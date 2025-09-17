import { Settings } from '../../database/index.js';
import log from './logger.js';

let settingsCache = null;
const POLLING_INTERVAL_MS = 1000;

export async function initializeDbSettings() {
  try {
    settingsCache = await Settings.getSettings();
    setInterval(async () => {
      try {
        const latestSettings = await Settings.getSettings();
        if (JSON.stringify(settingsCache) !== JSON.stringify(latestSettings)) {
          settingsCache = latestSettings;
        }
      } catch (pollError) {
        log(`Error saat polling pengaturan: ${pollError.message}`, true);
      }
    }, POLLING_INTERVAL_MS);
    return settingsCache;
  } catch (error) {
    log(`Gagal memuat pengaturan bot dari database. | ${error.message}`, true);
    process.exit(1);
  }
};
export function getDbSettings() {
  if (!settingsCache) {
    throw new Error("Gagal memanggil initializeDbSettings() saat startup.");
  }
  return settingsCache;
};