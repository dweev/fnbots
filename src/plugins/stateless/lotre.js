// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { delay } from 'baileys';
import { formatNumber } from '../../function/index.js';
import { gameStateManager } from '../../lib/gameManager.js';

export const command = {
  name: 'lotre',
  category: 'stateless',
  description: 'Game Lotre dengan taruhan (contoh: .lotre 10x atau .lotre 5x 1m)',
  isLimitGameCommand: true,
  execute: async ({ fn, toId, user, args, serial, sReply }) => {
    await gameStateManager.startGame(serial);
    try {
      let count = 1;
      let pricePerTicket = 500000n;
      if (!args[0] || !args[0].toLowerCase().endsWith('x')) return await sReply("Format perintah salah.\nContoh: `.lotre 10x` atau `.lotre 5x 1m`");
      count = parseInt(args[0].toLowerCase().replace('x', ''));
      if (isNaN(count) || count <= 0 || count > 10) return await sReply("Jumlah tiket tidak valid (1-10).");
      if (args[1]) {
        const bi0 = args[1].toLowerCase();
        let multiplier = 1n;
        let numPart = bi0;
        if (bi0.endsWith('k')) { multiplier = 1000n; numPart = bi0.slice(0, -1); }
        else if (bi0.endsWith('m')) { multiplier = 1000000n; numPart = bi0.slice(0, -1); }
        else if (bi0.endsWith('b')) { multiplier = 1000000000n; numPart = bi0.slice(0, -1); }
        else if (bi0.endsWith('t')) { multiplier = 1000000000000n; numPart = bi0.slice(0, -1); }
        else if (bi0.endsWith('q')) { multiplier = 1000000000000000n; numPart = bi0.slice(0, -1); }
        const sanitized = numPart.replace(',', '.');
        const numVal = Number(sanitized);
        if (isNaN(numVal) || !isFinite(numVal) || numVal <= 0) return await sReply("Format harga tiket tidak valid.");
        if (sanitized.includes('.')) {
          const parts = sanitized.split('.');
          const decimalPlaces = BigInt(parts[1].length);
          const divisor = 10n ** decimalPlaces;
          const numberNoDecimal = BigInt(sanitized.replace('.', ''));
          pricePerTicket = (numberNoDecimal * multiplier) / divisor;
        } else {
          pricePerTicket = BigInt(sanitized) * multiplier;
        }
      }
      if (!user || user.balance <= 0) return await sReply("User tidak ditemukan atau saldo 0.\nsilakan gunakan permainan mode grinding dulu seperti .chop, .mine, .fish, .hunt, .ngelonte, .work atau gunakan perintah .daily jika kamu belum daily claim hari ini.");
      const saldoAwal = BigInt(user.balance);
      const totalCost = BigInt(count) * pricePerTicket;
      if (saldoAwal < totalCost) return await sReply(`Saldo tidak cukup. Total: ${formatNumber(totalCost)}`);
      await user.minBalance(totalCost);
      const tickets = [];
      for (let i = 0; i < count; i++) {
        const numbers = new Set();
        while (numbers.size < 5) numbers.add(Math.floor(Math.random() * 69) + 1);
        const powerball = Math.floor(Math.random() * 26) + 1;
        tickets.push({ numbers: [...numbers].sort((a, b) => a - b), powerball });
      }
      const { key } = await sReply(`Membeli ${count} tiket lotre`);
      const undian = new Set();
      while (undian.size < 5) undian.add(Math.floor(Math.random() * 69) + 1);
      const powerballUndian = Math.floor(Math.random() * 26) + 1;
      const hasilUndian = [...undian].sort((a, b) => a - b);
      await delay(500);
      let hasilMsg = `Sedang mengundi angka...\n\n`;
      for (let i = 0; i < 5; i++) {
        hasilMsg += hasilUndian[i] + ' ';
        await fn.sendReply(toId, hasilMsg, { edit: key });
        await delay(500);
      }
      hasilMsg += '- PB: ' + powerballUndian; await fn.sendReply(toId, hasilMsg, { edit: key });
      let totalMenang = 0n;
      const finalTickets = tickets.map(t => {
        const match = t.numbers.filter(n => hasilUndian.includes(n)).length;
        const powerMatch = t.powerball === powerballUndian;
        let multiplier = 0n;
        if (match === 5 && powerMatch) multiplier = 100000n;
        else if (match === 5) multiplier = 1000n;
        else if (match === 4 && powerMatch) multiplier = 100n;
        else if (match === 4) multiplier = 20n;
        else if (match === 3 && powerMatch) multiplier = 10n;
        else if (match === 3) multiplier = 7n;
        else if (match === 2 && powerMatch) multiplier = 5n;
        else if (match === 1 && powerMatch) multiplier = 3n;
        else if (powerMatch) multiplier = 2n;
        const payout = pricePerTicket * multiplier;
        totalMenang += payout;
        return { ...t, match, powerMatch, payout };
      });
      if (totalMenang > 0n) await user.addBalance(totalMenang);
      let final = `Hasil Akhir\n[${hasilUndian.join(', ')}]-[${powerballUndian}]\n\n`;
      final += `Tiket:\n`;
      finalTickets.forEach((t) => {
        final += `> [${t.numbers.join(', ')}]-[${t.powerball}] » ` + `${t.payout > 0n ? '✅ +' + formatNumber(t.payout) : '❌'}\n`;
      });
      const netResult = totalMenang - totalCost;
      final += `\nModal: ${formatNumber(totalCost)}`;
      final += `\nHadiah: ${formatNumber(totalMenang)}\n`;
      if (netResult >= 0) {
        final += `\nKeuntungan Bersih: ${formatNumber(netResult)}`;
      } else {
        final += `\nKerugian Bersih: ${formatNumber(netResult)}`;
      }
      final += `\nSaldo Akhir: ${formatNumber(saldoAwal + netResult)}`;
      await delay(1000);
      await fn.sendReply(toId, final, { edit: key });
      await user.addXp();
    } finally {
      gameStateManager.endGame(serial);
    }
  }
};