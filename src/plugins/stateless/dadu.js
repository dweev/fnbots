// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import path from 'path';
import fs from 'fs-extra';
import config from '../../../config.js';
import { formatNumber } from '../../function/index.js';
import { gameStateManager } from '../../lib/gameManager.js';

export const command = {
  name: 'dadu',
  category: 'stateless',
  description: 'Game Mengocox Dadu',
  isLimitGameCommand: true,
  execute: async ({ fn, m, sPesan, user, toId, serial, reactFail }) => {
    await gameStateManager.startGame(serial);
    try {
      const dirPath = config.paths.dice;
      const allFiles = (await fs.readdir(dirPath)).filter(file => file.endsWith('.webp'));
      const randomFile = allFiles[Math.floor(Math.random() * allFiles.length)];
      const filePath = path.join(dirPath, randomFile);
      const match = randomFile.match(/roll-(\d)\.webp/);
      const diceValue = match ? parseInt(match[1], 10) : 1;
      const fileBuffer = await fs.readFile(filePath);
      await fn.sendRawWebpAsSticker(toId, fileBuffer, m);
      if (diceValue === 6) {
        const reward = 1500n;
        await sPesan(`🎉 Jackpot! Kamu mendapatkan ${formatNumber(reward)} dari hasil dadu angka 6!`);
        await user.addXp(); 
        await user.addBalance(reward);
      } else {
        await user.addXp(); await reactFail();
      }
    } finally {
      gameStateManager.endGame(serial);
    }
  }
};