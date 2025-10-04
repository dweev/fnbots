// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { redis } from '../../../database/index.js';

export const command = {
  name: 'debugsession',
  category: 'master',
  description: 'Debug semua session keys dengan identifikasi tipe yang akurat',
  isCommandWithoutPayment: true,
  execute: async ({ sReply }) => {
    try {
      const stream = redis.scanStream({ match: '*', count: 100 });
      const allKeys = [];
      stream.on('data', (keys) => {
        allKeys.push(...keys);
      });
      await new Promise(resolve => stream.on('end', resolve));
      if (allKeys.length === 0) {
        await sReply('Tidak ada session apapun di Redis');
        return;
      }
      const keysWithInfo = await Promise.all(
        allKeys.map(async (key) => {
          const ttl = await redis.ttl(key);
          return { key, ttl };
        })
      );
      const identifyType = (key) => {
        if (key === 'creds') return 'credentials';
        if (key.startsWith('app-state-sync-key-')) return 'app-state';
        if (key.startsWith('app-state-sync-version-')) return 'app-state-version';
        if (key.startsWith('pre-key-')) return 'pre-key';
        if (key.startsWith('sender-key-memory-')) return 'sender-key-memory';
        if (key.startsWith('sender-key-')) return 'sender-key';
        if (key.startsWith('session-')) return 'signal-session';
        if (key.startsWith('lid-mapping-')) return 'lid-mapping';
        return 'unknown';
      };
      const grouped = {};
      keysWithInfo.forEach(({ key, ttl }) => {
        const type = identifyType(key);
        if (!grouped[type]) {
          grouped[type] = [];
        }
        grouped[type].push({ key, ttl });
      });
      let response = `*DEBUG SESSION KEYS (REDIS)*\n\n`;
      response += `Total: ${allKeys.length} entries\n\n`;
      const typeDesc = {
        'credentials': 'Auth Credentials',
        'signal-session': 'Signal Sessions (E2E)',
        'pre-key': 'Pre-Keys (Crypto)',
        'sender-key': 'Sender Keys (Groups)',
        'sender-key-memory': 'Sender Key Memory',
        'app-state': 'App State Sync Keys',
        'app-state-version': 'App State Versions',
        'lid-mapping': 'LID Mappings',
        'unknown': 'Unknown Type'
      };
      const sortedTypes = Object.keys(grouped).sort();
      for (const type of sortedTypes) {
        const sessions = grouped[type];
        const desc = typeDesc[type] || type;
        response += `*${desc}* (${sessions.length}):\n`;
        const showCount = type === 'signal-session' ? 5 : 3;
        sessions.slice(0, showCount).forEach(({ key, ttl }, idx) => {
          if (type === 'signal-session') {
            const match = key.match(/^session-(\d+)([-:_](.+))?$/);
            if (match) {
              const jid = match[1];
              const device = match[3] || 'main';
              response += `  ${idx + 1}. JID: ${jid}\n`;
              response += `     Device: ${device}\n`;
            } else {
              response += `  ${idx + 1}. ${key}\n`;
            }
          } else if (type === 'lid-mapping') {
            const mappingKey = key.replace('lid-mapping-', '');
            if (mappingKey.endsWith('_reverse')) {
              const lid = mappingKey.replace('_reverse', '');
              response += `  ${idx + 1}. LID→PN: ${lid}\n`;
            } else {
              response += `  ${idx + 1}. PN→LID: ${mappingKey}\n`;
            }
          } else {
            const displayKey = key.length > 50 ? key.substring(0, 47) + '...' : key;
            response += `  ${idx + 1}. ${displayKey}\n`;
          }
          if (ttl > 0) {
            const hours = Math.floor(ttl / 3600);
            const minutes = Math.floor((ttl % 3600) / 60);
            response += `     TTL: ${hours}h ${minutes}m\n`;
          } else if (ttl === -1) {
            response += `     TTL: No expiry\n`;
          }
        });
        if (sessions.length > showCount) {
          response += `  ... +${sessions.length - showCount} more\n`;
        }
        response += `\n`;
      }
      response += `━━━━━━━━━━━━━━━━\n`;
      response += `*Summary:*\n`;
      const signalSessions = grouped['signal-session']?.length || 0;
      const preKeys = grouped['pre-key']?.length || 0;
      const lidMappings = grouped['lid-mapping']?.length || 0;
      response += `• Signal Sessions: ${signalSessions}\n`;
      response += `• Pre-Keys: ${preKeys}\n`;
      response += `• LID Mappings: ${lidMappings}\n`;
      const info = await redis.info('memory');
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      if (memoryMatch) {
        response += `• Redis Memory: ${memoryMatch[1].trim()}\n`;
      }
      await sReply(response);
    } catch (error) {
      await sReply(`Error saat debug session: ${error.message}`);
    }
  }
};