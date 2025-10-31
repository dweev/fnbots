// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { redis } from '../../../database/index.js';

export const command = {
  name: 'checksession',
  category: 'master',
  description: 'List semua Signal session keys untuk debugging',
  isCommandWithoutPayment: true,
  execute: async ({ sReply, args }) => {
    const debugMode = args[0] === 'debug';
    const showAll = args[0] === 'all';
    const stream = redis.scanStream({
      match: 'sessions:session-*',
      count: 100
    });
    const sessionKeys = [];
    await new Promise((resolve, reject) => {
      stream.on('data', (keys) => {
        sessionKeys.push(...keys);
      });
      stream.on('end', resolve);
      stream.on('error', reject);
    });
    if (sessionKeys.length === 0) {
      await sReply('Tidak ada Signal session yang tersimpan');
      return;
    }
    if (debugMode) {
      let debugResponse = `*DEBUG MODE - RAW KEYS*\n`;
      debugResponse += `Total: ${sessionKeys.length} keys\n\n`;
      const limit = showAll ? sessionKeys.length : 20;
      debugResponse += `Showing ${Math.min(limit, sessionKeys.length)} keys:\n\n`;
      sessionKeys.slice(0, limit).forEach((key, idx) => {
        const cleaned = key.replace('sessions:session-', '');
        debugResponse += `${idx + 1}. \`${cleaned}\`\n`;
      });
      if (sessionKeys.length > limit) {
        debugResponse += `\n... +${sessionKeys.length - limit} more keys\n`;
      }
      debugResponse += `\n*Format Analysis:*\n`;
      const formats = new Map();
      sessionKeys.forEach((key) => {
        const cleaned = key.replace('sessions:session-', '');
        if (cleaned.includes('@s.whatsapp.net')) {
          formats.set('WhatsApp JID', (formats.get('WhatsApp JID') || 0) + 1);
        } else if (cleaned.includes('@lid')) {
          formats.set('LID', (formats.get('LID') || 0) + 1);
        } else if (/^\d+_\d+\.\d+$/.test(cleaned)) {
          formats.set('Signal ID (number_version)', (formats.get('Signal ID (number_version)') || 0) + 1);
        } else {
          formats.set('Other', (formats.get('Other') || 0) + 1);
        }
      });
      formats.forEach((count, format) => {
        debugResponse += `• ${format}: ${count}\n`;
      });
      debugResponse += `\nUse .checksession all untuk show semua`;
      return await sReply(debugResponse);
    }
    const sessionsWithInfo = await Promise.all(
      sessionKeys.map(async (key) => {
        try {
          const ttl = await redis.ttl(key);
          return {
            key,
            ttl
          };
        } catch {
          return {
            key,
            ttl: -1
          };
        }
      })
    );
    const byType = {
      whatsappJid: [],
      lid: [],
      signalId: [],
      other: []
    };
    sessionsWithInfo.forEach((s) => {
      const cleaned = s.key.replace('sessions:session-', '');
      if (cleaned.includes('@s.whatsapp.net')) {
        byType.whatsappJid.push({ ...s, cleaned });
      } else if (cleaned.includes('@lid')) {
        byType.lid.push({ ...s, cleaned });
      } else if (/^\d+_\d+\.\d+$/.test(cleaned)) {
        byType.signalId.push({ ...s, cleaned });
      } else {
        byType.other.push({ ...s, cleaned });
      }
    });
    let response = `*SIGNAL SESSIONS SUMMARY*\n`;
    response += `Total: ${sessionKeys.length} sessions\n\n`;
    if (byType.whatsappJid.length > 0) {
      response += `*WhatsApp JID Sessions*\n`;
      response += `Count: ${byType.whatsappJid.length}\n\n`;
      const jidMap = {};
      byType.whatsappJid.forEach((s) => {
        const match = s.cleaned.match(/^(.+?@s\.whatsapp\.net)([:_-](.+))?$/);
        if (match) {
          const jid = match[1];
          const device = match[3] || 'main';
          if (!jidMap[jid]) {
            jidMap[jid] = { jid, devices: [] };
          }
          jidMap[jid].devices.push({ device, ttl: s.ttl });
        }
      });
      const jids = Object.values(jidMap).slice(0, 5);
      jids.forEach((jidData, i) => {
        const phoneNumber = jidData.jid.split('@')[0];
        response += `${i + 1}. ${phoneNumber}\n`;
        response += `   Devices: ${jidData.devices.length}\n`;
      });
      if (Object.keys(jidMap).length > 5) {
        response += `... +${Object.keys(jidMap).length - 5} more JIDs\n`;
      }
      response += `\n`;
    }
    if (byType.lid.length > 0) {
      response += `*LID Sessions*\n`;
      response += `Count: ${byType.lid.length}\n`;
      byType.lid.slice(0, 3).forEach((s, i) => {
        const shortLid = s.cleaned.substring(0, 20) + '...';
        response += `${i + 1}. ${shortLid}\n`;
      });
      if (byType.lid.length > 3) {
        response += `... +${byType.lid.length - 3} more\n`;
      }
      response += `\n`;
    }
    if (byType.signalId.length > 0) {
      response += `*Signal Protocol Sessions*\n`;
      response += `Count: ${byType.signalId.length}\n`;
      const versions = new Map();
      byType.signalId.forEach((s) => {
        const match = s.cleaned.match(/^\d+_(\d+\.\d+)$/);
        if (match) {
          const version = match[1];
          versions.set(version, (versions.get(version) || 0) + 1);
        }
      });
      response += `Versions:\n`;
      // prettier-ignore
      Array.from(versions.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([version, count]) => { response += `  • v${version}: ${count} sessions\n` });
      if (versions.size > 5) {
        response += `  • ... +${versions.size - 5} more versions\n`;
      }
      response += `\n`;
    }
    if (byType.other.length > 0) {
      response += `*Other Sessions*\n`;
      response += `Count: ${byType.other.length}\n\n`;
    }
    const info = await redis.info('stats');
    const keysMatch = info.match(/# Keyspace[\s\S]*?keys=(\d+)/);
    if (keysMatch) {
      response += `━━━━━━━━━━━━━━━━\n`;
      response += `Total Redis Keys: ${keysMatch[1]}\n`;
    }
    response += `\nCommands:\n`;
    response += `.checksession - Summary\n`;
    response += `.checksession debug - Raw keys`;
    await sReply(response);
  }
};
