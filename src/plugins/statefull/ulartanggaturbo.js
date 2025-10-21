// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { turboBoard, startUlarTanggaTimeout } from '../../function/index.js';

export const command = {
  name: 'ulartanggaturbo',
  displayName: 'g-ulartangga-turbo',
  category: 'statefull',
  description: 'Game Statefull ulartangga turbo',
  isLimitGameCommand: true,
  aliases: ['g-ulartangga-turbo'],
  execute: async ({ m, user, toId, sReply, serial, ularTanggaSessions, sPesan }) => {
    if (!m.isGroup) return await sReply("Permainan ini hanya bisa dimainkan di grup.");
    if (ularTanggaSessions[toId]) return await sReply("Sudah ada permainan yang sedang berjalan. Ketik `stop` untuk berhenti.");
    const playerId = serial;
    ularTanggaSessions[toId] = {
      board: turboBoard, playerJid: playerId, playerPos: 0, botPos: 0, turn: 'player', timeoutId: null
    };
    startUlarTanggaTimeout(toId, ularTanggaSessions);
    const welcomeMessage = `🐍 *Ular Tangga Turbo Dimulai!* 🪜\n\n` +
      `Pemain: @${playerId.split('@')[0]}\nLawan: Bot\n\n` +
      `*Aturan Turbo:*\n` +
      `▫️ Papan *50 Kotak*.\n▫️ Menggunakan *2 Dadu*.\n` +
      `▫️ Dapat giliran lagi jika dadu *kembar*.\n` +
      `▫️ Menang dengan *mencapai atau melewati* kotak 50.\n` +
      `▫️ Sesi berakhir dalam 3 menit jika tidak aktif.\n\n` +
      `Kamu mendapat giliran pertama! Ketik *lempar* untuk melempar dadu.`;
    await sPesan(welcomeMessage);
    await user.addXp();
  }
};