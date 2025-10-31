// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { gameStateManager } from '../../lib/gameManager.js';

export const command = {
  name: 'chop',
  category: 'stateless',
  description: 'Game Memotong Rumput',
  isLimitGameCommand: true,
  execute: async ({ user, sReply, serial }) => {
    await gameStateManager.startGame(serial);
    try {
      const earnedAmount = Math.floor(Math.random() * (500 - 1) + 1);
      const reward = BigInt(earnedAmount);
      await sReply('Kamu mendapatkan $' + earnedAmount + ' dari memotong rumput milik tetangga.');
      await user.addBalance(reward);
      await user.addXp();
    } finally {
      gameStateManager.endGame(serial);
    }
  }
};
