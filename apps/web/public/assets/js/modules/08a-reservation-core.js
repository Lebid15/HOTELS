// Fandqi Modular Refactor — Reservations, companions, documents, receipts, account statements, wizard, and reservation events.
const RESERVATION_STORAGE_KEY = 'fandqi.reservations';
const RESERVATION_STATUSES = ['pending','confirmed','cancelled','checked_in','completed'];
const RESERVATION_SOURCES = ['direct','phone','whatsapp','online','other'];

function reservationsFeature() {
  return window.FandqiReservationsFeature || null;
}

function readReservations() {
  const feature = reservationsFeature();
  if (feature?.repository?.read) return feature.repository.read();
  try {
    const value = readStorageJson(RESERVATION_STORAGE_KEY, []);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeReservations(reservations) {
  const feature = reservationsFeature();
  if (feature?.repository?.write) return feature.repository.write(reservations);
  writeStorageJson(RESERVATION_STORAGE_KEY, reservations);
}

function getHotelReservations(hotelId) {
  const feature = reservationsFeature();
  if (feature?.repository?.forHotel) return feature.repository.forHotel(hotelId);
  return readReservations().filter(reservation => reservation.hotelId === hotelId && reservation.status !== 'archived');
}

function getReservationById(id) {
  const feature = reservationsFeature();
  if (feature?.repository?.byId) return feature.repository.byId(id);
  return readReservations().find(reservation => reservation.id === id) || null;
}

function getReservationStatusLabel(status) {
  return t(`reservation.status.${status}`, status);
}

function getReservationSourceLabel(source) {
  return t(`reservation.source.${source}`, source);
}


function getReservationDocumentTypeLabel(type) {
  return t(`reservation.documentType.${type || 'national_id'}`, type || '-');
}

function getReservationYesNo(value) {
  return value ? t('common.yes', 'نعم') : t('common.no', 'لا');
}

function getReservationRelationshipOptions(selected = '') {
  const options = ['spouse','son','daughter','father','mother','brother','sister','relative','friend','other'];
  return options.map(option => `<option value="${h(option)}" ${selected === option ? 'selected' : ''}>${h(t(`reservation.relationship.${option}`))}</option>`).join('');
}

function getReservationRelationshipLabel(value) {
  return value ? t(`reservation.relationship.${value}`, value) : '-';
}

function getAdultCompanionDocumentTypeOptions(selected = '') {
  const options = ['national_id','passport','residence','other'];
  const value = selected || 'national_id';
  return options.map(option => `<option value="${h(option)}" ${value === option ? 'selected' : ''}>${h(getReservationDocumentTypeLabel(option))}</option>`).join('');
}

const FAMILY_RELATIONSHIP_VALUES = ['spouse','son','daughter','father','mother','brother','sister'];

function requiresFamilyProofRelationship(value) {
  return FAMILY_RELATIONSHIP_VALUES.includes(String(value || ''));
}

function isFamilyProofDocumentType(value) {
  return ['family_book', 'kinship_proof'].includes(String(value || ''));
}

function getReservationFormFamilyProofRequired(form) {
  if (!form) return false;
  const hasCompanions = document.getElementById('reservationHasCompanions')?.checked;
  if (!hasCompanions) return false;
  const groupType = document.getElementById('companionGroupType')?.value;
  if (groupType === 'family') return true;
  const relationSelects = [...form.querySelectorAll('select[name$="_relationship"], select[name="childrenRelationship"]')];
  return relationSelects.some(select => requiresFamilyProofRelationship(select.value));
}

function showReservationStep(step) {
  const form = document.getElementById('reservationForm');
  if (!form) return;
  const currentStep = Math.max(1, Number(step || 1));
  const panels = [...form.querySelectorAll('[data-step-panel]')];
  const tabs = [...form.querySelectorAll('[data-step-target]')];
  const prevBtn = document.getElementById('reservationPrevStepBtn');
  const nextBtn = document.getElementById('reservationNextStepBtn');
  const submitBtn = document.getElementById('reservationSubmitBtn');
  const totalSteps = panels.length || 1;
  form.dataset.currentStep = String(currentStep);
  panels.forEach(panel => panel.classList.toggle('hidden', Number(panel.dataset.stepPanel) !== currentStep));
  tabs.forEach(tab => {
    const stepNumber = Number(tab.dataset.stepTarget);
    tab.classList.toggle('active', stepNumber === currentStep);
    tab.classList.toggle('done', stepNumber < currentStep);
  });
  if (prevBtn) prevBtn.classList.toggle('hidden', currentStep === 1);
  if (nextBtn) nextBtn.classList.toggle('hidden', currentStep === totalSteps);
  if (submitBtn) submitBtn.classList.toggle('hidden', currentStep !== totalSteps);
}

function getReservationGuestCount(hasCompanions, adultCount, childrenCount) {
  return 1 + (hasCompanions ? Number(adultCount || 0) + Number(childrenCount || 0) : 0);
}

function getCurrentAdultCompanionRowsFromForm(count) {
  const form = document.getElementById('reservationForm');
  if (!form) return [];
  const data = Object.fromEntries(new FormData(form).entries());
  return Array.from({ length: Number(count || 0) }, (_, index) => ({
    nationalId: data[`adultCompanion_${index}_nationalId`] || '',
    firstName: data[`adultCompanion_${index}_firstName`] || '',
    lastName: data[`adultCompanion_${index}_lastName`] || '',
    fatherName: data[`adultCompanion_${index}_fatherName`] || '',
    motherName: data[`adultCompanion_${index}_motherName`] || '',
    birthDate: data[`adultCompanion_${index}_birthDate`] || '',
    relationship: data[`adultCompanion_${index}_relationship`] || '',
    documentType: data[`adultCompanion_${index}_documentType`] || 'national_id',
    documentFileName: data[`adultCompanion_${index}_documentFileName`] || '',
    documentDataUrl: data[`adultCompanion_${index}_documentDataUrl`] || '',
    documentSource: data[`adultCompanion_${index}_documentSource`] || ''
  }));
}

function getAdultCompanionDefaults(count, companions = []) {
  return Array.from({ length: Number(count || 0) }, (_, index) => companions[index] || {});
}

function renderAdultCompanionRows(companions = [], count = 0) {
  const rows = getAdultCompanionDefaults(count, companions);
  if (!rows.length) return '';
  return `
    <div class="companions-adults-list compact-adults-list" id="adultCompanionsRows">
      ${rows.map((companion, index) => {
        const fullName = [companion.firstName, companion.lastName].filter(Boolean).join(' ').trim();
        return `
        <details class="companion-card compact-companion-card" data-adult-companion-row="${index}" ${fullName || companion.nationalId ? '' : 'open'}>
          <summary class="companion-card-head compact-companion-summary">
            <span class="companion-summary-main">
              <strong>${h(t('reservation.companions.adultTitle'))} ${index + 1}</strong>
              <small>${h(fullName || companion.nationalId || t('reservation.companions.clickToComplete'))}</small>
            </span>
            <span class="companion-summary-meta">${h(getReservationRelationshipLabel(companion.relationship) || '-')}</span>
          </summary>
          <div class="compact-companion-body">
            <div class="modal-grid compact-modal-grid reservation-form-grid compact-companion-grid">
              <div class="field">${fieldLabel('fileText', h(t('reservation.form.nationalId')))}<input class="input" name="adultCompanion_${index}_nationalId" value="${h(companion.nationalId || '')}"></div>
              <div class="field">${fieldLabel('user', h(t('reservation.form.guestFirstName')))}<input class="input" name="adultCompanion_${index}_firstName" value="${h(companion.firstName || '')}"></div>
              <div class="field">${fieldLabel('user', h(t('reservation.form.guestLastName')))}<input class="input" name="adultCompanion_${index}_lastName" value="${h(companion.lastName || '')}"></div>
              <div class="field">${fieldLabel('users', h(t('reservation.companions.relationship')))}
                <select class="select" name="adultCompanion_${index}_relationship">
                  ${getReservationRelationshipOptions(companion.relationship || '')}
                </select>
              </div>
              <div class="field">${fieldLabel('user', h(t('reservation.form.fatherName')))}<input class="input" name="adultCompanion_${index}_fatherName" value="${h(companion.fatherName || '')}"></div>
              <div class="field">${fieldLabel('user', h(t('reservation.form.motherName')))}<input class="input" name="adultCompanion_${index}_motherName" value="${h(companion.motherName || '')}"></div>
              <div class="field">${fieldLabel('calendar', h(t('reservation.form.birthDate')))}<input class="input" type="date" name="adultCompanion_${index}_birthDate" value="${h(companion.birthDate || '')}"></div>
            </div>
          </div>
        </details>
      `;}).join('')}
    </div>
  `;
}

function renderAdultCompanionDocumentRows(companions = [], count = 0) {
  const rows = getAdultCompanionDefaults(count, companions);
  if (!rows.length) {
    return '';
  }
  return `
    <div class="adult-documents-list adult-documents-list--compact">
      ${rows.map((companion, index) => {
        const fullName = [companion.firstName, companion.lastName].filter(Boolean).join(' ').trim();
        const documentLabel = companion.documentFileName || t('reservation.companions.noDocumentSelected');
        return `
          <article class="adult-document-card adult-document-card--compact" data-adult-document-card="${index}">
            <div class="adult-document-head adult-document-head--compact">
              <div>
                <strong>${h(fullName || `${t('reservation.companions.adultTitle')} ${index + 1}`)}</strong>
                <small>${h(getReservationRelationshipLabel(companion.relationship) || t('reservation.companions.documentForAdult'))}</small>
              </div>
              <span class="document-file-pill" id="adultCompanion_${index}_documentFileName">${h(documentLabel)}</span>
            </div>
            <div class="document-compact-grid">
              <div class="field document-type-field">${fieldLabel('fileText', h(t('reservation.companions.documentType')))}
                <select class="select" name="adultCompanion_${index}_documentType">
                  ${getAdultCompanionDocumentTypeOptions(companion.documentType || 'national_id')}
                </select>
              </div>
              <div class="field document-upload-field">${fieldLabel('upload', h(t('reservation.companions.documentImage')))}
                <input class="input document-file-input" id="adultCompanion_${index}_documentFile" data-adult-document-file="${index}" type="file" accept="image/png,image/jpeg,image/webp,application/pdf">
                <input type="hidden" name="adultCompanion_${index}_documentDataUrl" value="${h(companion.documentDataUrl || '')}">
                <input type="hidden" name="adultCompanion_${index}_documentFileName" id="adultCompanion_${index}_documentFileNameHidden" value="${h(companion.documentFileName || '')}">
                <input type="hidden" name="adultCompanion_${index}_documentSource" id="adultCompanion_${index}_documentSource" value="${h(companion.documentSource || '')}">
              </div>
              <div class="document-actions compact-document-actions">
                <button class="btn ghost" type="button" data-scan-adult-document="${index}">${icon('fileText')}${h(t('reservation.companions.scanDocument'))}</button>
                <button class="btn ghost" type="button" data-view-adult-document="${index}" ${companion.documentFileName || companion.documentDataUrl ? '' : 'disabled'}>${h(t('reservation.actions.viewDocument'))}</button>
              </div>
            </div>
          </article>
        `;
      }).join('')}
    </div>
  `;
}

function collectAdultCompanions(data, count) {
  return Array.from({ length: Number(count || 0) }, (_, index) => ({
    nationalId: data[`adultCompanion_${index}_nationalId`] || '',
    firstName: data[`adultCompanion_${index}_firstName`] || '',
    lastName: data[`adultCompanion_${index}_lastName`] || '',
    fatherName: data[`adultCompanion_${index}_fatherName`] || '',
    motherName: data[`adultCompanion_${index}_motherName`] || '',
    birthDate: data[`adultCompanion_${index}_birthDate`] || '',
    relationship: data[`adultCompanion_${index}_relationship`] || '',
    documentType: data[`adultCompanion_${index}_documentType`] || 'national_id',
    documentFileName: data[`adultCompanion_${index}_documentFileName`] || '',
    documentDataUrl: data[`adultCompanion_${index}_documentDataUrl`] || '',
    documentSource: data[`adultCompanion_${index}_documentSource`] || ''
  })).filter(companion => Object.values(companion).some(Boolean));
}

async function collectAdultCompanionsWithDocuments(data, count) {
  const rows = collectAdultCompanions(data, count);
  for (let index = 0; index < rows.length; index += 1) {
    const fileInput = document.getElementById(`adultCompanion_${index}_documentFile`);
    const file = fileInput?.files?.[0] || null;
    if (file) {
      rows[index].documentDataUrl = await readReservationFileAsDataUrl(file);
      rows[index].documentFileName = file.name;
      rows[index].documentSource = 'upload';
    }
  }
  return rows;
}

function findMissingAdultCompanionDocumentIndex(companions = [], expectedCount = 0) {
  if (!Number(expectedCount || 0)) return -1;
  for (let index = 0; index < Number(expectedCount || 0); index += 1) {
    const companion = companions[index] || {};
    if (!companion.documentFileName && !companion.documentDataUrl) return index;
  }
  return -1;
}

const RESERVATION_FILE_DATA_MAX_BYTES = 220000;

function readReservationFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('');
    if (Number(file.size || 0) > RESERVATION_FILE_DATA_MAX_BYTES) return resolve('');
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('File read failed'));
    reader.readAsDataURL(file);
  });
}

