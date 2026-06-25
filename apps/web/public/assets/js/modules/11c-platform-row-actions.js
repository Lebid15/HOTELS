function bindHotelsEvents() {
  const addButton = document.getElementById('addHotelBtn');
  if (addButton) addButton.addEventListener('click', () => openHotelModal('add'));

  const searchInput = document.getElementById('hotelSearch');
  if (searchInput) searchInput.addEventListener('input', event => {
    state.hotelFilters.search = event.target.value;
    refreshHotelsTable();
  });

  const statusFilter = document.getElementById('hotelStatusFilter');
  if (statusFilter) statusFilter.addEventListener('change', event => {
    state.hotelFilters.status = event.target.value;
    refreshHotelsTable();
  });

  const locationFilter = document.getElementById('hotelLocationFilter');
  if (locationFilter) locationFilter.addEventListener('input', event => {
    state.hotelFilters.location = event.target.value;
    refreshHotelsTable();
  });

  bindHotelRowActions();

  document.querySelectorAll('[data-action="close-modal"]').forEach(button => {
    button.addEventListener('click', closeHotelModal);
  });

  const form = document.getElementById('hotelForm');
  bindAvatarUploaders();
  bindHotelRoomTypeEditor();
  bindReceptionShiftEvents();
  bindFoodServiceSettingsEvents();

  if (form) form.addEventListener('submit', async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const mode = form.dataset.mode;
    const id = form.dataset.id;
    const hotels = readHotels();
    const sharedEmail = normalizeEmail(data.email);
    const existingHotel = hotels.find(hotel => hotel.id === id) || {};
    const managerAvatar = await getAvatarPayload('managerPhoto', existingHotel.managerPhotoDataUrl || '', existingHotel.managerPhotoFileName || '');

    if (normalizePassword(data.managerPassword) !== normalizePassword(data.managerPasswordConfirm)) {
      toast(t('hotel.validation.passwordMismatch'));
      return;
    }

    if (mode === 'add') {
      hotels.push({
        id: createId('hotel'),
        name: data.name,
        country: data.country,
        city: data.city,
        address: data.address,
        phone: data.phone,
        email: sharedEmail,
        managerName: data.managerName,
        managerEmail: sharedEmail,
        managerPassword: normalizePassword(data.managerPassword),
        managerPhotoDataUrl: managerAvatar.dataUrl,
        managerPhotoFileName: managerAvatar.fileName,
        managerStatus: 'active',
        status: data.status || 'active',
        createdAt: todayISO(),
        updatedAt: todayISO()
      });
    } else {
      const index = hotels.findIndex(hotel => hotel.id === id);
      if (index >= 0) {
        if (mode === 'manager') {
          hotels[index] = {
            ...hotels[index],
            email: sharedEmail,
            managerName: data.managerName,
            managerEmail: sharedEmail,
            managerPassword: normalizePassword(data.managerPassword),
            managerPhotoDataUrl: managerAvatar.dataUrl,
            managerPhotoFileName: managerAvatar.fileName,
            updatedAt: todayISO()
          };
        } else {
          hotels[index] = {
            ...hotels[index],
            name: data.name,
            country: data.country,
            city: data.city,
            address: data.address,
            phone: data.phone,
            email: sharedEmail,
            managerName: data.managerName,
            managerEmail: sharedEmail,
            managerPassword: normalizePassword(data.managerPassword),
            managerPhotoDataUrl: managerAvatar.dataUrl,
            managerPhotoFileName: managerAvatar.fileName,
            status: data.status || hotels[index].status,
            updatedAt: todayISO()
          };
        }
      }
    }

    writeHotels(hotels);
    closeHotelModal();
  });

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


function refreshManagersTable() {
  const slot = document.getElementById('managersTableSlot');
  if (!slot) return;
  slot.innerHTML = renderManagersTable(getFilteredManagers());
  applyCentralDesignSystem(slot);
  bindManagerRowActions();
}

function bindManagerRowActions() {
  document.querySelectorAll('[data-action="toggle-manager"]').forEach(button => {
    button.addEventListener('click', () => {
      const hotels = readHotels().map(hotel => {
        if (hotel.id !== button.dataset.id) return hotel;
        const currentStatus = hotel.managerStatus || 'active';
        return { ...hotel, managerStatus: currentStatus === 'active' ? 'suspended' : 'active', updatedAt: todayISO() };
      });
      writeHotels(hotels);
      refreshManagersTable();
    });
  });
}

