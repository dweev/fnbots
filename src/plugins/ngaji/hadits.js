// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { fetchJson } from '../../function/index.js';

export const command = {
  name: 'hadits',
  category: 'ngaji',
  description: `Daftar Hadits`,
  isCommandWithoutPayment: true,
  execute: async ({ args, sReply, dbSettings }) => {
    const listUrl = `https://raw.githubusercontent.com/Terror-Machine/random/master/hadits/list.json`;
    const listPerawi = await fetchJson(listUrl);
    if (args.length === 0) {
      let replyText = '📜 *Daftar Perawi Hadits*\n\n';
      replyText += `Gunakan: ${dbSettings.rname}hadits <nama_perawi> <nomor>\n`;
      replyText += `Contoh: ${dbSettings.rname}hadits bukhari 50\n\n`;
      const listItems = listPerawi.map((item) => `• *${item.name}*\n  (ID: \`${item.slug}\`, Total: ${item.total})`).join('\n\n');
      replyText += listItems;
      await sReply(replyText.trim());
    } else {
      if (args.length < 2) return await sReply(`Format perintah salah.\nGunakan: ${dbSettings.rname}hadits <nama_perawi> <nomor>\nContoh: ${dbSettings.rname}hadits muslim 100`);
      const namaPerawi = args[0].toLowerCase();
      const nomorHadits = parseInt(args[1]);
      const perawi = listPerawi.find((p) => p.slug === namaPerawi);
      if (!perawi) return await sReply(`Nama perawi tidak ditemukan: ${namaPerawi}.\nGunakan ${dbSettings.rname}hadits untuk melihat daftar yang tersedia.`);
      if (isNaN(nomorHadits) || nomorHadits < 1 || nomorHadits > perawi.total) return await sReply(`Nomor hadits tidak valid untuk ${perawi.name}.\nMasukkan nomor antara 1 s.d. ${perawi.total}.`);
      const haditsUrl = `https://raw.githubusercontent.com/Terror-Machine/random/master/hadits/${perawi.slug}.json`;
      const semuaHadits = await fetchJson(haditsUrl);
      const hadits = semuaHadits.find((h) => h.number === nomorHadits);
      if (!hadits) return await sReply(`Hadits no. ${nomorHadits} untuk ${perawi.name} tidak ditemukan.`);
      let replyText = `📖 *Hadits ${perawi.name} No. ${hadits.number}*\n\n`;
      replyText += `${hadits.arab}\n\n`;
      replyText += `*Artinya:*\n${hadits.id}`;
      await sReply(replyText);
    }
  }
};
