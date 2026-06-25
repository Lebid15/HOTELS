function renderReservationModal() {
  if (!state.reservationModal) return '';
  const { mode, id } = state.reservationModal;
  const reservation = id ? getReservationById(id) : null;
  if (mode === 'view') return renderReservationViewModal(reservation);
  if (mode === 'success') return renderReservationSuccessModal(reservation);
  return renderReservationFormModal(mode, reservation);
}


function renderReservationPageSectionHead(actions = '') {
  const ui = window.FandqiUI || null;
  if (ui?.renderSectionHead) {
    return ui.renderSectionHead({
      title: t('page.reservations'),
      text: t('reservation.pageDescription'),
      kicker: t('reservation.page.kicker'),
      kickerIcon: icon('calendar'),
      actions,
      className: 'reservations-central-head',
      attrs: { 'data-ui-component': 'reservations-page-head' }
    });
  }
  return `
    <div class="section-head reservations-central-head" data-ui-component="reservations-page-head">
      <div>
        <span class="fandqi-ui-section-kicker">${icon('calendar')}${h(t('reservation.page.kicker'))}</span>
        <h2>${h(t('page.reservations'))}</h2>
        <p class="helper">${h(t('reservation.pageDescription'))}</p>
      </div>
      <div class="fandqi-ui-section-actions ds-actions">${actions}</div>
    </div>
  `;
}

function renderReservationPageActions(disabled = false) {
  const ui = window.FandqiUI || null;
  const addButton = renderReservationAddButton(disabled);
  if (ui?.renderActions) {
    return ui.renderActions({
      children: addButton,
      className: 'reservation-page-actions',
      attrs: { 'data-ui-component': 'reservations-page-actions' }
    });
  }
  return `<div class="ds-actions reservation-page-actions" data-ui-component="reservations-page-actions">${addButton}</div>`;
}

function renderReservationField({ label, control, iconName = '', className = '', component = 'reservations-field' }) {
  const ui = window.FandqiUI || null;
  const labelHtml = `<span class="field-label">${iconName ? icon(iconName) : ''}${h(label)}</span>`;
  if (ui?.renderField) {
    return ui.renderField({
      labelHtml,
      control,
      className: ['reservation-central-field', className].filter(Boolean).join(' '),
      attrs: { 'data-ui-component': component }
    });
  }
  return `<div class="field reservation-central-field ${h(className)}" data-ui-component="${h(component)}">${labelHtml}${control}</div>`;
}

function renderReservationFilterPanel({ roomOptions, employeeOptions }) {
  const ui = window.FandqiUI || null;
  const body = `
    ${renderReservationField({
      label: t('reservation.filters.search'),
      iconName: 'search',
      className: 'field-search reservation-search-field',
      component: 'reservations-search-field',
      control: `<input class="input ds-control" id="reservationSearch" value="${h(state.reservationFilters.search)}" autocomplete="off">`
    })}
    ${renderReservationField({
      label: t('reservation.filters.status'),
      iconName: 'status',
      component: 'reservations-status-filter',
      control: `<select class="select ds-control" id="reservationStatusFilter"><option value="all" ${state.reservationFilters.status === 'all' ? 'selected' : ''}>${h(t('reservation.filters.all'))}</option>${RESERVATION_STATUSES.map(status => `<option value="${h(status)}" ${state.reservationFilters.status === status ? 'selected' : ''}>${h(getReservationStatusLabel(status))}</option>`).join('')}</select>`
    })}
    ${renderReservationField({
      label: t('reservation.filters.room'),
      iconName: 'building',
      component: 'reservations-room-filter',
      control: `<select class="select ds-control" id="reservationRoomFilter"><option value="all" ${state.reservationFilters.room === 'all' ? 'selected' : ''}>${h(t('reservation.filters.all'))}</option>${roomOptions.map(room => `<option value="${h(room.id)}" ${state.reservationFilters.room === room.id ? 'selected' : ''}>${h(getReservationRoomLabel(room))}</option>`).join('')}</select>`
    })}
    ${renderReservationField({
      label: t('reservation.filters.employee'),
      iconName: 'users',
      component: 'reservations-employee-filter',
      control: `<select class="select ds-control" id="reservationEmployeeFilter"><option value="all" ${(state.reservationFilters.employee || 'all') === 'all' ? 'selected' : ''}>${h(t('reservation.filters.all'))}</option>${employeeOptions.map(employee => `<option value="${h(employee.value)}" ${state.reservationFilters.employee === employee.value ? 'selected' : ''}>${h(employee.label)}</option>`).join('')}</select>`
    })}
  `;
  if (ui?.renderSurface) {
    return ui.renderSurface({
      tag: 'section',
      className: 'filters-bar compact-filters-bar reservations-filters-bar reservation-central-filter-panel',
      body,
      attrs: { 'data-ui-component': 'reservations-filter-panel' }
    });
  }
  return `<section class="filters-bar compact-filters-bar reservations-filters-bar reservation-central-filter-panel" data-ui-component="reservations-filter-panel">${body}</section>`;
}