function bindManagersEvents() {
  const searchInput = document.getElementById('managerSearch');
  if (searchInput) searchInput.addEventListener('input', event => {
    state.managerFilters.search = event.target.value;
    refreshManagersTable();
  });

  const statusFilter = document.getElementById('managerStatusFilter');
  if (statusFilter) statusFilter.addEventListener('change', event => {
    state.managerFilters.status = event.target.value;
    refreshManagersTable();
  });

  const hotelStatusFilter = document.getElementById('managerHotelStatusFilter');
  if (hotelStatusFilter) hotelStatusFilter.addEventListener('change', event => {
    state.managerFilters.hotelStatus = event.target.value;
    refreshManagersTable();
  });

  bindHotelRowActions();
  bindManagerRowActions();

  document.querySelectorAll('[data-action="close-modal"]').forEach(button => {
    button.addEventListener('click', closeHotelModal);
  });

  const form = document.getElementById('hotelForm');
  bindAvatarUploaders();
  bindHotelRoomTypeEditor();
  bindReceptionShiftEvents();
  bindFoodServiceSettingsEvents();

  if (form) form.addEventListener('submit', async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const mode = form.dataset.mode;
    const id = form.dataset.id;
    const hotels = readHotels();
    const sharedEmail = normalizeEmail(data.email);
    const existingHotel = hotels.find(hotel => hotel.id === id) || {};
    const managerAvatar = await getAvatarPayload('managerPhoto', existingHotel.managerPhotoDataUrl || '', existingHotel.managerPhotoFileName || '');

    if (normalizePassword(data.managerPassword) !== normalizePassword(data.managerPasswordConfirm)) {
      toast(t('hotel.validation.passwordMismatch'));
      return;
    }

    const index = hotels.findIndex(hotel => hotel.id === id);
    if (index >= 0 && mode === 'manager') {
      hotels[index] = {
        ...hotels[index],
        email: sharedEmail,
        managerName: data.managerName,
        managerEmail: sharedEmail,
        managerPassword: normalizePassword(data.managerPassword),
        managerPhotoDataUrl: managerAvatar.dataUrl,
        managerPhotoFileName: managerAvatar.fileName,
        managerStatus: hotels[index].managerStatus || 'active',
        updatedAt: todayISO()
      };
    }

    writeHotels(hotels);
    closeHotelModal();
  });

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



function refreshPackagesTable() {
  const slot = document.getElementById('packagesTableSlot');
  if (!slot) return;
  slot.innerHTML = renderPackagesTable(getFilteredPackages());
  applyCentralDesignSystem(slot);
  bindPackageRowActions();
}

function bindPackageRowActions() {
  document.querySelectorAll('[data-action="view-package"]').forEach(button => {
    button.addEventListener('click', () => openPackageModal('view', button.dataset.id));
  });
  document.querySelectorAll('[data-action="edit-package"]').forEach(button => {
    button.addEventListener('click', () => openPackageModal('edit', button.dataset.id));
  });
  document.querySelectorAll('[data-action="toggle-package"]').forEach(button => {
    button.addEventListener('click', () => {
      const packages = readPackages().map(packageItem => {
        if (packageItem.id !== button.dataset.id) return packageItem;
        return { ...packageItem, status: packageItem.status === 'active' ? 'suspended' : 'active', updatedAt: todayISO() };
      });
      writePackages(packages);
      refreshPackagesTable();
    });
  });
  document.querySelectorAll('[data-action="archive-package"]').forEach(button => {
    button.addEventListener('click', () => {
      const packages = readPackages().map(packageItem => packageItem.id === button.dataset.id ? { ...packageItem, status: 'archived', updatedAt: todayISO() } : packageItem);
      writePackages(packages);
      refreshPackagesTable();
    });
  });
}

function bindPackagesEvents() {
  const addButton = document.getElementById('addPackageBtn');
  if (addButton) addButton.addEventListener('click', () => openPackageModal('add'));

  const searchInput = document.getElementById('packageSearch');
  if (searchInput) searchInput.addEventListener('input', event => {
    state.packageFilters.search = event.target.value;
    refreshPackagesTable();
  });

  const statusFilter = document.getElementById('packageStatusFilter');
  if (statusFilter) statusFilter.addEventListener('change', event => {
    state.packageFilters.status = event.target.value;
    refreshPackagesTable();
  });

  bindPackageRowActions();

  document.querySelectorAll('[data-action="close-package-modal"]').forEach(button => {
    button.addEventListener('click', closePackageModal);
  });

  const form = document.getElementById('packageForm');
  bindHotelRoomTypeEditor();
  bindReceptionShiftEvents();
  bindFoodServiceSettingsEvents();

  if (form) form.addEventListener('submit', async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const mode = form.dataset.mode;
    const id = form.dataset.id;
    const packages = readPackages();
    const nextPackage = {
      id: mode === 'edit' && id ? id : createId('package'),
      name: data.name,
      description: data.description,
      durationDays: Math.max(1, Number(data.durationDays || 30)),
      price: data.price,
      currency: data.currency || 'USD',
      status: data.status || 'active',
      maxUsers: data.maxUsers,
      maxRooms: data.maxRooms,
      restaurantSupport: data.restaurantSupport || 'no',
      reportsSupport: data.reportsSupport || 'no',
      trialSupport: data.trialSupport || 'no',
      notes: data.notes,
      createdAt: todayISO(),
      updatedAt: todayISO()
    };

    if (mode === 'edit') {
      const index = packages.findIndex(packageItem => packageItem.id === id);
      if (index >= 0) {
        nextPackage.createdAt = packages[index].createdAt || todayISO();
        packages[index] = nextPackage;
      } else {
        packages.push(nextPackage);
      }
    } else {
      packages.push(nextPackage);
    }

    writePackages(packages);
    closePackageModal();
  });
}

