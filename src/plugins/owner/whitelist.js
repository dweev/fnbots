// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Whitelist } from '../../../database/index.js';
import log from '../../utils/logger.js';

export const command = {
  name: 'whitelist',
  category: 'owner',
  description: 'Mengelola grup yang diizinkan menggunakan bot (whitelist).',
  aliases: ['aksesgrup', 'whitelistgroup', 'whitelistgrup'],
  execute: async ({ fn, m, sReply, reactDone, args, dbSettings }) => {
    const subcmd = args[0];
    const target = args.slice(1).join(" ");
    if (subcmd === "reset") {
      await Whitelist.clearAll();
      await reactDone();
    } else if (subcmd === "add") {
      if (target.match(/(chat.whatsapp.com)/gi)) {
        const inviteCode = target.split("https://chat.whatsapp.com/")[1];
        try {
          const { id } = await fn.groupGetInviteInfo(inviteCode);
          await Whitelist.addToWhitelist(id, 'group');
          await reactDone();
        } catch (error) {
          await log(`Error command whitelist add\n${error}`, true);
          await sReply(`Error: ${error.message}`);
        }
      } else if (target.includes("@g.us")) {
        await Whitelist.addToWhitelist(target, 'group');
        await reactDone();
      } else {
        if (m.isGroup) {
          await Whitelist.addToWhitelist(m.key.remoteJid, 'group');
          await reactDone();
        } else {
          throw new Error("Perintah `whitelist add` tanpa target hanya bisa digunakan di dalam grup.");
        }
      }
    } else if (subcmd === "del") {
      if (target.includes("@g.us")) {
        await Whitelist.removeFromWhitelist(target, 'group');
        await reactDone();
      } else {
        if (m.isGroup) {
          await Whitelist.removeFromWhitelist(m.key.remoteJid, 'group');
          await reactDone();
        } else {
          throw new Error("Perintah `whitelist del` tanpa target hanya bisa digunakan di dalam grup.");
        }
      }
    } else if (subcmd === "list") {
      const whitelistedGroups = await Whitelist.getWhitelistedGroups();
      let list = "📜 *Daftar Whitelist Grup:*\n\n";
      if (whitelistedGroups.length > 0) {
        let i = 1;
        for (const whitelist of whitelistedGroups) {
          try {
            const groupMeta = await fn.groupMetadata(whitelist.targetId);
            list += `${i++}. ${groupMeta.subject}\n \`${whitelist.targetId}\`\n`;
          } catch {
            list += `${i++}. Tidak dapat membaca metadata\n \`${whitelist.targetId}\`\n`;
          }
        }
      } else {
        list += "_Tidak ada grup yang di-whitelist._";
      }
      await sReply(list);
    } else {
      const guideMessage = `*❏ PANDUAN PERINTAH WHITELIST ❏*\n\nGunakan perintah ini untuk mengelola grup mana saja yang bisa menggunakan bot.\n\n*1. Menambah Whitelist:*\n\`${dbSettings.rname}whitelist add\` (di dalam grup target)\n\`${dbSettings.rname}whitelist add <link_grup>\`\n\`${dbSettings.rname}whitelist add <id_grup@g.us>\`\n\n*2. Menghapus Whitelist:*\n\`${dbSettings.rname}whitelist del\` (di dalam grup target)\n\`${dbSettings.rname}whitelist del <id_grup@g.us>\`\n\n*3. Melihat Daftar Whitelist:*\n\`${dbSettings.rname}whitelist list\`\n\n*4. Mereset Semua Whitelist:*\n\`${dbSettings.rname}whitelist reset\` (Hati-hati!)`;
      await sReply(guideMessage);
    }
  }
}