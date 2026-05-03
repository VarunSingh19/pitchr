import type { SendResult } from "@/lib/types";

/** Generate a CSV string and trigger browser download */
export function downloadCsv(results: SendResult[]) {
  const headers = ["Company", "Role", "Email", "Subject", "Status", "Timestamp"];
  const rows = results.map((r) => [
    escapeCsv(r.company),
    escapeCsv(r.role),
    escapeCsv(r.email),
    escapeCsv(r.subject),
    r.status,
    r.timestamp || "",
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `cold-email-report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