function getReservationRoomLabel(room) {
  if (!room) return '-';
  return `${t('reservation.form.roomShort')} ${room.number || '-'} - ${t('room.form.floorPrefix')} ${room.floor || '-'}`;
}

function getReservationGuestDisplayName(reservation) {
  const fullName = [reservation?.guestFirstName, reservation?.guestLastName].filter(Boolean).join(' ').trim();
  return fullName || reservation?.guestName || '-';
}

const ACTIVE_RESERVATION_ROOM_STATUSES = ['pending','confirmed','checked_in'];

function reservationDateRangesOverlap(startA, endA, startB, endB) {
  const feature = reservationsFeature();
  if (feature?.selectors?.dateRangesOverlap) return feature.selectors.dateRangesOverlap(startA, endA, startB, endB);
  if (!startA || !endA || !startB || !endB) return false;
  return String(startA) < String(endB) && String(startB) < String(endA);
}

function isRoomReservedByActiveReservation(roomId, excludeReservationId = '', checkInDate = '', checkOutDate = '') {
  const feature = reservationsFeature();
  if (feature?.selectors?.isRoomReservedByActiveReservation) {
    return feature.selectors.isRoomReservedByActiveReservation(readReservations(), roomId, excludeReservationId, checkInDate, checkOutDate);
  }
  if (!roomId || !checkInDate || !checkOutDate) return false;
  return readReservations().some(reservation => {
    if (reservation.roomId !== roomId || reservation.id === excludeReservationId) return false;
    if (!ACTIVE_RESERVATION_ROOM_STATUSES.includes(reservation.status || 'pending')) return false;
    return reservationDateRangesOverlap(checkInDate, checkOutDate, reservation.checkInDate, reservation.checkOutDate);
  });
}

