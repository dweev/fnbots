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
  name: 'spin',
  category: 'stateless',
  description: 'Game Spin Roullette',
  isLimitGameCommand: true,
  execute: async ({ user, args, serial, sReply }) => {
    await gameStateManager.startGame(serial);
    try {
      if (args.length > 1) return await sReply('pesan tidak valid, contoh: .spin 10k, .spin all, .spin 50%');
      const bi0 = args[0] ? args[0].toLowerCase() : '';
      if (!bi0) return await sReply('Masukkan jumlah taruhan, contoh: .spin 10k, .spin all, .spin 50%');
      if (!user || user.balance <= 0) return await sReply('User tidak ditemukan atau saldo 0.\nsilakan gunakan permainan mode grinding dulu seperti .chop, .mine, .fish, .hunt, .ngelonte, .work atau gunakan perintah .daily jika kamu belum daily claim hari ini.');
      const saldoAwal = BigInt(user.balance);
      let bid;
      if (bi0 === 'all' || bi0 === 'allin') {
        bid = saldoAwal;
      } else if (bi0.endsWith('%')) {
        const sanitizedPercent = bi0.replace(',', '.');
        const percentValue = parseFloat(sanitizedPercent.replace(/%/g, ''));
        if (isNaN(percentValue) || percentValue <= 0 || percentValue > 100) return await sReply('Input persen tidak valid (1-100).');
        bid = (saldoAwal * BigInt(Math.floor(percentValue * 100))) / 10000n;
      } else {
        let multiplier = 1n;
        let numPart = bi0;
        if (bi0.endsWith('k')) {
          multiplier = 1000n;
          numPart = bi0.slice(0, -1);
        } else if (bi0.endsWith('m')) {
          multiplier = 1000000n;
          numPart = bi0.slice(0, -1);
        } else if (bi0.endsWith('b')) {
          multiplier = 1000000000n;
          numPart = bi0.slice(0, -1);
        } else if (bi0.endsWith('t')) {
          multiplier = 1000000000000n;
          numPart = bi0.slice(0, -1);
        } else if (bi0.endsWith('q')) {
          multiplier = 1000000000000000n;
          numPart = bi0.slice(0, -1);
        }
        const sanitizedNumPart = numPart.replace(',', '.');
        const numValue = Number(sanitizedNumPart);
        if (isNaN(numValue) || !isFinite(numValue) || numValue <= 0) return await sReply('Input jumlah taruhan tidak valid. Gunakan format seperti: 50k, 1.5m, 2,2t');
        if (sanitizedNumPart.includes('.')) {
          const parts = sanitizedNumPart.split('.');
          const decimalPlaces = BigInt(parts[1].length);
          const divisor = 10n ** decimalPlaces;
          const numberWithoutDecimal = BigInt(sanitizedNumPart.replace('.', ''));
          bid = (numberWithoutDecimal * multiplier) / divisor;
        } else {
          bid = BigInt(sanitizedNumPart) * multiplier;
        }
      }
      if (bid <= 0n) return await sReply('Jumlah taruhan harus lebih dari 0.');
      if (saldoAwal < bid) return await sReply(`Saldo tidak cukup. Kamu perlu: ${formatNumber(bid)}`);
      const slotItems = ['🍒', '🍊', '🍇', '🍉', '🍋', '🔔', '❄️', '💎', '☠️', ' 7️⃣'];
      const rolls = [];
      for (let i = 0; i < 3; i++) {
        rolls.push(slotItems[Math.floor(Math.random() * slotItems.length)]);
      }
      const [a, b, c] = rolls;
      let reward = 0n;
      let winType = '';
      let multiplier;
      if (a === ' 7️⃣' && b === ' 7️⃣' && c === ' 7️⃣') {
        multiplier = 10n;
        reward = bid * multiplier;
        winType = 'Jackpot 777!';
      } else if (a === '💎' && b === '💎' && c === '💎') {
        multiplier = 7n;
        reward = bid * multiplier;
        winType = 'Jackpot Diamond!';
      } else if (a === b && b === c) {
        multiplier = 4n;
        reward = bid * multiplier;
        winType = 'TRIPLE!';
      } else if (a === b || b === c || a === c) {
        multiplier = 2n;
        reward = bid * multiplier;
        winType = 'DOUBLE!';
      }
      const selisih = reward - bid;
      await user.addBalance(selisih);
      const saldoAkhir = saldoAwal + selisih;
      let resultText = `🎰 Spin Machine 🎰\n${a} ${b} ${c}\n\n`;
      if (reward > 0) {
        resultText += `*${winType}* 🎉\nWIn: +${formatNumber(bid)} x${multiplier}`;
      } else {
        resultText += `Lost: -${formatNumber(bid)}`;
      }
      resultText += `\nSaldo akhir: ${formatNumber(saldoAkhir)}`;
      await sReply(resultText);
      await user.addXp();
    } finally {
      gameStateManager.endGame(serial);
    }
  }
};
