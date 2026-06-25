function openReservationModal(mode, id = null) {
  state.reservationModal = mode === 'view' ? { mode, id, section: 'overview' } : { mode, id };
  render();
}

function reservationUi() {
  return window.FandqiUI || null;
}

function renderReservationButton({ action, id = '', label = '', tone = 'ghost', iconName = '' }) {
  const ui = reservationUi();
  if (ui?.renderButton) {
    return ui.renderButton({
      label,
      tone,
      size: 'small',
      action,
      icon: iconName ? icon(iconName) : '',
      attrs: id ? { 'data-id': id } : {}
    });
  }
  return `<button class="btn small ${h(tone)}" type="button" data-action="${h(action)}"${id ? ` data-id="${h(id)}"` : ''}>${iconName ? icon(iconName) : ''}${h(label)}</button>`;
}

function renderReservationBadge(status) {
  const safeStatus = status || 'pending';
  const label = getReservationStatusLabel(safeStatus);
  const ui = reservationUi();
  if (ui?.renderBadge) {
    return ui.renderBadge({ label, status: safeStatus, attrs: { 'data-reservation-status': safeStatus } });
  }
  return `<span class="status-badge ${h(safeStatus)}" data-reservation-status="${h(safeStatus)}">${h(label)}</span>`;
}

function renderReservationEmptyState() {
  const ui = reservationUi();
  if (ui?.renderEmptyState) {
    return ui.renderEmptyState({
      title: t('reservation.emptyTitle'),
      text: t('reservation.emptyText'),
      icon: icon('calendar'),
      className: 'hotels-empty reservations-empty'
    });
  }
  return `
    <div class="empty-panel hotels-empty reservations-empty">
      <div>
        <h2>${h(t('reservation.emptyTitle'))}</h2>
        <p>${h(t('reservation.emptyText'))}</p>
      </div>
    </div>
  `;
}

function renderReservationActionButtons(reservation) {
  const status = reservation.status || 'pending';
  const actions = [
    renderReservationButton({ action: 'view-reservation', id: reservation.id, label: t('reservation.actions.view'), tone: 'accent', iconName: 'eye' }),
    renderReservationButton({ action: 'print-reservation', id: reservation.id, label: t('reservation.actions.print'), tone: 'luxury', iconName: 'print' }),
    renderReservationButton({ action: 'edit-reservation', id: reservation.id, label: t('reservation.actions.edit'), tone: 'success', iconName: 'edit' })
  ];
  if (status === 'pending') {
    actions.push(renderReservationButton({ action: 'confirm-reservation', id: reservation.id, label: t('reservation.actions.confirm'), tone: 'primary', iconName: 'checkCircle' }));
    actions.push(renderReservationButton({ action: 'cancel-reservation', id: reservation.id, label: t('reservation.actions.cancel'), tone: 'danger', iconName: 'x' }));
  }
  return actions.join('');
}

function renderReservationActionsRow(reservation) {
  const ui = reservationUi();
  const children = renderReservationActionButtons(reservation);
  if (ui?.renderActions) {
    return ui.renderActions({
      children,
      className: 'reservation-card-actions row-actions reservation-card-actions--central',
      attrs: { 'data-ui-component': 'reservation-card-actions' }
    });
  }
  return `<div class="reservation-card-actions row-actions reservation-card-actions--central" data-ui-component="reservation-card-actions">${children}</div>`;
}

function renderReservationMetaItem(iconName, text) {
  return `<div class="reservation-meta-item ds-meta-item" data-ui-component="reservation-meta-item">${icon(iconName)}<span>${h(text || '-')}</span></div>`;
}

function renderReservationStatBox({ label, value, note }) {
  return `
    <div class="reservation-stat-box ds-meta-item" data-ui-component="reservation-stat-box">
      <span>${h(label)}</span>
      <strong>${h(String(value ?? '-'))}</strong>
      ${note ? `<small>${h(note)}</small>` : ''}
    </div>
  `;
}

function renderReservationCard(reservation) {
  const ui = reservationUi();
  const room = getRoomById(reservation.roomId);
  const companionsCount = Number(reservation.adultCompanionCount || 0) + Number(reservation.childrenCount || 0);
  const totalGuests = Number(reservation.guestsCount || 1);
  const guestName = getReservationGuestDisplayName(reservation);
  const roomAccountCharges = getReservationRoomAccountOrdersTotal(reservation.id);
  const reservationFinancialTotal = getReservationFinancialTotal(reservation);
  const amountDue = getReservationAmountDue(reservation);
  const status = reservation.status || 'pending';
  const body = `
    <div class="reservation-card-top" data-ui-component="reservation-card-head">
      <div class="reservation-card-title-wrap">
        <div class="reservation-card-icon reservation-card-icon--${h(status)}">${icon('calendar')}</div>
        <div>
          <span class="reservation-number-chip">${h(t('reservation.columns.number'))}: ${h(reservation.reservationNo || '-')}</span>
          <h3>${h(guestName)}</h3>
          <p>${h(reservation.nationalId || reservation.guestPhone || '-')}</p>
        </div>
      </div>
      ${renderReservationBadge(status)}
    </div>

    <div class="reservation-meta-grid ds-meta-grid" data-ui-component="reservation-meta-grid">
      ${renderReservationMetaItem('building', getReservationRoomLabel(room))}
      ${renderReservationMetaItem('messageSquare', getReservationSourceLabel(reservation.source || 'direct'))}
      ${renderReservationMetaItem('user', getReservationBookingEmployeeSummary(reservation))}
      ${renderReservationMetaItem('calendar', `${reservation.checkInDate || '-'} → ${reservation.checkOutDate || '-'}`)}
      ${renderReservationMetaItem('clock', `${String(reservation.nights || 1)} ${t('reservation.units.nights')}`)}
    </div>

    <div class="reservation-stats-row ds-meta-grid" data-ui-component="reservation-stats-row">
      ${renderReservationStatBox({
        label: t('reservation.cards.guests'),
        value: totalGuests,
        note: `${t('reservation.cards.companions')}: ${companionsCount}`
      })}
      ${renderReservationStatBox({
        label: t('reservation.columns.amount'),
        value: `${reservationFinancialTotal || 0} ${reservation.currency || ''}`,
        note: `${t('reservation.columns.paid')}: ${reservation.paidAmount || 0}${roomAccountCharges ? ` • ${t('foodServices.finance.roomCharges')}: ${roomAccountCharges}` : ''}`
      })}
      ${renderReservationStatBox({
        label: t('reservation.cards.remaining'),
        value: `${amountDue} ${reservation.currency || ''}`,
        note: `${t('reservation.cards.lastUpdate')}: ${reservation.updatedAt || reservation.createdAt || '-'}`
      })}
    </div>

    ${reservation.notes ? `<p class="reservation-card-note" data-ui-component="reservation-card-note">${h(reservation.notes)}</p>` : `<p class="reservation-card-note reservation-card-note--muted" data-ui-component="reservation-card-note">${h(t('reservation.cards.noNotes'))}</p>`}

    ${renderReservationActionsRow(reservation)}
  `;
  const attrs = { 'data-ui-migrated': 'reservation-card', 'data-ui-component': 'reservation-card', 'data-reservation-status': status };
  if (ui?.renderSurface) {
    return ui.renderSurface({
      tag: 'article',
      className: `reservation-card reservation-card--${status}`,
      body,
      attrs
    });
  }
  return `<article class="reservation-card reservation-card--${h(status)} ds-card" data-ui-migrated="reservation-card" data-ui-component="reservation-card" data-reservation-status="${h(status)}">${body}</article>`;
}

