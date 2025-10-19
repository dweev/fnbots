// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { performanceManager } from '../../lib/performanceManager.js';

export const command = {
  name: 'cacheclear',
  category: 'master',
  description: 'Menghapus semua cache yang ada.',
  isCommandWithoutPayment: true,
  aliases: ['clearcache'],
  isEnabled: true,
  execute: async ({ sReply, reactDone }) => {
    await performanceManager.cache.clearAllCaches();
    await sReply("All caches cleared successfully!");
    await reactDone();
  }
};