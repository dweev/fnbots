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
  name: 'totobet',
  category: 'stateless',
  description: 'Game Totobet dengan taruhan (contoh: .totobet 1k 4D 1234)',
  isLimitGameCommand: true,
  execute: async ({ fn, toId, user, args, serial, sReply }) => {
    await gameStateManager.startGame(serial);
    try {
      if (args.length < 3) return await sReply("Format salah!\n\nContoh:\n.totobet 1k 4D 1234\n.totobet 1k 2D 56\n.totobet 1k colok 8");
      if (!user || user.balance <= 0) return await sReply("User tidak ditemukan atau saldo 0.\nsilakan gunakan permainan mode grinding dulu seperti .chop, .mine, .fish, .hunt, .ngelonte, .work atau gunakan perintah .daily jika kamu belum daily claim hari ini.");
      const saldoAwal = BigInt(user.balance);
      const bi0 = args[0] ? args[0].toLowerCase() : '';
      if (!bi0) return await sReply("Masukkan jumlah taruhan.");
      let bid;
      if (bi0 === 'all' || bi0 === 'allin') {
        bid = saldoAwal;
      } else if (bi0.endsWith('%')) {
        const sanitizedPercent = bi0.replace(',', '.');
        const percentValue = parseFloat(sanitizedPercent.replace(/%/g, ''));
        if (isNaN(percentValue) || percentValue <= 0 || percentValue > 100) return await sReply("Input persen tidak valid (1-100).");
        bid = (saldoAwal * BigInt(Math.floor(percentValue * 100))) / 10000n;
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
      if (bid <= 0n) return await sReply("Jumlah taruhan harus lebih dari 0.");
      if (saldoAwal < bid) return await sReply(`Saldo tidak cukup. Kamu perlu: ${formatNumber(bid)}`);
      const betType = args[1].toLowerCase();
      const betNumbers = args[2];
      if (!['4d', '3d', '2d', 'colok'].includes(betType)) return await sReply("Jenis taruhan tidak valid. Pilih: 4d, 3d, 2d, colok.");
      if (!/^\d+$/.test(betNumbers)) return await sReply("Angka tebakan hanya boleh berisi digit.");
      if (betType === '4d' && betNumbers.length !== 4) return await sReply("Taruhan 4D harus 4 digit.");
      if (betType === '3d' && betNumbers.length !== 3) return await sReply("Taruhan 3D harus 3 digit.");
      if (betType === '2d' && betNumbers.length !== 2) return await sReply("Taruhan 2D harus 2 digit.");
      if (betType === 'colok' && betNumbers.length !== 1) return await sReply("Taruhan Colok harus 1 digit.");
      const { key } = await sReply(`Taruhan Kamu pada *${betType.toUpperCase()}* dengan angka *${betNumbers}* sebesar ${formatNumber(bid)} telah diterima.\n\nMengundi hasil...`);
      const winningNumberStr = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      let menang = false;
      let multiplier = 0.0;
      if (betType === '4d' && betNumbers === winningNumberStr) { menang = true; multiplier = 4000; }
      else if (betType === '3d' && betNumbers === winningNumberStr.slice(1)) { menang = true; multiplier = 400; }
      else if (betType === '2d' && betNumbers === winningNumberStr.slice(2)) { menang = true; multiplier = 70; }
      else if (betType === 'colok') {
        const occurrences = winningNumberStr.split(betNumbers).length - 1;
        if (occurrences > 0) {
          menang = true;
          if (occurrences === 1) multiplier = 1.5;
          else if (occurrences === 2) multiplier = 3;
          else if (occurrences === 3) multiplier = 4.5;
          else if (occurrences === 4) multiplier = 6;
        }
      }
      let untungBersih = 0n;
      let totalMenang = 0n;
      if (menang) {
        totalMenang = (bid * BigInt(Math.floor(multiplier * 100))) / 100n;
        untungBersih = totalMenang;
      }
      const selisih = menang ? untungBersih : -bid;
      await user.addBalance(serial, selisih);
      const saldoAkhir = saldoAwal + selisih;
      let hasil = `🎟️ *HASIL TOTOBET* 🎟️\n\n`;
      hasil += `Angka Keluar:  *${winningNumberStr.split('').join(' ')}*\n`;
      hasil += `Taruhan Kamu: *${betType.toUpperCase()} - ${betNumbers}*\n\n`;
      if (menang) {
        hasil += `*Selamat, Kamu Menang!*\n`;
        hasil += `Modal Taruhan: -${formatNumber(bid)}\n`;
        hasil += `Hadiah Kemenangan: +${formatNumber(totalMenang)}\n`;
        hasil += `Untung Bersih: *+${formatNumber(untungBersih)}*\n`;
      } else {
        hasil += `*Kamu Kalah*\n`;
        hasil += `Kerugian: -${formatNumber(bid)}\n`;
      }
      hasil += `\nSaldo Akhir: ${formatNumber(saldoAkhir)}`;
      await delay(1000);
      await fn.sendReply(toId, hasil, { edit: key });
      await user.addXp();
    } finally {
      gameStateManager.endGame(serial);
    }
  }
};