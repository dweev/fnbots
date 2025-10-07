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
  name: 'hilo',
  category: 'stateless',
  description: 'Game Hilo dengan taruhan (contoh: .hilo 10k high)',
  isLimitGameCommand: true,
  execute: async ({ fn, toId, user, args, serial, sReply }) => {
    await gameStateManager.startGame(serial);
    try {
      if (args.length !== 2) return await sReply("Format perintah tidak valid.\nContoh: .hilo 10k high");
      const pilihan = args[1].toLowerCase();
      if (!['high', 'low'].includes(pilihan)) return await sReply("Pilihan taruhan tidak valid. Gunakan 'high' atau 'low'.");
      if (!user || user.balance <= 0) return await sReply("User tidak ditemukan atau saldo 0.\nsilakan gunakan permainan mode grinding dulu seperti .chop, .mine, .fish, .hunt, .ngelonte, .work atau gunakan perintah .daily jika kamu belum daily claim hari ini.");
      const saldoAwal = BigInt(user.balance);
      const bi0 = args[0]?.toLowerCase();
      if (!bi0) return await sReply("Masukkan jumlah taruhan.");
      let bid = 0n;
      if (bi0 === 'all' || bi0 === 'allin') {
        bid = saldoAwal;
      } else if (bi0.endsWith('%')) {
        const percentValue = parseFloat(bi0.replace(/%/g, '').replace(',', '.'));
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
      const currentCard = Math.floor(Math.random() * 13) + 1;
      const nextCard = Math.floor(Math.random() * 13) + 1;
      const cardToEmoji = (val) => ['A🂡', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', 'J🂫', 'Q🂭', 'K🂮'][val - 1];
      let selisih = 0n;
      let resultText = "";
      if (nextCard === currentCard) {
        selisih = 0n;
        resultText = `SERI! Kartu kedua nilainya sama. Taruhan Kamu dikembalikan.\n`;
      } else if ((pilihan === 'high' && nextCard > currentCard) || (pilihan === 'low' && nextCard < currentCard)) {
        selisih = bid;
        resultText = `Kamu MENANG! Keuntungan bersih: +${formatNumber(bid)}\n`;
      } else {
        selisih = -bid;
        resultText = `Kamu KALAH! Kerugian: -${formatNumber(bid)}\n`;
      }
      if (selisih !== 0n) {
        await user.addBalance(selisih);
      }
      const saldoAkhir = saldoAwal + selisih;
      let hasil = `🎰 *HI-LO GAME* 🎰\n\n`;
      hasil += `Kartu Awal: ${cardToEmoji(currentCard)}\n`;
      hasil += `Taruhan Kamu: *${pilihan.toUpperCase()}*\n`;
      hasil += `Kartu Berikutnya: ${cardToEmoji(nextCard)}\n\n`;
      hasil += resultText;
      hasil += `\nSaldo Akhir: ${formatNumber(saldoAkhir)}`;
      await fn.sendReply(toId, hasil);
      await user.addXp();
    } finally {
      gameStateManager.endGame(serial);
    }
  }
};