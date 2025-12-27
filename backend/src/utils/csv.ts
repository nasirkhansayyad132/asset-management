const escapeValue = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) {
    return "";
  }
  const stringValue = String(value);
  const needsQuotes = /[",\n]/.test(stringValue);
  const escaped = stringValue.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
};

export const toCsv = (rows: Array<Record<string, unknown>>) => {
  if (rows.length === 0) {
    return "";
  }
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    const values = headers.map((header) => escapeValue(row[header] as string));
    lines.push(values.join(","));
  }
  return lines.join("\n");
};
