// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { fetch as nativeFetch } from '../../addon/bridge.js';

export const command = {
  name: 'npmjs',
  category: 'util',
  description: 'Mencari informasi paket dari NPM Registry',
  isCommandWithoutPayment: true,
  execute: async ({ arg, sReply, dbSettings }) => {
    const packageName = arg;
    if (!packageName) return await sReply(`Gagal. Mohon berikan nama paket.\n\nContoh:\n${dbSettings.rname}npmjs baileys`);
    const response = await nativeFetch(`https://registry.npmjs.org/${packageName}`);
    if (response.status === 404) return sReply(`❎ Paket "${packageName}" tidak ditemukan di NPM registry.`);
    if (!response.ok) return await sReply(`Request gagal dengan status: ${response.status} ${response.statusText}`);
    const stalk = await response.json();
    const latestVersion = stalk['dist-tags']?.latest;
    if (!latestVersion) return await sReply(`Paket "${packageName}" ditemukan, tetapi tidak memiliki versi rilis 'latest'.`);
    const initialVersion = Object.keys(stalk.time).find(v => v !== 'created' && v !== 'modified');
    const latestPackageData = stalk.versions[latestVersion];
    const initialPackageData = stalk.versions[initialVersion];
    const dependenciesCountLatest = Object.keys(latestPackageData?.dependencies || {}).length;
    const dependenciesCountInitial = Object.keys(initialPackageData?.dependencies || {}).length;
    let replyText = `📦 *Informasi Paket: ${stalk.name}*\n\n`;
    replyText += `📝 *Deskripsi:* ${stalk.description || 'Tidak ada deskripsi'}\n\n`;
    replyText += `*Version*\n` + "```";
    replyText += `> Versi Terbaru : ${latestVersion}\n`;
    replyText += `> Versi Awal    : ${initialVersion || 'N/A'}\n`;
    replyText += `> Total Rilis   : ${Object.keys(stalk.versions).length}\n\n`;
    replyText += `Dependencies\n`;
    replyText += `> Dep. Terbaru  : ${dependenciesCountLatest}\n`;
    replyText += `> Dep. Awal     : ${dependenciesCountInitial}\n\n`;
    replyText += `Waktu\n`;
    replyText += `> Dibuat        : ${new Date(stalk.time.created).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n`;
    replyText += `> Rilis Terbaru : ${new Date(stalk.time[latestVersion]).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n` + "```";
    replyText += `🔗 *Link:* https://www.npmjs.com/package/${packageName}`;
    await sReply(replyText);
  }
};