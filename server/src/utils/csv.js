function escapeCsv(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Format an ISO date string into a human-readable format for Excel.
 * e.g. "2026-04-25T13:17:58" → "25-Apr-2026 01:17 PM"
 */
function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const mon = months[d.getMonth()];
    const year = d.getFullYear();
    let hours = d.getHours();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    const mins = String(d.getMinutes()).padStart(2, "0");
    return `${day}-${mon}-${year} ${String(hours).padStart(2,"0")}:${mins} ${ampm}`;
  } catch {
    return dateStr;
  }
}

function toCsv(rows) {
  const header = [
    "Name",
    "Phone",
    "Company",
    "Notes",
    "Temperature",
    "Source",
    "Last Contacted",
    "Created At",
  ];

  const lines = rows.map((row) =>
    [
      row.name,
      row.phone ? `\t${row.phone}` : "",  // tab prefix forces Excel to treat as text
      row.company,
      row.notes,
      row.temperature ? row.temperature.charAt(0).toUpperCase() + row.temperature.slice(1) : "",
      row.source ? row.source.charAt(0).toUpperCase() + row.source.slice(1) : "",
      formatDate(row.lastContactedAt),
      formatDate(row.createdAt),
    ]
      .map(escapeCsv)
      .join(",")
  );

  return [header.join(","), ...lines].join("\n");
}

module.exports = {
  toCsv,
};
