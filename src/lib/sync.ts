import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { humanError } from "./errors";
import { requireClient } from "./supabase";

export const SYNC_TABLES = [
  "profiles",
  "exercises",
  "workout_plans",
  "workout_plan_days",
  "workout_plan_exercises",
  "workout_sessions",
  "workout_session_exercises",
  "workout_sets",
  "cardio_sessions",
  "body_weight_logs",
  "body_measurements",
  "progress_photos",
  "goals",
  "schedule_overrides",
] as const;

export type SyncTable = (typeof SYNC_TABLES)[number];
export type SyncPhase = "local" | "syncing" | "synced" | "error";

type OutboxItem = {
  id: string;
  table: SyncTable;
  entityId: string;
  mode: "insert" | "update" | "delete";
  payload: Record<string, unknown>;
  expectedUpdatedAt: string | null;
  status: "pending" | "error";
  error: string | null;
  createdAt: string;
};

interface FormaDB extends DBSchema {
  outbox: { key: string; value: OutboxItem };
  kv: { key: string; value: { key: string; value: unknown } };
  blobs: { key: string; value: { id: string; blob: Blob; path: string } };
}

let databasePromise: Promise<IDBPDatabase<FormaDB>> | null = null;
let flushing = false;
let phase: SyncPhase = "synced";
let notice: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function getSyncPhase() {
  return phase;
}

export function consumeSyncNotice() {
  const current = notice;
  notice = null;
  return current;
}

export function subscribeSync(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function database() {
  databasePromise ??= openDB<FormaDB>("forma", 1, {
    upgrade(db) {
      db.createObjectStore("outbox", { keyPath: "id" });
      db.createObjectStore("kv", { keyPath: "key" });
      db.createObjectStore("blobs", { keyPath: "id" });
    },
  });
  return databasePromise;
}

export async function kvSet(key: string, value: unknown) {
  const db = await database();
  await db.put("kv", { key, value });
}

export async function kvGet<T>(key: string) {
  const db = await database();
  const row = await db.get("kv", key);
  return row?.value as T | undefined;
}

async function listOutbox() {
  const db = await database();
  return db.getAll("outbox");
}

function setPhase(items: OutboxItem[], active: boolean) {
  if (items.some((item) => item.status === "error")) phase = "error";
  else if (active) phase = "syncing";
  else if (items.some((item) => item.status === "pending")) phase = "local";
  else phase = "synced";
  emit();
}

function cleanPayload(payload: Record<string, unknown>) {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined) next[key] = value;
  }
  return next;
}

export async function rememberAck(table: SyncTable, id: string, updatedAt: string | null) {
  if (updatedAt) await kvSet(`ack:${table}:${id}`, updatedAt);
}

export async function readAck(table: SyncTable, id: string) {
  return (await kvGet<string>(`ack:${table}:${id}`)) ?? null;
}

export async function saveRow(input: {
  table: SyncTable;
  id: string;
  payload: Record<string, unknown>;
  expectedUpdatedAt: string | null;
  mode: "insert" | "update" | "delete";
}) {
  const db = await database();
  const key = `${input.table}:${input.id}`;
  const existing = await db.get("outbox", key);
  const payload = cleanPayload({ ...input.payload, id: input.id });
  let next: OutboxItem;
  if (existing && existing.status !== "error" && input.mode !== "delete" && existing.mode !== "delete") {
    next = {
      ...existing,
      mode: existing.mode === "insert" ? "insert" : "update",
      payload: { ...existing.payload, ...payload },
      expectedUpdatedAt: existing.mode === "insert" ? null : existing.expectedUpdatedAt,
      status: "pending",
      error: null,
    };
  } else {
    next = {
      id: key,
      table: input.table,
      entityId: input.id,
      mode: input.mode,
      payload,
      expectedUpdatedAt: input.mode === "insert" ? null : input.expectedUpdatedAt,
      status: "pending",
      error: null,
      createdAt: new Date().toISOString(),
    };
  }
  await db.put("outbox", next);
  const items = await listOutbox();
  setPhase(items, flushing);
  if (typeof navigator === "undefined" || navigator.onLine) await flush();
  return readAck(input.table, input.id);
}

