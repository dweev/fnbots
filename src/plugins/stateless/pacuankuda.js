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

const horseData = [
  { id: 1, name: 'Yanto', emoji: '🐎' },
  { id: 2, name: 'Gobel', emoji: '🐴' },
  { id: 3, name: 'Mukidi', emoji: '🏇' },
  { id: 4, name: 'Setro', emoji: '🦓' },
  { id: 5, name: 'Slamet', emoji: '🦄' },
  { id: 6, name: 'Cokro', emoji: '🦌' }
];

export const command = {
  name: 'pacuankuda',
  category: 'stateless',
  description: 'Game Pacuan Kuda dengan taruhan (contoh: .pacuankuda 10k Yanto)',
  isLimitGameCommand: true,
  execute: async ({ fn, toId, user, args, serial, sReply }) => {
    await gameStateManager.startGame(serial);
    try {
      const horseNames = horseData.map(h => h.name.toLowerCase());
      if (args.length < 2) return await sReply(`Format salah!\nContoh: .pacuankuda 10k Yanto`);
      const playerBetOnName = args[1].toLowerCase();
      if (!horseNames.includes(playerBetOnName)) return await sReply(`Nama kuda tidak valid.\nPilih: ${horseData.map(h => h.name).join(', ')}`);
      const chosenHorse = horseData.find(h => h.name.toLowerCase() === playerBetOnName);
      if (!user || user.balance <= 0) return await sReply("User tidak ditemukan atau saldo 0.\nsilakan gunakan permainan mode grinding dulu seperti .chop, .mine, .fish, .hunt, .ngelonte, .work atau gunakan perintah .daily jika kamu belum daily claim hari ini.");
      const saldoAwal = BigInt(user.balance);
      const bi0 = args[0] ? args[0].toLowerCase() : '';
      if (!bi0) return await sReply(`Format salah!\nContoh: .pacuankuda 10k Yanto`);
      let bid = 0n;
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
        if (isNaN(num) || !isFinite(num) || num <= 0) return await sReply(`Format salah!\nContoh: .pacuankuda 10k Yanto`);
        if (sanitized.includes('.')) {
          const parts = sanitized.split('.'); const decimalPlaces = BigInt(parts[1].length);
          const divisor = 10n ** decimalPlaces; const numberWithoutDecimal = BigInt(sanitized.replace('.', ''));
          bid = (numberWithoutDecimal * multiplier) / divisor;
        } else { bid = BigInt(sanitized) * multiplier; }
      }
      if (bid <= 0n) return await sReply("Jumlah taruhan harus lebih dari 0.");
      if (saldoAwal < bid) return await sReply(`Saldo tidak cukup. Diperlukan: ${formatNumber(bid)}`);
      const trackLength = 13;
      const horses = JSON.parse(JSON.stringify(horseData));
      horses.forEach(h => h.progress = 0);
      const generateTrackDisplay = (horseList) => {
        let display = '🏇 *PACUAN KUDA DIMULAI* 🏇\n\n';
        horseList.forEach(h => {
          const track = '─'.repeat(h.progress);
          const remaining = '·'.repeat(Math.max(0, trackLength - h.progress));
          display += `*${h.name}*: ${track}${h.emoji}${remaining}🏁\n`;
        });
        return display;
      };
      const { key } = await sReply(`Taruhan ${formatNumber(bid)} pada *${chosenHorse.name}* diterima.\n\n${generateTrackDisplay(horses)}`);
      await delay(2000);
      let winner = null;
      while (!winner) {
        for (const horse of horses) {
          if (winner) continue;
          const move = Math.floor(Math.random() * 3) + 1;
          horse.progress += move;
          if (horse.progress >= trackLength) {
            horse.progress = trackLength;
            winner = horse;
          }
        }
        horses.sort((a, b) => b.progress - a.progress);
        await fn.sendReply(toId, generateTrackDisplay(horses), { edit: key });
        await delay(1000);
      }
      const menang = winner.id === chosenHorse.id;
      const payoutMultiplier = 5n;
      const keuntunganBersih = menang ? (bid * payoutMultiplier) - bid : 0n;
      const selisih = menang ? keuntunganBersih : -bid;
      if (selisih !== 0n) {
        await user.addBalance(selisih);
      }
      const saldoAkhir = saldoAwal + selisih;
      let hasilFinal = generateTrackDisplay(horses);
      hasilFinal += `\n--- HASIL AKHIR ---\n`;
      hasilFinal += `🏆 Pemenangnya adalah *${winner.name}* (${winner.emoji})!\n\n`;
      if (menang) {
        hasilFinal += `Selamat! Taruhanmu pada *${chosenHorse.name}* menang!\n`;
        hasilFinal += `Keuntungan Bersih: +${formatNumber(selisih)}\n`;
      } else {
        hasilFinal += `Maaf, taruhanmu pada *${chosenHorse.name}* kalah.\n`;
        hasilFinal += `Kerugian: -${formatNumber(bid)}\n`;
      }
      hasilFinal += `\nSaldo Akhir: ${formatNumber(saldoAkhir)}`;
      await delay(1000); fn.sendReply(toId, hasilFinal, { edit: key });
      await user.addXp();
    } finally {
      gameStateManager.endGame(serial);
    }
  }
};