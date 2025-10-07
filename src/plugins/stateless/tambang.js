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

const layers = [
  {
    name: "Permukaan Tanah", depth: 50, collapseChance: 0.15, opCostMultiplier: 0.05, rewards: [
      { name: "Batu Kapur", payout: -0.5, message: "hanya menemukan Batu Kapur tak berharga." },
      { name: "Batu Bara", payout: 1.5, message: "menemukan lapisan Batu Bara tipis." }]
  },
  {
    name: "Kerak Bumi", depth: 150, collapseChance: 0.25, opCostMultiplier: 0.10, rewards: [
      { name: "Gipsum", payout: -1.0, message: "membuang waktu menggali Gipsum." },
      { name: "Bijih Besi", payout: 1.5, message: "menemukan urat Bijih Besi yang solid." },
      { name: "Bauksit", payout: 2.0, message: "menemukan deposit Bauksit!" }]
  },
  {
    name: "Mantel Bumi", depth: 300, collapseChance: 0.50, opCostMultiplier: 0.20, rewards: [
      { name: "Belerang", payout: -1.0, message: "terkena semburan gas Belerang beracun!" },
      { name: "Marmer", payout: 2.0, message: "menemukan lempengan Marmer yang indah." },
      { name: "Tembaga", payout: 3.0, message: "melihat kilauan Tembaga di dinding gua!" }]
  },
  {
    name: "Inti Luar", depth: 500, collapseChance: 0.75, opCostMultiplier: 0.40, rewards: [
      { name: "Fosfat", payout: -1.0, message: "merusak peralatan karena lapisan Fosfat yang rapuh." },
      { name: "Timah", payout: 5.0, message: "menemukan bongkahan Timah murni!" },
      { name: "Uranium", payout: 20.0, message: "menemukan bijih Uranium yang sangat berharga!" }]
  },
  {
    name: "Inti Dalam", depth: 1000, collapseChance: 0.85, opCostMultiplier: 0.80, rewards: [
      { name: "Kecapekan", payout: -1.0, message: "kamu kecapekan" },
      { name: "Perak", payout: 10.0, message: "menemukan urat PERAK murni!" },
      { name: "Emas", payout: 50.0, message: "menemukan urat EMAS MURNI!" },
      { name: "Berlian", payout: 100.0, message: "menemukan sebuah BERLIAN raksasa!" },
      { name: "Adamantium", payout: 3600.0, message: "menemukan logam mitos, ADAMANTIUM!" }]
  }
];

const generateMineDisplay = (currentLayerIndex, targetLayerIndex, status = 'digging') => {
  let display = "⛏️ *EKSPEDISI TAMBANG* ⛏️\n\n";
  layers.forEach((layer, index) => {
    if (index > targetLayerIndex && status !== 'failed') return;
    let icon = "❓"; let suffix = "";
    if (index < currentLayerIndex) { icon = "✅"; }
    else if (index === currentLayerIndex) {
      if (status === 'digging') { icon = "⛏️"; suffix = "  <-- Kamu di sini"; }
      else if (status === 'failed') { icon = "💥"; suffix = "  <-- Runtuh!"; }
      else if (status === 'success') { icon = "💎"; suffix = "  <-- Selesai!"; }
    }
    display += `[${layer.depth}m] ${icon} ${layer.name}${suffix}\n`;
  });
  return display;
};

