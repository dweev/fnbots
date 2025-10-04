// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { parseNIK } from '../../function/index.js';

export const command = {
  name: 'carinik',
  category: 'util',
  description: 'Mencari informasi berdasarkan NIK (Nomor Induk Kependudukan) Indonesia',
  isCommandWithoutPayment: true,
  execute: async ({ sReply, arg, args, dbSettings }) => {
    if (!arg || args.length > 1) return await sReply(`Format perintah salah. Gunakan: ${dbSettings.rname}carinik <nomor_nik>`);
    const nikToSearch = args[0];
    const res = await parseNIK(nikToSearch);
    if (!res.status) return await sReply(res.error || 'NIK tidak valid atau tidak ditemukan.');
    let responseText = `*🔍 Hasil Pencarian NIK*\n\n`;
    responseText += `*NIK :* \`\`\`${res.nik}\`\`\`\n`;
    responseText += `*Jenis Kelamin :* ${res.jenisKelamin}\n`;
    responseText += `\n`;
    responseText += `*📅 Kelahiran*\n`;
    responseText += `  - *Tanggal :* ${res.kelahiran.tanggal}\n`;
    responseText += `  - *Hari Lahir :* ${res.kelahiran.hari}\n`;
    responseText += `  - *Zodiak :* ${res.kelahiran.zodiak}\n`;
    responseText += `\n`;
    responseText += `*📊 Usia & Generasi*\n`;
    responseText += `  - *Saat Ini :* ${res.usia.teks}\n`;
    responseText += `  - *Kategori :* ${res.usia.kategori}\n`;
    responseText += `  - *Generasi :* ${res.usia.generasi}\n`;
    responseText += `  - *Ulang Tahun :* ${res.usia.ultah}\n`;
    responseText += `\n`;
    responseText += `*📍 Lokasi Terdaftar*\n`;
    responseText += `  - *Provinsi :* ${res.lokasi.provinsi}\n`;
    responseText += `  - *Kab/Kota :* ${res.lokasi.kabupatenKota}\n`;
    responseText += `  - *Kecamatan :* ${res.lokasi.kecamatan}\n`;
    responseText += `  - *Kelurahan :* ${res.lokasi.kelurahan}\n`;
    responseText += `  - *Kode Pos :* ${res.lokasi.kodePos}\n`;
    await sReply(responseText);
  }
};