// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { fetchJson } from '../../function/index.js';

export const command = {
  name: 'kisahnabi',
  category: 'ngaji',
  description: `Daftar Kisah Nabi`,
  isCommandWithoutPayment: true,
  execute: async ({ args, sReply }) => {
    const dataUrl = `https://raw.githubusercontent.com/Terror-Machine/random/master/kisahnabi.json`;
    const isiData = await fetchJson(dataUrl);
    if (args.length === 0) {
      let kisahNabi = '📜 *Daftar Kisah Nabi*\nGunakan perintah *.kisahnabi nomor* untuk keterangannya\n\n';
      const listItems = isiData.map(item => `${item.id}. ${item.name}`).join('\n');
      kisahNabi += listItems;
      await sReply(kisahNabi.trim());
    } else {
      const argNumber = parseInt(args[0]);
      if (isNaN(argNumber) || argNumber < 1 || argNumber > 23) return await sReply('Nomor tidak valid. Harap masukkan angka antara 1 sampai 25.');
      const kisah = isiData.find(item => item.id === argNumber);
      if (!kisah) return await sReply(`kisah nabi untuk nomor ${argNumber} tidak ditemukan.`);
      let replyText = `✨ *kisah nabi ke-${kisah.name}*\n\n`;
      replyText += `*Tempat:* ${kisah.tmp}\n\n`;
      replyText += `${kisah.description}`;
      await sReply(replyText.trim());
    }
  }
};