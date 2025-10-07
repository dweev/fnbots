// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import generateCard from '../../utils/katepe.js';
import { tmpDir } from '../../lib/tempManager.js';

export const command = {
  name: 'ektp',
  category: 'fun',
  description: `Membuat EKTP palsu (GUNAKAN DENGAN BIJAK!)`,
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, toId, quotedMsg, dbSettings, arg, sReply }) => {
    const targetMsg = quotedMsg ? m.quoted || m : m.message;
    if (!arg) return await sReply(`Format salah. Gunakan format:\n${dbSettings.rname}ektp NIK | Nama | Tempat/Tgl Lahir | Jenis Kelamin | Gol.Darah | Alamat | RT/RW | Kel/Desa | Kecamatan | Agama | Status Perkawinan | Pekerjaan | Kewarganegaraan | Masa Berlaku | Provinsi | Kabupaten | Lokasi TTD | Tanggal TTD | Teks TTD\n\nSambil mereply atau mengirim gambar.\n\nContoh: ${dbSettings.rname}ektp 1234567890123456|MUKIDI SLAMET|JAKARTA, 01-01-0001|LAKI-LAKI|AB|JL. KENANGAN NO. 17|001/001|MENTENG|MENTENG|ISLAM|SERING KAWIN|WIRASWASTA|WNI|SEUMUR HIDUP|PROVINSI DKI JAKARTA|KOTA ADM. JAKARTA PUSAT|JAKARTA PUSAT,|30-06-2025|MUKIDI`);
    if (!targetMsg || !targetMsg.imageMessage) return await sReply("Kirim atau balas sebuah gambar untuk dijadikan foto profil kartu.");
    const resBuffer = await fn.getMediaBuffer(targetMsg);
    if (!resBuffer) return await sReply("Gagal mengunduh media gambar.");
    const tempProfilePicPath = await tmpDir.createTempFileWithContent(resBuffer, 'jpg');
    const parts = arg.split('|');
    const dataOrder = [
      "NIK", "Nama", "Tempat/Tgl Lahir", "Jenis Kelamin", "Gol. Darah", "Alamat", "RT/RW",
      "Kel/Desa", "Kecamatan", "Agama", "Status Perkawinan", "Pekerjaan", "Kewarganegaraan", "Berlaku Hingga"
    ];
    const headerFooterOrder = ["Provinsi", "Kabupaten", "LokasiTTD", "TanggalTTD"];
    const myUserData = {};
    dataOrder.forEach((key, index) => {
      if (parts[index] && parts[index].trim() !== '') {
        myUserData[key] = parts[index].trim();
      }
    });
    const myHeaderFooterData = {};
    headerFooterOrder.forEach((key, index) => {
      const partIndex = dataOrder.length + index;
      if (parts[partIndex] && parts[partIndex].trim() !== '') {
        myHeaderFooterData[key] = parts[partIndex].trim();
      }
    });
    const signatureText = parts[dataOrder.length + headerFooterOrder.length]?.trim();
    const imageResultBuffer = await generateCard({
      userData: myUserData,
      headerFooterData: myHeaderFooterData,
      profilePicPath: tempProfilePicPath,
      signatureText: signatureText
    });
    if (!imageResultBuffer) return await sReply("Gagal membuat gambar kartu (modul mengembalikan null).");
    await fn.sendMediaFromBuffer(toId, 'image/jpeg', imageResultBuffer, dbSettings.autocommand, m);
    await tmpDir.deleteFile(tempProfilePicPath);
  }
};