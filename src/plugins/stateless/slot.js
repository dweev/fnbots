// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { delay } from 'baileys';
import { formatNumber } from '../../function/function.js';
import { gameStateManager } from '../../lib/gameManager.js';

export const command = {
  name: 'slot',
  category: 'stateless',
  description: 'Game Slot Machine',
  isLimitGameCommand: true,
  execute: async ({ fn, toId, user, args, serial, sReply }) => {
    await gameStateManager.startGame(serial);
    try {
      const gameModes = {
        easy: {
          cost: 0,
          count: 5,
          rewardText: "Menang!",
          getReward: (cost, maxSame) => {
            if (maxSame >= 3) {
              return Math.floor(Math.random() * (500 - 100) + 100);
            }
            return 0;
          }
        },
        normal: {
          cost: 2000,
          count: 7,
          rewardText: "Menang!",
          getReward: (cost, maxSame) => {
            if (maxSame >= 7) return Math.floor(cost * 3);
            if (maxSame >= 5) return Math.floor(cost * 2.5);
            if (maxSame >= 3) return Math.floor(cost * 2.3);
            return 0;
          }
        },
        hard: {
          cost: 20000,
          count: 10,
          rewardText: "Menang!",
          getReward: (cost, maxSame) => {
            if (maxSame >= 10) return Math.floor(cost * 4);
            if (maxSame >= 7) return Math.floor(cost * 2.7);
            if (maxSame >= 5) return Math.floor(cost * 2.5);
            return 0;
          }
        },
        extreme: {
          cost: 200000,
          count: 20,
          rewardText: "Menang!",
          getReward: (cost, maxSame) => {
            if (maxSame >= 20) return Math.floor(cost * 10);
            if (maxSame >= 13) return Math.floor(cost * 4.7);
            if (maxSame >= 10) return Math.floor(cost * 4.5);
            if (maxSame >= 7) return Math.floor(cost * 4.3);
            return 0;
          }
        }
      };
      if (args.length > 1) return await sReply("pesan tidak valid, contoh: .slot, .slot normal, .slot extreme");
      const mode = args[0] ? args[0].toLowerCase() : 'easy';
      const config = gameModes[mode];
      if (!config) return await sReply(`Mode "${mode}" tidak ditemukan. Pilihan: easy, normal, hard, extreme.`);
      if (!user || user.balance <= 0) return await sReply("User tidak ditemukan atau saldo 0.\nsilakan gunakan permainan mode grinding dulu seperti .chop, .mine, .fish, .hunt, .ngelonte, .work atau gunakan perintah .daily jika kamu belum daily claim hari ini.");
      const saldoAwal = user ? BigInt(user.balance) : 0n;
      if (saldoAwal < BigInt(config.cost)) return await sReply(`Saldomu tidak cukup untuk bermain mode ${mode} (butuh ${formatNumber(config.cost)}).`);
      let { key } = await sReply('🎰 Slot Machine🎰\n⏳ Rolling...');
      const slotSymbols = ['💎', '❄️', '☠️', '⚡', '❤️'];
      const rollResult = [];
      let display = `🎰 Slot Machine 🎰\n`;
      for (let i = 0; i < config.count; i++) {
        const rand = Math.floor(Math.random() * slotSymbols.length);
        rollResult.push(slotSymbols[rand]);
        if (i % 1 === 0 || i === config.count - 1) {
          await fn.sendReply(toId, display + rollResult.join(' '), { edit: key });
          await delay(500);
        }
      }
      const counts = {};
      for (let icon of rollResult) {
        counts[icon] = (counts[icon] || 0) + 1;
      }
      const maxSame = Object.values(counts).length > 0 ? Math.max(...Object.values(counts)) : 0;
      const biayaMain = BigInt(config.cost);
      const hadiah = BigInt(config.getReward(config.cost, maxSame));
      const selisih = hadiah - biayaMain;
      if (selisih !== 0n) {
        await user.addBalance(selisih);
      }
      const saldoAkhir = saldoAwal + selisih;
      let finalText = `🎰 Slot Machine 🎰\n` + rollResult.join(' ') + '\n\n';
      finalText += `🔎 » *${maxSame}* Repetisi Symbols\n`;
      if (hadiah > 0n) {
        finalText += `${config.rewardText} Reward: (+${formatNumber(hadiah)})\n`;
        if (config.cost > 0) {
          finalText += `You Get: ${selisih >= 0 ? '+' : ''}${formatNumber(selisih)}\n\n`;
        }
      } else {
        finalText += `Nice Try!\n`;
        if (config.cost > 0) {
          finalText += `You Lost: -${formatNumber(config.cost)}\n\n`;
        }
      }
      finalText += `Saldo akhir: ${formatNumber(saldoAkhir)}`;
      await delay(1500); fn.sendReply(toId, finalText, { edit: key });
      await user.addXp();
    } finally {
      gameStateManager.endGame(serial);
    }
  }
};