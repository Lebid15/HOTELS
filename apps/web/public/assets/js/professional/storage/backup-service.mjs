import { BACKUP_STORAGE_KEYS } from './storage-keys.mjs';
import { storageRepository } from './storage-repository.mjs';

export function createBackupService(repository = storageRepository, keys = BACKUP_STORAGE_KEYS) {
  return Object.freeze({
    keys,
    exportSnapshot() {
      return repository.snapshot(keys);
    },
    importSnapshot(snapshot = {}) {
      repository.restore(snapshot);
      return snapshot;
    },
    clearAll() {
      repository.clear(keys);
    }
  });
}

export const backupService = createBackupService();
