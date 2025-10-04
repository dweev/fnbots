// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Settings } from '../../../database/index.js';

export const command = {
  name: 'upbotname',
  category: 'owner',
  description: 'mengganti nama bot',
  isCommandWithoutPayment: true,
  execute: async ({ dbSettings, reactDone, arg }) => {
    if (arg) {
      dbSettings.botname = arg;
      await Settings.updateSettings(dbSettings);
      await reactDone();
    }
  }
};