function getReservationRooms(hotelId, options = {}) {
  const includeReservationId = options.includeReservationId || '';
  const includeRoomId = includeReservationId ? getReservationById(includeReservationId)?.roomId : '';
  const rooms = getHotelRooms(hotelId);
  const feature = reservationsFeature();
  if (feature?.selectors?.getReservationRooms) return feature.selectors.getReservationRooms(rooms, includeRoomId);
  return rooms.filter(room => {
    if (room.status === 'archived' || room.status === 'out_of_service') return false;
    if (includeRoomId && room.id === includeRoomId) return true;
    return true;
  });
}

function calculateNights(checkInDate, checkOutDate) {
  const feature = reservationsFeature();
  if (feature?.selectors?.calculateNights) return feature.selectors.calculateNights(checkInDate, checkOutDate);
  if (!checkInDate || !checkOutDate) return 1;
  const start = new Date(`${checkInDate}T00:00:00`);
  const end = new Date(`${checkOutDate}T00:00:00`);
  const diff = Math.round((end - start) / 86400000);
  return Math.max(1, Number.isFinite(diff) ? diff : 1);
}

function getReservationTotals(roomId, checkInDate, checkOutDate) {
  const room = getRoomById(roomId);
  const feature = reservationsFeature();
  if (feature?.selectors?.calculateReservationTotals) {
    return feature.selectors.calculateReservationTotals(room, checkInDate, checkOutDate, readPlatformSettings().defaultCurrency || 'USD');
  }
  const nights = calculateNights(checkInDate, checkOutDate);
  const roomPrice = Number(room?.price || 0);
  const totalAmount = roomPrice * nights;
  return {
    room,
    nights,
    roomPrice,
    totalAmount,
    currency: room?.currency || readPlatformSettings().defaultCurrency || 'USD'
  };
}