export async function dropUnsyncedInsert(table: SyncTable, id: string) {
  const db = await database();
  const key = `${table}:${id}`;
  const existing = await db.get("outbox", key);
  if (existing?.mode === "insert") {
    await db.delete("outbox", key);
    setPhase(await listOutbox(), flushing);
    return true;
  }
  return false;
}

export async function putBlob(id: string, blob: Blob, path: string) {
  const db = await database();
  await db.put("blobs", { id, blob, path });
}

export async function flush() {
  if (flushing) return;
  flushing = true;
  const db = await database();
  let items = await listOutbox();
  setPhase(items, true);
  for (const item of items.sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    try {
      const updatedAt = await pushItem(item);
      await db.delete("outbox", item.id);
      if (updatedAt) await rememberAck(item.table, item.entityId, updatedAt);
      if (item.table === "progress_photos") await db.delete("blobs", item.entityId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "conflict") {
        await db.delete("outbox", item.id);
        notice = "Había un cambio más reciente en tu cuenta. Conservamos esa versión.";
      } else {
        const offline = typeof navigator !== "undefined" && !navigator.onLine;
        const stored = await db.get("outbox", item.id);
        if (stored) {
          stored.status = offline ? "pending" : "error";
          stored.error = humanError(error);
          await db.put("outbox", stored);
        }
        if (offline || stored?.status === "error") break;
      }
    }
  }
  items = await listOutbox();
  if (items.length === 0) await runRpcJobs();
  flushing = false;
  setPhase(await listOutbox(), false);
}

async function runRpcJobs() {
  const jobs = (await kvGet<RpcJob[]>("rpc-jobs")) ?? [];
  if (jobs.length === 0) return;
  const client = requireClient();
  const remaining: RpcJob[] = [];
  for (const job of jobs) {
    const { error } = await client.rpc(job.name, job.args);
    if (error) {
      remaining.push(job);
      notice = humanError(error);
      break;
    }
  }
  await kvSet("rpc-jobs", remaining);
}

async function pushItem(item: OutboxItem) {
  const client = requireClient();
  if (item.mode === "delete") {
    const { error } = await client.from(item.table).delete().eq("id", item.entityId);
    if (error) throw error;
    return null;
  }
  if (item.table === "progress_photos") {
    const db = await database();
    const file = await db.get("blobs", item.entityId);
    if (file) {
      const { error } = await client.storage.from("progress-photos").upload(file.path, file.blob, {
        contentType: "image/webp",
        upsert: true,
      });
      if (error) throw error;
    }
  }
  if (item.mode === "insert") {
    const { data, error } = await client.from(item.table).upsert(item.payload, { onConflict: "id" }).select("updated_at").maybeSingle();
    if (error) throw error;
    return (data?.updated_at as string | undefined) ?? null;
  }
  const patch = { ...item.payload };
  delete patch.id;
  delete patch.updated_at;
  delete patch.created_at;
  delete patch.user_id;
  let query = client.from(item.table).update(patch).eq("id", item.entityId);
  if (item.expectedUpdatedAt) query = query.eq("updated_at", item.expectedUpdatedAt);
  const { data, error } = await query.select("updated_at").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("conflict");
  return data.updated_at as string;
}

export async function enqueueRpc(name: string, args: Record<string, unknown>) {
  const jobs = (await kvGet<RpcJob[]>("rpc-jobs")) ?? [];
  jobs.push({ id: crypto.randomUUID(), name, args });
  await kvSet("rpc-jobs", jobs);
  if (typeof navigator === "undefined" || navigator.onLine) await flush();
}

type RpcJob = { id: string; name: string; args: Record<string, unknown> };

export async function initSync() {
  const items = await listOutbox();
  setPhase(items, false);
  if (typeof window === "undefined") return;
  window.addEventListener("online", () => {
    void flush();
  });
  if (navigator.onLine && items.length > 0) void flush();
}

export async function pendingCount() {
  const items = await listOutbox();
  return items.length;
}
