// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { fetchJson } from '../../function/index.js';

export const command = {
  name: 'quran',
  category: 'ngaji',
  description: `Daftar Lengkap Surah Al-Qur'an`,
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, toId, args, sReply }) => {
    const quranApiUrl = "https://raw.githubusercontent.com/Terror-Machine/QuranJSON/master/quran.json";
    const quranData = await fetchJson(quranApiUrl);
    if (!Array.isArray(quranData) || quranData.length === 0) return await sReply("Format data Quran tidak sesuai atau kosong.");
    if (args.length === 0) {
      const header = "📖 *Daftar Lengkap Surah Al-Qur'an*\n\n";
      const listItems = quranData.map(surah => {
        return `${surah.number_of_surah}. ${surah.name}`;
      });
      const pesanBalasan = header + listItems.join('\n');
      await sReply(pesanBalasan);
    } else {
      const surahNumber = parseInt(args[0]);
      if (isNaN(surahNumber) || surahNumber < 1 || surahNumber > 114) return await sReply(`Nomor surah tidak valid. Harap masukkan angka antara 1 sampai 114.`);
      const surahDitemukan = quranData.find(s => s.number_of_surah === surahNumber);
      if (surahDitemukan) {
        const { recitation } = surahDitemukan;
        await fn.sendFileUrl(toId, recitation, '', m);
      } else {
        await sReply(`Surah dengan nomor ${surahNumber} tidak ditemukan.`);
      }
    }
  }
};