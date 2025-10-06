// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { performanceManager } from '../../lib/performanceManager.js';

export const command = {
  name: 'cachesync',
  category: 'owner',
  description: 'Memuat ulang semua plugin yang telah diubah.',
  isCommandWithoutPayment: true,
  aliases: ['synccache'],
  isEnabled: true,
  execute: async ({ sReply, reactDone }) => {
    await performanceManager.cache.forceSync();
    await sReply("Cache sync completed successfully!");
    await reactDone();
  }
};