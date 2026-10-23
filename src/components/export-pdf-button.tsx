"use client";

import { useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";

export function ExportPdfButton({
  filename,
  title,
  subtitle,
  headers,
  rows,
  footNote,
  label = "Export PDF",
}: {
  filename: string;
  title: string;
  subtitle?: string;
  headers: string[];
  rows: Array<Array<string | number | null | undefined>>;
  footNote?: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      className="h-11 w-full sm:w-auto"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        try {
          const doc = new jsPDF({
            orientation: headers.length > 6 ? "landscape" : "portrait",
            unit: "mm",
            format: "a4",
          });

          const margin = 14;
          let y = 16;

          doc.setFont("helvetica", "bold");
          doc.setFontSize(14);
          doc.text(title, margin, y);
          y += 6;

          if (subtitle) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(90);
            doc.text(subtitle, margin, y);
            doc.setTextColor(0);
            y += 5;
          }

          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(110);
          doc.text(
            `Dicetak ${new Intl.DateTimeFormat("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date())} · SiniKos`,
            margin,
            y,
          );
          doc.setTextColor(0);
          y += 4;

          autoTable(doc, {
            startY: y,
            head: [headers],
            body: rows.map((row) =>
              row.map((cell) => (cell == null ? "" : String(cell))),
            ),
            styles: {
              font: "helvetica",
              fontSize: 8,
              cellPadding: 2,
              overflow: "linebreak",
            },
            headStyles: {
              fillColor: [30, 41, 59],
              textColor: 255,
              fontStyle: "bold",
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: margin, right: margin },
          });

          if (footNote) {
            const finalY =
              (doc as jsPDF & { lastAutoTable?: { finalY: number } })
                .lastAutoTable?.finalY ?? y;
            doc.setFontSize(8);
            doc.setTextColor(80);
            doc.text(footNote, margin, finalY + 8);
            doc.setTextColor(0);
          }

          doc.save(filename);
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Menyiapkan…" : label}
    </Button>
  );
}