function renderReservationNoRoomsWarning() {
  const ui = window.FandqiUI || null;
  if (ui?.renderEmptyState) {
    return ui.renderEmptyState({
      title: t('reservation.noRoomsTitle'),
      text: t('reservation.noRoomsText'),
      icon: icon('building'),
      className: 'reservation-warning reservation-warning-central'
    });
  }
  return `<div class="empty-panel reservation-warning reservation-warning-central"><div><h2>${h(t('reservation.noRoomsTitle'))}</h2><p>${h(t('reservation.noRoomsText'))}</p></div></div>`;
}

function renderReservationAddButton(disabled = false) {
  const ui = window.FandqiUI || null;
  if (ui?.renderButton) {
    return ui.renderButton({
      label: t('reservation.actions.add'),
      tone: 'primary',
      icon: icon('plus'),
      disabled,
      className: 'reservation-add-button',
      attrs: { id: 'addReservationBtn', 'data-ui-component': 'reservations-add-button' }
    });
  }
  return `<button class="btn primary reservation-add-button" type="button" id="addReservationBtn" data-ui-component="reservations-add-button" ${disabled ? 'disabled' : ''}>${icon('plus')}${h(t('reservation.actions.add'))}</button>`;
}

function getReservationVisualSummary(reservations) {
  return {
    total: reservations.length,
    pending: reservations.filter(reservation => reservation.status === 'pending').length,
    confirmed: reservations.filter(reservation => reservation.status === 'confirmed').length,
    active: reservations.filter(reservation => ['confirmed', 'checked_in'].includes(reservation.status)).length,
    revenue: reservations.reduce((sum, reservation) => sum + Number(reservation.totalAmount || 0), 0)
  };
}

function renderReservationSummaryStrip(summary, currency = 'USD') {
  const ui = window.FandqiUI || null;
  const items = [
    { key: 'total', iconName: 'calendar', label: t('reservation.cards.total'), note: t('reservation.cards.totalNote'), value: summary.total, tone: 'primary' },
    { key: 'pending', iconName: 'clock', label: t('reservation.cards.pending'), note: t('reservation.cards.pendingNote'), value: summary.pending, tone: 'warning' },
    { key: 'confirmed', iconName: 'checkCircle', label: t('reservation.cards.confirmed'), note: t('reservation.cards.confirmedNote'), value: summary.confirmed, tone: 'success' },
    { key: 'active', iconName: 'users', label: t('reservation.cards.activeStay'), note: t('reservation.cards.activeStayNote'), value: summary.active, tone: 'accent' },
    { key: 'revenue', iconName: 'creditCard', label: t('reservation.cards.revenue'), note: t('reservation.cards.revenueNote'), value: `${summary.revenue} ${currency}`, tone: 'luxury' }
  ];
  return `
    <section class="reservation-summary-grid ds-summary-grid" data-ui-component="reservations-summary-grid">
      ${items.map(item => {
        if (ui?.renderMetricCard) {
          return ui.renderMetricCard({
            tag: 'article',
            title: item.label,
            value: item.value,
            note: item.note,
            icon: icon(item.iconName),
            tone: item.tone,
            className: `reservation-summary-card reservation-summary-card--${item.key}`,
            attrs: { 'data-ui-component': 'reservations-summary-card', 'data-reservation-metric': item.key }
          });
        }
        return `
          <article class="reservation-summary-card reservation-summary-card--${h(item.key)} ds-card ds-summary-card" data-ui-component="reservations-summary-card" data-reservation-metric="${h(item.key)}">
            <div class="reservation-summary-icon">${icon(item.iconName)}</div>
            <div class="reservation-summary-content">
              <span class="reservation-summary-label">${h(item.label)}</span>
              <strong class="reservation-summary-value">${h(String(item.value))}</strong>
              <small class="reservation-summary-note">${h(item.note)}</small>
            </div>
          </article>
        `;
      }).join('')}
    </section>
  `;
}

function renderReservationsPage() {
  const hotel = getManagerHotel();
  if (!hotel) return renderManagerNoHotel();
  const rooms = getReservationRooms(hotel.id);
  const reservations = getFilteredReservations();
  const allReservations = getHotelReservations(hotel.id);
  const roomOptions = [...new Map(rooms.map(room => [room.id, room])).values()];
  const employeeOptions = getReservationEmployeeFilterOptions(hotel.id);
  const currency = readPlatformSettings().defaultCurrency || hotel.currency || 'USD';
  const summary = getReservationVisualSummary(allReservations);
  const actions = renderReservationPageActions(!rooms.length);
  return `
    <div class="hotels-page reservations-page reservation-central-page" data-ui-migrated="reservations" data-ui-centralized="phase100-reservations">
      ${renderReservationPageSectionHead(actions)}
      ${rooms.length ? '' : renderReservationNoRoomsWarning()}
      ${renderReservationSummaryStrip(summary, currency)}
      ${renderReservationFilterPanel({ roomOptions, employeeOptions })}
      <div id="reservationsTableSlot" class="reservations-cards-slot reservation-cards-slot-central" data-ui-component="reservations-list-slot">${renderReservationsTable(reservations)}</div>
      ${renderReservationModal()}
    </div>
  `;
}

function refreshReservationsTable() {
  const slot = document.getElementById('reservationsTableSlot');
  if (!slot) return;
  slot.innerHTML = renderReservationsTable(getFilteredReservations());
  applyCentralDesignSystem(slot);
  bindReservationRowActions();
}

