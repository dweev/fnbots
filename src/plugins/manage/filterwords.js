// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

export const command = {
  name: 'filterwords',
  category: 'manage',
  description: 'Mengelola daftar kata terlarang di group',
  isCommandWithoutPayment: true,
  execute: async ({ m, args, groupData, sReply }) => {
    if (!m.isGroup) return await sReply('Perintah hanya dapat digunakan di dalam group');
    if (!args[0]) {
      let helpMessage = '*Cara Penggunaan Filterwords:*\n\n';
      helpMessage += '• *filterwords add <kata>* - Menambah kata terlarang\n';
      helpMessage += '• *filterwords remove <kata>* - Menghapus kata terlarang\n';
      helpMessage += '• *filterwords list* - Menampilkan daftar kata terlarang\n';
      helpMessage += '• *filterwords clear* - Menghapus semua kata terlarang';
      return await sReply(helpMessage);
    }
    const subCommand = args[0].toLowerCase();
    const word = args[1]?.toLowerCase();
    switch (subCommand) {
      case 'add':
        if (!word) return await sReply('Masukkan kata yang ingin ditambahkan');
        if (groupData.hasFilterWord(word)) return await sReply(`Kata "*${word}*" sudah ada di daftar filter`);
        await groupData.addFilterWord(word);
        return await sReply(`Berhasil menambahkan "*${word}*" ke daftar filter`);
      case 'remove':
        if (!word) return await sReply('Masukkan kata yang ingin dihapus');
        await groupData.removeFilterWord(word);
        return await sReply(`Berhasil menghapus "*${word}*" dari daftar filter`);
      case 'list': {
        const filterWords = groupData.filterWords;
        if (filterWords.length === 0) return await sReply('Tidak ada kata yang difilter saat ini');
        const wordList = filterWords.map((word, index) => `${index + 1}. ${word}`).join('\n');
        return await sReply(`*Daftar Kata Terfilter:*\n${wordList}`);
      }
      case 'clear':
        await groupData.clearAllFilterWords();
        return await sReply('Semua kata filter telah dihapus');
      default:
        return await sReply(`Perintah tidak valid. Gunakan *filterwords* untuk melihat cara penggunaan`);
    }
  }
};