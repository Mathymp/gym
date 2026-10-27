function cell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function toCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return "\uFEFF";
  const headers = Object.keys(rows[0] ?? {});
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map((header) => cell(row[header])).join(","));
  return `\uFEFF${lines.join("\n")}`;
}
