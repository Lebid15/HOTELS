import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const exists = file => fs.existsSync(file);

const failures = [];

const requiredFiles = [
  'docs/PRODUCTION_READINESS_AUDIT.json',
  'docs/PRODUCTION_READINESS_AUDIT.md',
  'docs/FEATURE_MODULES_INVENTORY.json',
  'docs/RUNTIME_STABILITY_TRUE_MODULES_PHASE23.md'
];

for (const file of requiredFiles) {
  if (!exists(file)) failures.push(`missing required production readiness artifact: ${file}`);
}

const packageJson = JSON.parse(read('package.json'));
const quality = packageJson.scripts?.['quality:full'] || '';

const requiredPreviousAudits = [
  'ui-migration:closure-audit',
  'feature-modules:closure-audit',
  'feature-modules-reports-payments-notifications:audit',
  'closure:test'
];

for (const script of requiredPreviousAudits) {
  if (!quality.includes(`npm run ${script}`)) {
    failures.push(`quality:full must include prerequisite audit ${script}`);
  }
}

if (!packageJson.scripts?.['production-readiness:audit']) {
  failures.push('package.json missing production-readiness:audit script');
}

const report = exists('docs/PRODUCTION_READINESS_AUDIT.json')
  ? JSON.parse(read('docs/PRODUCTION_READINESS_AUDIT.json'))
  : null;

if (report) {
  if (report.status !== 'not_production_saas_ready') {
    failures.push('production readiness report must honestly mark the project as not_production_saas_ready');
  }

  const requiredBlockers = [
    'Backend/API',
    'Database',
    'Authentication',
    'Authorization/RBAC',
    'Payments/Financial Integrity',
    'Backups/Recovery',
    'Observability',
    'Deployment/Security'
  ];

  const blockers = Array.isArray(report.hardProductionBlockers) ? report.hardProductionBlockers : [];
  for (const blocker of requiredBlockers) {
    if (!blockers.some(item => item.area === blocker)) {
      failures.push(`production readiness report missing blocker: ${blocker}`);
    }
  }

  if (!report.featureModules || report.featureModules.count < 11) {
    failures.push('production readiness report must include all 11 feature modules');
  }

  if (Number(report.productionSaaSReadinessScore || 0) >= 9) {
    failures.push('production SaaS readiness score is unrealistically high for a local-only MVP');
  }

  if (!report.staticFindings || Number(report.staticFindings.localStorageReferenceFilesCount || 0) < 1) {
    failures.push('production readiness report must document localStorage usage');
  }
}

const reportMd = exists('docs/PRODUCTION_READINESS_AUDIT.md') ? read('docs/PRODUCTION_READINESS_AUDIT.md') : '';
for (const token of [
  'Local MVP',
  'Production SaaS',
  'Backend/API',
  'Database',
  'Auth/RBAC',
  'Observability',
  'Deployment'
]) {
  if (!reportMd.includes(token)) failures.push(`production readiness markdown missing section/token: ${token}`);
}

if (failures.length) {
  console.error('Production readiness audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Production readiness audit passed ✅');
