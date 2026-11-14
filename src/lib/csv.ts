/** Neutralizes spreadsheet formulas in user-provided text. */
export function csvContent(header: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    const text = String(v ?? "");
    const safe = typeof v === "string" && /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const body = [header, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
  return "\uFEFF" + body;
}

/** Downloads rows as a semicolon CSV with BOM so Turkish Excel opens it correctly. */
export function downloadCsv(filename: string, header: string[], rows: (string | number | null | undefined)[][]) {
  const url = URL.createObjectURL(new Blob([csvContent(header, rows)], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
