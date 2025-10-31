// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { jadwalSholat } from '../../function/index.js';

export const command = {
  name: 'jadwalsholat',
  category: 'ngaji',
  description: `Jadwal Sholat untuk wilayah tertentu dengan query`,
  isCommandWithoutPayment: true,
  execute: async ({ arg, sReply, dbSettings }) => {
    if (!arg) return await sReply(`Perintah salah. Contoh: ${dbSettings.rname}jadwalsholat jakarta`);
    const kota = arg;
    const hasil = await jadwalSholat(kota);
    const hariIni = new Date();
    const daftarHari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const namaHari = daftarHari[hariIni.getDay()];
    const namaKotaKapital = kota
      .split(' ')
      .map((kata) => kata.charAt(0).toUpperCase() + kata.slice(1))
      .join(' ');
    let replyText = `🕌 *Jadwal Sholat untuk wilayah ${namaKotaKapital}*\n`;
    replyText += `*${namaHari}, ${hasil.tanggal} ${hasil.bulan}*\n`;
    replyText += '```\n';
    replyText += `Imsyak  : ${hasil.imsyak}\n`;
    replyText += `Shubuh  : ${hasil.shubuh}\n`;
    replyText += `Terbit  : ${hasil.terbit}\n`;
    replyText += `Dhuha   : ${hasil.dhuha}\n`;
    replyText += `Dzuhur  : ${hasil.dzuhur}\n`;
    replyText += `Ashar   : ${hasil.ashr}\n`;
    replyText += `Maghrib : ${hasil.maghrib}\n`;
    replyText += `Isya    : ${hasil.isya}\n`;
    replyText += '```';
    await sReply(replyText);
  }
};