function refreshSubscriptionRequestsPanel() {
  const slot = document.getElementById('subscriptionRequestsSlot');
  if (!slot || typeof renderOwnerSubscriptionRequestsPanel !== 'function') return;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderOwnerSubscriptionRequestsPanel().trim();
  const next = wrapper.firstElementChild;
  if (!next) return;
  slot.replaceWith(next);
  applyCentralDesignSystem(next);
}

function refreshSubscriptionsTable() {
  const slot = document.getElementById('subscriptionsTableSlot');
  if (!slot) return;
  slot.innerHTML = renderSubscriptionsTable(getFilteredSubscriptions());
  applyCentralDesignSystem(slot);
  bindSubscriptionRowActions();
}

function renewSubscription(hotelId) {
  const subscriptions = readSubscriptions();
  const index = subscriptions.findIndex(subscription => subscription.hotelId === hotelId);
  if (index < 0) return;
  const current = subscriptions[index];
  const packageItem = getPackageById(current.packageId || current.plan);
  const durationDays = Math.max(1, Number(current.durationDays || packageItem?.durationDays || 30));
  const startDate = todayISO();
  const endDate = calculateSubscriptionEndDate(startDate, durationDays);
  subscriptions[index] = {
    ...current,
    packageName: packageItem?.name || current.packageName,
    durationDays,
    status: 'active',
    startDate,
    endDate,
    monthlyAmount: current.monthlyAmount || packageItem?.price || '',
    currency: current.currency || packageItem?.currency || 'USD',
    paymentStatus: 'unpaid',
    updatedAt: todayISO()
  };
  writeSubscriptions(subscriptions);
  toast(t('subscription.toast.renewed'));
  refreshSubscriptionsTable();
}

function bindSubscriptionRowActions() {
  if (typeof bindPlatformSubscriptionRequestActions === 'function') bindPlatformSubscriptionRequestActions();
  document.querySelectorAll('[data-action="approve-subscription-request"]').forEach(button => {
    button.addEventListener('click', () => applySubscriptionRequestApproval(button.dataset.id || '', true));
  });
  document.querySelectorAll('[data-action="reject-subscription-request"]').forEach(button => {
    button.addEventListener('click', () => applySubscriptionRequestApproval(button.dataset.id || '', false));
  });
  document.querySelectorAll('[data-action="edit-subscription"]').forEach(button => {
    button.addEventListener('click', () => openSubscriptionModal('edit', button.dataset.id));
  });
  document.querySelectorAll('[data-action="view-subscription"]').forEach(button => {
    button.addEventListener('click', () => openSubscriptionModal('view', button.dataset.id));
  });
  document.querySelectorAll('[data-action="renew-subscription"]').forEach(button => {
    button.addEventListener('click', () => renewSubscription(button.dataset.id));
  });
  document.querySelectorAll('[data-action="toggle-subscription"]').forEach(button => {
    button.addEventListener('click', () => {
      const subscriptions = readSubscriptions().map(subscription => {
        if (subscription.hotelId !== button.dataset.id) return subscription;
        const effectiveStatus = getSubscriptionStatus(subscription);
        return { ...subscription, status: effectiveStatus === 'suspended' ? 'active' : 'suspended', updatedAt: todayISO() };
      });
      writeSubscriptions(subscriptions);
      refreshSubscriptionsTable();
    });
  });
}

