// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import fs from 'fs-extra';
import { getMyLevel } from '../../function/index.js';
import config from '../../../config.js';

export const command = {
  name: 'level',
  category: 'game',
  description: 'Cek level kamu',
  isCommandWithoutPayment: true,
  execute: async ({ fn, user, dbSettings, toId, m, pushname, serial }) => {
    let datax;
    try {
      datax = await fn.profilePictureUrl(serial, 'image');
    } catch {
      datax = await fs.readFile(config.paths.avatar);
    }
    const buffer = await getMyLevel(user, pushname, datax);
    await fn.sendMediaFromBuffer(toId, 'image/jpeg', buffer, dbSettings.autocommand, m);
  }
};