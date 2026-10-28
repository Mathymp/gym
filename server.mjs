import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("./dist", import.meta.url)));
const port = Number(process.env.PORT) || 10000;

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

const headers = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(self), microphone=(), geolocation=()",
};

async function fileAt(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;
  const target = resolve(join(root, normalize(decoded)));
  if (target !== root && !target.startsWith(root + sep)) return null;
  try {
    const info = await stat(target);
    if (info.isFile()) return { path: target, size: info.size };
    if (info.isDirectory()) {
      const index = join(target, "index.html");
      const indexInfo = await stat(index);
      if (indexInfo.isFile()) return { path: index, size: indexInfo.size };
    }
  } catch {
    return null;
  }
  return null;
}

createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { ...headers, Allow: "GET, HEAD" }).end();
    return;
  }
  const { pathname } = new URL(request.url ?? "/", "http://localhost");
  let file = await fileAt(pathname);
  const isAsset = extname(pathname) !== "";
  if (!file && isAsset) {
    response.writeHead(404, { ...headers, "Content-Type": "text/plain; charset=utf-8" }).end("No encontrado");
    return;
  }
  if (!file) file = await fileAt("/index.html");
  if (!file) {
    response.writeHead(503, { ...headers, "Content-Type": "text/plain; charset=utf-8" }).end("Falta compilar la app");
    return;
  }
  const extension = extname(file.path);
  const immutable = file.path.includes(`${sep}assets${sep}`);
  const cache = immutable
    ? "public, max-age=31536000, immutable"
    : extension === ".html" || file.path.endsWith("sw.js") || extension === ".webmanifest"
      ? "no-cache"
      : "public, max-age=3600";
  response.writeHead(200, {
    ...headers,
    "Content-Type": types[extension] ?? "application/octet-stream",
    "Content-Length": file.size,
    "Cache-Control": cache,
  });
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  createReadStream(file.path).pipe(response);
}).listen(port, "0.0.0.0", () => {
  console.log(`FORMA sirviendo dist en el puerto ${port}`);
});
