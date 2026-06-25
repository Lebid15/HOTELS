import fs from 'node:fs';

const roomsPath = 'apps/web/public/assets/js/modules/06-rooms-dashboard.js';
const adapterPath = 'apps/web/public/assets/js/professional/adapters/ui-adapter.js';

const roomsCentralPath = 'apps/web/public/assets/js/modules/06c-rooms-floors-centralization.js';
const rooms = fs.readFileSync(roomsPath, 'utf8') + '\n' + fs.readFileSync(roomsCentralPath, 'utf8');
const adapter = fs.readFileSync(adapterPath, 'utf8');

const required = [
  ['rooms page migration marker', 'data-ui-migrated="rooms"'],
  ['rooms list migration marker', 'data-ui-migrated="rooms-list"'],
  ['room card migration marker', 'data-ui-migrated="room-card"'],
  ['room UI facade usage', 'window.FandqiUI'],
  ['central room button helper', 'renderRoomButton'],
  ['central room badge helper', 'renderRoomBadge'],
  ['central room empty helper', 'renderRoomEmptyState'],
  ['central room add button helper', 'renderRoomAddButton'],
  ['UI adapter renderButton', 'renderButton'],
  ['UI adapter renderBadge', 'renderBadge'],
  ['UI adapter renderEmptyState', 'renderEmptyState']
];

const failures = required
  .filter(([, token]) => !(rooms.includes(token) || adapter.includes(token)))
  .map(([label, token]) => `${label}: missing ${token}`);

const forbiddenPatterns = [
  /<button class="btn small ghost" type="button" data-action="view-room"/,
  /<button class="btn small ghost" type="button" data-action="edit-room"/,
  /<button class="btn small success" type="button" data-action="restore-room"/,
  /<button class="btn small danger" type="button" data-action="archive-room"/,
  /<span class="status-badge \$\{h\(displayStatus\)\}"/
];

for (const pattern of forbiddenPatterns) {
  if (pattern.test(rooms)) failures.push(`forbidden legacy room UI pattern found: ${pattern}`);
}

if (failures.length) {
  console.error('Rooms UI migration audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Rooms UI migration audit passed ✅');
