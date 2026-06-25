export function createNotificationsRepository() {
  return Object.freeze({
    listFromProvider(provider, role = 'hotel_manager') {
      if (typeof provider !== 'function') return [];
      const value = provider(role);
      return Array.isArray(value) ? value : [];
    }
  });
}

export const notificationsRepository = createNotificationsRepository();