function bindReservationRowActions() {
  document.querySelectorAll('[data-action="view-reservation"]').forEach(button => {
    button.addEventListener('click', () => openReservationModal('view', button.dataset.id));
  });
  document.querySelectorAll('[data-action="edit-reservation"]').forEach(button => {
    button.addEventListener('click', () => openReservationModal('edit', button.dataset.id));
  });
  document.querySelectorAll('[data-action="print-reservation"]').forEach(button => {
    button.addEventListener('click', () => printReservationReceipt(button.dataset.id));
  });
  document.querySelectorAll('[data-action="print-account-statement"]').forEach(button => {
    button.addEventListener('click', () => printReservationAccountStatement(button.dataset.id));
  });
  document.querySelectorAll('[data-action="confirm-reservation"]').forEach(button => {
    button.addEventListener('click', () => {
      const feature = reservationsFeature();
      if (feature?.actions?.confirm) {
        feature.actions.confirm(button.dataset.id);
      } else {
        const reservations = readReservations().map(reservation => reservation.id === button.dataset.id ? { ...reservation, status: 'confirmed', updatedAt: todayISO() } : reservation);
        writeReservations(reservations);
      }
      refreshReservationsTable();
    });
  });
  document.querySelectorAll('[data-action="cancel-reservation"]').forEach(button => {
    button.addEventListener('click', () => {
      const feature = reservationsFeature();
      if (feature?.actions?.cancel) {
        feature.actions.cancel(button.dataset.id, { updatedAt: todayISO() });
      } else {
        const reservations = readReservations().map(reservation => reservation.id === button.dataset.id ? { ...reservation, status: 'cancelled', updatedAt: todayISO() } : reservation);
        writeReservations(reservations);
      }
      refreshReservationsTable();
    });
  });
}

function bindReservationTotals() {
  const roomSelect = document.getElementById('reservationRoomSelect');
  const checkInInput = document.getElementById('reservationCheckInDate');
  const checkOutInput = document.getElementById('reservationCheckOutDate');
  const nightsInput = document.getElementById('reservationNights');
  const priceInput = document.getElementById('reservationRoomPrice');
  const totalInput = document.getElementById('reservationTotalAmount');
  const currencyInput = document.getElementById('reservationCurrency');
  const update = () => {
    if (!roomSelect || !checkInInput || !nightsInput) return;
    const nights = Math.max(1, Number(nightsInput.value || 1));
    nightsInput.value = nights;
    const checkOutDate = calculateSubscriptionEndDate(checkInInput.value, nights);
    if (checkOutInput) checkOutInput.value = checkOutDate;
    const room = getRoomById(roomSelect.value);
    const roomPrice = Number(room?.price || 0);
    if (priceInput) priceInput.value = roomPrice;
    if (totalInput) totalInput.value = roomPrice * nights;
    if (currencyInput) currencyInput.value = room?.currency || readPlatformSettings().defaultCurrency || 'USD';
  };
  [roomSelect, checkInInput, nightsInput].filter(Boolean).forEach(input => input.addEventListener('change', update));
  if (nightsInput) nightsInput.addEventListener('input', update);
  update();
}


function bindReservationGuestEmailField() {
  const checkbox = document.getElementById('guestNoEmailCheckbox');
  const input = document.getElementById('guestEmailInput');
  if (!checkbox || !input) return;
  const sync = () => {
    input.disabled = checkbox.checked;
    if (checkbox.checked) input.value = '';
  };
  checkbox.addEventListener('change', sync);
  sync();
}

function openReservationDocumentPreview(source, title = '') {
  if (!source) {
    toast(t('reservation.details.previewUnavailable'));
    return;
  }
  const url = typeof source === 'string' ? source : URL.createObjectURL(source);
  const safeTitle = h(title || t('reservation.actions.viewDocument'));
  const isPdf = (typeof source !== 'string' && source.type === 'application/pdf') || String(url).startsWith('data:application/pdf');
  const content = isPdf
    ? `<embed class="preview-pdf" src="${h(url)}" type="application/pdf">`
    : `<img class="preview-image" src="${h(url)}" alt="${safeTitle}">`;
  openRuntimePrintWindow(`<!doctype html><html><head><meta charset="utf-8"><title>${safeTitle}</title><style>body{font-family:Arial,Tahoma,sans-serif;margin:0;background:rgb(248 250 252);color:rgb(15 23 42)}header{padding:14px 18px;background:white;border-bottom:1px solid rgb(226 232 240);font-weight:800}.preview-pdf{width:100%;height:calc(100vh - 70px);border:0}.preview-image{max-width:100%;max-height:calc(100vh - 90px);display:block;margin:auto;object-fit:contain}</style></head><body><header>${safeTitle}</header>${content}</body></html>`, { width: 900, height: 700, popupMessage: t('reservation.receipt.popupBlocked') });
}

function getReservationDocumentPreviewSource(fileInputId, dataInputId) {
  const file = document.getElementById(fileInputId)?.files?.[0] || null;
  if (file) return file;
  return document.getElementById(dataInputId)?.value || '';
}

