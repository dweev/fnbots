// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { gameStateManager } from '../../lib/gameManager.js';

export const command = {
  name: 'work',
  category: 'stateless',
  description: 'Game Bekerja Keras Bagai Quda',
  isLimitGameCommand: true,
  execute: async ({ user, sReply, serial }) => {
    await gameStateManager.startGame(serial);
    try {
      const earnedAmount = Math.floor(Math.random() * (500 - 1) + 1);
      const reward = BigInt(earnedAmount);
      await sReply('Kamu mendapatkan $' + earnedAmount + ' dari bekerja keras! semangat terus ya kak.:)');
      await user.addBalance(reward);
      await user.addXp();
    } finally {
      gameStateManager.endGame(serial);
    }
  }
};
