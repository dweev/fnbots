// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { fetchJson } from '../../function/index.js';

export const command = {
  name: 'doaharian',
  category: 'ngaji',
  description: `Daftar Doa Harian`,
  isCommandWithoutPayment: true,
  execute: async ({ args, sReply }) => {
    const dataUrl = `https://raw.githubusercontent.com/Terror-Machine/random/master/doaseharihari.json`;
    const isiData = await fetchJson(dataUrl);
    if (args.length === 0) {
      let daftarDoa = '📜 *Daftar Doa Harian*\nGunakan perintah *.doaharian nomor* untuk keterangannya\n\n';
      const listItems = isiData.map(item => `${item.id}. ${item.judul}`).join('\n');
      daftarDoa += listItems;
      await sReply(daftarDoa.trim());
    } else {
      const argNumber = parseInt(args[0]);
      if (isNaN(argNumber) || argNumber < 1 || argNumber > 23) return await sReply('Nomor tidak valid. Harap masukkan angka antara 1 sampai 23.');
      const doa = isiData.find(item => item.id === argNumber);
      if (!doa) return await sReply(`Doa Harian untuk nomor ${argNumber} tidak ditemukan.`);
      let replyText = `✨ *Doa Harian ke-${doa.id}*\n\n`;
      replyText += `*Nama:* ${doa.judul}\n\n`;
      replyText += `*Latin:* ${doa.latin}\n\n`;
      replyText += `*Arab:*\n${doa.arab}\n\n`;
      replyText += `*Terjemahan:*\n${doa.terjemah}`;
      await sReply(replyText.trim());
    }
  }
};