function bindReservationDocumentPreviewButtons() {
  const mainButton = document.getElementById('reservationViewDocumentBtn');
  if (mainButton) mainButton.addEventListener('click', () => openReservationDocumentPreview(getReservationDocumentPreviewSource('reservationDocumentFile', 'reservationDocumentDataUrl'), document.getElementById('reservationDocumentFileNameHidden')?.value || t('reservation.form.documentImage')));

  const familyButton = document.getElementById('reservationViewFamilyProofBtn');
  if (familyButton) familyButton.addEventListener('click', () => openReservationDocumentPreview(getReservationDocumentPreviewSource('reservationFamilyProofFile', 'reservationFamilyProofDataUrl'), document.getElementById('reservationFamilyProofFileNameHidden')?.value || t('reservation.familyProof.file')));
}

function refreshAdultCompanionDocumentRowsFromForm() {
  const slot = document.getElementById('adultCompanionDocumentRowsSlot');
  const adultCount = Number(document.getElementById('adultCompanionCount')?.value || 0);
  if (!slot) return;
  const existingRows = slot.querySelectorAll?.('[data-adult-document-card]').length || 0;
  const hasSelectedFiles = [...slot.querySelectorAll('input[type="file"]')].some(input => input.files?.length);
  if (existingRows === adultCount && hasSelectedFiles) return;
  const rows = getCurrentAdultCompanionRowsFromForm(Math.max(adultCount, existingRows));
  slot.innerHTML = renderAdultCompanionDocumentRows(rows, adultCount);
  applyCentralDesignSystem(slot);
  bindAdultCompanionDocumentEvents();
}

function bindAdultCompanionDocumentEvents() {
  document.querySelectorAll('[data-adult-document-file]').forEach(fileInput => {
    if (fileInput.dataset.boundAdultDocument === '1') return;
    fileInput.dataset.boundAdultDocument = '1';
    fileInput.addEventListener('change', () => {
      const index = fileInput.dataset.adultDocumentFile;
      const fileName = document.getElementById(`adultCompanion_${index}_documentFileName`);
      const hiddenName = document.getElementById(`adultCompanion_${index}_documentFileNameHidden`);
      const source = document.getElementById(`adultCompanion_${index}_documentSource`);
      const viewButton = document.querySelector(`[data-view-adult-document="${index}"]`);
      const file = fileInput.files?.[0] || null;
      if (fileName) fileName.textContent = file?.name || t('reservation.companions.noDocumentSelected');
      if (hiddenName && file?.name) hiddenName.value = file.name;
      if (source && file) source.value = 'upload';
      if (viewButton) viewButton.disabled = !file && !document.querySelector(`[name="adultCompanion_${index}_documentDataUrl"]`)?.value;
    });
  });

  document.querySelectorAll('[data-scan-adult-document]').forEach(button => {
    if (button.dataset.boundAdultScan === '1') return;
    button.dataset.boundAdultScan = '1';
    button.addEventListener('click', () => {
      const index = button.dataset.scanAdultDocument;
      const source = document.getElementById(`adultCompanion_${index}_documentSource`);
      if (source) source.value = 'scanner';
      toast(t('reservation.form.scannerHint'));
    });
  });

  document.querySelectorAll('[data-view-adult-document]').forEach(button => {
    if (button.dataset.boundAdultView === '1') return;
    button.dataset.boundAdultView = '1';
    button.addEventListener('click', () => {
      const index = button.dataset.viewAdultDocument;
      openReservationDocumentPreview(
        getReservationDocumentPreviewSource(`adultCompanion_${index}_documentFile`, `adultCompanion_${index}_documentDataUrl`),
        document.getElementById(`adultCompanion_${index}_documentFileNameHidden`)?.value || t('reservation.companions.documentImage')
      );
    });
  });
}

