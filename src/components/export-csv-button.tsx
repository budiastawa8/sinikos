"use client";

import { Button } from "@/components/ui/button";

/** Pemisah kolom ; — cocok untuk Excel Indonesia. */
const CSV_SEP = ";";

function escapeCsv(value: string | number | null | undefined) {
  const raw = value == null ? "" : String(value);
  if (/[";\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function ExportCsvButton({
  filename,
  headers,
  rows,
  label = "Export CSV",
}: {
  filename: string;
  headers: string[];
  rows: Array<Array<string | number | null | undefined>>;
  label?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-11 w-full sm:w-auto"
      onClick={() => {
        const lines = [
          headers.map(escapeCsv).join(CSV_SEP),
          ...rows.map((row) => row.map(escapeCsv).join(CSV_SEP)),
        ];
        const blob = new Blob(["\uFEFF" + lines.join("\n")], {
          type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }}
    >
      {label}
    </Button>
  );
}
