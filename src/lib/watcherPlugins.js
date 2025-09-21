// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info watcherPlugins.js ──────────────

import path from 'path';
import { dirname } from 'path';
import chokidar from 'chokidar';
import { fileURLToPath } from 'url';
import log from '../utils/logger.js';
import { loadPlugins } from './plugins.js';
import { initializeFuse } from '../../core/handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pluginPath = path.join(__dirname, '..', 'plugins');

let reloadTimeout;
async function debouncedReload(reason = 'File change detected') {
  clearTimeout(reloadTimeout);
  reloadTimeout = setTimeout(async () => {
    try {
      log(reason);
      await loadPlugins(pluginPath);
      await initializeFuse();
      log('Plugin berhasil dimuat ulang.');
    } catch (error) {
      log(error, true);
    }
  }, 1500);
}

export default function startPluginWatcher() {
  const watcher = chokidar.watch(pluginPath, {
    persistent: true,
    ignoreInitial: true,
    depth: 10,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100,
    },
  });
  watcher.on('all', (event, filePath) => {
    if (!filePath.endsWith('.js')) return;
    const relativePath = path.relative(pluginPath, filePath);
    log(`File ${event}: ${relativePath}`);
    debouncedReload(`${event}: ${relativePath}`);
  });
  watcher.on('ready', () => {
    log(`Mengawasi perubahan pada: ${pluginPath}`);
  });
  watcher.on('error', (error) => {
    log(`Watcher error: ${error.message}`, true);
  });
  process.on('SIGINT', () => {
    if (reloadTimeout) clearTimeout(reloadTimeout);
    watcher.close();
  });
  return watcher;
}