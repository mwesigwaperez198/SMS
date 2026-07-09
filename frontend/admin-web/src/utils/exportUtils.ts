export function printElement(elementId: string, title?: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    window.print();
    return;
  }

  const originalContents = document.body.innerHTML;
  const printContents = element.innerHTML;

  const styles = Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules || [])
          .map((rule) => rule.cssText)
          .join("");
      } catch {
        return "";
      }
    })
    .join("");

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title || "Export"}</title>
      <style>${styles}</style>
      <style>
        body {
          background: #0f172a !important;
          color: #f1f5f9 !important;
          padding: 20px;
          font-family: 'Outfit', Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
        }
        @media print {
          body {
            background: #fff !important;
            color: #111 !important;
          }
        }
        .no-print { display: none !important; }
        .print-only { display: block !important; }
      </style>
    </head>
    <body>
      <div id="print-root">${printContents}</div>
      <script>
        window.onload = function() { window.print(); window.close(); };
      <\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

export function downloadElement(elementId: string, filename = "download.html") {
  const element = document.getElementById(elementId);
  if (!element) return;

  const content = element.innerHTML;
  const styles = Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules || [])
          .map((rule) => rule.cssText)
          .join("");
      } catch {
        return "";
      }
    })
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${filename.replace(/\.html$/, "")}</title>
  <style>${styles}</style>
  <style>
    body { background: #0f172a !important; color: #f1f5f9 !important; padding: 20px; font-family: 'Outfit', Inter, ui-sans-serif, system-ui, -apple-system, sans-serif; }
    .no-print { display: none !important; }
    .print-only { display: block !important; }
  </style>
</head>
<body><div>${content}</div></body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportAsCSV(rows: Record<string, unknown>[], filename = "export.csv") {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((h) => {
        const val = row[h];
        const str = val == null ? "" : String(val);
        return str.includes(",") || str.includes('"') || str.includes("\n")
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
