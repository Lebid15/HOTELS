export function createReportActions() {
  return Object.freeze({
    toCsv(rows = []) {
      return rows.map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    },
    getExportFilename(type = 'report', today = new Date().toISOString().slice(0, 10)) {
      return `fandqi-${type || 'report'}-${today}.csv`;
    }
  });
}
