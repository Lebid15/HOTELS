function buildBackupPayload() {
  const data = {};
  BACKUP_STORAGE_KEYS.forEach(key => {
    data[key] = readStorageText(key);
  });
  return {
    app: 'Fandqi',
    version: 'technical-closure-v1',
    exportedAt: new Date().toISOString(),
    data
  };
}

function exportBackup() {
  const payload = JSON.stringify(buildBackupPayload(), null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `fandqi-backup-${todayISO()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  toast(t('settings.toast.backupExported'));
}

function importBackupFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    try {
      const payload = JSON.parse(String(reader.result || '{}'));
      const data = payload && typeof payload === 'object' ? payload.data : null;
      if (!data || typeof data !== 'object') throw new Error('invalid');
      BACKUP_STORAGE_KEYS.forEach(key => {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          const value = data[key];
          if (value === null || value === undefined) removeStorageKey(key);
          else writeStorageText(key, String(value));
        }
      });
      toast(t('settings.toast.backupImported'));
      render();
    } catch {
      toast(t('settings.toast.backupInvalid'));
    }
  });
  reader.readAsText(file);
}

function clearDemoData() {
  const confirmed = window.confirm(t('settings.confirm.clearDemoData'));
  if (!confirmed) return;
  BACKUP_STORAGE_KEYS.forEach(key => removeStorageKey(key));
  toast(t('settings.toast.demoDataCleared'));
  render();
}

function bindPasswordToggles() {
  document.querySelectorAll('[data-toggle-password]').forEach(button => {
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.togglePassword);
      if (!input) return;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      button.innerHTML = isPassword ? icons.eyeOff : icons.eye;
      button.setAttribute('aria-label', isPassword ? t('login.hidePassword') : t('login.showPassword'));
      button.setAttribute('title', isPassword ? t('login.hidePassword') : t('login.showPassword'));
    });
  });
}

function bindPlatformSettingsEvents() {
  const form = document.getElementById('platformSettingsForm');
  const logoInput = document.getElementById('platformLogoInput');
  const logoDataInput = document.getElementById('platformLogoDataUrl');
  const logoPreview = document.getElementById('platformLogoPreview');
  const removeLogoButton = document.getElementById('removePlatformLogoBtn');
  const exportBackupButton = document.getElementById('exportBackupBtn');
  const importBackupInput = document.getElementById('importBackupInput');
  const clearDemoDataButton = document.getElementById('clearDemoDataBtn');

  bindPasswordToggles();

  document.querySelectorAll('[data-settings-tab]').forEach(button => {
    button.addEventListener('click', () => {
      const tab = button.dataset.settingsTab;
      if (!SETTINGS_TABS.some(item => item.id === tab)) return;
      state.settingsTab = tab;
      writeStorageText('fandqi.settingsTab', tab);
      document.querySelectorAll('[data-settings-tab]').forEach(item => {
        const isActive = item.dataset.settingsTab === tab;
        item.classList.toggle('active', isActive);
        item.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
      document.querySelectorAll('[data-settings-panel]').forEach(panel => {
        panel.classList.toggle('active', panel.dataset.settingsPanel === tab);
      });
      if (typeof resetPlatformSettingsScrollLock === 'function') resetPlatformSettingsScrollLock();
    });
  });

  if (exportBackupButton) exportBackupButton.addEventListener('click', exportBackup);
  if (importBackupInput) importBackupInput.addEventListener('change', () => importBackupFile(importBackupInput.files?.[0]));
  if (clearDemoDataButton) clearDemoDataButton.addEventListener('click', clearDemoData);

  if (logoInput && logoDataInput && logoPreview) {
    logoInput.addEventListener('change', () => {
      const file = logoInput.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        const value = String(reader.result || '');
        logoDataInput.value = value;
        logoPreview.classList.add('has-logo');
        logoPreview.innerHTML = `<img src="${h(value)}" alt="${h(t('settings.fields.logo'))}">`;
      });
      reader.readAsDataURL(file);
    });
  }

  if (removeLogoButton && logoDataInput && logoPreview) {
    removeLogoButton.addEventListener('click', () => {
      logoDataInput.value = '';
      logoPreview.classList.remove('has-logo');
      logoPreview.innerHTML = `<span>${h(t('app.initial', 'ف'))}</span>`;
      if (logoInput) logoInput.value = '';
    });
  }

  if (!form) return;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const currentPassword = String(data.currentPassword || '');
    const newPassword = String(data.newPassword || '');
    const confirmPassword = String(data.confirmPassword || '');

    if (currentPassword || newPassword || confirmPassword) {
      if (currentPassword !== getPlatformOwnerPassword()) {
        toast(t('settings.validation.currentPasswordWrong'));
        return;
      }
      if (!newPassword || newPassword.length < 6) {
        toast(t('settings.validation.passwordTooShort'));
        return;
      }
      if (newPassword !== confirmPassword) {
        toast(t('settings.validation.passwordMismatch'));
        return;
      }
      writePlatformOwnerPassword(newPassword);
    }

    const settings = {
      ...readPlatformSettings(),
      platformName: String(data.platformName || '').trim(),
      platformNameEn: String(data.platformNameEn || '').trim(),
      platformEmail: String(data.platformEmail || '').trim(),
      platformPhone: String(data.platformPhone || '').trim(),
      defaultCurrency: data.defaultCurrency || 'USD',
      defaultCountry: String(data.defaultCountry || '').trim(),
      timezone: data.timezone || 'Europe/Istanbul',
      dateFormat: data.dateFormat || 'YYYY-MM-DD',
      timeFormat: data.timeFormat || '24',
      defaultLanguage: data.defaultLanguage || i18n.state.lang,
      defaultTheme: 'light',
      invoiceTitle: String(data.invoiceTitle || '').trim(),
      invoiceFooter: String(data.invoiceFooter || '').trim(),
      taxRate: Math.max(0, Number(data.taxRate || 0)),
      invoicePrefix: String(data.invoicePrefix || 'INV').trim(),
      invoiceLastNumber: Math.max(0, Number(data.invoiceLastNumber || 0)),
      subscriptionPrefix: String(data.subscriptionPrefix || 'SUB').trim(),
      subscriptionLastNumber: Math.max(0, Number(data.subscriptionLastNumber || 0)),
      subscriptionExpireBeforeDays: Math.max(1, Number(data.subscriptionExpireBeforeDays || 7)),
      notifySubscriptionExpired: boolFromFormValue(data.notifySubscriptionExpired),
      notifyNewHotel: boolFromFormValue(data.notifyNewHotel),
      notifyHotelSuspended: boolFromFormValue(data.notifyHotelSuspended),
      subscriptionWarningMessage: String(data.subscriptionWarningMessage || '').trim(),
      subscriptionExpiredMessage: String(data.subscriptionExpiredMessage || '').trim(),
      supportEmail: String(data.supportEmail || '').trim(),
      supportPhone: String(data.supportPhone || '').trim(),
      supportWhatsapp: String(data.supportWhatsapp || '').trim(),
      supportWhatsappLink: String(data.supportWhatsappLink || '').trim(),
      facebookUrl: String(data.facebookUrl || '').trim(),
      instagramUrl: String(data.instagramUrl || '').trim(),
      websiteUrl: String(data.websiteUrl || '').trim(),
      subscriptionTerms: String(data.subscriptionTerms || '').trim(),
      suspensionPolicy: String(data.suspensionPolicy || '').trim(),
      legalNote: String(data.legalNote || '').trim(),
      logoDataUrl: String(data.logoDataUrl || '').trim(),
      notes: String(data.notes || '').trim(),
      updatedAt: todayISO()
    };
    writePlatformSettings(settings);
    setTheme('light');
    if (settings.defaultLanguage !== i18n.state.lang) {
      await i18n.load(settings.defaultLanguage);
    }
    toast(currentPassword || newPassword || confirmPassword ? t('settings.toast.savedWithPassword') : t('settings.toast.saved'));
    render();
  });
}


function applyDashboardFilter(filterType) {
  if (filterType === 'hotels_all') state.hotelFilters.status = 'all';
  if (filterType === 'hotels_active') state.hotelFilters.status = 'active';
  if (filterType === 'hotels_suspended') state.hotelFilters.status = 'suspended';
  if (filterType === 'managers_all') state.managerFilters.status = 'all';
  if (filterType === 'packages_active') state.packageFilters.status = 'active';
  if (filterType === 'subscriptions_all') state.subscriptionFilters.status = 'all';
  if (filterType === 'subscriptions_active') state.subscriptionFilters.status = 'active';
  if (filterType === 'subscriptions_expired') state.subscriptionFilters.status = 'expired';
}

function bindDashboardEvents() {
  document.querySelectorAll('[data-dashboard-page]').forEach(button => {
    button.addEventListener('click', () => {
      applyDashboardFilter(button.dataset.dashboardFilter || '');
      setActivePage(button.dataset.dashboardPage);
    });
  });

  document.querySelectorAll('[data-dashboard-action]').forEach(button => {
    button.addEventListener('click', () => {
      const action = button.dataset.dashboardAction;
      if (action === 'add_hotel') {
        state.activePage = 'hotels';
        state.hotelModal = { mode: 'add', id: null };
        writeStorageText('fandqi.activePage', state.activePage);
        render();
      }
      if (action === 'add_package') {
        state.activePage = 'packages';
        state.packageModal = { mode: 'add', id: null };
        writeStorageText('fandqi.activePage', state.activePage);
        render();
      }
      if (action === 'add_subscription') {
        if (!readHotels().some(hotel => hotel.status !== 'archived')) {
          toast(t('subscription.validation.addHotelFirst'));
          return;
        }
        if (!getActivePackages().length) {
          toast(t('subscription.validation.addPackageFirst'));
          return;
        }
        state.activePage = 'subscriptions';
        state.subscriptionModal = { mode: 'edit', hotelId: null };
        writeStorageText('fandqi.activePage', state.activePage);
        render();
      }
    });
  });

  document.querySelectorAll('[data-dashboard-subscription]').forEach(button => {
    button.addEventListener('click', () => {
      state.activePage = 'subscriptions';
      state.subscriptionModal = { mode: 'view', hotelId: button.dataset.dashboardSubscription };
      writeStorageText('fandqi.activePage', state.activePage);
      render();
    });
  });
}

function bindFoodServicesEvents() {
  const addButton = document.getElementById('addFoodOrderBtn');
  if (addButton) addButton.addEventListener('click', openFoodOrderModal);

  const addMenuItemButton = document.getElementById('addFoodMenuItemBtn');
  if (addMenuItemButton) addMenuItemButton.addEventListener('click', openFoodMenuModal);

  document.querySelectorAll('[data-action="close-food-order-modal"]').forEach(button => {
    button.addEventListener('click', closeFoodOrderModal);
  });

  document.querySelectorAll('[data-action="close-food-menu-modal"]').forEach(button => {
    button.addEventListener('click', closeFoodMenuModal);
  });

  document.querySelectorAll('[data-action="print-food-order-invoice"]').forEach(button => {
    button.addEventListener('click', () => printFoodOrderInvoice(button.dataset.id));
  });

  const menuForm = document.getElementById('foodMenuItemForm');
  if (menuForm) menuForm.addEventListener('submit', event => {
    event.preventDefault();
    const hotel = getManagerHotel();
    if (!hotel) return;
    const data = Object.fromEntries(new FormData(menuForm).entries());
    const menuItem = {
      id: createId('menu-item'),
      hotelId: hotel.id,
      serviceType: data.serviceType || 'restaurant',
      category: data.category || 'extras',
      name: String(data.name || '').trim(),
      price: Math.max(0, Number(data.price || 0)),
      currency: data.currency || 'USD',
      availability: data.availability || 'available',
      status: 'active',
      description: data.description || '',
      createdAt: todayISO(),
      updatedAt: todayISO()
    };
    const feature = foodFeature();
    if (feature?.actions?.addMenuItem) {
      feature.actions.addMenuItem(menuItem, {
        idFactory: prefix => createId(prefix),
        today: todayISO
      });
    } else {
      const items = readFoodMenuItems();
      items.push(menuItem);
      writeFoodMenuItems(items);
    }
    closeFoodMenuModal();
  });

  const sourceSelect = document.getElementById('foodOrderSourceType');
  const roomSelect = document.getElementById('foodOrderRoomId');
  const guestSelect = document.getElementById('foodOrderGuestEntry');
  const roomNumberInput = document.getElementById('foodOrderRoomNumber');
  const reservationInput = document.getElementById('foodOrderReservationId');
  const guestNameInput = document.getElementById('foodOrderGuestName');
  const walkInGuestInput = document.getElementById('foodOrderWalkInGuestName');
  const tableInput = document.getElementById('foodOrderTableNumber');

  const syncFoodGuestFields = () => {
    if (!guestSelect) return;
    const selectedOption = guestSelect.options[guestSelect.selectedIndex];
    const roomId = selectedOption?.dataset?.roomId || '';
    const roomNumber = selectedOption?.dataset?.roomNumber || '';
    if (roomSelect && roomId && roomSelect.value !== roomId) roomSelect.value = roomId;
    if (roomNumberInput) roomNumberInput.value = roomNumber;
    if (reservationInput) reservationInput.value = selectedOption?.dataset?.reservationId || '';
    if (guestNameInput) guestNameInput.value = selectedOption?.dataset?.guestName || '';
    if (walkInGuestInput && selectedOption?.value) walkInGuestInput.value = '';
  };

  const filterFoodGuestsByRoom = () => {
    if (!guestSelect || !roomSelect) return;
    const roomId = roomSelect.value;
    [...guestSelect.options].forEach(option => {
      if (!option.value) {
        option.hidden = false;
        return;
      }
      option.hidden = Boolean(roomId) && option.dataset.roomId !== roomId;
    });
    const selectedOption = guestSelect.options[guestSelect.selectedIndex];
    if (selectedOption?.hidden) guestSelect.value = '';
    syncFoodGuestFields();
  };

  const syncFoodSourceFields = () => {
    const source = sourceSelect?.value || 'room';
    const isRoomSource = source === 'room';
    const isTableSource = source === 'table';
    if (tableInput) {
      tableInput.closest('.field')?.classList.toggle('hidden', !isTableSource);
      if (!isTableSource) tableInput.value = '';
    }
    if (roomSelect) roomSelect.closest('.field')?.classList.toggle('food-field-required', isRoomSource);
    if (guestSelect) guestSelect.closest('.field')?.classList.toggle('food-field-required', isRoomSource);
    if (walkInGuestInput) {
      walkInGuestInput.closest('.field')?.classList.toggle('hidden', isRoomSource);
      if (isRoomSource) walkInGuestInput.value = '';
    }
  };

  if (roomSelect) roomSelect.addEventListener('change', filterFoodGuestsByRoom);
  if (guestSelect) guestSelect.addEventListener('change', syncFoodGuestFields);
  if (sourceSelect) sourceSelect.addEventListener('change', syncFoodSourceFields);
  syncFoodSourceFields();
  filterFoodGuestsByRoom();

  const hotelForItems = getManagerHotel();
  const menuItemsForOrder = hotelForItems ? getHotelAvailableFoodMenuItems(hotelForItems.id) : [];
  const orderItemsList = document.getElementById('foodOrderItemsList');
  const orderAmountInput = document.getElementById('foodOrderAmount');
  const orderTextInput = document.getElementById('foodOrderTextInput');
  let foodOrderRowCounter = 1;

  const collectFoodOrderItemsFromForm = () => {
    if (!orderItemsList) return [];
    return [...orderItemsList.querySelectorAll('[data-food-order-item-row]')].map(row => {
      const select = row.querySelector('[data-food-order-item-select]');
      const qtyInput = row.querySelector('[data-food-order-item-qty]');
      const option = select?.options?.[select.selectedIndex];
      const item = menuItemsForOrder.find(menuItem => menuItem.id === select?.value);
      const quantity = Math.max(1, Number(qtyInput?.value || 1));
      if (!item || !select?.value) return null;
      return {
        id: item.id,
        name: item.name,
        category: item.category,
        serviceType: item.serviceType,
        price: Number(option?.dataset?.price || item.price || 0),
        quantity,
        total: Number(option?.dataset?.price || item.price || 0) * quantity
      };
    }).filter(Boolean);
  };

  const syncFoodOrderTotal = () => {
    const items = collectFoodOrderItemsFromForm();
    const total = getFoodOrderItemsTotal(items);
    if (orderAmountInput) orderAmountInput.value = String(total);
    if (orderTextInput) orderTextInput.value = items.map(item => `${item.name} × ${item.quantity}`).join(t('common.listSeparator', '، '));
    if (orderItemsList) {
      [...orderItemsList.querySelectorAll('[data-food-order-item-row]')].forEach(row => {
        const select = row.querySelector('[data-food-order-item-select]');
        const qtyInput = row.querySelector('[data-food-order-item-qty]');
        const option = select?.options?.[select.selectedIndex];
        const lineTotal = row.querySelector('[data-food-order-line-total]');
        const totalValue = Number(option?.dataset?.price || 0) * Math.max(1, Number(qtyInput?.value || 1));
        if (lineTotal) lineTotal.textContent = String(totalValue);
      });
    }
  };

  document.querySelectorAll('[data-action="add-food-order-item-row"]').forEach(button => {
    button.addEventListener('click', () => {
      if (!orderItemsList) return;
      orderItemsList.insertAdjacentHTML('beforeend', getFoodOrderItemRowHtml(menuItemsForOrder, foodOrderRowCounter));
      foodOrderRowCounter += 1;
      syncFoodOrderTotal();
    });
  });

  if (orderItemsList) orderItemsList.addEventListener('input', event => {
    if (event.target?.matches?.('[data-food-order-item-select], [data-food-order-item-qty]')) syncFoodOrderTotal();
  });
  if (orderItemsList) orderItemsList.addEventListener('change', event => {
    if (event.target?.matches?.('[data-food-order-item-select], [data-food-order-item-qty]')) syncFoodOrderTotal();
  });
  if (orderItemsList) orderItemsList.addEventListener('click', event => {
    const button = event.target.closest('[data-action="remove-food-order-item-row"]');
    if (!button) return;
    const rows = orderItemsList.querySelectorAll('[data-food-order-item-row]');
    if (rows.length <= 1) return;
    button.closest('[data-food-order-item-row]')?.remove();
    syncFoodOrderTotal();
  });
  syncFoodOrderTotal();

  const form = document.getElementById('foodOrderForm');
  if (form) form.addEventListener('submit', async event => {
    event.preventDefault();
    const hotel = getManagerHotel();
    if (!hotel) return;
    const data = Object.fromEntries(new FormData(form).entries());
    const selectedOrderItems = collectFoodOrderItemsFromForm();
    if (!selectedOrderItems.length) {
      toast(t('foodServices.validation.itemsRequired'));
      return;
    }
    const sourceType = data.sourceType || 'hospitality';
    const guestEntry = getFoodOrderGuestOptions(hotel.id).find(entry => entry.id === data.guestEntryId) || null;
    const manualGuestName = String(data.walkInGuestName || '').trim();
    if (sourceType === 'room' && !guestEntry) {
      toast(t('foodServices.validation.roomGuestRequired'));
      return;
    }
    if (sourceType === 'table' && !String(data.tableNumber || '').trim()) {
      toast(t('foodServices.validation.tableRequired'));
      return;
    }
    if (!guestEntry && !manualGuestName) {
      toast(t('foodServices.validation.guestNameRequired'));
      return;
    }
    if ((data.paymentMethod || 'cash') === 'room_account' && sourceType === 'room' && !guestEntry?.reservationId) {
      toast(t('foodServices.validation.roomAccountGuestRequired'));
      return;
    }
    const roomNumberFromSelect = roomSelect?.options?.[roomSelect.selectedIndex]?.dataset?.roomNumber || data.roomNumber || '';
    const amount = getFoodOrderItemsTotal(selectedOrderItems);
    const order = {
      id: createId('food-order'),
      hotelId: hotel.id,
      serviceType: data.serviceType,
      sourceType,
      roomId: guestEntry?.room?.id || guestEntry?.reservation?.roomId || data.roomId || '',
      roomNumber: guestEntry?.room?.number || roomNumberFromSelect || '',
      reservationId: guestEntry?.reservationId || '',
      reservationNo: guestEntry?.reservationNo || '',
      guestEntryId: guestEntry?.id || '',
      guestName: guestEntry?.name || manualGuestName,
      guestType: guestEntry?.type || 'walk_in',
      tableNumber: data.tableNumber,
      paymentMethod: data.paymentMethod || 'cash',
      externalVendor: data.externalVendor,
      orderText: selectedOrderItems.map(item => `${item.name} × ${item.quantity}`).join(t('common.listSeparator', '، ')),
      items: selectedOrderItems,
      amount,
      currency: data.currency,
      notes: data.notes,
      status: 'delivered',
      deliveredAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      updatedAt: todayISO()
    };
    const feature = foodFeature();
    if (feature?.actions?.addOrder) {
      feature.actions.addOrder(order, {
        idFactory: prefix => createId(prefix),
        now: () => new Date().toISOString().slice(0, 16).replace('T', ' '),
        today: todayISO
      });
    } else {
      const orders = readFoodOrders();
      orders.push(order);
      writeFoodOrders(orders);
    }
    closeFoodOrderModal();
  });
}

function refreshPaymentsTable() {
  render();
}

function bindPaymentsEvents() {
  const searchInput = document.getElementById('paymentsSearch');
  if (searchInput) searchInput.addEventListener('input', event => {
    state.paymentFilters.search = event.target.value;
    refreshPaymentsTable();
  });
  const methodFilter = document.getElementById('paymentsMethodFilter');
  if (methodFilter) methodFilter.addEventListener('change', event => {
    state.paymentFilters.method = event.target.value;
    refreshPaymentsTable();
  });
  document.querySelectorAll('[data-action="print-food-order-invoice"]').forEach(button => {
    button.addEventListener('click', () => printFoodOrderInvoice(button.dataset.id));
  });
}

function bindWorkspaceEvents(activePage, role) {
  if (role === 'platform_owner' && activePage === 'dashboard') bindDashboardEvents();
  if (role === 'platform_owner' && activePage === 'hotels') bindHotelsEvents();
  if (role === 'platform_owner' && activePage === 'hotel_managers') bindManagersEvents();
  if (role === 'platform_owner' && activePage === 'packages') bindPackagesEvents();
  if (role === 'platform_owner' && activePage === 'subscriptions') bindSubscriptionsEvents();
  if (role === 'platform_owner' && activePage === 'subscription_requests' && typeof bindPlatformSubscriptionRequestActions === 'function') bindPlatformSubscriptionRequestActions();
  if (role === 'platform_owner' && activePage === 'platform_settings') bindPlatformSettingsEvents();
  if (isHotelOperationalRole(role) && (activePage === 'dashboard' || activePage === 'front_desk')) bindManagerDashboardEvents();
  if (role === 'hotel_manager' && activePage === 'hotel_settings') bindHotelSettingsEvents();
  if (role === 'hotel_manager' && activePage === 'staff') bindStaffEvents();
  if (isHotelOperationalRole(role) && activePage === 'rooms') bindRoomsEvents();
  if (isHotelOperationalRole(role) && activePage === 'reservations') bindReservationsEvents();
  if (role === 'hotel_manager' && activePage === 'guests') bindGuestsEvents();
  if (isHotelOperationalRole(role) && activePage === 'check_in_out') bindCheckInOutEvents();
  if (isHotelOperationalRole(role) && activePage === 'housekeeping') bindHousekeepingEvents();
  if (isHotelOperationalRole(role) && activePage === 'maintenance') bindMaintenanceEvents();
  if (role === 'hotel_manager' && activePage === 'subscription_plan') bindHotelSubscriptionPlanEvents();
  if (isHotelOperationalRole(role) && activePage === 'payments') bindPaymentsEvents();
  if (isHotelOperationalRole(role) && activePage === 'room_service') bindFoodServicesEvents();
  if (activePage === 'notifications') bindNotificationsPageEvents();
  if (isHotelOperationalRole(role) && activePage === 'reports') bindReportsEvents();
}

function render() {
  if (state.authenticated && state.currentUser) {
    renderShell();
  } else {
    renderLogin();
  }
  applyCentralDesignSystem();
}

async function init() {
  setTheme('light');
  await i18n.load();
  render();
}

init().catch(error => {
  app.textContent = error.message;
});
