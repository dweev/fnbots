// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { screenshotWeb } from '../../utils/screenshots.js';

export const command = {
  name: 'ssweb',
  category: 'convert',
  description: 'Membuat Fake Chat',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, toId, arg, body, sReply, dbSettings }) => {
    if (!arg) return await sReply(`Harap berikan URL. Contoh: \`${dbSettings.rname}ssweb https://github/Terror-Machine/fnbots/ --mobile --full\``);
    const urlRegex = /(https?:\/\/[^\s]+)/;
    const urlMatch = body.match(urlRegex);
    if (!urlMatch) return await sReply('URL tidak valid. Pastikan menggunakan http:// atau https://');
    const url = urlMatch[0];
    const options = {
      fullPage: body.includes('--full')
    };
    if (body.includes('--mobile')) {
      options.device = 'iPhone 15 Pro';
    }
    const buffer = await screenshotWeb(url, options);
    if (!buffer) return await sReply(`Error! silakan coba lagi beberapa tahun lagi?`);
    await fn.sendMediaFromBuffer(toId, 'image/jpeg', buffer, dbSettings.autocommand, m);
  }
};
