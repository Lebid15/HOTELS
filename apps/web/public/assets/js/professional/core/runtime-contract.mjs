const REQUIRED_GLOBALS = [
  'i18n',
  'state',
  'render',
  'applyCentralDesignSystem',
  'formatDateTime',
  'todayISO'
];

export function collectRuntimeContract() {
  return REQUIRED_GLOBALS.map(name => ({
    name,
    available: typeof window[name] !== 'undefined'
  }));
}

export function installRuntimeContractReporter(namespace) {
  const report = collectRuntimeContract();
  namespace.contract = report;
  namespace.hasRuntimeContractWarnings = report.some(item => !item.available);
  return report;
}
