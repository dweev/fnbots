// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { formatNumber } from '../../function/index.js';
import { gameStateManager } from '../../lib/gameManager.js';

export const command = {
  name: 'flip',
  category: 'stateless',
  description: 'Game Flip Koin',
  isLimitGameCommand: true,
  execute: async ({ user, args, serial, sReply }) => {
    await gameStateManager.startGame(serial);
    try {
      if (!args[0]) return await sReply(`Gunakan .flip muka | gambar`);
      const pilihanInput = args[0].toLowerCase();
      let pilihanPemain;
      if (['h', 'head', 'heads', 'muka', 'depan'].includes(pilihanInput)) {
        pilihanPemain = 'muka';
      } else if (['t', 'tail', 'tails', 'gambar', 'belakang'].includes(pilihanInput)) {
        pilihanPemain = 'gambar';
      } else {
        return await sReply("Pilihan tidak valid. Gunakan 'muka' atau 'gambar'.");
      }
      const bot = Math.random() < 0.5 ? 'muka' : 'gambar';
      let tx = `Bot memilih: *${bot.toUpperCase()}*\n`;
      tx += `Kamu memilih: *${pilihanPemain.toUpperCase()}*\n\n`;
      if (pilihanPemain === bot) {
        const rewardAmount = Math.floor(Math.random() * 499) + 1;
        const reward = BigInt(rewardAmount);
        await user.addBalance(reward);
        tx += `Selamat, kamu menang dan mendapatkan +${formatNumber(reward)}!`;
      } else {
        tx += 'Sayang sekali, kamu kalah dari bot!';
      }
      await sReply(tx);
      await user.addXp();
    } finally {
      gameStateManager.endGame(serial);
    }
  }
};
