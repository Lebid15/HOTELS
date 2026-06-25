export function createEventBus() {
  const listeners = new Map();

  function on(eventName, handler) {
    if (!listeners.has(eventName)) listeners.set(eventName, new Set());
    listeners.get(eventName).add(handler);
    return () => listeners.get(eventName)?.delete(handler);
  }

  function emit(eventName, payload = {}) {
    for (const handler of listeners.get(eventName) || []) {
      handler(payload);
    }
  }

  function clear(eventName) {
    if (eventName) listeners.delete(eventName);
    else listeners.clear();
  }

  return { on, emit, clear };
}