function closeReservationModal() {
  state.reservationModal = null;
  render();
}

function renderReservationsTable(reservations) {
  if (!reservations.length) {
    return renderReservationEmptyState();
  }
  const sortedReservations = reservationsFeature()?.selectors?.sortReservationsByNewest ? reservationsFeature().selectors.sortReservationsByNewest(reservations) : [...reservations].sort((a, b) => String(b.checkInDate || '').localeCompare(String(a.checkInDate || '')) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  return `
    <div class="reservation-cards-grid reservation-cards-grid--central" data-ui-migrated="reservations-list" data-ui-component="reservations-list">
      ${sortedReservations.map(renderReservationCard).join('')}
    </div>
  `;
}

function renderReservationFormModal(mode, reservation) {
  const hotel = getManagerHotel();
  if (!hotel) return '';
  const rooms = getReservationRooms(hotel.id, { includeReservationId: reservation?.id || '' });
  const isEdit = mode === 'edit';
  const firstRoom = rooms[0] || null;
  const today = todayISO();
  const tomorrow = calculateSubscriptionEndDate(today, 1);
  const current = reservation || {
    reservationNo: getNextReservationNumber(hotel.id),
    roomId: firstRoom?.id || '',
    status: 'pending',
    source: 'direct',
    checkInDate: today,
    checkOutDate: tomorrow,
    guestsCount: 1,
    paidAmount: 0
  };
  const legacyNameParts = String(current.guestName || '').trim().split(/\s+/).filter(Boolean);
  const guestFirstName = current.guestFirstName || legacyNameParts[0] || '';
  const guestLastName = current.guestLastName || legacyNameParts.slice(1).join(' ') || '';
  const totals = getReservationTotals(current.roomId, current.checkInDate, current.checkOutDate);
  const roomOptions = [...rooms];
  if (current.roomId && !roomOptions.some(room => room.id === current.roomId)) {
    const selectedRoom = getRoomById(current.roomId);
    if (selectedRoom) roomOptions.unshift(selectedRoom);
  }
  const companionAdults = Number(current.adultCompanionCount || current.adultCompanions?.length || 0);
  const companionChildren = Number(current.childrenCount || 0);
  const companionGroupType = current.companionGroupType || (current.documentType === 'family_book' ? 'family' : 'companions');
  const initialGuestsCount = getReservationGuestCount(Boolean(current.hasCompanions), companionAdults, companionChildren);
  const initialNights = Number(current.nights || calculateNights(current.checkInDate || today, current.checkOutDate || tomorrow) || 1);
  const initialCheckOutDate = calculateSubscriptionEndDate(current.checkInDate || today, initialNights);
  const currentEmployeeInfo = getCurrentReservationEmployee();
  const bookingEmployeeInfo = isEdit && current.bookingEmployeeName ? {
    name: current.bookingEmployeeName,
    roleLabel: current.bookingEmployeeRole || '',
    shiftLabel: current.bookingEmployeeShift || '',
    photoDataUrl: currentEmployeeInfo.photoDataUrl || ''
  } : currentEmployeeInfo;
  const steps = [
    { id: 1, label: t('reservation.wizard.steps.guest') },
    { id: 2, label: t('reservation.wizard.steps.companions') },
    { id: 3, label: t('reservation.wizard.steps.documents') },
    { id: 4, label: t('reservation.wizard.steps.booking') }
  ];
  return `
    <div class="modal-backdrop reservation-modal-backdrop" role="dialog" aria-modal="true" data-ui-component="reservation-modal-backdrop">
      <form class="modal-card compact-modal-card reservation-wizard-modal reservation-central-modal" data-ui-component="reservation-form-modal" id="reservationForm" data-mode="${h(mode)}" data-id="${h(current.id || '')}" data-current-step="1" novalidate>
        <div class="modal-head">
          <h2>${h(isEdit ? t('reservation.modal.editTitle') : t('reservation.modal.addTitle'))}</h2>
          <button class="icon-btn" type="button" data-action="close-reservation-modal">${icon('x')}</button>
        </div>

        <div class="reservation-steps-nav" id="reservationStepsNav">
          ${steps.map(step => `
            <button class="reservation-step-tab ${step.id === 1 ? 'active' : ''}" type="button" data-step-target="${step.id}">
              <span class="reservation-step-index">${step.id}</span>
              <span class="reservation-step-text">${h(step.label)}</span>
            </button>
          `).join('')}
        </div>

        <div class="reservation-validation-alert hidden" id="reservationValidationAlert" role="alert" aria-live="polite"></div>

        <section class="reservation-step-panel" data-step-panel="1">
          <div class="form-section-title">${h(t('reservation.form.guestIdentity'))}</div>
          <div class="modal-grid compact-modal-grid reservation-form-grid">
            <div class="field">${fieldLabel('fileText', h(t('reservation.form.nationalId')))}<input class="input" name="nationalId" value="${h(current.nationalId || '')}" required></div>
            <div class="field">${fieldLabel('user', h(t('reservation.form.guestFirstName')))}<input class="input" name="guestFirstName" value="${h(guestFirstName)}" required></div>
            <div class="field">${fieldLabel('user', h(t('reservation.form.guestLastName')))}<input class="input" name="guestLastName" value="${h(guestLastName)}" required></div>
            <div class="field">${fieldLabel('user', h(t('reservation.form.fatherName')))}<input class="input" name="fatherName" value="${h(current.fatherName || '')}"></div>
            <div class="field">${fieldLabel('user', h(t('reservation.form.motherName')))}<input class="input" name="motherName" value="${h(current.motherName || '')}"></div>
            <div class="field">${fieldLabel('calendar', h(t('reservation.form.birthDate')))}<input class="input" type="date" name="birthDate" value="${h(current.birthDate || '')}"></div>
            <div class="field">${fieldLabel('phone', h(t('reservation.form.guestPhone')))}<input class="input" name="guestPhone" value="${h(current.guestPhone || '')}" required></div>
            <div class="field" id="guestEmailField">${fieldLabel('mail', h(t('reservation.form.guestEmail')))}<input class="input" type="email" name="guestEmail" id="guestEmailInput" value="${h(current.guestEmail || '')}" ${current.guestNoEmail ? 'disabled' : ''}></div>
            <label class="check-row settings-check reservation-no-email">
              <input type="checkbox" name="guestNoEmail" id="guestNoEmailCheckbox" ${current.guestNoEmail ? 'checked' : ''}>
              <span class="check-label">${icon('mail', 'check-icon')}<span>${h(t('reservation.form.noEmail'))}</span></span>
            </label>
          </div>
        </section>

        <section class="reservation-step-panel reservation-documents-panel hidden" data-step-panel="3">
          <div class="form-section-title">${h(t('reservation.form.documentInfo'))}</div>
          <div class="reservation-documents-compact-stack">
            <article class="document-section-card document-section-card--primary">
              <div class="document-section-head">
                <div>
                  <strong>${h(t('reservation.documents.mainTitle', 'وثيقة صاحب الحجز'))}</strong>
                  <small>${h(t('reservation.documents.mainHelper', 'اختر نوع الوثيقة وارفع صورة واضحة أو اسحبها من الماسح.'))}</small>
                </div>
                <span class="document-file-pill" id="reservationDocumentFileName">${h(current.documentFileName || t('reservation.form.noDocumentSelected'))}</span>
              </div>
              <div class="document-compact-grid document-compact-grid--main">
                <div class="field document-type-field">${fieldLabel('fileText', h(t('reservation.form.documentType')))}
                  <select class="select" name="documentType" id="reservationDocumentType">
                    ${['national_id','passport','family_book','kinship_proof','residence','other'].map(type => `<option value="${h(type)}" ${((current.documentType || 'national_id') === type) ? 'selected' : ''}>${h(getReservationDocumentTypeLabel(type))}</option>`).join('')}
                  </select>
                </div>
                <div class="field document-upload-field">${fieldLabel('upload', h(t('reservation.form.documentImage')))}
                  <input class="input document-file-input" id="reservationDocumentFile" type="file" accept="image/png,image/jpeg,image/webp,application/pdf">
                  <input type="hidden" name="documentDataUrl" id="reservationDocumentDataUrl" value="${h(current.documentDataUrl || '')}">
                  <input type="hidden" name="documentFileName" id="reservationDocumentFileNameHidden" value="${h(current.documentFileName || '')}">
                  <input type="hidden" name="documentSource" id="reservationDocumentSource" value="${h(current.documentSource || '')}">
                </div>
                <div class="document-actions compact-document-actions">
                  <button class="btn ghost" type="button" id="reservationScanDocumentBtn">${icon('fileText')}${h(t('reservation.form.scanDocument'))}</button>
                  <button class="btn ghost" type="button" id="reservationViewDocumentBtn" ${current.documentFileName || current.documentDataUrl ? '' : 'disabled'}>${h(t('reservation.actions.viewDocument'))}</button>
                </div>
              </div>
            </article>

            <details class="document-accordion adult-documents-box ${companionAdults ? '' : 'hidden'}" id="adultCompanionDocumentsBox">
              <summary class="document-accordion-summary">
                <span>
                  <strong>${h(t('reservation.companions.documentsTitle'))}</strong>
                  <small>${h(t('reservation.companions.documentsHelper'))}</small>
                </span>
                <em>${h(String(companionAdults))}</em>
              </summary>
              <div class="document-accordion-body" id="adultCompanionDocumentRowsSlot">${renderAdultCompanionDocumentRows(current.adultCompanions || [], companionAdults)}</div>
            </details>

            <details class="document-accordion family-proof-box hidden" id="reservationFamilyProofBox">
              <summary class="document-accordion-summary">
                <span>
                  <strong>${h(t('reservation.familyProof.title'))}</strong>
                  <small>${h(t('reservation.familyProof.helper'))}</small>
                </span>
                <em>${h(t('reservation.documents.optional', 'اختياري'))}</em>
              </summary>
              <div class="document-accordion-body">
                <div class="document-compact-grid document-compact-grid--main">
                  <div class="field document-type-field">${fieldLabel('fileText', h(t('reservation.familyProof.type')))}
                    <select class="select" name="familyProofType" id="reservationFamilyProofType">
                      ${['family_book','kinship_proof'].map(type => `<option value="${h(type)}" ${(current.familyProofType || 'family_book') === type ? 'selected' : ''}>${h(getReservationDocumentTypeLabel(type))}</option>`).join('')}
                    </select>
                  </div>
                  <div class="field document-upload-field">${fieldLabel('upload', h(t('reservation.familyProof.file')))}
                    <input class="input document-file-input" id="reservationFamilyProofFile" type="file" accept="image/png,image/jpeg,image/webp,application/pdf">
                    <input type="hidden" name="familyProofDataUrl" id="reservationFamilyProofDataUrl" value="${h(current.familyProofDataUrl || '')}">
                    <input type="hidden" name="familyProofFileName" id="reservationFamilyProofFileNameHidden" value="${h(current.familyProofFileName || '')}">
                    <input type="hidden" name="familyProofSource" id="reservationFamilyProofSource" value="${h(current.familyProofSource || '')}">
                  </div>
                  <div class="document-actions compact-document-actions">
                    <button class="btn ghost" type="button" id="reservationScanFamilyProofBtn">${icon('fileText')}${h(t('reservation.familyProof.scan'))}</button>
                    <button class="btn ghost" type="button" id="reservationViewFamilyProofBtn" ${current.familyProofFileName || current.familyProofDataUrl ? '' : 'disabled'}>${h(t('reservation.actions.viewDocument'))}</button>
                  </div>
                </div>
                <p class="document-file-pill document-file-pill--wide" id="reservationFamilyProofFileName">${h(current.familyProofFileName || t('reservation.familyProof.noFile'))}</p>
              </div>
            </details>
          </div>
        </section>

        <section class="reservation-step-panel hidden" data-step-panel="2">
          <div class="form-section-title">${h(t('reservation.companions.title'))}</div>
          <div class="reservation-companion-box">
            <label class="check-row settings-check reservation-companion-toggle">
              <input type="checkbox" name="hasCompanions" id="reservationHasCompanions" ${current.hasCompanions ? 'checked' : ''}>
              <span class="check-label">${icon('users', 'check-icon')}<span>${h(t('reservation.companions.hasCompanions'))}</span></span>
            </label>
            <div class="reservation-companions-panel ${current.hasCompanions ? '' : 'hidden'}" id="reservationCompanionsPanel">
              <div class="modal-grid compact-modal-grid reservation-form-grid">
                <div class="field">${fieldLabel('users', h(t('reservation.companions.groupType')))}
                  <select class="select" name="companionGroupType" id="companionGroupType">
                    <option value="companions" ${companionGroupType === 'companions' ? 'selected' : ''}>${h(t('reservation.companions.groupCompanions'))}</option>
                    <option value="family" ${companionGroupType === 'family' ? 'selected' : ''}>${h(t('reservation.companions.groupFamily'))}</option>
                  </select>
                </div>
                <div class="field">${fieldLabel('users', h(t('reservation.companions.adultCount')))}
                  <select class="select" name="adultCompanionCount" id="adultCompanionCount">
                    ${[0,1,2,3,4,5,6,7,8].map(count => `<option value="${count}" ${companionAdults === count ? 'selected' : ''}>${count}</option>`).join('')}
                  </select>
                </div>
                <div class="field">${fieldLabel('users', h(t('reservation.companions.childrenCount')))}
                  <select class="select" name="childrenCount" id="childrenCount">
                    ${[0,1,2,3,4,5,6,7,8,9,10].map(count => `<option value="${count}" ${companionChildren === count ? 'selected' : ''}>${count}</option>`).join('')}
                  </select>
                </div>
                <div class="field ${companionChildren === 0 ? 'hidden' : ''}" id="childrenRelationshipField">${fieldLabel('users', h(t('reservation.companions.childrenRelationship')))}
                  <select class="select" name="childrenRelationship">
                    ${getReservationRelationshipOptions(current.childrenRelationship || '')}
                  </select>
                </div>
              </div>
              <p class="helper reservation-family-note ${companionGroupType === 'family' ? '' : 'hidden'}" id="reservationFamilyBookNote">${h(t('reservation.companions.familyBookRequired'))}</p>
              <div id="adultCompanionRowsSlot">${renderAdultCompanionRows(current.adultCompanions || [], companionAdults)}</div>

            </div>
          </div>
        </section>

        <section class="reservation-step-panel hidden" data-step-panel="4">
          <div class="form-section-title">${h(t('reservation.form.reservationInfo'))}</div>
          <div class="booking-employee-card">
            ${renderPersonAvatar(bookingEmployeeInfo.photoDataUrl || '', bookingEmployeeInfo.name || '', 'booking-employee-avatar')}
            <div>
              <span>${h(t('reservation.staff.bookedBy'))}</span>
              <strong>${h(bookingEmployeeInfo.name || '-')}</strong>
              <small>${h([bookingEmployeeInfo.roleLabel, bookingEmployeeInfo.shiftLabel].filter(Boolean).join(' - ') || '-')}</small>
            </div>
          </div>
          <div class="modal-grid compact-modal-grid reservation-form-grid">
            <div class="field">${fieldLabel('hash', h(t('reservation.form.number')))}<input class="input" name="reservationNo" value="${h(current.reservationNo || '')}" readonly></div>
            <div class="field">${fieldLabel('building', h(t('reservation.form.room')))}
              <select class="select" name="roomId" id="reservationRoomSelect" required>
                ${roomOptions.map(room => `<option value="${h(room.id)}" ${current.roomId === room.id ? 'selected' : ''}>${h(getReservationRoomLabel(room))} - ${h(room.price || 0)} ${h(room.currency || '')}</option>`).join('')}
              </select>
            </div>
            <div class="field">${fieldLabel('users', h(t('reservation.form.guestsCount')))}<input class="input" name="guestsCount" id="reservationGuestsCount" value="${h(initialGuestsCount)}" readonly></div>
            <div class="field">${fieldLabel('calendar', h(t('reservation.form.checkInDate')))}<input class="input" type="date" name="checkInDate" id="reservationCheckInDate" value="${h(current.checkInDate || today)}" required></div>
            <div class="field">${fieldLabel('clock', h(t('reservation.form.nights')))}<input class="input" type="number" min="1" step="1" name="nights" id="reservationNights" value="${h(initialNights)}" required></div>
            <div class="field">${fieldLabel('calendar', h(t('reservation.form.checkOutDate')))}<input class="input" type="date" name="checkOutDate" id="reservationCheckOutDate" value="${h(initialCheckOutDate)}" readonly required></div>
            <div class="field">${fieldLabel('creditCard', h(t('reservation.form.roomPrice')))}<input class="input" name="roomPrice" id="reservationRoomPrice" value="${h(current.roomPrice || totals.roomPrice)}" readonly></div>
            <div class="field">${fieldLabel('creditCard', h(t('reservation.form.totalAmount')))}<input class="input" name="totalAmount" id="reservationTotalAmount" value="${h(current.totalAmount || totals.totalAmount)}" readonly></div>
            <div class="field">${fieldLabel('creditCard', h(t('reservation.form.paidAmount')))}<input class="input" type="number" min="0" step="0.01" name="paidAmount" value="${h(current.paidAmount || 0)}"></div>
            <div class="field">${fieldLabel('currency', h(t('reservation.form.currency')))}<input class="input" name="currency" id="reservationCurrency" value="${h(current.currency || totals.currency)}" readonly></div>
            <div class="field">${fieldLabel('status', h(t('reservation.form.status')))}
              <select class="select" name="status" required>
                ${RESERVATION_STATUSES.filter(status => status !== 'checked_in' && status !== 'completed').map(status => `<option value="${h(status)}" ${current.status === status ? 'selected' : ''}>${h(getReservationStatusLabel(status))}</option>`).join('')}
              </select>
            </div>
            <div class="field">${fieldLabel('messageSquare', h(t('reservation.form.source')))}
              <select class="select" name="source" required>
                ${['direct','phone','whatsapp','online','other'].map(source => `<option value="${h(source)}" ${(current.source || 'direct') === source ? 'selected' : ''}>${h(getReservationSourceLabel(source))}</option>`).join('')}
              </select>
            </div>
            <div class="field field-full"><p class="helper reservation-helper-note">${h(t('reservation.form.priceLockHelper'))}</p></div>
            <div class="field field-full">${fieldLabel('notes', h(t('reservation.form.notes')))}<textarea class="input textarea" name="notes" rows="3">${h(current.notes || '')}</textarea></div>
          </div>
        </section>

        <div class="modal-actions reservation-wizard-actions">
          <button class="btn ghost" type="button" data-action="close-reservation-modal">${h(t('common.cancel'))}</button>
          <div class="reservation-wizard-nav-buttons">
            <button class="btn ghost hidden" type="button" id="reservationPrevStepBtn">${h(t('common.previous'))}</button>
            <button class="btn primary" type="button" id="reservationNextStepBtn">${h(t('common.next'))}</button>
            <button class="btn primary hidden" type="submit" id="reservationSubmitBtn">${h(t('common.save'))}</button>
          </div>
        </div>
      </form>
    </div>
  `;
}

function renderReservationDetailPair(label, value) {
  return `
    <div class="reservation-detail-pair">
      <span>${h(label)}</span>
      <strong>${h(value || '-')}</strong>
    </div>
  `;
}

function renderReservationDetailSection(title, pairs) {
  return `
    <section class="reservation-detail-section">
      <h3>${h(title)}</h3>
      <div class="reservation-detail-grid">
        ${pairs.map(([label, value]) => renderReservationDetailPair(label, value)).join('')}
      </div>
    </section>
  `;
}

function getReservationDetailTabs(reservation) {
  const tabs = [
    { id: 'overview', label: t('reservation.details.overviewTab', 'نظرة عامة'), iconName: 'calendar' },
    { id: 'guest', label: t('reservation.details.guestSection'), iconName: 'user' },
    { id: 'booking', label: t('reservation.details.bookingSection'), iconName: 'building' },
    { id: 'finance', label: t('reservation.details.moneySection'), iconName: 'creditCard' },
    { id: 'documents', label: t('reservation.details.docsSection'), iconName: 'fileText' }
  ];
  if (reservation?.notes) tabs.push({ id: 'notes', label: t('reservation.form.notes'), iconName: 'fileText' });
  return tabs;
}

function getActiveReservationDetailTab(reservation) {
  const tabs = getReservationDetailTabs(reservation);
  const requested = state.reservationModal?.section || 'overview';
  return tabs.some(tab => tab.id === requested) ? requested : tabs[0].id;
}

function setReservationDetailTab(section) {
  if (!state.reservationModal) return;
  state.reservationModal = { ...state.reservationModal, section: section || 'overview' };
  render();
}

function renderReservationDetailTabs(reservation, activeTab) {
  const ui = reservationUi();
  const tabs = getReservationDetailTabs(reservation).map(tab => ({
    id: tab.id,
    label: tab.label,
    icon: `<span class="settings-tab-icon">${icon(tab.iconName)}</span>`,
    attrs: { 'data-action': 'set-reservation-detail-tab', 'data-tab': tab.id }
  }));
  if (ui?.renderTabs) {
    return ui.renderTabs({
      tabs,
      active: activeTab,
      className: 'settings-tabs reservation-modal-tabs reservation-modal-tabs--central',
      attrs: { 'aria-label': t('reservation.details.tabsLabel', 'أقسام تفاصيل الحجز'), 'data-ui-component': 'reservation-detail-tabs' }
    });
  }
  return `
    <div class="settings-tabs reservation-modal-tabs reservation-modal-tabs--central" role="tablist" aria-label="${h(t('reservation.details.tabsLabel', 'أقسام تفاصيل الحجز'))}" data-ui-component="reservation-detail-tabs">
      ${getReservationDetailTabs(reservation).map(tab => `
        <button class="settings-tab-btn ${tab.id === activeTab ? 'active' : ''}" type="button" role="tab" aria-selected="${tab.id === activeTab ? 'true' : 'false'}" data-action="set-reservation-detail-tab" data-tab="${h(tab.id)}">
          <span class="settings-tab-icon">${icon(tab.iconName)}</span>
          <span>${h(tab.label)}</span>
        </button>
      `).join('')}
    </div>
  `;
}

function renderReservationOverviewCards(items) {
  const ui = reservationUi();
  return `
    <section class="reservation-detail-overview-grid ds-summary-grid" data-ui-component="reservation-detail-overview-grid">
      ${items.map(item => {
        if (ui?.renderMetricCard) {
          return ui.renderMetricCard({
            tag: 'article',
            title: item.label,
            value: item.value || '-',
            note: item.note || '',
            icon: icon(item.iconName || 'calendar'),
            tone: 'primary',
            className: 'reservation-overview-card',
            attrs: { 'data-ui-component': 'reservation-overview-card' }
          });
        }
        return `
          <div class="reservation-overview-card ds-card" data-ui-component="reservation-overview-card">
            <div class="reservation-overview-card-icon">${icon(item.iconName || 'calendar')}</div>
            <div>
              <span>${h(item.label)}</span>
              <strong>${h(item.value || '-')}</strong>
              ${item.note ? `<small>${h(item.note)}</small>` : ''}
            </div>
          </div>
        `;
      }).join('')}
    </section>
  `;
}

function renderReservationActivePanel(activeTab, reservation, context) {
  const { guestPairs, reservationPairs, moneyPairs, docsPairs, room, amountDue } = context;
  const totalGuests = Number(reservation?.guestsCount || 1);
  const nights = Number(reservation?.nights || 1);
  const statusLabel = getReservationStatusLabel(reservation?.status);
  const overviewPairs = [
    [t('reservation.form.guestName'), getReservationGuestDisplayName(reservation)],
    [t('reservation.form.room'), getReservationRoomLabel(room)],
    [t('reservation.form.status'), statusLabel],
    [t('reservation.form.source'), getReservationSourceLabel(reservation?.source)],
    [t('reservation.form.checkInDate'), reservation?.checkInDate || '-'],
    [t('reservation.form.checkOutDate'), reservation?.checkOutDate || '-'],
    [t('reservation.staff.bookedBy'), getReservationBookingEmployeeSummary(reservation)],
    [t('reservation.form.nationalId'), reservation?.nationalId || '-']
  ];
  if (activeTab === 'overview') {
    return `
      <div class="reservation-detail-pane reservation-detail-pane--overview">
        ${renderReservationOverviewCards([
          { iconName: 'building', label: t('reservation.form.room'), value: getReservationRoomLabel(room), note: `${totalGuests} ${t('reservation.form.guestsCount')}` },
          { iconName: 'calendar', label: t('reservation.details.stayPeriod', 'فترة الإقامة'), value: `${reservation?.checkInDate || '-'} → ${reservation?.checkOutDate || '-'}`, note: `${nights} ${t('reservation.units.nights')}` },
          { iconName: 'creditCard', label: t('reservation.form.totalAmount'), value: `${reservation?.totalAmount || 0} ${reservation?.currency || ''}`, note: t('reservation.details.totalConfirmed', 'إجمالي قيمة الحجز') },
          { iconName: 'fileText', label: t('reservation.details.remainingAmount', 'المتبقي'), value: `${amountDue || 0} ${reservation?.currency || ''}`, note: t('reservation.form.paidAmount') + `: ${reservation?.paidAmount || 0} ${reservation?.currency || ''}` }
        ])}
        ${renderReservationDetailSection(t('reservation.details.quickSummary', 'ملخص سريع'), overviewPairs)}
      </div>
    `;
  }
  if (activeTab === 'guest') return `<div class="reservation-detail-pane">${renderReservationDetailSection(t('reservation.details.guestSection'), guestPairs)}</div>`;
  if (activeTab === 'booking') return `<div class="reservation-detail-pane">${renderReservationDetailSection(t('reservation.details.bookingSection'), reservationPairs)}</div>`;
  if (activeTab === 'finance') return `<div class="reservation-detail-pane">${renderReservationDetailSection(t('reservation.details.moneySection'), moneyPairs)}</div>`;
  if (activeTab === 'documents') return `
    <div class="reservation-detail-pane">
      ${renderReservationDetailSection(t('reservation.details.docsSection'), docsPairs)}
      ${renderReservationDocumentActions(reservation)}
    </div>
  `;
  if (activeTab === 'notes' && reservation?.notes) {
    return `
      <div class="reservation-detail-pane">
        <section class="reservation-detail-section">
          <h3>${h(t('reservation.form.notes'))}</h3>
          <p class="reservation-detail-note">${h(reservation.notes)}</p>
        </section>
      </div>
    `;
  }
  return `<div class="reservation-detail-pane">${renderReservationDetailSection(t('reservation.details.guestSection'), guestPairs)}</div>`;
}

function getReservationCompanionsSummary(reservation) {
  if (!reservation?.hasCompanions) return t('common.no');
  const adultCount = Number(reservation.adultCompanionCount || reservation.adultCompanions?.length || 0);
  const childrenCount = Number(reservation.childrenCount || 0);
  const type = reservation.companionGroupType === 'family' ? t('reservation.companions.groupFamily') : t('reservation.companions.groupCompanions');
  return `${type} - ${t('reservation.companions.adultCount')}: ${adultCount} - ${t('reservation.companions.childrenCount')}: ${childrenCount}`;
}

function getReservationAdultCompanionsSummary(reservation) {
  const adults = reservation?.adultCompanions || [];
  if (!adults.length) return '-';
  return adults.map((companion, index) => {
    const name = [companion.firstName, companion.lastName].filter(Boolean).join(' ').trim() || `${t('reservation.companions.adultTitle')} ${index + 1}`;
    const relation = getReservationRelationshipLabel(companion.relationship);
    const doc = companion.documentFileName ? t('reservation.details.documentReady') : t('reservation.details.documentMissing');
    return `${index + 1}. ${name} - ${relation} - ${doc}`;
  }).join(' | ');
}

function getReservationProofSummary(reservation) {
  const mainType = getReservationDocumentTypeLabel(reservation?.documentType);
  const main = `${mainType} - ${reservation?.documentFileName ? t('reservation.details.documentReady') : t('reservation.details.documentMissing')}`;
  const family = reservation?.familyProofRequired
    ? `${getReservationDocumentTypeLabel(reservation.familyProofType)} - ${reservation.familyProofFileName ? t('reservation.details.documentReady') : t('reservation.details.documentMissing')}`
    : t('reservation.details.notRequired');
  return { main, family };
}

function renderReservationDocumentActions(reservation) {
  const actions = [];
  if (reservation?.documentFileName) actions.push({ label: getReservationDocumentTypeLabel(reservation.documentType), doc: 'main', enabled: Boolean(reservation.documentDataUrl) });
  if (reservation?.familyProofFileName) actions.push({ label: getReservationDocumentTypeLabel(reservation.familyProofType), doc: 'family', enabled: Boolean(reservation.familyProofDataUrl) });
  (reservation?.adultCompanions || []).forEach((companion, index) => {
    if (companion.documentFileName) actions.push({ label: `${t('reservation.companions.adultTitle')} ${index + 1} - ${getReservationDocumentTypeLabel(companion.documentType)}`, doc: `adult:${index}`, enabled: Boolean(companion.documentDataUrl) });
  });
  if (!actions.length) return '';
  return `
    <section class="reservation-detail-section reservation-document-actions">
      <h3>${h(t('reservation.details.documentsView'))}</h3>
      <div class="document-action-list">
        ${actions.map(action => `
          <button class="btn ghost" type="button" data-action="view-saved-reservation-document" data-doc="${h(action.doc)}" ${action.enabled ? '' : 'disabled'}>${h(t('reservation.actions.viewDocument'))} - ${h(action.label)}</button>
        `).join('')}
        ${actions.some(action => !action.enabled) ? `<p class="helper">${h(t('reservation.details.previewUnavailable'))}</p>` : ''}
      </div>
    </section>
  `;
}

function bindReservationDetailDocumentActions() {
  document.querySelectorAll('[data-action="view-saved-reservation-document"]').forEach(button => {
    button.addEventListener('click', () => {
      const reservation = state.reservationModal?.id ? getReservationById(state.reservationModal.id) : null;
      if (!reservation) return;
      const doc = button.dataset.doc || 'main';
      if (doc === 'main') return openReservationDocumentPreview(reservation.documentDataUrl || '', reservation.documentFileName || t('reservation.form.documentImage'));
      if (doc === 'family') return openReservationDocumentPreview(reservation.familyProofDataUrl || '', reservation.familyProofFileName || t('reservation.familyProof.file'));
      if (doc.startsWith('adult:')) {
        const index = Number(doc.split(':')[1] || 0);
        const companion = (reservation.adultCompanions || [])[index];
        return openReservationDocumentPreview(companion?.documentDataUrl || '', companion?.documentFileName || t('reservation.companions.documentImage'));
      }
    });
  });
}

function bindReservationDetailTabs() {
  document.querySelectorAll('[data-action="set-reservation-detail-tab"]').forEach(button => {
    button.addEventListener('click', () => {
      setReservationDetailTab(button.dataset.tab || 'overview');
    });
  });
}

function renderReservationViewModal(reservation) {
  if (!reservation) return '';
  const room = getRoomById(reservation.roomId);
  const proof = getReservationProofSummary(reservation);
  const amountDue = getReservationAmountDue(reservation);
  const activeTab = getActiveReservationDetailTab(reservation);
  const guestPairs = [
    [t('reservation.form.guestName'), getReservationGuestDisplayName(reservation)],
    [t('reservation.form.nationalId'), reservation.nationalId || '-'],
    [t('reservation.form.fatherName'), reservation.fatherName || '-'],
    [t('reservation.form.motherName'), reservation.motherName || '-'],
    [t('reservation.form.birthDate'), reservation.birthDate || '-'],
    [t('reservation.form.guestPhone'), reservation.guestPhone || '-']
  ];
  const reservationPairs = [
    [t('reservation.form.number'), reservation.reservationNo || '-'],
    [t('reservation.form.room'), getReservationRoomLabel(room)],
    [t('reservation.form.guestsCount'), reservation.guestsCount || 1],
    [t('reservation.form.checkInDate'), reservation.checkInDate || '-'],
    [t('reservation.form.checkOutDate'), reservation.checkOutDate || '-'],
    [t('reservation.form.nights'), reservation.nights || 1],
    [t('reservation.form.status'), getReservationStatusLabel(reservation.status)],
    [t('reservation.form.source'), getReservationSourceLabel(reservation.source)],
    [t('reservation.staff.bookedBy'), getReservationBookingEmployeeSummary(reservation)]
  ];
  const moneyPairs = [
    [t('reservation.form.roomPrice'), `${reservation.roomPrice || 0} ${reservation.currency || ''}`],
    [t('reservation.form.totalAmount'), `${reservation.totalAmount || 0} ${reservation.currency || ''}`],
    [t('reservation.form.paidAmount'), `${reservation.paidAmount || 0} ${reservation.currency || ''}`],
    [t('reservation.details.remainingAmount', 'المتبقي'), `${amountDue || 0} ${reservation.currency || ''}`]
  ];
  const docsPairs = [
    [t('reservation.form.documentImage'), proof.main],
    [t('reservation.familyProof.title'), proof.family],
    [t('reservation.companions.hasCompanions'), getReservationCompanionsSummary(reservation)],
    [t('reservation.companions.relationship'), getReservationAdultCompanionsSummary(reservation)]
  ];
  const activePanel = renderReservationActivePanel(activeTab, reservation, {
    guestPairs,
    reservationPairs,
    moneyPairs,
    docsPairs,
    room,
    amountDue
  });
  return `
    <div class="modal-backdrop reservation-modal-backdrop" role="dialog" aria-modal="true" data-ui-component="reservation-modal-backdrop">
      <div class="modal-card compact-modal-card reservation-details-modal reservation-central-modal" data-ui-component="reservation-details-modal">
        <div class="modal-head reservation-details-head">
          <h2>${h(t('reservation.modal.viewTitle'))}</h2>
          <button class="icon-btn" type="button" data-action="close-reservation-modal">${icon('x')}</button>
        </div>
        <div class="reservation-detail-hero">
          <div>
            <span>${h(t('reservation.form.number'))}</span>
            <strong>${h(reservation.reservationNo || '-')}</strong>
          </div>
          <div>
            <span>${h(t('reservation.form.guestName'))}</span>
            <strong>${h(getReservationGuestDisplayName(reservation))}</strong>
          </div>
          <span class="status-badge ${h(reservation.status)}">${h(getReservationStatusLabel(reservation.status))}</span>
        </div>
        ${renderReservationDetailTabs(reservation, activeTab)}
        <div class="reservation-detail-body">
          ${activePanel}
        </div>
        <div class="modal-actions reservation-details-actions">
          <button class="btn ghost" type="button" data-action="close-reservation-modal">${h(t('common.close'))}</button>
          <button class="btn primary" type="button" data-action="print-reservation" data-id="${h(reservation.id)}">${icon('receipt')}${h(t('reservation.actions.print'))}</button>
        </div>
      </div>
    </div>
  `;
}

function renderReservationSuccessModal(reservation) {
  if (!reservation) return '';
  const room = getRoomById(reservation.roomId);
  return `
    <div class="modal-backdrop reservation-modal-backdrop" role="dialog" aria-modal="true" data-ui-component="reservation-modal-backdrop">
      <div class="modal-card reservation-success-modal reservation-central-modal" data-ui-component="reservation-success-modal">
        <div class="reservation-success-icon">${icon('checkCircle')}</div>
        <h2>${h(t('reservation.success.title'))}</h2>
        <p>${h(t('reservation.success.text'))}</p>
        <div class="reservation-success-summary">
          ${renderReservationDetailPair(t('reservation.form.number'), reservation.reservationNo || '-')}
          ${renderReservationDetailPair(t('reservation.form.guestName'), getReservationGuestDisplayName(reservation))}
          ${renderReservationDetailPair(t('reservation.form.room'), getReservationRoomLabel(room))}
          ${renderReservationDetailPair(t('reservation.form.totalAmount'), `${reservation.totalAmount || 0} ${reservation.currency || ''}`)}
        </div>
        <div class="modal-actions reservation-details-actions">
          <button class="btn ghost" type="button" data-action="close-reservation-modal">${h(t('common.close'))}</button>
          <button class="btn primary" type="button" data-action="print-reservation" data-id="${h(reservation.id)}">${icon('receipt')}${h(t('reservation.actions.printCustomer'))}</button>
          <button class="btn luxury" type="button" data-action="print-account-statement" data-id="${h(reservation.id)}">${icon('fileText')}${h(t('accountStatement.print', 'طباعة كشف الحساب'))}</button>
        </div>
      </div>
    </div>
  `;
}

function getReservationPresentedDocumentTypes(reservation) {
  const items = [];
  const addType = (type) => {
    const label = getReservationDocumentTypeLabel(type || 'national_id');
    if (label && !items.includes(label)) items.push(label);
  };
  if (reservation?.documentType) addType(reservation.documentType);
  if (reservation?.familyProofRequired || reservation?.familyProofType || reservation?.familyProofFileName) addType(reservation.familyProofType || 'family_book');
  (reservation?.adultCompanions || []).forEach(companion => {
    if (companion.documentType || companion.documentFileName) addType(companion.documentType || 'national_id');
  });
  return items.length ? items : [getReservationDocumentTypeLabel('national_id')];
}

function getReservationReceiptHtml(reservation) {
  const hotel = getManagerHotel() || {};
  const settings = readHotelSettings(reservation.hotelId) || {};
  const platformSettings = readPlatformSettings();
  const room = getRoomById(reservation.roomId);
  const hotelName = settings.displayName || hotel.name || getPlatformBrandName() || 'Fandqi';
  const logo = settings.logoDataUrl || platformSettings.logoDataUrl || '';
  const printedAt = new Date().toLocaleString(state.lang === 'ar' ? 'ar' : 'en');
  const printDate = new Date().toLocaleDateString(state.lang === 'ar' ? 'ar' : 'en');
  const printTime = new Date().toLocaleTimeString(state.lang === 'ar' ? 'ar' : 'en');
  const balance = Math.max(0, Number(reservation.totalAmount || 0) - Number(reservation.paidAmount || 0));
  const bookedBySummary = getReservationBookingEmployeeSummary(reservation);
  const documentTypes = getReservationPresentedDocumentTypes(reservation);
  const documentTypeChips = documentTypes.map(label => `<span class="doc-chip"><span class="chip-icon">✓</span>${h(label)}</span>`).join('');
  const companionRows = (reservation.adultCompanions || []).map((companion, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${h([companion.firstName, companion.lastName].filter(Boolean).join(' ') || '-')}</td>
      <td>${h(companion.nationalId || '-')}</td>
      <td>${h(getReservationRelationshipLabel(companion.relationship))}</td>
      <td>${h(getReservationDocumentTypeLabel(companion.documentType || 'national_id'))}</td>
    </tr>`).join('');
  const hasCompanionSection = Boolean((reservation.adultCompanions || []).length || Number(reservation.childrenCount || 0));
  const logoHtml = logo ? `<img src="${h(logo)}" alt="${h(hotelName)}">` : `<span>${h(String(hotelName).slice(0, 1) || 'F')}</span>`;
  const contactLine = [settings.address || hotel.address, settings.city || hotel.city, settings.phone || hotel.phone, settings.email || hotel.email].filter(Boolean).join(' • ');
  return `<!doctype html>
<html lang="${h(state.lang || 'ar')}" dir="${h(document.documentElement.dir || 'rtl')}">
<head>
<meta charset="utf-8">
<title>${h(t('reservation.receipt.title'))} - ${h(reservation.reservationNo || '')}</title>
<style>${getCentralPrintStyles('reservation-receipt')}</style>
</head>
<body>
  ${renderPrintWindowActions(t('reservation.actions.printCustomer'))}
  <main class="page">
    <section class="sheet">
      <header class="top">
        <div class="brand"><div class="logo">${logoHtml}</div><div><h1>${h(hotelName)}</h1><p>${h(contactLine || t('reservation.receipt.hotelDocument'))}</p></div></div>
        <div class="doc-title"><h2>${h(t('reservation.receipt.title'))}</h2><span class="num">${h(reservation.reservationNo || '-')}</span><p>${h(t('reservation.receipt.formIntro', 'يوضح هذا النموذج تفاصيل الحجز والوثائق المقدمة والشروط الإدارية المعتمدة.'))}</p></div>
      </header>

      <section class="hero">
        <div class="hero-card"><span>${h(t('reservation.form.guestName'))}</span><strong>${h(getReservationGuestDisplayName(reservation))}</strong></div>
        <div class="hero-card"><span>${h(t('reservation.form.room'))}</span><strong>${h(getReservationRoomLabel(room))}</strong></div>
        <div class="hero-card balance"><span>${h(t('reservation.receipt.balance'))}</span><strong>${h(balance)} ${h(reservation.currency || '')}</strong></div>
      </section>

      <div class="split">
        <section class="panel"><div class="panel-head"><h3>${h(t('reservation.details.bookingSection'))}</h3><span class="panel-icon">☷</span></div><div class="kv-grid">
          <div class="kv"><span>${h(t('reservation.form.checkInDate'))}</span><strong>${h(reservation.checkInDate || '-')}</strong></div>
          <div class="kv"><span>${h(t('reservation.form.checkOutDate'))}</span><strong>${h(reservation.checkOutDate || '-')}</strong></div>
          <div class="kv"><span>${h(t('reservation.form.nights'))}</span><strong>${h(reservation.nights || 1)}</strong></div>
          <div class="kv"><span>${h(t('reservation.form.status'))}</span><strong>${h(getReservationStatusLabel(reservation.status))}</strong></div>
          <div class="kv full"><span>${h(t('reservation.staff.bookedBy'))}</span><strong>${h(bookedBySummary)}</strong></div>
        </div></section>
        <section class="panel"><div class="panel-head"><h3>${h(t('reservation.details.guestSection'))}</h3><span class="panel-icon">☻</span></div><div class="kv-grid">
          <div class="kv"><span>${h(t('reservation.form.nationalId'))}</span><strong>${h(reservation.nationalId || '-')}</strong></div>
          <div class="kv"><span>${h(t('reservation.form.guestPhone'))}</span><strong>${h(reservation.guestPhone || '-')}</strong></div>
          <div class="kv"><span>${h(t('reservation.form.guestsCount'))}</span><strong>${h(reservation.guestsCount || 1)}</strong></div>
          <div class="kv"><span>${h(t('reservation.form.source'))}</span><strong>${h(getReservationSourceLabel(reservation.source))}</strong></div>
          <div class="kv full"><span>${h(t('reservation.form.guestEmail'))}</span><strong>${h(reservation.guestEmail || t('reservation.form.noEmail'))}</strong></div>
        </div></section>
      </div>

      <section class="panel"><div class="panel-head"><div><h3>${h(t('reservation.receipt.documentsTitle', 'الوثائق المقدمة'))}</h3><small>${h(t('reservation.receipt.documentsHelper', 'يتم تسجيل نوع الوثيقة فقط دون عرض أو طباعة صور الوثائق للزبون.'))}</small></div><span class="panel-icon">▣</span></div><div class="documents-copy"><p>${h(t('reservation.receipt.documentsText', 'الوثائق التالية تم تسجيل نوعها ضمن ملف الحجز:'))}</p><div class="doc-chips">${documentTypeChips}</div></div></section>

      ${hasCompanionSection ? `<section class="panel"><div class="panel-head"><h3>${h(t('reservation.companions.title'))}</h3><span class="panel-icon">♟</span></div>${companionRows ? `<table><thead><tr><th>#</th><th>${h(t('reservation.form.guestName'))}</th><th>${h(t('reservation.form.nationalId'))}</th><th>${h(t('reservation.companions.relationship'))}</th><th>${h(t('reservation.form.documentType'))}</th></tr></thead><tbody>${companionRows}</tbody></table>` : ''}${Number(reservation.childrenCount || 0) ? `<div class="child-line">${h(t('reservation.companions.childrenCount'))}: ${h(reservation.childrenCount)} - ${h(t('reservation.companions.childrenRelationship'))}: ${h(getReservationRelationshipLabel(reservation.childrenRelationship))}</div>` : ''}</section>` : ''}

      <section class="panel"><div class="panel-head"><h3>${h(t('reservation.receipt.termsTitle'))}</h3><span class="panel-icon">☰</span></div><div class="terms"><div class="terms-box">${h(t('reservation.receipt.termsText'))}</div></div></section>
      <footer class="footer"><span>${h(t('reservation.receipt.generatedAt'))}: ${h(printDate)} | ${h(printTime)}</span><span>${h(t('reservation.receipt.customerCopy'))}</span></footer>
    </section>
  </main>
  ${renderAutoPrintScript()}
</body>
</html>`;
}

function printReservationReceipt(id) {
  const reservation = getReservationById(id);
  if (!reservation) return;
  openRuntimePrintWindow(getReservationReceiptHtml(reservation), { width: 900, height: 700, popupMessage: t('reservation.receipt.popupBlocked') });
}

function getReservationAccountStatementHtml(reservation) {
  const hotel = getManagerHotel() || {};
  const settings = readHotelSettings(reservation.hotelId) || {};
  const platformSettings = readPlatformSettings();
  const room = getRoomById(reservation.roomId);
  const hotelName = settings.displayName || hotel.name || getPlatformBrandName() || 'Fandqi';
  const logo = settings.logoDataUrl || platformSettings.logoDataUrl || '';
  const logoHtml = logo ? `<img src="${h(logo)}" alt="${h(hotelName)}">` : `<span>${h(String(hotelName).slice(0, 1) || 'F')}</span>`;
  const orders = getFoodOrdersByReservationId(reservation.id);
  const roomOrdersTotal = getFoodOrderRoomAccountTotal(orders);
  const paidOrdersTotal = getFoodOrderPaidTotal(orders);
  const bookingTotal = Number(reservation.totalAmount || 0);
  const bookingPaid = Number(reservation.paidAmount || 0);
  const due = getReservationAmountDue(reservation);
  const currency = reservation.currency || settings.defaultCurrency || 'USD';
  const printedAt = new Date().toLocaleString(state.lang === 'ar' ? 'ar' : 'en');
  const rows = [
    { type: t('accountStatement.type.roomStay', 'إقامة الغرفة'), desc: `${getReservationRoomLabel(room)} · ${reservation.checkInDate || '-'} → ${reservation.checkOutDate || '-'}`, debit: bookingTotal, credit: 0, method: t('accountStatement.method.roomCharge', 'أجرة إقامة') },
    { type: t('accountStatement.type.payment', 'دفعة'), desc: t('accountStatement.desc.bookingPayment', 'مدفوع من قيمة الحجز'), debit: 0, credit: bookingPaid, method: t('accountStatement.method.bookingPayment', 'دفعة حجز') },
    ...orders.map(order => ({
      type: getFoodOrderServiceLabel(order.serviceType),
      desc: formatFoodOrderItems(order),
      debit: (order.paymentMethod || 'cash') === 'room_account' ? Number(order.amount || 0) : 0,
      credit: (order.paymentMethod || 'cash') === 'room_account' ? 0 : Number(order.amount || 0),
      method: getFoodOrderPaymentMethodLabel(order.paymentMethod || 'cash')
    }))
  ];
  const rowsHtml = rows.map(row => `
    <tr><td>${h(row.type)}</td><td>${h(row.desc)}</td><td>${h(row.method || '-')}</td><td>${h(row.debit ? `${row.debit} ${currency}` : '-')}</td><td>${h(row.credit ? `${row.credit} ${currency}` : '-')}</td></tr>
  `).join('');
  return `<!doctype html><html lang="${h(state.lang || 'ar')}" dir="${h(document.documentElement.dir || 'rtl')}"><head><meta charset="utf-8"><title>${h(t('accountStatement.title', 'كشف حساب'))} - ${h(reservation.reservationNo || '')}</title><style>${getCentralPrintStyles('account-statement')}</style></head><body>${renderPrintWindowActions(t('accountStatement.print', 'طباعة كشف الحساب'))}<main class="page"><section class="sheet"><header class="top"><div class="brand"><div class="logo">${logoHtml}</div><div><h1>${h(hotelName)}</h1><p>${h(printedAt)}</p></div></div><div><h2>${h(t('accountStatement.title', 'كشف حساب'))}</h2><p>${h(reservation.reservationNo || '-')}</p></div></header><div class="summary"><div class="box"><span>${h(t('reservation.form.guestName'))}</span><strong>${h(getReservationGuestDisplayName(reservation))}</strong></div><div class="box"><span>${h(t('reservation.form.room'))}</span><strong>${h(getReservationRoomLabel(room))}</strong></div><div class="box"><span>${h(t('accountStatement.paidOrders', 'طلبات مدفوعة'))}</span><strong>${h(paidOrdersTotal)} ${h(currency)}</strong></div><div class="box due"><span>${h(t('accountStatement.remaining', 'المتبقي'))}</span><strong>${h(due)} ${h(currency)}</strong></div><div class="box"><span>${h(t('accountStatement.bookingTotal', 'قيمة الإقامة'))}</span><strong>${h(bookingTotal)} ${h(currency)}</strong></div><div class="box"><span>${h(t('accountStatement.bookingPaid', 'مدفوع الحجز'))}</span><strong>${h(bookingPaid)} ${h(currency)}</strong></div><div class="box"><span>${h(t('accountStatement.roomOrdersTotal', 'طلبات على حساب الغرفة'))}</span><strong>${h(roomOrdersTotal)} ${h(currency)}</strong></div><div class="box"><span>${h(t('reservation.form.status'))}</span><strong>${h(getReservationStatusLabel(reservation.status))}</strong></div></div><table><thead><tr><th>${h(t('accountStatement.columns.type', 'البند'))}</th><th>${h(t('accountStatement.columns.desc', 'الوصف'))}</th><th>${h(t('accountStatement.columns.method', 'الطريقة'))}</th><th>${h(t('accountStatement.columns.debit', 'مدين'))}</th><th>${h(t('accountStatement.columns.credit', 'مدفوع'))}</th></tr></thead><tbody>${rowsHtml}</tbody></table><footer class="footer"><span>${h(t('accountStatement.generatedAt', 'تاريخ الطباعة'))}: ${h(printedAt)}</span><strong>${h(t('accountStatement.customerCopy', 'نسخة الزبون'))}</strong></footer></section></main>${renderAutoPrintScript()}</body></html>`;
}

function printReservationAccountStatement(id) {
  const reservation = getReservationById(id);
  if (!reservation) return;
  openRuntimePrintWindow(getReservationAccountStatementHtml(reservation), { width: 900, height: 760, popupMessage: t('reservation.receipt.popupBlocked') });
}