function bindReservationCompanionFields() {
  const form = document.getElementById('reservationForm');
  const toggle = document.getElementById('reservationHasCompanions');
  const panel = document.getElementById('reservationCompanionsPanel');
  const groupType = document.getElementById('companionGroupType');
  const adultCount = document.getElementById('adultCompanionCount');
  const childrenCount = document.getElementById('childrenCount');
  const guestsCount = document.getElementById('reservationGuestsCount');
  const rowsSlot = document.getElementById('adultCompanionRowsSlot');
  const childrenRelationshipField = document.getElementById('childrenRelationshipField');
  const familyProofBox = document.getElementById('reservationFamilyProofBox');
  const adultDocumentsBox = document.getElementById('adultCompanionDocumentsBox');
  const familyProofType = document.getElementById('reservationFamilyProofType');
  const familyNote = document.getElementById('reservationFamilyBookNote');
  if (!toggle || !panel) return;

  let lastAdultCount = Number(adultCount?.value || 0);

  const syncGuests = () => {
    const count = getReservationGuestCount(toggle.checked, adultCount?.value || 0, childrenCount?.value || 0);
    if (guestsCount) guestsCount.value = count;
  };

  const syncFamilyDocument = () => {
    const isRequired = getReservationFormFamilyProofRequired(form);
    if (familyProofBox) familyProofBox.classList.toggle('hidden', !isRequired);
    if (familyProofType && isRequired && groupType?.value === 'family') familyProofType.value = 'family_book';
    if (familyNote) familyNote.classList.toggle('hidden', !isRequired);
  };

  const renderRowsIfNeeded = force => {
    const count = Number(adultCount?.value || 0);
    if (adultDocumentsBox) {
      adultDocumentsBox.classList.toggle('hidden', !toggle.checked || count === 0);
      const badge = adultDocumentsBox.querySelector('.document-accordion-summary em');
      if (badge) badge.textContent = String(count);
    }
    const existingRows = rowsSlot?.querySelectorAll?.('[data-adult-companion-row]').length || 0;
    if (!rowsSlot) return;
    if (force || existingRows !== count) {
      const rows = getCurrentAdultCompanionRowsFromForm(Math.max(count, existingRows));
      rowsSlot.innerHTML = renderAdultCompanionRows(rows, count);
      applyCentralDesignSystem(rowsSlot);
      const docsSlot = document.getElementById('adultCompanionDocumentRowsSlot');
      if (docsSlot) {
        docsSlot.innerHTML = renderAdultCompanionDocumentRows(rows, count);
        applyCentralDesignSystem(docsSlot);
        bindAdultCompanionDocumentEvents();
      }
    }
    lastAdultCount = count;
  };

  const syncPanel = (options = {}) => {
    panel.classList.toggle('hidden', !toggle.checked);
    if (!toggle.checked) {
      syncGuests();
      syncFamilyDocument();
      const docsSlot = document.getElementById('adultCompanionDocumentRowsSlot');
      if (adultDocumentsBox) adultDocumentsBox.classList.add('hidden');
      if (docsSlot) {
        docsSlot.innerHTML = renderAdultCompanionDocumentRows([], 0);
        applyCentralDesignSystem(docsSlot);
      }
      return;
    }
    renderRowsIfNeeded(Boolean(options.forceRows));
    if (childrenRelationshipField) childrenRelationshipField.classList.toggle('hidden', Number(childrenCount?.value || 0) === 0);
    syncGuests();
    syncFamilyDocument();
  };

  toggle.addEventListener('change', () => syncPanel());
  if (adultCount) adultCount.addEventListener('change', () => syncPanel({ forceRows: Number(adultCount.value || 0) !== lastAdultCount }));
  if (childrenCount) childrenCount.addEventListener('change', () => syncPanel());
  if (groupType) groupType.addEventListener('change', () => syncPanel());
  if (panel) {
    panel.addEventListener('change', event => {
      const name = event.target?.name || '';
      if (name.endsWith('_relationship') || name === 'childrenRelationship') syncFamilyDocument();
    });
    panel.addEventListener('input', event => {
      const name = event.target?.name || '';
      if (name.startsWith('adultCompanion_')) {
        // Document titles are refreshed when moving from companions to the documents step.
      }
    });
  }
  syncPanel();
}

function bindReservationDocumentFields() {
  const fileInput = document.getElementById('reservationDocumentFile');
  const fileName = document.getElementById('reservationDocumentFileName');
  const hiddenName = document.getElementById('reservationDocumentFileNameHidden');
  const source = document.getElementById('reservationDocumentSource');
  const viewButton = document.getElementById('reservationViewDocumentBtn');
  if (fileInput) fileInput.addEventListener('change', () => {
    const name = fileInput.files?.[0]?.name || t('reservation.form.noDocumentSelected');
    if (fileName) fileName.textContent = name;
    if (hiddenName && fileInput.files?.[0]?.name) hiddenName.value = fileInput.files[0].name;
    if (source && fileInput.files?.[0]) source.value = 'upload';
    if (viewButton) viewButton.disabled = !fileInput.files?.[0] && !document.getElementById('reservationDocumentDataUrl')?.value;
  });

  const familyProofFile = document.getElementById('reservationFamilyProofFile');
  const familyProofFileName = document.getElementById('reservationFamilyProofFileName');
  const familyProofHiddenName = document.getElementById('reservationFamilyProofFileNameHidden');
  const familyProofSource = document.getElementById('reservationFamilyProofSource');
  const familyViewButton = document.getElementById('reservationViewFamilyProofBtn');
  if (familyProofFile) familyProofFile.addEventListener('change', () => {
    const name = familyProofFile.files?.[0]?.name || t('reservation.familyProof.noFile');
    if (familyProofFileName) familyProofFileName.textContent = name;
    if (familyProofHiddenName && familyProofFile.files?.[0]?.name) familyProofHiddenName.value = familyProofFile.files[0].name;
    if (familyProofSource && familyProofFile.files?.[0]) familyProofSource.value = 'upload';
    if (familyViewButton) familyViewButton.disabled = !familyProofFile.files?.[0] && !document.getElementById('reservationFamilyProofDataUrl')?.value;
  });

  const familyProofType = document.getElementById('reservationFamilyProofType');
  const groupType = document.getElementById('companionGroupType');
  if (familyProofType) familyProofType.addEventListener('change', () => {
    if (groupType?.value === 'family' && familyProofType.value !== 'family_book') {
      familyProofType.value = 'family_book';
      toast(t('reservation.companions.familyBookRequired'));
    }
  });

  const scanButton = document.getElementById('reservationScanDocumentBtn');
  if (scanButton) scanButton.addEventListener('click', () => {
    if (source) source.value = 'scanner';
    toast(t('reservation.form.scannerHint'));
  });

  const scanFamilyButton = document.getElementById('reservationScanFamilyProofBtn');
  if (scanFamilyButton) scanFamilyButton.addEventListener('click', () => {
    if (familyProofSource) familyProofSource.value = 'scanner';
    toast(t('reservation.form.scannerHint'));
  });

  bindReservationDocumentPreviewButtons();
  bindAdultCompanionDocumentEvents();
}

