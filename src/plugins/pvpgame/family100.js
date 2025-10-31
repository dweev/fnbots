// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { randomChoice } from '../../function/index.js';
import soal from '../../games/family100.json' with { type: 'json' };

export const command = {
  name: 'family100',
  displayName: 'p-family100',
  category: 'pvpgame',
  description: 'Game Statefull PVP Family100',
  isLimitGameCommand: true,
  aliases: ['p-family100'],
  execute: async ({ toId, sReply, sPesan, family100, user }) => {
    if (family100[toId]) return await sReply('Masih ada sesi Family100 yang belum diselesaikan.');
    const hasil = randomChoice(soal);
    const msg = await sPesan(`Tebak kuis berikut ini:\n\n📌 ${hasil.soal}\n⏳ Waktu: 5 menit\n🏆 Hadiah total: *600*\n\nKetik jawabanmu satu per satu.`);
    family100[toId] = [
      hasil.soal,
      hasil.jawaban,
      Array(hasil.jawaban.length).fill(false),
      {
        benar: {},
        salah: {}
      },
      setTimeout(async () => {
        if (family100[toId]) {
          const [, jawaban, status] = family100[toId];
          // prettier-ignore
          const belum = jawaban.map((j, i) => (status[i] ? null : `❎ ${j}`)).filter(Boolean).join('\n');
          await sReply(`⏰ Waktu habis!\n\nJawaban:\n- ${jawaban.join('\n')}\n\nYang belum terjawab:\n${belum}`);
          delete family100[toId];
        }
      }, 300000),
      msg,
      msg.key.id
    ];
    await user.addXp();
  }
};
