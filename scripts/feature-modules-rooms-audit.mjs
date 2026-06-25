import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');

const requiredFiles = [
  'apps/web/public/assets/js/professional/features/rooms/constants.mjs',
  'apps/web/public/assets/js/professional/features/rooms/repository.mjs',
  'apps/web/public/assets/js/professional/features/rooms/validators.mjs',
  'apps/web/public/assets/js/professional/features/rooms/render.mjs',
  'apps/web/public/assets/js/professional/features/rooms/actions.mjs',
  'apps/web/public/assets/js/professional/features/rooms/index.mjs',
  'apps/web/public/assets/js/professional/adapters/rooms-feature-adapter.js'
];

const failures = [];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) failures.push(`required rooms feature file missing: ${file}`);
}

const appEntry = read('apps/web/public/assets/js/professional/app-entry.mjs');
const indexHtml = read('apps/web/public/index.html');
const roomsModule = read('apps/web/public/assets/js/modules/06-rooms-dashboard.js') + '\n' + read('apps/web/public/assets/js/modules/06c-rooms-floors-centralization.js');
const roomsIndex = read('apps/web/public/assets/js/professional/features/rooms/index.mjs');
const roomsRepository = read('apps/web/public/assets/js/professional/features/rooms/repository.mjs');
const roomsRender = read('apps/web/public/assets/js/professional/features/rooms/render.mjs');
const roomsValidators = read('apps/web/public/assets/js/professional/features/rooms/validators.mjs');
const roomsAdapter = read('apps/web/public/assets/js/professional/adapters/rooms-feature-adapter.js');

const requiredTokens = [
  ['app-entry imports roomsFeature', appEntry, "import { roomsFeature } from './features/rooms/index.mjs';"],
  ['app-entry exposes feature registry', appEntry, 'features: Object.freeze({'],
  ['app-entry exposes rooms feature', appEntry, 'rooms: roomsFeature'],
  ['index loads classic rooms feature adapter', indexHtml, 'rooms-feature-adapter.js'],
  ['rooms page has feature marker', roomsModule, 'data-feature-module="rooms"'],
  ['classic rooms module uses feature facade', roomsModule, 'window.FandqiRoomsFeature'],
  ['classic rooms module delegates read', roomsModule, 'feature?.repository?.read'],
  ['classic rooms module delegates write', roomsModule, 'feature?.repository?.write'],
  ['classic rooms module delegates hotel selector', roomsModule, 'feature?.repository?.forHotel'],
  ['classic rooms module delegates display status', roomsModule, 'feature?.selectors?.getRoomDisplayStatus'],
  ['classic rooms module delegates grouping', roomsModule, 'feature?.selectors?.groupRoomsByFloor'],
  ['rooms feature exports object', roomsIndex, 'export const roomsFeature'],
  ['rooms repository has read', roomsRepository, 'read()'],
  ['rooms repository has forHotel', roomsRepository, 'forHotel(hotelId'],
  ['rooms validators normalize', roomsValidators, 'normalizeRoom'],
  ['rooms validators validate', roomsValidators, 'validateRoom'],
  ['rooms render display status selector', roomsRender, 'getRoomDisplayStatus'],
  ['rooms render group selector', roomsRender, 'groupRoomsByFloor'],
  ['classic adapter installs facade', roomsAdapter, 'window.FandqiRoomsFeature = Object.freeze']
];

for (const [label, source, token] of requiredTokens) {
  if (!source.includes(token)) failures.push(`${label}: missing ${token}`);
}

const forbiddenPatterns = [
  ['rooms read direct only', /function readRooms\(\) \{\s*try \{/],
  ['rooms hotel direct only', /function getHotelRooms\(hotelId\) \{\s*return readRooms\(\)\.filter/],
  ['rooms display direct only', /function getRoomDisplayStatus\(room\) \{\s*if \(!room\) return 'available';/]
];

for (const [label, pattern] of forbiddenPatterns) {
  if (pattern.test(roomsModule)) failures.push(`forbidden non-feature rooms implementation remains: ${label}`);
}

if (failures.length) {
  console.error('Rooms feature module audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Rooms feature module audit passed ✅');