function getNextReservationNumber(hotelId) {
  const settings = readHotelSettings(hotelId);
  const feature = reservationsFeature();
  if (feature?.selectors?.getNextReservationNumber) {
    return feature.selectors.getNextReservationNumber({
      prefix: settings.bookingPrefix || 'RES',
      lastNumber: settings.bookingLastNumber || 0,
      existingCount: getHotelReservations(hotelId).length
    });
  }
  const prefix = settings.bookingPrefix || 'RES';
  const existing = getHotelReservations(hotelId).length + 1;
  const seed = Math.max(Number(settings.bookingLastNumber || 0) + 1, existing);
  return `${prefix}-${String(seed).padStart(4, '0')}`;
}

function getFilteredReservations() {
  const hotel = getManagerHotel();
  if (!hotel) return [];
  const search = state.reservationFilters.search.trim().toLowerCase();
  return getHotelReservations(hotel.id).filter(reservation => {
    const room = getRoomById(reservation.roomId);
    const companionSearchValues = (reservation.adultCompanions || []).flatMap(companion => [companion.nationalId, companion.firstName, companion.lastName, companion.fatherName, companion.motherName, companion.relationship]);
    const matchesSearch = !search || [reservation.reservationNo, reservation.guestName, reservation.guestFirstName, reservation.guestLastName, reservation.fatherName, reservation.motherName, reservation.nationalId, reservation.birthDate, reservation.guestPhone, reservation.guestEmail, reservation.documentFileName, reservation.childrenRelationship, reservation.bookingEmployeeName, reservation.bookingEmployeeRole, reservation.bookingEmployeeShift, reservation.createdByName, reservation.createdByRole, ...companionSearchValues, room?.number, reservation.notes]
      .some(value => String(value || '').toLowerCase().includes(search));
    const matchesStatus = state.reservationFilters.status === 'all' || reservation.status === state.reservationFilters.status;
    const matchesRoom = state.reservationFilters.room === 'all' || reservation.roomId === state.reservationFilters.room;
    const selectedEmployee = state.reservationFilters.employee || 'all';
    const matchesEmployee = selectedEmployee === 'all' || getReservationBookingEmployeeKey(reservation) === selectedEmployee;
    return matchesSearch && matchesStatus && matchesRoom && matchesEmployee;
  });
}

