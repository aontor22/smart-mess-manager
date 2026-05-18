import jsPDF from "jspdf";

export function downloadCSV(filename, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((key) => {
          const value = row[key] ?? "";
          return `"${String(value).replace(/"/g, '""')}"`;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadReportPDF({ title, subtitle, rows, currency }) {
  const doc = new jsPDF();
  let y = 18;
  doc.setFontSize(16);
  doc.text(title, 14, y);
  y += 8;
  doc.setFontSize(10);
  doc.text(subtitle, 14, y);
  y += 10;

  doc.setFontSize(9);
  rows.forEach((row, index) => {
    if (y > 280) {
      doc.addPage();
      y = 18;
    }
    const line = `${index + 1}. ${row.name} | Meals: ${row.meals} | Payable: ${row.payable.toFixed(2)} ${currency} | Deposit: ${row.deposit.toFixed(2)} ${currency} | Balance: ${row.balance.toFixed(2)} ${currency}`;
    doc.text(line, 14, y);
    y += 7;
  });

  doc.save("monthly-report.pdf");
}
