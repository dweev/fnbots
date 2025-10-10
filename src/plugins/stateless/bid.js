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
  name: 'bid',
  category: 'stateless',
  description: 'Game Taruhan Dadu (1-12, big, small)',
  isLimitGameCommand: true,
  execute: async ({ fn, toId, user, args, serial, sReply }) => {
    await gameStateManager.startGame(serial);
    try {
      const q = args.join(' ');
      if (!user || user.balance <= 0) return await sReply("User tidak ditemukan atau saldo 0.\nsilakan gunakan permainan mode grinding dulu seperti .chop, .mine, .fish, .hunt, .ngelonte, .work atau gunakan perintah .daily jika kamu belum daily claim hari ini.");
      const saldoAwal = BigInt(user.balance);
      const bi0 = args[0] ? args[0].toLowerCase() : '';
      if (!bi0) return await sReply("Masukkan jumlah taruhan. Contoh: .bid 1k big");
      let bid = 0n;
      let isAllIn = false;
      let isPercent = false;
      if (bi0 === 'all' || bi0 === 'allin') {
        isAllIn = true;
      } else if (bi0.endsWith('%')) {
        isPercent = true;
      } else {
        let multiplier = 1n;
        let numPart = bi0;
        if (bi0.endsWith('k')) { multiplier = 1000n; numPart = bi0.slice(0, -1); }
        else if (bi0.endsWith('m')) { multiplier = 1000000n; numPart = bi0.slice(0, -1); }
        else if (bi0.endsWith('b')) { multiplier = 1000000000n; numPart = bi0.slice(0, -1); }
        else if (bi0.endsWith('t')) { multiplier = 1000000000000n; numPart = bi0.slice(0, -1); }
        else if (bi0.endsWith('q')) { multiplier = 1000000000000000n; numPart = bi0.slice(0, -1); }
        const sanitizedNumPart = numPart.replace(',', '.');
        const numValue = Number(sanitizedNumPart);
        if (isNaN(numValue) || !isFinite(numValue) || numValue <= 0) return await sReply("Input jumlah taruhan tidak valid. Gunakan format seperti: 50k, 1.5m, 2,2t");
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
      const taruhanInput = q.substring(bi0.length).trim();
      if (!taruhanInput) return await sReply("Format salah! Pilih taruhan setelah jumlah bid (Contoh: big, small, 5, 2-7, >8).");
      const taruhanData = taruhanInput.split(/[, ]+/).filter(a => a.trim() !== '');
      if (taruhanData.length === 0) return await sReply("Pilihan taruhan tidak boleh kosong.");
      let taruhanList = [];
      taruhanData.forEach(item => {
        const cleanedItem = item.toLowerCase();
        if (cleanedItem.includes('-')) {
          const [start, end] = cleanedItem.split('-').map(n => parseInt(n.trim(), 10));
          if (!isNaN(start) && !isNaN(end) && start <= end && start >= 1 && end <= 12) {
            for (let i = start; i <= end; i++) taruhanList.push(i.toString());
          }
        } else if (cleanedItem.includes('>')) {
          const min = parseInt(cleanedItem.replace(/>/g, ''), 10);
          if (!isNaN(min) && min < 12) {
            for (let i = min + 1; i <= 12; i++) taruhanList.push(i.toString());
          }
        } else if (cleanedItem.includes('<')) {
          const max = parseInt(cleanedItem.replace(/</g, ''), 10);
          if (!isNaN(max) && max > 1) {
            for (let i = 1; i < max; i++) taruhanList.push(i.toString());
          }
        } else if (["big", "small", "besar", "kecil"].includes(cleanedItem)) {
          taruhanList.push(cleanedItem);
        } else {
          const num = parseInt(cleanedItem, 10);
          if (!isNaN(num) && num >= 1 && num <= 12) {
            taruhanList.push(num.toString());
          }
        }
      });
      taruhanList = [...new Set(taruhanList)];
      if (taruhanList.length === 0) return await sReply("Tidak ada taruhan valid yang ditemukan.");
      const hasBig = taruhanList.includes('big') || taruhanList.includes('besar');
      const hasSmall = taruhanList.includes('small') || taruhanList.includes('kecil');
      const hasNumericBet = taruhanList.some(t => !isNaN(parseInt(t, 10)));
      if ((hasBig || hasSmall) && hasNumericBet) return await sReply("Dilarang mencampur taruhan 'big'/'small' dengan taruhan angka spesifik.");
      if (hasBig && hasSmall) return await sReply("Dilarang bertaruh pada 'big' dan 'small' secara bersamaan.");
      const totalTaruhan = BigInt(taruhanList.length);
      let tot;
      if (isAllIn) {
        if (totalTaruhan > 1n) return await sReply("'all' hanya bisa digunakan untuk 1 jenis taruhan.");
        bid = saldoAwal;
        tot = saldoAwal;
      } else if (isPercent) {
        const sanitizedPercent = bi0.replace(',', '.');
        const percentValue = parseFloat(sanitizedPercent.replace(/%/g, ''));
        if (isNaN(percentValue) || percentValue <= 0 || percentValue > 100) return await sReply("Input persen tidak valid (1-100).");
        const totalPercent = (saldoAwal * BigInt(Math.floor(percentValue * 100))) / 10000n;
        if (totalPercent === 0n) return await sReply("Jumlah taruhan dari persentase terlalu kecil.");
        bid = totalPercent / totalTaruhan;
        if (bid === 0n) return await sReply(`Jumlah taruhan per bet terlalu kecil, coba naikkan persentase.`);
        tot = bid * totalTaruhan;
      } else {
        tot = bid * totalTaruhan;
      }
      if (saldoAwal < tot) return await sReply(`Saldo tidak cukup. Kamu perlu: ${formatNumber(tot)}`);
      if (tot <= 0n) return await sReply("Jumlah total taruhan harus lebih dari 0.");
      const betInfo = `Taruhan: ${taruhanList.join(', ')}\nBet per taruhan: ${formatNumber(bid)}\nTotal bet: ${formatNumber(tot)}\n\nMemutar dadu...`;
      const { key } = await sReply(betInfo);
      const dice1 = Math.floor(Math.random() * 6) + 1;
      const dice2 = Math.floor(Math.random() * 6) + 1;
      const totalDice = dice1 + dice2;
      let hasil = `🎲 Dadu A: ${dice1} | 🎲 Dadu B: ${dice2}\n✨ Total: *${totalDice}*\n\n`;
      let totalReward = 0n;
      taruhanList.forEach(taruhan => {
        let menang = false;
        let multiplier = 0.0;
        const isBig = taruhan === 'big' || taruhan === 'besar';
        const isSmall = taruhan === 'small' || taruhan === 'kecil';
        const numTaruhan = parseInt(taruhan, 10);
        if (isBig && totalDice > 7) {
          menang = true;
          multiplier = 2;
        } else if (isSmall && totalDice < 7) {
          menang = true;
          multiplier = 2;
        } else if (!isNaN(numTaruhan) && totalDice === numTaruhan) {
          menang = true;
          multiplier = (taruhanList.length === 1) ? 10.0 : 2;
        }
        if (menang) {
          const reward = (bid * BigInt(Math.floor(multiplier * 10))) / 10n;
          totalReward += reward;
          hasil += `"${taruhan}" » ${formatNumber(bid)} x${multiplier.toFixed(1)}\n`;
        } else {
          hasil += `"${taruhan}" » -${formatNumber(bid)}\n`;
        }
      });
      const selisih = totalReward - tot;
      await user.addBalance(selisih);
      const saldoAkhir = saldoAwal + selisih;
      hasil += `\nSaldo Akhir: ${formatNumber(saldoAkhir)}`;
      await delay(1000);
      await fn.sendReply(toId, hasil, { edit: key });
      await user.addXp();
    } finally {
      gameStateManager.endGame(serial);
    }
  }
};