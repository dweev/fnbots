// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import path from 'path';
import { cleanupPlugins } from '../../lib/plugins.js';
import { initializeFuse } from '../../function/index.js';

export const command = {
  name: 'reloadplugins',
  category: 'owner',
  description: 'Memuat ulang semua plugin yang telah diubah.',
  isCommandWithoutPayment: true,
  aliases: ['reloadcmd'],
  isEnabled: true,
  execute: async ({ sReply, reactDone }) => {
    const { loadPlugins, getPluginStats } = await import('../../lib/plugins.js');
    const pluginPath = path.join(process.cwd(), 'src', 'plugins');
    cleanupPlugins();
    await loadPlugins(pluginPath);
    await initializeFuse();
    const stats = getPluginStats();
    let statsText = `Plugin Cache Reloaded Successfully!\n\n`;
    statsText += `Statistics:\n`;
    statsText += `• Total commands: ${stats.totalCommands}\n`;
    statsText += `• Categories: ${stats.categories}\n\n`;
    statsText += `Commands by Category:\n`;
    for (const [category, count] of Object.entries(stats.commandsByCategory)) {
      statsText += `• ${category}: ${count} commands\n`;
    }
    await sReply(statsText);
    await reactDone();
  }
};
