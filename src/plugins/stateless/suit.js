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
  name: 'suit',
  category: 'stateless',
  description: 'Game Batu Gunting Kertas',
  isLimitGameCommand: true,
  execute: async ({ user, args, serial, dbSettings, sReply }) => {
    await gameStateManager.startGame(serial);
    try {
      if (!args) return await sReply(`Gunakan ${dbSettings.rname}suit batu | gunting | kertas`);
      const player = args[0].toLowerCase();
      const valid = ["batu", "gunting", "kertas"];
      if (!valid.includes(player)) return await sReply(`Pilihan tidak valid. Gunakan batu, gunting, atau kertas.`);
      const bot = valid[Math.floor(Math.random() * 3)];
      let tx = `Bot memilih: *${bot.toUpperCase()}*\n`;
      tx += `Kamu memilih: *${player.toUpperCase()}*\n\n`;
      if (player === bot) {
        tx += "Hasilnya seri!";
      } else if (
        (player === "batu" && bot === "gunting") ||
        (player === "gunting" && bot === "kertas") ||
        (player === "kertas" && bot === "batu")
      ) {
        const rewardAmount = Math.floor(Math.random() * 349) + 1;
        const reward = BigInt(rewardAmount);
        await user.addBalance(reward);
        tx += `Selamat, kamu menang dan mendapatkan +${formatNumber(reward)}!`;
      } else {
        tx += "Sayang sekali, kamu kalah dari bot!";
      }
      await sReply(tx);
      await user.addXp();
    } finally {
      gameStateManager.endGame(serial);
    }
  }
};