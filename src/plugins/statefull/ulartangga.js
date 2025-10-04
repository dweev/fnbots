// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { createRandomMap, generateUlarTanggaImage } from '../../function/index.js';

export const command = {
  name: 'ulartangga',
  displayName: 'g-ulartangga',
  category: 'statefull',
  description: 'Game Statefull ulartangga',
  isLimitGameCommand: true,
  aliases: ['g-ulartangga'],
  execute: async ({ sPesan, m, user, toId, sReply, serial, ulartangga }) => {
    if (!m.isGroup) return await sReply("Permainan ini hanya bisa dimainkan di grup.");
    if (ulartangga[toId]) return await sReply("Sudah ada permainan yang berjalan. Ketik `stop` untuk berhenti.");
    const playerId = serial;
    const newMap = createRandomMap();
    ulartangga[toId] = {
      playerJid: playerId,
      playerPos: 0,
      botPos: 0,
      map: newMap,
      turn: 'player',
      timeoutId: null
    };
    const gameDuration = 3 * 60 * 1000;
    const timeoutCallback = () => {
      if (ulartangga[toId]) {
        delete ulartangga[toId];
      }
    };
    ulartangga[toId].timeoutId = setTimeout(timeoutCallback, gameDuration);
    const initialBoard = await generateUlarTanggaImage(ulartangga[toId]);
    if (!initialBoard) return await sReply("Gagal membuat papan permainan.");
    const welcomeMessage = `🐍🪜 *Permainan Ular Tangga Dimulai!* 🪜🐍\n\n` +
      `Pemain: @${playerId.split('@')[0]} (Pion Merah)\n` +
      `Lawan: Bot (Pion Biru Muda)\n` +
      `Sesi akan berakhir dalam 3 menit jika tidak aktif.\n\n` +
      `Giliran Kamu! Ketik *roll* atau *kocok* untuk melempar dadu.`;
    await sPesan({ image: initialBoard, caption: welcomeMessage, mentions: [playerId] });
    await user.addXp();
  }
};