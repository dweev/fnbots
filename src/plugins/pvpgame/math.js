// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { modes, genMath, formatNumber } from '../../function/index.js';

export const command = {
  name: 'math',
  displayName: 'p-math',
  category: 'pvpgame',
  description: 'Game Statefull PVP Matematika',
  isLimitGameCommand: true,
  aliases: ['p-math'],
  execute: async ({ arg, args, dbSettings, toId, sReply, sPesan, gamematematika, user }) => {
    if (!arg) return await sReply('Mode: noob | easy | medium | hard | extreme\n\nContoh penggunaan: ' + dbSettings.sname + 'game-math noob');
    const mode = args[0].toLowerCase();
    if (!(mode in modes)) return await sReply('Mode: noob | easy | medium | hard | extreme\n\nContoh penggunaan: ' + dbSettings.rname + 'game-math noob');
    if (toId in gamematematika) return await sReply('Masih ada soal belum terjawab di chat ini', gamematematika[toId][0]);
    const math = genMath(mode);
    const msg = await sPesan(`Berapa hasil dari *${math.str}*?\n\nTimeout: ${(math.time / 1000).toFixed()} detik\nPoint Jawaban Benar: ${formatNumber(math.bonus)} Saldo`);
    gamematematika[toId] = [
      msg.key.id,
      math,
      4,
      setTimeout(async () => {
        if (gamematematika[toId]) await sReply(`Waktu habis!\nJawabannya adalah ${math.result}`, gamematematika[toId][0]);
        delete gamematematika[toId];
      }, math.time)
    ];
    await user.addXp();
  }
};