function bindSubscriptionsEvents() {
  const addButton = document.getElementById('addSubscriptionBtn');
  if (addButton) addButton.addEventListener('click', () => {
    if (!readHotels().some(hotel => hotel.status !== 'archived')) {
      toast(t('subscription.validation.addHotelFirst'));
      return;
    }
    if (!getActivePackages().length) {
      toast(t('subscription.validation.addPackageFirst'));
      return;
    }
    openSubscriptionModal('edit');
  });

  const searchInput = document.getElementById('subscriptionSearch');
  if (searchInput) searchInput.addEventListener('input', event => {
    state.subscriptionFilters.search = event.target.value;
    refreshSubscriptionsTable();
  });

  const statusFilter = document.getElementById('subscriptionStatusFilter');
  if (statusFilter) statusFilter.addEventListener('change', event => {
    state.subscriptionFilters.status = event.target.value;
    refreshSubscriptionsTable();
  });

  const planFilter = document.getElementById('subscriptionPlanFilter');
  if (planFilter) planFilter.addEventListener('change', event => {
    state.subscriptionFilters.plan = event.target.value;
    refreshSubscriptionsTable();
  });

  bindSubscriptionRowActions();

  document.querySelectorAll('[data-action="close-subscription-modal"]').forEach(button => {
    button.addEventListener('click', closeSubscriptionModal);
  });

  const hotelSelect = document.getElementById('subscriptionHotelSelect');
  if (hotelSelect) hotelSelect.addEventListener('change', event => {
    openSubscriptionModal('edit', event.target.value);
  });

  const planSelect = document.getElementById('subscriptionPlanSelect');
  const durationInput = document.getElementById('subscriptionDurationDays');
  const startInput = document.getElementById('subscriptionStartDate');
  const endInput = document.getElementById('subscriptionEndDate');
  const amountInput = document.getElementById('subscriptionMonthlyAmount');
  const currencySelect = document.getElementById('subscriptionCurrency');
  const currencyHidden = document.getElementById('subscriptionCurrencyHidden');

  const applyPackageDefaults = () => {
    const packageItem = getPackageById(planSelect?.value);
    if (!packageItem) return;
    if (durationInput) durationInput.value = Math.max(1, Number(packageItem.durationDays || 30));
    if (amountInput) amountInput.value = packageItem.price || '';
    if (currencySelect) currencySelect.value = packageItem.currency || 'USD';
    if (currencyHidden) currencyHidden.value = packageItem.currency || 'USD';
  };

  const syncSubscriptionDates = () => {
    if (!startInput || !durationInput || !endInput) return;
    const startDate = startInput.value || todayISO();
    const durationDays = Math.max(1, Number(durationInput.value || getSubscriptionPlanDays(planSelect?.value)));
    startInput.value = startDate;
    durationInput.value = durationDays;
    endInput.value = calculateSubscriptionEndDate(startDate, durationDays);
  };

  if (planSelect) planSelect.addEventListener('change', () => {
    applyPackageDefaults();
    syncSubscriptionDates();
  });
  if (durationInput) durationInput.addEventListener('input', syncSubscriptionDates);
  if (startInput) startInput.addEventListener('change', syncSubscriptionDates);
  syncSubscriptionDates();

  const form = document.getElementById('subscriptionForm');
  bindHotelRoomTypeEditor();
  bindReceptionShiftEvents();
  bindFoodServiceSettingsEvents();

  if (form) form.addEventListener('submit', async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.hotelId) {
      toast(t('subscription.validation.hotelRequired'));
      return;
    }
    if (!data.packageId) {
      toast(t('subscription.validation.packageRequired'));
      return;
    }
    const packageItem = getPackageById(data.packageId);
    if (!packageItem) {
      toast(t('subscription.validation.packageRequired'));
      return;
    }
    const durationDays = Math.max(1, Number(data.durationDays || packageItem.durationDays || 30));
    const startDate = data.startDate || todayISO();
    const endDate = calculateSubscriptionEndDate(startDate, durationDays);

    const subscriptions = readSubscriptions();
    const index = subscriptions.findIndex(subscription => subscription.hotelId === data.hotelId);
    const nextSubscription = {
      id: index >= 0 ? subscriptions[index].id : createId('subscription'),
      hotelId: data.hotelId,
      packageId: data.packageId,
      packageName: packageItem.name,
      plan: data.packageId,
      durationDays,
      status: normalizeSubscriptionStatus(data.status, endDate),
      startDate,
      endDate,
      monthlyAmount: data.monthlyAmount || packageItem.price || '',
      currency: data.currency || packageItem.currency || 'USD',
      paymentStatus: data.paymentStatus,
      notes: data.notes,
      createdAt: index >= 0 ? subscriptions[index].createdAt : todayISO(),
      updatedAt: todayISO()
    };

    if (index >= 0) subscriptions[index] = nextSubscription;
    else subscriptions.push(nextSubscription);

    writeSubscriptions(subscriptions);
    closeSubscriptionModal();
  });
}
