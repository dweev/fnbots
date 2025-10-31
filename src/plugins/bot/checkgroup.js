// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import fs from 'fs-extra';
import config from '../../../config.js';

const defaultAvatar = config.paths.avatar;
export const command = {
  name: 'checkgroup',
  category: 'bot',
  description: 'Check group details from cache.',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, mygroup, mygroupMembers, dbSettings, sReply, toId, args }) => {
    if (args.length < 2) {
      return await sReply(`Usage:\n• ${dbSettings.rname}checkgroup <group_number> member\n• ${dbSettings.rname}checkgroup <group_number> admins\n• ${dbSettings.rname}checkgroup <group_number> user <phone_number>\n• ${dbSettings.rname}checkgroup <group_number> info <member_number>\n\nUse ${dbSettings.rname}listgroup to see the list.`);
    }
    const nomorGroup = parseInt(args[0], 10);
    const subcommand = args[1].toLowerCase();
    const subArgs = args.slice(2);
    if (isNaN(nomorGroup) || nomorGroup < 1 || nomorGroup > mygroup.length) {
      return await sReply(`Invalid group number! Range: 1 - ${mygroup.length}`);
    }
    const idGroup = mygroup[nomorGroup - 1];
    const members = mygroupMembers[idGroup];
    if (!members || members.length === 0) {
      return await sReply('Member data for this group is not available in cache. Run .listgroup first.');
    }
    switch (subcommand) {
      case 'member': {
        const mentions = members.map((m) => m.id);
        const memberList = mentions.map((jid, index) => `${index + 1}. @${jid.split('@')[0]}`).join('\n');
        await sReply(`*GROUP MEMBER LIST*\n\n${memberList}\n\nTotal: ${members.length} members`, { mentions });
        break;
      }
      case 'admins': {
        const admins = members.filter((m) => m.admin);
        if (admins.length === 0) return await sReply('No admins found in this group.');
        const mentions = admins.map((a) => a.id);
        const adminList = mentions.map((jid, index) => `${index + 1}. @${jid.split('@')[0]}`).join('\n');
        await sReply(`*GROUP ADMIN LIST*\n\n${adminList}\n\nTotal: ${admins.length} admins`, { mentions });
        break;
      }
      case 'user': {
        if (subArgs.length < 1) {
          return await sReply(`Wrong format!\nExample: ${dbSettings.rname}checkgroup 1 user 628123`);
        }
        const targetNumber = subArgs[0].replace(/[^0-9]/g, '');
        const user = members.find((member) => member.id.startsWith(targetNumber));
        if (user) {
          const name = await fn.getName(user.id);
          const userInfo = `*USER FOUND*\n\nName: ${name}\nNumber: ${user.id.split('@')[0]}\nStatus: ${user.admin ? 'Admin' : 'Member'}`;
          await sReply(userInfo);
        } else {
          await sReply(`User with number *${targetNumber}* not found in this group.`);
        }
        break;
      }
      case 'info': {
        if (subArgs.length < 1) {
          return await sReply(`Wrong format!\nExample: ${dbSettings.rname}checkgroup 1 info 1 3 5`);
        }
        for (const memberIndexStr of subArgs) {
          const nomorMember = parseInt(memberIndexStr, 10);
          if (isNaN(nomorMember) || nomorMember < 1 || nomorMember > members.length) {
            await sReply(`Invalid member number: *${memberIndexStr}*`);
            continue;
          }
          const user = members[nomorMember - 1];
          const name = await fn.getName(user.id);
          const mime = 'image/jpeg';
          let mediaBuffer;
          try {
            mediaBuffer = await fn.profileImageBuffer(user.id, 'image');
          } catch {
            mediaBuffer = await fs.readFile(defaultAvatar);
          }
          const caption = `*MEMBER INFO #${nomorMember}*\n\nName: ${name || 'Unknown'}\nNumber: ${user.id.split('@')[0]}\nStatus: ${user.admin ? 'Admin' : 'Member'}\nID: ${user.id}`;
          await fn.sendMediaFromBuffer(toId, mime, mediaBuffer, caption, m);
        }
        break;
      }
      default:
        await sReply('Unknown subcommand! Use: member, admins, user, or info.');
        break;
    }
  }
};
