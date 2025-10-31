// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { fetchJson } from '../../function/index.js';

export const command = {
  name: 'tafsir',
  category: 'ngaji',
  description: `Data atau tafsir Surah Al-Qur'an`,
  isCommandWithoutPayment: true,
  execute: async ({ args, sReply }) => {
    if (args.length === 0) return await sReply('Perintah salah. Contoh: .tafsir 1 atau .tafsir 1 5');
    const surahNumber = parseInt(args[0]);
    if (isNaN(surahNumber) || surahNumber < 1 || surahNumber > 114) return await sReply('Nomor surah tidak valid. Harap masukkan angka antara 1 sampai 114.');
    const ayahNumber = args[1] ? parseInt(args[1]) : null;
    const quranApiUrl = `https://raw.githubusercontent.com/Terror-Machine/QuranJSON/master/surah/${surahNumber}.json`;
    const quranData = await fetchJson(quranApiUrl);
    const surahName = quranData.name;
    const tafsirKemenagText = quranData.tafsir?.id?.kemenag?.text;
    if (!tafsirKemenagText) return await sReply(`Tafsir untuk surah ${surahName} tidak ditemukan.`);
    let replyText = '';
    if (ayahNumber) {
      if (isNaN(ayahNumber) || ayahNumber < 1 || ayahNumber > quranData.number_of_ayah) return await sReply(`Nomor ayat tidak valid untuk Surah ${surahName}. Pilih ayat antara 1 s.d. ${quranData.number_of_ayah}.`);
      const verseData = quranData.verses.find((v) => v.number === ayahNumber);
      const tafsirForAyah = tafsirKemenagText[ayahNumber];
      if (!verseData || !tafsirForAyah) return await sReply(`Data atau tafsir untuk Surah ${surahName} ayat ${ayahNumber} tidak ditemukan.`);
      replyText = `📖 *Tafsir Surah ${surahName} Ayat ${ayahNumber}*\n\n`;
      replyText += `*Ayat:*\n${verseData.text}\n\n`;
      replyText += `*Terjemahan:*\n${verseData.translation_id}\n\n`;
      replyText += `*Tafsir Kemenag:*\n${tafsirForAyah}`;
    } else {
      replyText = `📖 *Tafsir Lengkap Surah ${surahName}*\n\n`;
      quranData.verses.forEach((verse) => {
        const currentAyah = verse.number;
        const tafsirForAyah = tafsirKemenagText[currentAyah];
        if (tafsirForAyah) {
          replyText += `*[ Ayat ${currentAyah} ]*\n${tafsirForAyah}\n\n`;
        }
      });
    }
    await sReply(replyText.trim());
  }
};
