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
  name: 'aduq',
  category: 'stateless',
  description: 'Game AduQ Domino',
  isLimitGameCommand: true,
  execute: async ({ fn, toId, user, args, serial, sReply }) => {
    await gameStateManager.startGame(serial);
    try {
      if (args.length > 1) return await sReply("Pesan tidak valid, contoh: .aduq 10k, .aduq all, .aduq 50%");
      if (!user || user.balance <= 0) return await sReply("User tidak ditemukan atau saldo 0.\nsilakan gunakan permainan mode grinding dulu seperti .chop, .mine, .fish, .hunt, .ngelonte, .work atau gunakan perintah .daily jika kamu belum daily claim hari ini.");
      const saldoAwal = BigInt(user.balance);
      const bi0 = args[0] ? args[0].toLowerCase() : '';
      if (!bi0) return await sReply("Masukkan jumlah taruhan, contoh: .aduq 10k, .aduq all, .aduq 50%");
      let bid = 0n;
      if (bi0 === 'all' || bi0 === 'allin') {
        bid = saldoAwal;
      } else if (bi0.endsWith('%')) {
        const sanitizedPercent = bi0.replace(',', '.');
        const percentValue = parseFloat(sanitizedPercent.replace('%', ''));
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
      const { key } = await sReply(`🀄 *ADUQ* 🀄\nAnda bertaruh sebesar ${formatNumber(bid)}.\n\nMengocok kartu domino...`);
      const createDominoDeck = () => {
        const deck = [];
        for (let i = 0; i <= 6; i++) {
          for (let j = i; j <= 6; j++) {
            deck.push({ a: i, b: j, isBalak: i === j });
          }
        }
        return deck.sort(() => Math.random() - 0.5);
      };
      const getHandValue = (hand) => (hand[0].a + hand[0].b + hand[1].a + hand[1].b) % 10;
      const getHighestBalakValue = (hand) => {
        let highest = -1;
        if (hand[0].isBalak) highest = Math.max(highest, hand[0].a);
        if (hand[1].isBalak) highest = Math.max(highest, hand[1].a);
        return highest;
      };
      const formatDominoHand = (hand) => hand.map(c => `[${c.a}|${c.b}]`).join(' ');
      const deck = createDominoDeck();
      const playerHand = [deck.pop(), deck.pop()];
      const botHand = [deck.pop(), deck.pop()];
      const playerValue = getHandValue(playerHand);
      const botValue = getHandValue(botHand);
      let winner = null;
      if (playerValue > botValue) {
        winner = 'player';
      } else if (botValue > playerValue) {
        winner = 'bot';
      } else {
        const playerBalak = getHighestBalakValue(playerHand);
        const botBalak = getHighestBalakValue(botHand);
        if (playerBalak > botBalak) {
          winner = 'player';
        } else if (botBalak > playerBalak) {
          winner = 'bot';
        } else {
          winner = 'push';
        }
      }
      let selisih = 0n;
      let winText = "";
      if (winner === 'player') {
        selisih = bid;
        winText = `*Kamu Menang!*\nKeuntungan bersih: +${formatNumber(selisih)}`;
      } else if (winner === 'bot') {
        selisih = -bid;
        winText = `*Kamu Kalah.*\nKerugian: -${formatNumber(bid)}`;
      } else {
        selisih = 0n;
        winText = `*Seri!*\nTaruhan Kamu sebesar ${formatNumber(bid)} dikembalikan.`;
      }
      if (selisih !== 0n) {
        await user.addBalance(selisih);
      }
      const saldoAkhir = saldoAwal + selisih;
      let hasil = `🀄 *ADUQ* 🀄\n\n`;
      hasil += `Tangan Kamu: ${formatDominoHand(playerHand)} (Nilai: *${playerValue}*)\n`;
      hasil += `Tangan Bot: ${formatDominoHand(botHand)} (Nilai: *${botValue}*)\n\n`;
      hasil += `${winText}\n\n`;
      hasil += `Saldo Akhir: ${formatNumber(saldoAkhir)}`;
      await delay(1000);
      await fn.sendReply(toId, hasil, { edit: key });
      await user.addXp();
    } finally {
      gameStateManager.endGame(serial);
    }
  }
};