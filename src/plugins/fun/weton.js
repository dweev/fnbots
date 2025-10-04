// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { getZodiak } from '../../function/index.js';

export const command = {
  name: 'getzodiak',
  category: 'fun',
  description: `Melihat info zodiak`,
  isCommandWithoutPayment: true,
  execute: async ({ args, sReply, dbSettings }) => {
    if (args.length < 2) return await sReply(`Penggunaan salah!\nContoh: ${dbSettings.sname}weton arfine 17-01-2004`);
    const nama = args[0];
    const tanggal = args[1];
    const validDate = /^\d{2}-\d{2}-\d{4}$/;
    if (!validDate.test(tanggal)) return await sReply('Format tanggal salah! Gunakan format DD-MM-YYYY.\nContoh: 17-01-2004');
    const result = await getZodiak(nama, tanggal);
    await sReply(result);
  }
};