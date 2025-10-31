// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { Settings } from '../../../database/index.js';

export const command = {
  name: 'changeexif',
  category: 'owner',
  description: 'mengatur packname dan packAuthor exif untuk custom watermark sticker',
  isCommandWithoutPayment: true,
  execute: async ({ dbSettings, reactDone, arg, sReply }) => {
    if (arg) {
      const name = arg.split('|')[0];
      const author = arg.split('|')[1];
      dbSettings.packName = name.trim();
      dbSettings.packAuthor = author.trim();
      await Settings.updateSettings(dbSettings);
      await sReply(`dataExif sudah dirubah menjadi: \n\n- packname: ${dbSettings.packName}\n- author: ${dbSettings.packAuthor}`);
      await reactDone();
    }
  }
};
