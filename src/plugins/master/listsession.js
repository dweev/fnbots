// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { BaileysSession } from '../../../database/auth.js';

export const command = {
  name: 'listsession',
  category: 'master',
  description: 'List semua Signal session keys untuk debugging',
  isCommandWithoutPayment: true,
  execute: async ({ sReply }) => {
    const sessions = await BaileysSession.find({
      key: {
        $regex: '^sessions:default:session-\\d+',
      }
    }, { key: 1, updatedAt: 1, createdAt: 1 }).sort({ updatedAt: -1 }).lean();
    if (sessions.length === 0) {
      await sReply('Tidak ada Signal session yang tersimpan');
      return;
    }
    const jidMap = {};
    sessions.forEach(s => {
      const cleaned = s.key.replace('sessions:default:session-', '');
      const separatorMatch = cleaned.match(/^(\d+)([-:_](.+))?$/);
      if (separatorMatch) {
        const jid = separatorMatch[1]; // Nomor HP
        const deviceSuffix = separatorMatch[3] || 'main';
        if (!jidMap[jid]) {
          jidMap[jid] = {
            jid: jid,
            devices: [],
            lastUpdate: s.updatedAt
          };
        }
        jidMap[jid].devices.push({
          suffix: deviceSuffix,
          fullKey: cleaned,
          updatedAt: s.updatedAt,
          createdAt: s.createdAt
        });
        if (s.updatedAt > jidMap[jid].lastUpdate) {
          jidMap[jid].lastUpdate = s.updatedAt;
        }
      }
    });
    const uniqueJids = Object.values(jidMap).sort((a, b) =>
      new Date(b.lastUpdate) - new Date(a.lastUpdate)
    );
    let response = `*DAFTAR SIGNAL SESSIONS*\n`;
    response += `Total: ${uniqueJids.length} unique JIDs\n`;
    response += `Total devices: ${sessions.length}\n\n`;
    uniqueJids.forEach((jidData, i) => {
      const date = new Date(jidData.lastUpdate).toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      response += `${i + 1}. *${jidData.jid}*\n`;
      response += `   Devices: ${jidData.devices.length}\n`;
      response += `   Last: ${date}\n`;
      if (jidData.devices.length <= 3) {
        jidData.devices.forEach((dev, idx) => {
          const devDate = new Date(dev.updatedAt).toLocaleString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          });
          response += `   └─ ${idx + 1}. ${dev.suffix} (${devDate})\n`;
        });
      } else {
        response += `   └─ 1. ${jidData.devices[0].suffix}\n`;
        response += `   └─ 2. ${jidData.devices[1].suffix}\n`;
        response += `   └─ ... (+${jidData.devices.length - 3} more)\n`;
        response += `   └─ ${jidData.devices.length}. ${jidData.devices[jidData.devices.length - 1].suffix}\n`;
      }
      response += `\n`;
    });
    await sReply(response);
  }
}