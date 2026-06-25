import { browserStorageEngine } from './storage-engine.mjs';
import { DOMAIN_STORAGE_ENTRIES } from './storage-keys.mjs';

function cloneFallback(fallback) {
  if (Array.isArray(fallback)) return [...fallback];
  if (fallback && typeof fallback === 'object') return { ...fallback };
  return fallback;
}

function normalizeByFallback(value, fallback) {
  if (Array.isArray(fallback)) return Array.isArray(value) ? value : cloneFallback(fallback);
  if (fallback && typeof fallback === 'object') return value && typeof value === 'object' && !Array.isArray(value) ? value : cloneFallback(fallback);
  return value ?? fallback;
}

export function createStorageRepository(engine = browserStorageEngine) {
  return Object.freeze({
    getText: engine.getText,
    setText: engine.setText,
    readJson: engine.readJson,
    writeJson: engine.writeJson,
    remove: engine.remove,
    clear: engine.clear,
    snapshot: engine.snapshot,
    restore: engine.restore,
    read(key, fallback = null) {
      return engine.readJson(key, fallback);
    },
    write(key, value) {
      return engine.writeJson(key, value);
    }
  });
}

export function createDomainRepository(name, key, fallback = [], repository = createStorageRepository()) {
  return Object.freeze({
    name,
    key,
    fallback,
    read() {
      return normalizeByFallback(repository.readJson(key, cloneFallback(fallback)), fallback);
    },
    write(value) {
      return repository.writeJson(key, value);
    },
    clear() {
      repository.remove(key);
    }
  });
}

export function createRepositoryRegistry(repository = createStorageRepository()) {
  return Object.freeze(DOMAIN_STORAGE_ENTRIES.reduce((items, [name, key, fallback]) => {
    items[name] = createDomainRepository(name, key, fallback, repository);
    return items;
  }, {}));
}

export const storageRepository = createStorageRepository();
export const domainRepositories = createRepositoryRegistry(storageRepository);
