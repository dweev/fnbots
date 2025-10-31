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
    const stream = redis.scanStream({
      match: 'sessions:*',
      count: 100
    });
    const allKeys = [];
    await new Promise((resolve, reject) => {
      stream.on('data', (keys) => {
        allKeys.push(...keys);
      });
      stream.on('end', resolve);
      stream.on('error', reject);
    });
    if (allKeys.length === 0) return await sReply('Tidak ada session apapun di Redis');
    const keysWithInfo = await Promise.all(
      allKeys.map(async (key) => {
        const ttl = await redis.ttl(key);
        return { key, ttl };
      })
    );
    const identifyType = (key) => {
      const cleanKey = key.replace('sessions:', '');
      if (cleanKey === 'creds') return 'credentials';
      if (cleanKey.startsWith('app-state-sync-key-')) return 'app-state';
      if (cleanKey.startsWith('app-state-sync-version-')) return 'app-state-version';
      if (cleanKey.startsWith('pre-key-')) return 'pre-key';
      if (cleanKey.startsWith('sender-key-memory-')) return 'sender-key-memory';
      if (cleanKey.startsWith('sender-key-')) return 'sender-key';
      if (cleanKey.startsWith('session-')) return 'signal-session';
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
      'unknown': 'Unknown Type'
    };
    const sortedTypes = Object.keys(grouped).sort();
    for (const type of sortedTypes) {
      const sessions = grouped[type];
      const desc = typeDesc[type] || type;
      response += `*${desc}* (${sessions.length}):\n`;
      const showCount = type === 'signal-session' ? 5 : 3;
      sessions.slice(0, showCount).forEach(({ key, ttl }, idx) => {
        const displayKey = key.replace('sessions:', '');
        if (type === 'signal-session') {
          const match = displayKey.match(/^session-(.+?)(?:[-:_](.+))?$/);
          if (match) {
            const jid = match[1];
            const device = match[2] || 'main';
            const phoneNumber = jid.includes('@') ? jid.split('@')[0] : jid;
            response += `  ${idx + 1}. JID: ${phoneNumber}\n`;
            response += `     Device: ${device}\n`;
          } else {
            response += `  ${idx + 1}. ${displayKey}\n`;
          }
        } else if (type === 'credentials') {
          response += `  ${idx + 1}. [Credential Data]\n`;
        } else {
          const shortKey = displayKey.length > 50 ? displayKey.substring(0, 47) + '...' : displayKey;
          response += `  ${idx + 1}. ${shortKey}\n`;
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
    const credentials = grouped['credentials']?.length || 0;
    const signalSessions = grouped['signal-session']?.length || 0;
    const preKeys = grouped['pre-key']?.length || 0;
    const appState = grouped['app-state']?.length || 0;
    response += `• Credentials: ${credentials}\n`;
    response += `• Signal Sessions: ${signalSessions}\n`;
    response += `• Pre-Keys: ${preKeys}\n`;
    response += `• App State Keys: ${appState}\n`;
    const info = await redis.info('memory');
    const memoryMatch = info.match(/used_memory_human:(.+)/);
    if (memoryMatch) {
      response += `• Redis Memory: ${memoryMatch[1].trim()}\n`;
    }
    await sReply(response);
  }
};
