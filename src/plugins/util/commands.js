// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { formatCommandList } from '../../lib/function.js';
import { pluginCache } from '../../lib/plugins.js';

export const command = {
  name: 'commands',
  category: 'util',
  description: 'Menampilkan semua daftar perintah bot.',
  aliases: ['menu', 'help'],
  execute: async ({ sReply, isSadmin, isMaster, isVIP, isPremium, dbSettings, m }) => {
    let ts = `*── ${dbSettings.botName} ──*`;
    const menuSections = [
      { title: 'MASTER COMMANDS',     data: pluginCache.helpMap.get('master'),    required: isSadmin },
      { title: 'OWNER COMMANDS',      data: pluginCache.helpMap.get('owner'),     required: isSadmin || isMaster },
      { title: 'MANAGE BOT',          data: pluginCache.helpMap.get('bot'),       required: isSadmin || isMaster },
      { title: 'VIP COMMANDS',        data: pluginCache.helpMap.get('vip'),       required: isSadmin || isMaster || isVIP },
      { title: 'PREMIUM COMMANDS',    data: pluginCache.helpMap.get('premium'),   required: isSadmin || isMaster || isVIP || isPremium },
      { title: 'GROUP COMMANDS',      data: pluginCache.helpMap.get('manage'),    required: isSadmin || isMaster || isVIP || isPremium },
      { title: 'MEDIA COMMANDS',      data: pluginCache.helpMap.get('media'),     required: true },
      { title: 'CONVERT COMMANDS',    data: pluginCache.helpMap.get('convert'),   required: true },
      { title: 'AUDIO MANIPULATION',  data: pluginCache.helpMap.get('audio'),     required: true },
      { title: 'TEXT MANIPULATION',   data: pluginCache.helpMap.get('text'),      required: true },
      { title: 'IMAGE MANIPULATION',  data: pluginCache.helpMap.get('image'),     required: true },
      { title: 'AI COMMANDS',         data: pluginCache.helpMap.get('ai'),        required: true },
      { title: 'ANIME COMMANDS',      data: pluginCache.helpMap.get('anime'),     required: true },
      { title: 'FUN COMMANDS',        data: pluginCache.helpMap.get('fun'),       required: true },
      { title: 'NGAJI COMMANDS',      data: pluginCache.helpMap.get('ngaji'),     required: true },
      { title: 'GAME COMMANDS',       data: pluginCache.helpMap.get('game'),      required: true },
      { title: 'PVE STATELESS GAME',  data: pluginCache.helpMap.get('stateless'), required: true },
      { title: 'PVE STATEFUL GAME',   data: pluginCache.helpMap.get('statefull'), required: true },
      { title: 'PVP GAME',            data: pluginCache.helpMap.get('pvpgame'),   required: true },
      { title: 'MATH COMMANDS',       data: pluginCache.helpMap.get('math'),      required: true },
      { title: 'UTIL COMMANDS',       data: pluginCache.helpMap.get('util'),      required: true },
      { title: 'LIST COMMANDS',       data: pluginCache.helpMap.get('list'),      required: true },
    ];
    for (const section of menuSections) {
      if (section.required && section.data) {
        const commandListString = formatCommandList(section.data);
        if (commandListString) {
          ts += `\n\n*${section.title}*${commandListString}`;
        }
      }
    }
    ts += `\n\nRegards: *FNBOTS*`;
    await sReply(`${ts}\n\n@${m.sender.split('@')[0]}`);
  }
};