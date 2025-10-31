// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { fetchJson } from '../../function/index.js';

export const command = {
  name: 'asmaulhusna',
  category: 'ngaji',
  description: `Daftar Asmaul Husna`,
  isCommandWithoutPayment: true,
  execute: async ({ args, sReply }) => {
    const dataUrl = `https://raw.githubusercontent.com/Terror-Machine/random/master/asmaulhusna.json`;
    const isiData = await fetchJson(dataUrl);
    if (args.length === 0) {
      let daftarAsma = '📜 *Daftar 99 Asmaul Husna*\nGunakan perintah *.asmaulhusna nomor* untuk keterangannya\n\n';
      const listItems = isiData.map((item) => `${item.number}. ${item.name}`).join('\n');
      daftarAsma += listItems;
      await sReply(daftarAsma.trim());
    } else {
      const argNumber = parseInt(args[0]);
      if (isNaN(argNumber) || argNumber < 1 || argNumber > 99) return await sReply('Nomor tidak valid. Harap masukkan angka antara 1 sampai 99.');
      const asma = isiData.find((item) => item.number === argNumber);
      if (!asma) return await sReply(`Asmaul Husna untuk nomor ${argNumber} tidak ditemukan.`);
      let replyText = `✨ *Asmaul Husna ke-${asma.number}*\n\n`;
      replyText += `*Nama:* ${asma.name}\n`;
      replyText += `*Arti:* ${asma.meaning}\n\n`;
      replyText += `*Keterangan:*\n${asma.keterangan}\n\n`;
      replyText += `*Amalan:*\n${asma.amalan}`;
      await sReply(replyText.trim());
    }
  }
};