function getReservationStepName(step) {
  const map = { 1: 'guest', 2: 'companions', 3: 'documents', 4: 'booking' };
  return t(`reservation.wizard.steps.${map[Number(step)] || 'guest'}`);
}

function getReservationFieldLabel(field) {
  const label = field?.closest('.field')?.querySelector('.field-label span:last-child, label');
  return label?.textContent?.trim() || field?.getAttribute('name') || t('reservation.validation.field');
}

function clearReservationValidationWarning() {
  const alert = document.getElementById('reservationValidationAlert');
  if (!alert) return;
  alert.classList.add('hidden');
  alert.innerHTML = '';
}

function showReservationValidationWarning(step, message, focusSelector = '') {
  showReservationStep(step);
  const alert = document.getElementById('reservationValidationAlert');
  const stepName = getReservationStepName(step);
  const title = t('reservation.validation.title');
  const text = `${t('reservation.validation.stepPrefix')} ${stepName}: ${message}`;
  if (alert) {
    alert.classList.remove('hidden');
    alert.innerHTML = `<strong>${h(title)}</strong><span>${h(text)}</span>`;
    alert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  if (focusSelector) {
    const field = document.querySelector(focusSelector);
    const details = field?.closest?.('details');
    if (details) details.open = true;
    if (field && typeof field.focus === 'function') setTimeout(() => field.focus(), 80);
  }
  toast(`${title}: ${text}`);
}

function validateVisibleReservationStep(step) {
  const form = document.getElementById('reservationForm');
  if (!form) return true;
  const panel = form.querySelector(`[data-step-panel="${step}"]`);
  if (!panel) return true;
  const fields = [...panel.querySelectorAll('input, select, textarea')].filter(el => !el.disabled && el.type !== 'hidden' && el.offsetParent !== null);
  for (const field of fields) {
    if (!field.checkValidity()) {
      const label = getReservationFieldLabel(field);
      showReservationValidationWarning(step, `${t('reservation.validation.requiredField')} ${label}`, `[name="${field.name}"]`);
      return false;
    }
  }
  clearReservationValidationWarning();
  return true;
}

function validateReservationBeforeSave(form, data) {
  const requiredStepOne = [
    ['nationalId', 'reservation.form.nationalId'],
    ['guestFirstName', 'reservation.form.guestFirstName'],
    ['guestLastName', 'reservation.form.guestLastName'],
    ['guestPhone', 'reservation.form.guestPhone']
  ];
  for (const [name, labelKey] of requiredStepOne) {
    if (!String(data[name] || '').trim()) return { step: 1, message: `${t('reservation.validation.requiredField')} ${t(labelKey)}`, selector: `[name="${name}"]` };
  }

  const documentFile = document.getElementById('reservationDocumentFile')?.files?.[0] || null;
  if (!documentFile && !String(data.documentFileName || '').trim() && !String(data.documentDataUrl || '').trim()) {
    return { step: 3, message: t('reservation.form.documentRequired'), selector: '#reservationDocumentFile' };
  }

  const hasCompanions = data.hasCompanions === 'on';
  if (hasCompanions) {
    const adultCount = Number(data.adultCompanionCount || 0);
    const childrenCount = Number(data.childrenCount || 0);
    if (!adultCount && !childrenCount) return { step: 2, message: t('reservation.validation.companionsEmpty'), selector: '#adultCompanionCount' };
    for (let index = 0; index < adultCount; index += 1) {
      const fields = [
        [`adultCompanion_${index}_nationalId`, 'reservation.form.nationalId'],
        [`adultCompanion_${index}_firstName`, 'reservation.form.guestFirstName'],
        [`adultCompanion_${index}_lastName`, 'reservation.form.guestLastName'],
        [`adultCompanion_${index}_fatherName`, 'reservation.form.fatherName'],
        [`adultCompanion_${index}_motherName`, 'reservation.form.motherName'],
        [`adultCompanion_${index}_birthDate`, 'reservation.form.birthDate'],
        [`adultCompanion_${index}_relationship`, 'reservation.companions.relationship']
      ];
      for (const [name, labelKey] of fields) {
        if (!String(data[name] || '').trim()) {
          return { step: 2, message: `${t('reservation.validation.adultCompanionPrefix')} ${index + 1}: ${t('reservation.validation.requiredField')} ${t(labelKey)}`, selector: `[name="${name}"]` };
        }
      }
      const adultFile = document.getElementById(`adultCompanion_${index}_documentFile`)?.files?.[0] || null;
      if (!adultFile && !String(data[`adultCompanion_${index}_documentFileName`] || '').trim() && !String(data[`adultCompanion_${index}_documentDataUrl`] || '').trim()) {
        return { step: 3, message: `${t('reservation.companions.documentRequired')} ${index + 1}`, selector: `#adultCompanion_${index}_documentFile` };
      }
    }
    if (childrenCount > 0 && !String(data.childrenRelationship || '').trim()) {
      return { step: 2, message: `${t('reservation.validation.requiredField')} ${t('reservation.companions.childrenRelationship')}`, selector: '[name="childrenRelationship"]' };
    }
    const familyProofRequired = getReservationFormFamilyProofRequired(form);
    const familyProofFile = document.getElementById('reservationFamilyProofFile')?.files?.[0] || null;
    if (familyProofRequired && !familyProofFile && !String(data.familyProofFileName || '').trim() && !String(data.familyProofDataUrl || '').trim()) {
      return { step: 3, message: t('reservation.familyProof.required'), selector: '#reservationFamilyProofFile' };
    }
  }

  const requiredStepFour = [
    ['roomId', 'reservation.form.room'],
    ['checkInDate', 'reservation.form.checkInDate'],
    ['nights', 'reservation.form.nights'],
    ['status', 'reservation.form.status'],
    ['source', 'reservation.form.source']
  ];
  for (const [name, labelKey] of requiredStepFour) {
    if (!String(data[name] || '').trim()) return { step: 4, message: `${t('reservation.validation.requiredField')} ${t(labelKey)}`, selector: `[name="${name}"]` };
  }
  if (Number(data.nights || 0) < 1) return { step: 4, message: t('reservation.validation.invalidNights'), selector: '[name="nights"]' };
  const editingId = form?.dataset?.id || '';
  const validatedCheckOutDate = calculateSubscriptionEndDate(data.checkInDate, Number(data.nights || 1));
  if (isRoomReservedByActiveReservation(data.roomId, editingId, data.checkInDate, validatedCheckOutDate)) return { step: 4, message: t('reservation.validation.roomAlreadyReserved'), selector: '[name="roomId"]' };
  return null;
}

function bindReservationWizard() {
  const form = document.getElementById('reservationForm');
  if (!form) return;
  const panels = [...form.querySelectorAll('[data-step-panel]')];
  const tabs = [...form.querySelectorAll('[data-step-target]')];
  const prevBtn = document.getElementById('reservationPrevStepBtn');
  const nextBtn = document.getElementById('reservationNextStepBtn');
  const submitBtn = document.getElementById('reservationSubmitBtn');
  const totalSteps = panels.length || 1;

  const validateStep = step => validateVisibleReservationStep(step);

  const setStep = step => {
    const previousStep = Number(form.dataset.currentStep || 1);
    const currentStep = Math.max(1, Math.min(totalSteps, Number(step) || 1));
    if (currentStep === 3 && previousStep <= 2) refreshAdultCompanionDocumentRowsFromForm();
    showReservationStep(currentStep);
  };

  tabs.forEach(tab => tab.addEventListener('click', () => {
    const target = Number(tab.dataset.stepTarget || 1);
    const current = Number(form.dataset.currentStep || 1);
    if (target > current && !validateStep(current)) return;
    setStep(target);
  }));

  if (prevBtn) prevBtn.addEventListener('click', () => setStep(Number(form.dataset.currentStep || 1) - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => {
    const current = Number(form.dataset.currentStep || 1);
    if (!validateStep(current)) return;
    setStep(current + 1);
  });

  setStep(Number(form.dataset.currentStep || 1));
}

function bindReservationsEvents() {
  const addButton = document.getElementById('addReservationBtn');
  if (addButton) addButton.addEventListener('click', () => openReservationModal('add'));

  const searchInput = document.getElementById('reservationSearch');
  if (searchInput) searchInput.addEventListener('input', event => {
    state.reservationFilters.search = event.target.value;
    refreshReservationsTable();
  });

  const statusFilter = document.getElementById('reservationStatusFilter');
  if (statusFilter) statusFilter.addEventListener('change', event => {
    state.reservationFilters.status = event.target.value;
    refreshReservationsTable();
  });

  const roomFilter = document.getElementById('reservationRoomFilter');
  if (roomFilter) roomFilter.addEventListener('change', event => {
    state.reservationFilters.room = event.target.value;
    refreshReservationsTable();
  });

  const employeeFilter = document.getElementById('reservationEmployeeFilter');
  if (employeeFilter) employeeFilter.addEventListener('change', event => {
    state.reservationFilters.employee = event.target.value;
    refreshReservationsTable();
  });

  bindReservationRowActions();

  document.querySelectorAll('[data-action="close-reservation-modal"]').forEach(button => {
    button.addEventListener('click', closeReservationModal);
  });

  bindReservationTotals();
  bindReservationGuestEmailField();
  bindReservationCompanionFields();
  bindReservationDocumentFields();
  bindReservationWizard();
  bindReservationDetailTabs();
  bindReservationDetailDocumentActions();

  const form = document.getElementById('reservationForm');
  if (form) form.addEventListener('submit', async event => {
    event.preventDefault();
    try {
      const hotel = getManagerHotel();
      if (!hotel) return;
    const data = Object.fromEntries(new FormData(form).entries());
    const validationError = validateReservationBeforeSave(form, data);
    if (validationError) {
      showReservationValidationWarning(validationError.step, validationError.message, validationError.selector);
      return;
    }
    clearReservationValidationWarning();
    const documentFile = document.getElementById('reservationDocumentFile')?.files?.[0] || null;
    const documentDataUrl = documentFile ? await readReservationFileAsDataUrl(documentFile) : (data.documentDataUrl || '');
    const documentFileName = documentFile?.name || data.documentFileName || '';
    if (!documentFileName && !documentDataUrl) {
      showReservationValidationWarning(3, t('reservation.form.documentRequired'), '#reservationDocumentFile');
      return;
    }
    const familyProofFile = document.getElementById('reservationFamilyProofFile')?.files?.[0] || null;
    const familyProofDataUrl = familyProofFile ? await readReservationFileAsDataUrl(familyProofFile) : (data.familyProofDataUrl || '');
    const familyProofFileName = familyProofFile?.name || data.familyProofFileName || '';
    const hasCompanions = data.hasCompanions === 'on';
    const companionGroupType = hasCompanions ? (data.companionGroupType || 'companions') : 'none';
    const adultCompanionCount = hasCompanions ? Number(data.adultCompanionCount || 0) : 0;
    const childrenCount = hasCompanions ? Number(data.childrenCount || 0) : 0;
    const adultCompanions = await collectAdultCompanionsWithDocuments(data, adultCompanionCount);
    const missingAdultDocumentIndex = findMissingAdultCompanionDocumentIndex(adultCompanions, adultCompanionCount);
    if (missingAdultDocumentIndex >= 0) {
      showReservationValidationWarning(3, `${t('reservation.companions.documentRequired')} ${missingAdultDocumentIndex + 1}`, `#adultCompanion_${missingAdultDocumentIndex}_documentFile`);
      return;
    }
    const familyProofRequired = getReservationFormFamilyProofRequired(form);
    if (familyProofRequired && (!familyProofFileName && !familyProofDataUrl)) {
      showReservationValidationWarning(3, t('reservation.familyProof.required'), '#reservationFamilyProofFile');
      return;
    }
    const calculatedGuestsCount = getReservationGuestCount(hasCompanions, adultCompanionCount, childrenCount);
    const nights = Math.max(1, Number(data.nights || 1));
    const checkOutDate = calculateSubscriptionEndDate(data.checkInDate, nights);
    const totals = getReservationTotals(data.roomId, data.checkInDate, checkOutDate);
    const reservations = readReservations();
    const mode = form.dataset.mode;
    const id = form.dataset.id;
    const existingReservation = id ? reservations.find(reservation => reservation.id === id) : null;
    const actingEmployee = getCurrentReservationEmployee();
    const payload = {
      hotelId: hotel.id,
      reservationNo: data.reservationNo || getNextReservationNumber(hotel.id),
      nationalId: data.nationalId,
      guestFirstName: data.guestFirstName,
      guestLastName: data.guestLastName,
      guestName: [data.guestFirstName, data.guestLastName].filter(Boolean).join(' ').trim(),
      fatherName: data.fatherName,
      motherName: data.motherName,
      birthDate: data.birthDate,
      documentType: data.documentType || 'national_id',
      documentFileName,
      documentDataUrl,
      documentSource: data.documentSource || (documentFile ? 'upload' : ''),
      familyProofRequired,
      familyProofType: familyProofRequired ? (companionGroupType === 'family' ? 'family_book' : (data.familyProofType || 'family_book')) : '',
      familyProofFileName,
      familyProofDataUrl,
      familyProofSource: data.familyProofSource || (familyProofFile ? 'upload' : ''),
      hasCompanions,
      companionGroupType,
      adultCompanionCount,
      adultCompanions,
      childrenCount,
      childrenRelationship: childrenCount > 0 ? data.childrenRelationship : '',
      guestPhone: data.guestPhone,
      guestNoEmail: data.guestNoEmail === 'on',
      guestEmail: data.guestNoEmail === 'on' ? '' : data.guestEmail,
      roomId: data.roomId,
      guestsCount: calculatedGuestsCount,
      checkInDate: data.checkInDate,
      checkOutDate,
      nights,
      roomPrice: totals.roomPrice,
      totalAmount: totals.totalAmount,
      paidAmount: Number(data.paidAmount || 0),
      currency: totals.currency,
      status: data.status || 'pending',
      source: data.source || 'direct',
      bookingEmployeeId: existingReservation?.bookingEmployeeId || actingEmployee.id || '',
      bookingEmployeeName: existingReservation?.bookingEmployeeName || actingEmployee.name || '',
      bookingEmployeeEmail: existingReservation?.bookingEmployeeEmail || actingEmployee.email || '',
      bookingEmployeeRole: existingReservation?.bookingEmployeeRole || actingEmployee.roleLabel || '',
      bookingEmployeeShift: existingReservation?.bookingEmployeeShift || actingEmployee.shiftLabel || '',
      lastEditedByName: mode === 'edit' ? actingEmployee.name || '' : '',
      lastEditedByRole: mode === 'edit' ? actingEmployee.roleLabel || '' : '',
      notes: data.notes,
      updatedAt: todayISO()
    };
    let savedId = id;
    if (mode === 'add') {
      savedId = createId('reservation');
      reservations.push({ id: savedId, ...payload, createdAt: todayISO() });
    } else {
      const index = reservations.findIndex(reservation => reservation.id === id);
      if (index >= 0) reservations[index] = { ...reservations[index], ...payload };
    }
    writeReservations(reservations);
    state.reservationModal = { mode: 'success', id: savedId };
    render();
    toast(t('reservation.success.title'));
    } catch (error) {
      console.error('Reservation save failed', error);
      showReservationValidationWarning(Number(form.dataset.currentStep || 4), t('reservation.validation.saveFailed'), '');
    }
  });
}


