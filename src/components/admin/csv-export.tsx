"use client";

import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CsvExport({
  filename,
  headers,
  rows,
  label = "Baixar CSV",
}: {
  filename: string;
  headers: string[];
  rows: (string | number)[][];
  label?: string;
}) {
  const download = () => {
    const esc = (v: string | number) =>
      `"${String(v).replace(/"/g, '""')}"`;
    const csv = [
      headers.map(esc).join(","),
      ...rows.map((row) => row.map(esc).join(",")),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" size="sm" className="gap-1.5" onClick={download}>
      <DownloadIcon className="size-4" />
      {label}
    </Button>
  );
}
