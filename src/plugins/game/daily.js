// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { formatNumber } from '../../function/function.js';
import { gameStateManager } from '../../lib/gameManager.js';

export const command = {
  name: 'daily',
  category: 'game',
  description: 'GACHA DAILY',
  isCommandWithoutPayment: true,
  aliases: ['claim', 'dailyclaim'],
  execute: async ({ user, sReply, serial }) => {
    await gameStateManager.startGame(serial);
    try {
      if (!user.gacha) return await sReply("Kamu sudah mengambil daily-claim hari ini. Tunggu hingga jam 21:00!");
      const randomValue = Math.random();
      let reward;
      if (randomValue < 0.03) {
        reward = 1000000000;
      } else if (randomValue < 0.07) {
        reward = 1000000;
      } else if (randomValue < 0.65) {
        reward = 1000 * 5;
      } else if (randomValue < 0.95) {
        reward = 1000 * 3;
      } else {
        reward = 1000;
      }
      user.gacha = false;
      await sReply(`🎉 Kamu mendapatkan: ${formatNumber(reward)}!`);
      await user.addBalance(reward);
      await user.addXp();
    } finally {
      gameStateManager.endGame(serial);
    }
  }
};