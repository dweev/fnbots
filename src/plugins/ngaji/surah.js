// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { fetchJson } from '../../function/index.js';

export const command = {
  name: 'surah',
  category: 'ngaji',
  description: `Daftar Lengkap Surah Al-Qur'an`,
  isCommandWithoutPayment: true,
  execute: async ({ args, sReply }) => {
    if (args.length === 0) return await sReply('Perintah salah. Contoh: .surah 1');
    const surahNumber = parseInt(args[0]);
    if (isNaN(surahNumber) || surahNumber < 1 || surahNumber > 114) return await sReply('Nomor surah tidak valid. Harap masukkan angka antara 1 sampai 114.');
    const quranApiUrl = `https://raw.githubusercontent.com/Terror-Machine/QuranJSON/master/surah/${surahNumber}.json`;
    const quranData = await fetchJson(quranApiUrl);
    const surahName = quranData.name;
    const numberOfAyah = quranData.number_of_ayah;
    const verses = quranData.verses;
    let replyText = `📖 *Surah ${surahName}*\n`;
    replyText += `Jumlah Ayat: ${numberOfAyah}\n\n`;
    verses.forEach((verse) => {
      const verseNumber = verse.number;
      const verseText = verse.text;
      const verseTranslation = verse.translation_id;
      replyText += `${verseNumber}. ${verseText}\n`;
      replyText += `*Artinya:* ${verseTranslation}\n\n`;
    });
    await sReply(replyText.trim());
  }
};
