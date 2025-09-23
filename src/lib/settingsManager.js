// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info settingsManager.js ─────────────

import config from '../../config.js';
import log, { pinoLogger } from './logger.js';
import { Settings } from '../../database/index.js';

let settingsCache = null;
const POLLING_INTERVAL_MS = config.performance.pollingInterval;

export async function initializeDbSettings() {
  try {
    settingsCache = await Settings.getSettings();
    setInterval(async () => {
      try {
        const latestSettings = await Settings.getSettings();
        if (JSON.stringify(settingsCache) !== JSON.stringify(latestSettings)) {
          if (settingsCache.pinoLogger !== latestSettings.pinoLogger) {
              pinoLogger.level = latestSettings.pinoLogger;
          }
          settingsCache = latestSettings;
        }
      } catch (error) {
        log(error, true);
      }
    }, POLLING_INTERVAL_MS);
    return settingsCache;
  } catch (error) {
    log(error, true);
    process.exit(1);
  }
};
export function getDbSettings() {
  if (!settingsCache) {
    throw new Error("Gagal memanggil initializeDbSettings() saat startup.");
  }
  return settingsCache;
};