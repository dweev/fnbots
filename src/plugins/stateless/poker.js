// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { delay } from 'baileys';
import { gameStateManager } from '../../lib/gameManager.js';
import { getHandDetails, createDeck, shuffleDeck, anteBonusMultipliers, formatHandSimple, formatNumber } from '../../function/index.js';

export const command = {
  name: 'poker',
  category: 'stateless',
  description: 'Game Poker dengan taruhan (contoh: .poker 10k)',
  isLimitGameCommand: true,
  execute: async ({ fn, toId, user, args, serial, sReply }) => {
    await gameStateManager.startGame(serial);
    try {
      if (args.length > 1) return await sReply("Format tidak valid. Contoh: .poker 10k");
      if (!user || user.balance <= 0) return await sReply("User tidak ditemukan atau saldo 0.\nsilakan gunakan permainan mode grinding dulu seperti .chop, .mine, .fish, .hunt, .ngelonte, .work atau gunakan perintah .daily jika kamu belum daily claim hari ini.");
      const saldoAwal = BigInt(user.balance);
      const bi0 = args[0] ? args[0].toLowerCase() : '';
      if (!bi0) return await sReply("Format tidak valid. Contoh: .poker 10k");
      let bid;
      if (bi0 === 'all' || bi0 === 'allin') { bid = saldoAwal; }
      else if (bi0.endsWith('%')) {
        const percentValue = parseFloat(bi0.replace(/%/g, '').replace(',', '.'));
        if (isNaN(percentValue) || percentValue <= 0 || percentValue > 100) return await sReply("Input persen tidak valid (1-100).");
        bid = (saldoAwal * BigInt(Math.floor(percentValue * 100))) / 10000n;
      } else {
        let multiplier = 1n; let numPart = bi0;
        if (bi0.endsWith('k')) { multiplier = 1000n; numPart = bi0.slice(0, -1); }
        else if (bi0.endsWith('m')) { multiplier = 1000000n; numPart = bi0.slice(0, -1); }
        else if (bi0.endsWith('b')) { multiplier = 1000000000n; numPart = bi0.slice(0, -1); }
        else if (bi0.endsWith('t')) { multiplier = 1000000000000n; numPart = bi0.slice(0, -1); }
        else if (bi0.endsWith('q')) { multiplier = 1000000000000000n; numPart = bi0.slice(0, -1); }
        const sanitized = numPart.replace(',', '.'); const num = Number(sanitized);
        if (isNaN(num) || !isFinite(num) || num <= 0) return await sReply("Format tidak valid. Contoh: .poker 10k");
        if (sanitized.includes('.')) {
          const parts = sanitized.split('.'); const decimalPlaces = BigInt(parts[1].length);
          const divisor = 10n ** decimalPlaces; const numberWithoutDecimal = BigInt(sanitized.replace('.', ''));
          bid = (numberWithoutDecimal * multiplier) / divisor;
        } else { bid = BigInt(sanitized) * multiplier; }
      }
      if (bid <= 0n) return await sReply("Jumlah taruhan harus lebih dari 0.");
      if (saldoAwal < bid) return await sReply(`Saldo tidak cukup. Diperlukan: ${formatNumber(bid)}`);
      const { key } = await sReply(`🃏 *THREE CARD POKER* 🃏\nAnda bertaruh sebesar ${formatNumber(bid)}.\n\nDealer sedang membagikan kartu...`);
      const deck = createDeck();
      shuffleDeck(deck);
      const playerHand = [deck.pop(), deck.pop(), deck.pop()];
      const dealerHand = [deck.pop(), deck.pop(), deck.pop()];
      const playerDetails = getHandDetails(playerHand);
      const dealerDetails = getHandDetails(dealerHand);
      const menang = playerDetails.rankValue > dealerDetails.rankValue;
      const isSeri = playerDetails.rankValue === dealerDetails.rankValue;
      const hasilTaruhan = menang ? bid : -bid;
      let anteBonus = 0n;
      let bonusText = "";
      if (menang) {
        const bonusMultiplier = anteBonusMultipliers[playerDetails.rankValue];
        if (bonusMultiplier) {
          anteBonus = bid * bonusMultiplier;
          bonusText = `\n*BONUS* (${playerDetails.name}): +${formatNumber(anteBonus)} (x${bonusMultiplier})`;
        }
      }
      const selisih = hasilTaruhan + anteBonus;
      if (selisih !== 0n) {
        await user.addBalance(selisih);
      }
      const saldoAkhir = saldoAwal + selisih;
      let hasil = `🃏 *HASIL THREE CARD POKER* 🃏\n\n`;
      hasil += `*Tangan Kamu*: ${formatHandSimple(playerHand)}\n   └ Peringkat: *${playerDetails.name}*\n\n`;
      hasil += `*Tangan Dealer*: ${formatHandSimple(dealerHand)}\n   └ Peringkat: *${dealerDetails.name}*\n\n`;
      hasil += `---HASIL TARUHAN---\n`;
      if (menang) {
        hasil += `*MENANG vs Dealer!* Keuntungan: +${formatNumber(bid)}`;
      } else {
        if (isSeri) {
          hasil += `*KALAH (SERI)!* Taruhan hangus. Kerugian: -${formatNumber(bid)}`;
        } else {
          hasil += `*KALAH vs Dealer.* Kerugian: -${formatNumber(bid)}`;
        }
      }
      hasil += bonusText;
      hasil += `\n\nSaldo Akhir: ${formatNumber(saldoAkhir)}`;
      await delay(1000); 
      await fn.sendReply(toId, hasil, { edit: key });
      await user.addXp();
    } finally {
      gameStateManager.endGame(serial);
    }
  }
};