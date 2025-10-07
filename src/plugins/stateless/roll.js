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
  name: 'roll',
  category: 'stateless',
  description: 'Game Roullete dengan taruhan (contoh: .roll 1k red, 25, 26-30)',
  isLimitGameCommand: true,
  execute: async ({ fn, toId, user, args, serial, sReply }) => {
    await gameStateManager.startGame(serial);
    try {
      const q = args.join(' ');
      if (!user || user.balance <= 0) return await sReply("User tidak ditemukan atau saldo 0.\nsilakan gunakan permainan mode grinding dulu seperti .chop, .mine, .fish, .hunt, .ngelonte, .work atau gunakan perintah .daily jika kamu belum daily claim hari ini.");
      const saldoAwal = BigInt(user.balance);
      const bi0 = args[0] ? args[0].toLowerCase() : '';
      if (!bi0) return await sReply("Masukkan jumlah taruhan. Contoh: .roll 1k red");
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
        if (isNaN(numValue) || !isFinite(numValue) || numValue <= 0) return await sReply("Input jumlah taruhan tidak valid. Gunakan format seperti: 1k, 50k, 1.5m, 2,2t");
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
      if (!taruhanInput) return await sReply("Format salah! Pilih taruhan setelah jumlah bid.\nContoh: .roll 1k red, 25, 5-10");
      const taruhanData = taruhanInput.split(/[, ]+/).filter(a => a.trim() !== '');
      if (taruhanData.length === 0) return await sReply("Pilihan taruhan tidak boleh kosong.");
      const validKeywords = new Set(['red', 'merah', 'black', 'hitam', 'green', 'hijau', 'odd', 'ganjil', 'even', 'genap']);
      let taruhanList = [];
      taruhanData.forEach(item => {
        const cleanedItem = item.toLowerCase();
        if (validKeywords.has(cleanedItem)) {
          taruhanList.push(cleanedItem);
        } else if (/^\d+$/.test(cleanedItem) && parseInt(cleanedItem) >= 0 && parseInt(cleanedItem) <= 36) {
          taruhanList.push(cleanedItem);
        } else if (cleanedItem.includes('-')) {
          const [start, end] = cleanedItem.split('-').map(n => parseInt(n.trim(), 10));
          if (!isNaN(start) && !isNaN(end) && start <= end && start > 0 && end <= 36) {
            for (let i = start; i <= end; i++) taruhanList.push(i.toString());
          }
        } else if (cleanedItem.startsWith('>')) {
          const min = parseInt(cleanedItem.slice(1), 10);
          if (!isNaN(min) && min < 36 && min > 0) {
            for (let i = min + 1; i <= 36; i++) taruhanList.push(i.toString());
          }
        } else if (cleanedItem.startsWith('<')) {
          const max = parseInt(cleanedItem.slice(1), 10);
          if (!isNaN(max) && max > 1 && max <= 36) {
            for (let i = 1; i < max; i++) taruhanList.push(i.toString());
          }
        }
      });
      taruhanList = [...new Set(taruhanList)];
      if (taruhanList.length === 0) return await sReply("Tidak ada taruhan valid yang ditemukan.");
      const betSet = new Set(taruhanList);
      if ((betSet.has('red') || betSet.has('merah')) && (betSet.has('black') || betSet.has('hitam'))) return await sReply("Dilarang bertaruh pada 'red' dan 'black' bersamaan.");
      if ((betSet.has('red') || betSet.has('merah') || betSet.has('black') || betSet.has('hitam')) && (betSet.has('green') || betSet.has('hijau'))) return await sReply("Dilarang bertaruh pada 'red/black' dan 'green' bersamaan.");
      if ((betSet.has('odd') || betSet.has('ganjil')) && (betSet.has('even') || betSet.has('genap'))) return await sReply("Dilarang bertaruh pada 'odd' dan 'even' bersamaan.");
      if (betSet.has('0') && taruhanList.length > 1) return await sReply("Taruhan '0' hanya boleh 1 angka saja.");
      const totalTaruhan = BigInt(taruhanList.length);
      let tot = 0n;
      if (isAllIn) {
        if (totalTaruhan > 1n) return await sReply("'all' hanya untuk 1 jenis taruhan.");
        bid = saldoAwal; tot = saldoAwal;
      } else if (isPercent) {
        const sanitizedPercent = bi0.replace(',', '.');
        const percentValue = parseFloat(sanitizedPercent.replace(/%/g, ''));
        if (isNaN(percentValue) || percentValue <= 0 || percentValue > 100) return await sReply("Input persen tidak valid (1-100).");
        const totalPercent = (saldoAwal * BigInt(Math.floor(percentValue * 100))) / 10000n;
        if (totalPercent === 0n) return await sReply("Jumlah taruhan dari persentase terlalu kecil.");
        bid = totalPercent / totalTaruhan;
        if (bid === 0n) return await sReply(`Jumlah taruhan per bet terlalu kecil.`);
        tot = bid * totalTaruhan;
      } else {
        tot = bid * totalTaruhan;
      }
      if (saldoAwal < tot) return await sReply(`Saldo tidak cukup. Kamu perlu: ${formatNumber(tot)}`);
      if (tot <= 0n) return await sReply("Jumlah total taruhan harus lebih dari 0.");
      const betInfo = `Taruhan: ${taruhanList.join(', ')}\nBet per taruhan: ${formatNumber(bid)}\nTotal bet: ${formatNumber(tot)}\n\nRoda berputar...`;
      const { key } = await sReply(betInfo);
      const ROULETTE_POCKETS = [
        { num: 0, color: 'green' }, { num: 1, color: 'red' }, { num: 2, color: 'black' }, { num: 3, color: 'red' }, { num: 4, color: 'black' },
        { num: 5, color: 'red' }, { num: 6, color: 'black' }, { num: 7, color: 'red' }, { num: 8, color: 'black' }, { num: 9, color: 'red' },
        { num: 10, color: 'black' }, { num: 11, color: 'black' }, { num: 12, color: 'red' }, { num: 13, color: 'black' }, { num: 14, color: 'red' },
        { num: 15, color: 'black' }, { num: 16, color: 'red' }, { num: 17, color: 'black' }, { num: 18, color: 'red' }, { num: 19, color: 'red' },
        { num: 20, color: 'black' }, { num: 21, color: 'red' }, { num: 22, color: 'black' }, { num: 23, color: 'red' }, { num: 24, color: 'black' },
        { num: 25, color: 'red' }, { num: 26, color: 'black' }, { num: 27, color: 'red' }, { num: 28, color: 'black' }, { num: 29, color: 'black' },
        { num: 30, color: 'red' }, { num: 31, color: 'black' }, { num: 32, color: 'red' }, { num: 33, color: 'black' }, { num: 34, color: 'red' },
        { num: 35, color: 'black' }, { num: 36, color: 'red' }
      ];
      const winningPocket = ROULETTE_POCKETS[Math.floor(Math.random() * ROULETTE_POCKETS.length)];
      const winningNumber = winningPocket.num;
      const winningColor = winningPocket.color;
      let hasil = `Angka Keluar: *${winningNumber} ${winningColor.charAt(0).toUpperCase() + winningColor.slice(1)}*\n\n`;
      let totalReward = 0n;
      taruhanList.forEach(taruhan => {
        let menang = false;
        let multiplier = 0;
        const num = parseInt(taruhan, 10);
        if (!isNaN(num)) {
          if (num === winningNumber) {
            menang = true;
            if (num === 0 && taruhanList.length === 1) {
              multiplier = 3600;
            } else if (taruhanList.length === 1) {
              multiplier = 18;
            } else {
              multiplier = 1.8;
            }
          }
        } else if (taruhan === 'red' || taruhan === 'merah') {
          if (winningColor === 'red') { menang = true; multiplier = 2; }
        } else if (taruhan === 'black' || taruhan === 'hitam') {
          if (winningColor === 'black') { menang = true; multiplier = 2; }
        } else if (taruhan === 'even' || taruhan === 'genap') {
          if (winningNumber !== 0 && winningNumber % 2 === 0) { menang = true; multiplier = 2; }
        } else if (taruhan === 'odd' || taruhan === 'ganjil') {
          if (winningNumber !== 0 && winningNumber % 2 !== 0) { menang = true; multiplier = 2; }
        }
        if (menang) {
          const finalMultiplier = Math.floor(multiplier * 100) / 100;
          const reward = (bid * BigInt(Math.floor(finalMultiplier * 100))) / 100n;
          totalReward += reward;
          hasil += `"${taruhan}" » ${formatNumber(bid)} x${finalMultiplier.toFixed(2)} » +${formatNumber(reward)}\n`;
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