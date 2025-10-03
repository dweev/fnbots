// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { BaileysSession } from '../../../database/auth.js';

export const command = {
  name: 'debugsession',
  category: 'master',
  description: 'Debug semua session keys dengan identifikasi tipe yang akurat',
  isCommandWithoutPayment: true,
  execute: async ({ sReply }) => {
    const allSessions = await BaileysSession.find({
      key: { $regex: '^sessions:default:' }
    }, {
      key: 1,
      updatedAt: 1
    }).sort({ updatedAt: -1 }).lean();
    if (allSessions.length === 0) {
      await sReply('Tidak ada session apapun di database');
      return;
    }
    const identifyType = (key) => {
      const cleaned = key.replace('sessions:default:', '');
      if (cleaned === 'creds') return 'credentials';
      if (cleaned.startsWith('app-state-sync-key-')) return 'app-state';
      if (cleaned.startsWith('app-state-sync-version-')) return 'app-state-version';
      if (cleaned.startsWith('pre-key-')) return 'pre-key';
      if (cleaned.startsWith('sender-key-')) return 'sender-key';
      if (cleaned.startsWith('sender-key-memory-')) return 'sender-key-memory';
      if (cleaned.startsWith('session-')) return 'signal-session';
      if (cleaned.startsWith('lid-mapping-')) return 'lid-mapping';
      return 'unknown';
    };
    const grouped = {};
    allSessions.forEach(s => {
      const type = identifyType(s.key);
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(s);
    });
    let response = `*DEBUG SESSION KEYS*\n\n`;
    response += `Total: ${allSessions.length} entries\n\n`;
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
      sessions.slice(0, showCount).forEach((s, idx) => {
        const key = s.key.replace('sessions:default:', '');
        const time = new Date(s.updatedAt).toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
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
        response += `     ${time}\n`;
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
    await sReply(response);
  }
};