export const command = {
  name: 'tambang',
  category: 'stateless',
  description: 'Game Simulasi Menambang dengan taruhan (contoh: .tambang 10k hard)',
  isLimitGameCommand: true,
  execute: async ({ fn, toId, user, args, serial, sReply }) => {
    await gameStateManager.startGame(serial);
    try {
      if (args.length < 1) return await sReply("Format salah!\nContoh: .tambang 10k hard\nMode: easy, normal, hard, extreme, ultra (default)");
      const modeMap = { 'easy': 0, 'normal': 1, 'hard': 2, 'extreme': 3, 'ultra': 4 };
      const modeInput = args[1] ? args[1].toLowerCase() : 'ultra';
      if (!Object.prototype.hasOwnProperty.call(modeMap, modeInput)) return await sReply("Mode tidak valid. Pilih: easy, normal, hard, extreme, ultra.");
      const targetLayerIndex = modeMap[modeInput];
      if (!user || user.balance <= 0) return await sReply("User tidak ditemukan atau saldo 0.\nsilakan gunakan permainan mode grinding dulu seperti .chop, .mine, .fish, .hunt, .ngelonte, .work atau gunakan perintah .daily jika kamu belum daily claim hari ini.");
      const saldoAwal = BigInt(user.balance);
      const bi0 = args[0] ? args[0].toLowerCase() : '';
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
        if (isNaN(num) || !isFinite(num) || num <= 0) return await sReply("Input jumlah taruhan tidak valid.");
        if (sanitized.includes('.')) {
          const parts = sanitized.split('.'); const decimalPlaces = BigInt(parts[1].length);
          const divisor = 10n ** decimalPlaces; const numberWithoutDecimal = BigInt(sanitized.replace('.', ''));
          bid = (numberWithoutDecimal * multiplier) / divisor;
        } else { bid = BigInt(sanitized) * multiplier; }
      }
      if (bid <= 0n) return await sReply("Jumlah taruhan harus lebih dari 0.");
      if (saldoAwal < bid) return await sReply(`Saldo tidak cukup. Diperlukan: ${formatNumber(bid)}`);
      const { key } = await sReply(`Memulai Ekspedisi Tambang menuju *${layers[targetLayerIndex].name}*...`);
      let totalWinnings = 0n;
      let totalOpCost = 0n;
      let expeditionFailed = false;
      let finalLayerIndex = -1;
      let eventLog = "\n--- Laporan Ekspedisi ---\n";
      for (let i = 0; i <= targetLayerIndex; i++) {
        finalLayerIndex = i;
        const layer = layers[i];
        await fn.sendReply(toId, generateMineDisplay(i, targetLayerIndex, 'digging') + eventLog, { edit: key });
        await delay(2500);
        if (Math.random() < layer.collapseChance) {
          expeditionFailed = true;
          eventLog += `💥 BENCANA di ${layer.depth}m! Tambang runtuh!\n`;
          await fn.sendReply(toId, generateMineDisplay(i, targetLayerIndex, 'failed') + eventLog, { edit: key });
          break;
        }
        const currentOpCost = (bid * BigInt(Math.floor(layer.opCostMultiplier * 100))) / 100n;
        totalOpCost += currentOpCost;
        eventLog += `🔧 Biaya di ${layer.depth}m: -${formatNumber(currentOpCost)}\n`;
        const rewardItem = layer.rewards[Math.floor(Math.random() * layer.rewards.length)];
        const currentReward = (bid * BigInt(Math.floor(rewardItem.payout * 100))) / 100n;
        totalWinnings += currentReward;
        const icon = currentReward >= 0n ? "✅" : "⚠️";
        const valueText = currentReward >= 0n ? `+${formatNumber(currentReward)}` : `${formatNumber(currentReward)}`;
        eventLog += `${icon} Kamu ${rewardItem.message} (Nilai: ${valueText})\n`;
      }
      if (!expeditionFailed) {
        await fn.sendReply(toId, generateMineDisplay(targetLayerIndex, targetLayerIndex, 'success') + eventLog, { edit: key });
        await delay(1000);
      }
      let selisih;
      if (expeditionFailed) {
        selisih = -bid;
      } else {
        const keuntunganBersih = totalWinnings - totalOpCost;
        selisih = keuntunganBersih - bid;
        if (selisih < -bid) {
          selisih = -bid;
        }
      }
      if (selisih !== 0n) {
        await user.addBalance(selisih);
      }
      const saldoAkhir = saldoAwal + selisih;
      const finalStatus = expeditionFailed ? 'failed' : 'success';
      let finalMessage = generateMineDisplay(finalLayerIndex, targetLayerIndex, finalStatus);
      finalMessage += eventLog;
      if (!expeditionFailed) finalMessage += `\n✨ Ekspedisi ke *${layers[targetLayerIndex].name}* selesai dengan selamat!\n`;
      finalMessage += `\n--- RINGKASAN AKHIR ---\n`;
      finalMessage += `Modal Awal: ${formatNumber(bid)}\n`;
      if (!expeditionFailed) {
        finalMessage += `Total Nilai Temuan: ${formatNumber(totalWinnings)}\n`;
        finalMessage += `Total Biaya Operasional: -${formatNumber(totalOpCost)}\n`;
      }
      finalMessage += `*Hasil Bersih: ${selisih >= 0n ? 'Untung +' : 'Rugi '}${formatNumber(selisih > 0n ? selisih : -selisih)}*\n`;
      finalMessage += `\n💰 Saldo Akhir: ${formatNumber(saldoAkhir)}`;
      await delay(500); fn.sendReply(toId, finalMessage, { edit: key });
      await user.addXp();
    } finally {
      gameStateManager.endGame(serial);
    }
  }
};