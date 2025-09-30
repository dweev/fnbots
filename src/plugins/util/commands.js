// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { pluginCache } from '../../lib/plugins.js';
import { Command } from '../../../database/index.js';

export const command = {
  name: 'commands',
  category: 'util',
  description: 'Menampilkan daftar perintah bot.',
  aliases: ['menu', 'help'],
  isCommandWithoutPayment: true,
  execute: async ({ sReply, isSadmin, isMaster, isVIP, isPremium, dbSettings, m, args }) => {
    const category = args[0]?.toLowerCase();
    const menuSections = [
      { key: 'master',      title: 'MASTER COMMANDS',     required: isSadmin                                      },
      { key: 'owner',       title: 'OWNER COMMANDS',      required: isSadmin || isMaster                          },
      { key: 'bot',         title: 'MANAGE BOT',          required: isSadmin || isMaster                          },
      { key: 'vip',         title: 'VIP COMMANDS',        required: isSadmin || isMaster || isVIP                 },
      { key: 'premium',     title: 'PREMIUM COMMANDS',    required: isSadmin || isMaster || isVIP || isPremium    },
      { key: 'manage',      title: 'GROUP COMMANDS',      required: isSadmin || isMaster || isVIP || isPremium    },
      { key: 'media',       title: 'MEDIA COMMANDS',      required: true                                          },
      { key: 'convert',     title: 'CONVERT COMMANDS',    required: true                                          },
      { key: 'audio',       title: 'AUDIO MANIPULATION',  required: true                                          },
      { key: 'text',        title: 'TEXT MANIPULATION',   required: true                                          },
      { key: 'image',       title: 'IMAGE MANIPULATION',  required: true                                          },
      { key: 'ai',          title: 'AI COMMANDS',         required: true                                          },
      { key: 'anime',       title: 'ANIME COMMANDS',      required: true                                          },
      { key: 'fun',         title: 'FUN COMMANDS',        required: true                                          },
      { key: 'ngaji',       title: 'NGAJI COMMANDS',      required: true                                          },
      { key: 'game',        title: 'GAME COMMANDS',       required: true                                          },
      { key: 'stateless',   title: 'PVE STATELESS GAME',  required: true                                          },
      { key: 'statefull',   title: 'PVE STATEFUL GAME',   required: true                                          },
      { key: 'pvpgame',     title: 'PVP GAME',            required: true                                          },
      { key: 'math',        title: 'MATH COMMANDS',       required: true                                          },
      { key: 'util',        title: 'UTIL COMMANDS',       required: true                                          },
      { key: 'list',        title: 'LIST COMMANDS',       required: true                                          },
    ];
    const accessibleSections = menuSections.filter(s => s.required && pluginCache.helpMap.get(s.key)?.size > 0);
    if (!category || category === 'categories') {
      await showCategories(sReply, dbSettings, m, accessibleSections);
    } else if (category === 'all') {
      await showAllCommands(sReply, dbSettings, m, accessibleSections);
    } else {
      await showCategoryCommands(sReply, dbSettings, m, category, accessibleSections);
    }
  }
};

async function showCategories(sReply, dbSettings, m, sections) {
  let ts = `*── ${dbSettings.botName} ──*\n\n`;
  sections.forEach((section, i) => {
    const commandCount = pluginCache.helpMap.get(section.key)?.size || 0;
    ts += `${i + 1}. *${section.title}* (${commandCount})\n`;
    ts += `    commands category ${section.key}\n\n`;
  });
  ts += `\n*Tips:*`;
  ts += `\n• *commands all* - Lihat semua perintah`;
  ts += `\n• *commands <kategori>* - Lihat per kategori`;
  ts += `\n\nⓁ = Limit\n🄶 = Limit Game`;
  ts += `\n\nRegards: *${dbSettings.botName}*`;
  await sReply(`${ts}\n\n@${m.sender.split('@')[0]}`);
};

async function showAllCommands(sReply, dbSettings, m, sections) {
  let ts = `*── ${dbSettings.botName} ──*`;
  ts += `\n\n*Keterangan:*\nⓁ = Menggunakan Limit\n🄶 = Menggunakan Limit Game`;
  const allDbCommands = await Command.find().lean();
  const commandMap = new Map(allDbCommands.map(cmd => [cmd.name, cmd]));
  for (const section of sections) {
    const commandListString = formatCommandListWithIcons(section.key, commandMap);
    if (commandListString) {
      ts += `\n\n*${section.title}*${commandListString}`;
    }
  }
  ts += `\n\nGunakan *commands* untuk melihat per kategori`;
  ts += `\n\nRegards: *${dbSettings.botName}*`;
  await sReply(`${ts}\n\n@${m.sender.split('@')[0]}`);
};

async function showCategoryCommands(sReply, dbSettings, m, category, sections) {
  const section = sections.find(s => 
    s.key === category || 
    s.title.toLowerCase().includes(category) ||
    category === s.key.toLowerCase()
  );
  if (!section) {
    let ts = `*Kategori tidak ditemukan!*\n\n`;
    ts += `Kategori tersedia:\n`;
    sections.forEach((s, i) => {
      ts += `${i + 1}. ${s.key}\n`;
    });
    ts += `\nGunakan: *commands <kategori>*`;
    return await sReply(ts);
  }
  const commandData = pluginCache.helpMap.get(section.key);
  if (!commandData || commandData.size === 0) {
    return await sReply(`Tidak ada perintah di kategori *${section.title}*`);
  }
  const allDbCommands = await Command.find().lean();
  const commandMap = new Map(allDbCommands.map(cmd => [cmd.name, cmd]));
  let ts = `*── ${dbSettings.botName} ──*`;
  ts += `\n\n*${section.title}*`;
  ts += `\n\nTotal: ${commandData.size} perintah`;
  ts += `\nⓁ = Limit \n🄶 = Limit Game\n`;
  const commandListString = formatCommandListWithIcons(section.key, commandMap);
  ts += commandListString;
  ts += `\n\n*commands* - Lihat semua kategori`;
  ts += `\n*commands all* - Lihat semua perintah`;
  ts += `\n\nRegards: *${dbSettings.botName}*`;
  await sReply(`${ts}\n\n@${m.sender.split('@')[0]}`);
};

function formatCommandListWithIcons(categoryKey, commandMap) {
  const commandNameMap = pluginCache.helpMap.get(categoryKey);
  if (!commandNameMap || commandNameMap.size === 0) return '';
  const commandNames = [...commandNameMap.keys()].sort();
  let listString = '';
  commandNames.forEach((name, i) => {
    const cmdData = commandMap.get(name);
    const displayName = cmdData?.displayName || name;
    let icon = 'Ⓛ';
    if (cmdData) {
      if (cmdData.isLimitGameCommand) {
        icon = '🄶';
      } else if (cmdData.isCommandWithoutPayment) {
        icon = '';
      }
    }
    listString += `\n${i + 1}. ${displayName} ${icon}`;
  });
  return listString;
}