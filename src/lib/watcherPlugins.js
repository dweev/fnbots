// ─── Info ────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info src/lib/watcherPlugins.js ──────────────

import path from 'path';
import log from './logger.js';
import { dirname } from 'path';
import chokidar from 'chokidar';
import { fileURLToPath } from 'url';
import { loadPlugins } from './plugins.js';
import { initializeFuse } from '../function/function.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pluginPath = path.join(__dirname, '..', 'plugins');

let reloadTimeout;
async function debouncedReload() {
  clearTimeout(reloadTimeout);
  reloadTimeout = setTimeout(async () => {
    try {
      await loadPlugins(pluginPath);
      await initializeFuse();
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
    debouncedReload();
  });
  watcher.on('ready', () => {
    log(`Watcher Ready: ${pluginPath}`);
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