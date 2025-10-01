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
  name: 'baccarat',
  category: 'stateless',
  description: 'Game Baccarat',
  isLimitGameCommand: true,
  execute: async ({ fn, toId, user, args, serial, sReply }) => {
    await gameStateManager.startGame(serial);
    try {
      if (args.length > 2) return await sReply("Pesan tidak valid, contoh: .baccarat 10k banker, .baccarat all tie, .baccarat 50% player");
      const PilihanTaruhan = args[1] ? args[1].toLowerCase() : '';
      if (!['player', 'banker', 'tie'].includes(PilihanTaruhan)) return await sReply("Format salah! Pilih taruhan: player, banker, atau tie.\nContoh: .baccarat 1k player");
      if (!user || user.balance <= 0) return await sReply("User tidak ditemukan atau saldo 0.\nsilakan gunakan permainan mode grinding dulu seperti .chop, .mine, .fish, .hunt, .ngelonte, .work atau gunakan perintah .daily jika kamu belum daily claim hari ini.");
      const saldoAwal = BigInt(user.balance);
      let bi0 = args[0] ? args[0].toLowerCase() : '';
      if (!bi0) return await sReply("Masukkan jumlah taruhan.");
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
      let { key } = await sReply(`🂡 *BACCARAT* 🂡\nAnda bertaruh ${formatNumber(bid)} pada *${PilihanTaruhan.toUpperCase()}*.\n\n⏳ Membagikan kartu...`)
      const suits = ['♠️', '♥️', '♦️', '♣️'];
      const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
      let deck = [];
      for (let i = 0; i < 4; i++) {
        for (const suit of suits) {
          for (const rank of ranks) {
            deck.push({ rank, suit });
          }
        }
      }
      deck.sort(() => Math.random() - 0.5);
      const getCardValue = (card) => {
        if (['10', 'J', 'Q', 'K'].includes(card.rank)) return 0;
        if (card.rank === 'A') return 1;
        return parseInt(card.rank);
      };
      const calculateHandValue = (hand) => {
        return hand.reduce((sum, card) => sum + getCardValue(card), 0) % 10;
      };
      const drawCard = () => deck.pop();
      const formatHand = (hand) => hand.map(c => `[${c.rank}${c.suit}]`).join(' ');
      let playerHand = [drawCard(), drawCard()];
      let bankerHand = [drawCard(), drawCard()];
      let playerValue = calculateHandValue(playerHand);
      let bankerValue = calculateHandValue(bankerHand);
      let playerThirdCard = null;
      let log = `Tangan Awal:\n`;
      log += `> Player: ${formatHand(playerHand)} (Total: ${playerValue})\n`;
      log += `> Banker: ${formatHand(bankerHand)} (Total: ${bankerValue})\n\n`;
      if (playerValue < 8 && bankerValue < 8) {
        if (playerValue <= 5) {
          playerThirdCard = drawCard();
          playerHand.push(playerThirdCard);
          playerValue = calculateHandValue(playerHand);
          log += `Player menarik kartu ketiga: ${formatHand([playerThirdCard])}\n`;
        } else {
          log += `Player bertahan (stand).\n`;
        }
        const playerDrew = !!playerThirdCard;
        let bankerDraws = false;
        if (!playerDrew) {
          if (bankerValue <= 5) bankerDraws = true;
        } else {
          const p3Value = getCardValue(playerThirdCard);
          if (bankerValue <= 2) bankerDraws = true;
          else if (bankerValue === 3 && p3Value !== 8) bankerDraws = true;
          else if (bankerValue === 4 && p3Value >= 2 && p3Value <= 7) bankerDraws = true;
          else if (bankerValue === 5 && p3Value >= 4 && p3Value <= 7) bankerDraws = true;
          else if (bankerValue === 6 && p3Value >= 6 && p3Value <= 7) bankerDraws = true;
        }
        if (bankerDraws) {
          const bankerThirdCard = drawCard();
          bankerHand.push(bankerThirdCard);
          bankerValue = calculateHandValue(bankerHand);
          log += `Banker menarik kartu ketiga: ${formatHand([bankerThirdCard])}\n`;
        } else {
          log += `Banker bertahan (stand).\n`;
        }
      } else {
        log += "Natural Win! Permainan berhenti.\n";
      }
      let pemenang = '';
      if (playerValue > bankerValue) pemenang = 'player';
      else if (bankerValue > playerValue) pemenang = 'banker';
      else pemenang = 'tie';
      let reward = 0n;
      let multiplierText = "";
      let menang = (PilihanTaruhan === pemenang);
      if (menang) {
        if (pemenang === 'player') {
          reward = bid;
          multiplierText = "(Payout 1:1)";
        } else if (pemenang === 'banker') {
          reward = (bid * 95n) / 100n;
          multiplierText = "(Payout 0.95:1, 5% Komisi)";
        } else if (pemenang === 'tie') {
          reward = bid * 8n;
          multiplierText = "(Payout 8:1)";
        }
      }
      const selisih = menang ? reward : -bid;
      await user.addBalance(selisih);
      const saldoAkhir = saldoAwal + selisih;
      let hasil = `🂡 *BACCARAT* 🂡\n\n`;
      hasil += `${log}\n`;
      hasil += `Hasil Akhir:\n`;
      hasil += `> Player: ${formatHand(playerHand)} (Total: *${playerValue}*)\n`;
      hasil += `> Banker: ${formatHand(bankerHand)} (Total: *${bankerValue}*)\n\n`;
      hasil += `Pemenangnya adalah *${pemenang.toUpperCase()}*!\n\n`;
      if (menang) {
        hasil += `Selamat, taruhanmu pada "${PilihanTaruhan.toUpperCase()}" menang!\n`;
        hasil += `Taruhan Kamu: ${formatNumber(bid)}\n`;
        hasil += `Payout: ${multiplierText}\n`;
        hasil += `Keuntungan Bersih: *+${formatNumber(reward)}*\n`;
      } else {
        hasil += `Sayang sekali, taruhanmu pada "${PilihanTaruhan}" kalah.\n`;
        hasil += `Kamu kehilangan: -${formatNumber(bid)}\n`;
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