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
  name: 'blackjack',
  category: 'stateless',
  description: 'Game BlackJack dengan taruhan (contoh: .blackjack 10k)',
  isLimitGameCommand: true,
  execute: async ({ fn, toId, user, args, serial, sReply }) => {
    await gameStateManager.startGame(serial);
    try {
      if (args.length > 1) return await sReply("Format tidak valid. Contoh: .blackjack 10k");
      if (!user || user.balance <= 0) return await sReply("User tidak ditemukan atau saldo 0.\nsilakan gunakan permainan mode grinding dulu seperti .chop, .mine, .fish, .hunt, .ngelonte, .work atau gunakan perintah .daily jika kamu belum daily claim hari ini.");
      const saldoAwal = BigInt(user.balance);
      const bi0 = args[0]?.toLowerCase();
      if (!bi0) return await sReply("Masukkan jumlah taruhan.");
      let bid = 0n;
      if (bi0 === 'all' || bi0 === 'allin') {
        bid = saldoAwal;
      } else if (bi0.endsWith('%')) {
        const percentValue = parseFloat(bi0.replace('%', '').replace(',', '.'));
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
        const sanitized = numPart.replace(',', '.');
        const num = Number(sanitized);
        if (isNaN(num) || num <= 0) return await sReply("Input jumlah taruhan tidak valid.");
        if (sanitized.includes('.')) {
          const parts = sanitized.split('.');
          const decimalPlaces = BigInt(parts[1].length);
          const divisor = 10n ** decimalPlaces;
          const numberWithoutDecimal = BigInt(sanitized.replace('.', ''));
          bid = (numberWithoutDecimal * multiplier) / divisor;
        } else {
          bid = BigInt(num) * multiplier;
        }
      }
      if (bid <= 0n) return await sReply("Jumlah taruhan harus lebih dari 0.");
      if (saldoAwal < bid) return await sReply(`Saldo tidak cukup. Diperlukan: ${formatNumber(bid)}`);
      const { key } = await sReply(`🃏 *BLACKJACK* 🃏\nAnda bertaruh sebesar ${formatNumber(bid)}.\n\nDealer sedang membagikan kartu...`);
      const RISKY_HIT_CHANCE = 0.001;
      const deck = [];
      const suits = ['♠️', '♥️', '♦️', '♣️'];
      const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
      for (let i = 0; i < 4; i++) {
        for (const suit of suits) {
          for (const rank of ranks) {
            deck.push({ rank, suit });
          }
        }
      }
      deck.sort(() => Math.random() - 0.5);
      const draw = () => deck.pop();
      const formatHand = (cards) => cards.map(c => `[${c.rank}${c.suit}]`).join(' ');
      const calculateHandValue = (hand) => {
        let value = 0;
        let aceCount = 0;
        for (const card of hand) {
          if (card.rank === 'A') {
            aceCount++;
            value += 11;
          } else if (['J', 'Q', 'K', '10'].includes(card.rank)) {
            value += 10;
          } else {
            value += parseInt(card.rank);
          }
        }
        while (value > 21 && aceCount > 0) {
          value -= 10;
          aceCount--;
        }
        return value;
      };
      const playerHand = [draw(), draw()];
      const dealerHand = [draw(), draw()];
      let log = ``;
      const playerHasBlackjack = calculateHandValue(playerHand) === 21 && playerHand.length === 2;
      const dealerHasBlackjack = calculateHandValue(dealerHand) === 21 && dealerHand.length === 2;
      let menang = false, seri = false, blackjackWin = false;
      if (playerHasBlackjack) {
        blackjackWin = true;
        if (dealerHasBlackjack) {
          seri = true;
          log += `Kamu dan Dealer sama-sama BLACKJACK! Hasilnya seri (Push).\n`;
        } else {
          menang = true;
          log += `NATURAL BLACKJACK! Kemenangan instan!\n`;
        }
      } else {
        log += `Kamu bermain dengan strategi standar...\n`;
        while (calculateHandValue(playerHand) < 17) {
          playerHand.push(draw());
        }
        let playerVal = calculateHandValue(playerHand);
        if (playerVal >= 17 && playerVal <= 20 && Math.random() < RISKY_HIT_CHANCE) {
          log += `\n*LANGKAH GILA!* Kamu merasakan dorongan nekat untuk menarik satu kartu lagi...\n`;
          playerHand.push(draw());
          playerVal = calculateHandValue(playerHand);
        }
        log += `\nTangan final Kamu: ${formatHand(playerHand)} (Total: *${playerVal}*)\n`;
        if (playerVal > 21) {
          log += `Kamu *bust*! Nilai melebihi 21.\n`;
        } else {
          log += `\nDealer membuka kartunya...\n`;
          while (calculateHandValue(dealerHand) < 17) {
            dealerHand.push(draw());
          }
          let dealerVal = calculateHandValue(dealerHand);
          if (dealerVal >= 17 && dealerVal <= 20 && Math.random() < RISKY_HIT_CHANCE) {
            log += `\n*DEALER NEKAT!* Tiba-tiba, Dealer menarik satu kartu lagi secara membabi buta...\n`;
            dealerHand.push(draw());
            dealerVal = calculateHandValue(dealerHand);
          }
          log += `\nTangan final Dealer: ${formatHand(dealerHand)} (Total: *${dealerVal}*)\n\n`;
          if (dealerVal > 21) {
            log += `Dealer bust! Kamu menang.\n`;
            menang = true;
          } else if (playerVal > dealerVal) {
            log += `Kamu menang dengan nilai lebih tinggi.\n`;
            menang = true;
          } else if (playerVal < dealerVal) {
            log += `Kamu kalah, dealer lebih tinggi.\n`;
          } else {
            log += `Seri, nilai sama (Push).\n`;
            seri = true;
          }
        }
      }
      let selisih = 0n;
      if (blackjackWin) {
        selisih = (bid * 3n) / 2n;
        log += `\nKeuntungan Spesial: *+${formatNumber(selisih)}* (Payout 3:2)\n`;
      } else if (menang) {
        selisih = bid;
        log += `\nKeuntungan: *+${formatNumber(selisih)}*\n`;
      } else if (!seri) {
        selisih = -bid;
        log += `\nKerugian: *-${formatNumber(bid)}*\n`;
      }
      if (selisih !== 0n) {
        await user.addBalance(selisih);
      }
      const saldoAkhir = saldoAwal + selisih;
      log += `\nSaldo Akhir: ${formatNumber(saldoAkhir)}`;
      await delay(1000); 
      await fn.sendReply(toId, `🃏 *BLACKJACK* 🃏\n\nTaruhan: ${formatNumber(bid)}\n${log}`, { edit: key });
      await user.addXp();
    } finally {
      gameStateManager.endGame(serial);
    }
  }
};