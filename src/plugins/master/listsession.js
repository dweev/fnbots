// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { redis } from '../../../database/index.js';

export const command = {
  name: 'listsession',
  category: 'master',
  description: 'List semua Signal session keys untuk debugging',
  isCommandWithoutPayment: true,
  execute: async ({ sReply }) => {
    try {
      const stream = redis.scanStream({
        match: 'session-*',
        count: 100
      });
      const sessionKeys = [];
      stream.on('data', (keys) => {
        sessionKeys.push(...keys);
      });
      await new Promise(resolve => stream.on('end', resolve));
      if (sessionKeys.length === 0) {
        await sReply('Tidak ada Signal session yang tersimpan');
        return;
      }
      const sessionsWithInfo = await Promise.all(
        sessionKeys.map(async (key) => {
          try {
            const idletime = await redis.object('IDLETIME', key);
            const ttl = await redis.ttl(key);
            const lastAccess = Date.now() - (idletime * 1000);
            return {
              key,
              updatedAt: new Date(lastAccess),
              ttl
            };
          } catch {
            return {
              key,
              updatedAt: new Date(),
              ttl: -1
            };
          }
        })
      );
      const jidMap = {};
      sessionsWithInfo.forEach(s => {
        const cleaned = s.key.replace('session-', '');
        const separatorMatch = cleaned.match(/^(\d+)([-:_](.+))?$/);
        if (separatorMatch) {
          const jid = separatorMatch[1];
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
            ttl: s.ttl
          });
          if (s.updatedAt > jidMap[jid].lastUpdate) {
            jidMap[jid].lastUpdate = s.updatedAt;
          }
        }
      });
      const uniqueJids = Object.values(jidMap).sort((a, b) =>
        new Date(b.lastUpdate) - new Date(a.lastUpdate)
      );
      let response = `*DAFTAR SIGNAL SESSIONS (REDIS)*\n`;
      response += `Total: ${uniqueJids.length} unique JIDs\n`;
      response += `Total devices: ${sessionKeys.length}\n\n`;
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
            let devInfo = `   └─ ${idx + 1}. ${dev.suffix} (${devDate})`;
            if (dev.ttl > 0) {
              const hours = Math.floor(dev.ttl / 3600);
              devInfo += ` [TTL: ${hours}h]`;
            }
            response += devInfo + '\n';
          });
        } else {
          const firstDev = jidData.devices[0];
          const lastDev = jidData.devices[jidData.devices.length - 1];
          response += `   └─ 1. ${firstDev.suffix}\n`;
          response += `   └─ 2. ${jidData.devices[1].suffix}\n`;
          response += `   └─ ... (+${jidData.devices.length - 3} more)\n`;
          response += `   └─ ${jidData.devices.length}. ${lastDev.suffix}\n`;
        }
        response += `\n`;
      });
      const info = await redis.info('stats');
      const keysMatch = info.match(/# Keyspace[\s\S]*?keys=(\d+)/);
      if (keysMatch) {
        response += `━━━━━━━━━━━━━━━━\n`;
        response += `Total Redis Keys: ${keysMatch[1]}\n`;
      }
      await sReply(response);
    } catch (error) {
      await sReply(`Error saat list session: ${error.message}`);
    }
  }
};