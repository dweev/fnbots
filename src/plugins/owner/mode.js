// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { Settings } from '../../../database/index.js';

export const command = {
  name: 'mode',
  category: 'owner',
  description: 'Mengubah mode bot.',
  isCommandWithoutPayment: true,
  isEnabled: true,
  execute: async ({ sReply, body, dbSettings }) => {
    const args = body.toLowerCase().trim().split(/\s+/);
    const modeInput = args[1]?.toLowerCase().trim();
    const modeMap = {
      'publik': 'false',
      'selfbot': 'true',
      'auto': 'auto'
    };
    const getDisplayMode = (internalMode) => {
      const displayMap = {
        'false': 'publik',
        'true': 'selfbot',
        'auto': 'auto'
      };
      return displayMap[internalMode] || internalMode;
    };
    if (!modeInput || modeInput === '') {
      const currentMode = dbSettings.self;
      const displayMode = getDisplayMode(currentMode);
      return sReply(`Mode saat ini: *${displayMode}*\nGunakan: mode <mode>\n • publik\n • selfbot\n • auto`);
    }
    if (!Object.prototype.hasOwnProperty.call(modeMap, modeInput)) {
      return sReply(`Mode tidak valid!\n\nMode yang tersedia:\n • publik\n • selfbot\n • auto\n\nMode saat ini: *${getDisplayMode(dbSettings.self)}*`);
    }
    const internalMode = modeMap[modeInput];
    await Settings.setSelfMode(internalMode);
    dbSettings.self = internalMode;
    await sReply(`Mode berhasil diubah ke: *${modeInput}*`);
  }
};
