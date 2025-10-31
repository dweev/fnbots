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
    const input = args[0]?.toLowerCase();
    // prettier-ignore
    const menuSections = [
      { key: 'master',      title: 'Master',            fullTitle: 'MASTER COMMANDS',     required: isSadmin                                      },
      { key: 'owner',       title: 'Owner',             fullTitle: 'OWNER COMMANDS',      required: isSadmin || isMaster                          },
      { key: 'bot',         title: 'Bot',               fullTitle: 'MANAGE BOT',          required: isSadmin || isMaster                          },
      { key: 'vip',         title: 'VIP',               fullTitle: 'VIP COMMANDS',        required: isSadmin || isMaster || isVIP                 },
      { key: 'premium',     title: 'Premium',           fullTitle: 'PREMIUM COMMANDS',    required: isSadmin || isMaster || isVIP || isPremium    },
      { key: 'manage',      title: 'Manage',            fullTitle: 'GROUP COMMANDS',      required: isSadmin || isMaster || isVIP || isPremium    },
      { key: 'media',       title: 'Media',             fullTitle: 'MEDIA COMMANDS',      required: true                                          },
      { key: 'convert',     title: 'Convert',           fullTitle: 'CONVERT COMMANDS',    required: true                                          },
      { key: 'audio',       title: 'Audio',             fullTitle: 'AUDIO MANIPULATION',  required: true                                          },
      { key: 'text',        title: 'Text',              fullTitle: 'TEXT MANIPULATION',   required: true                                          },
      { key: 'image',       title: 'Image',             fullTitle: 'IMAGE MANIPULATION',  required: true                                          },
      { key: 'ai',          title: 'AI',                fullTitle: 'AI COMMANDS',         required: true                                          },
      { key: 'anime',       title: 'Anime',             fullTitle: 'ANIME COMMANDS',      required: true                                          },
      { key: 'fun',         title: 'Fun',               fullTitle: 'FUN COMMANDS',        required: true                                          },
      { key: 'ngaji',       title: 'Ngaji',             fullTitle: 'NGAJI COMMANDS',      required: true                                          },
      { key: 'game',        title: 'Game',              fullTitle: 'GAME COMMANDS',       required: true                                          },
      { key: 'stateless',   title: 'Stateless',         fullTitle: 'PVE STATELESS GAME',  required: true                                          },
      { key: 'statefull',   title: 'Stateful',          fullTitle: 'PVE STATEFUL GAME',   required: true                                          },
      { key: 'pvpgame',     title: 'PVPGame',           fullTitle: 'PVP GAME',            required: true                                          },
      { key: 'math',        title: 'Math',              fullTitle: 'MATH COMMANDS',       required: true                                          },
      { key: 'util',        title: 'Util',              fullTitle: 'UTIL COMMANDS',       required: true                                          },
      { key: 'list',        title: 'List',              fullTitle: 'LIST COMMANDS',       required: true                                          },
    ];
    const accessibleSections = menuSections.filter((s) => s.required && pluginCache.helpMap.get(s.key)?.size > 0);
    if (input && !isNaN(input)) {
      const index = parseInt(input) - 1;
      if (index >= 0 && index < accessibleSections.length) {
        const section = accessibleSections[index];
        await showCategoryCommands(sReply, dbSettings, m, section.key, accessibleSections);
        return;
      } else {
        await sReply(`*Nomor kategori tidak valid!*\n\nGunakan nomor 1-${accessibleSections.length}`);
        return;
      }
    }
    if (!input || input === 'categories') {
      await showCategories(sReply, dbSettings, m, accessibleSections);
    } else if (input === 'all') {
      await showAllCommands(sReply, dbSettings, m, accessibleSections);
    } else {
      await showCategoryCommands(sReply, dbSettings, m, input, accessibleSections);
    }
  }
};

async function showCategories(sReply, dbSettings, m, sections) {
  let ts = `\`\`\`── ${dbSettings.botName} ──\n\n`;
  ts += `List Category:\n`;
  sections.forEach((section, i) => {
    const num = String(i + 1).padStart(2, '0');
    ts += `${num}. ${section.title}\n`;
  });

  ts += `\nTips:`;
  ts += `\n• commands all`;
  ts += `\n• commands [number]`;
  ts += `\n• commands [category]`;
  ts += `\n\nRegards: ${dbSettings.botName}\`\`\``;
  await sReply(`${ts}\n\n@${m.sender.split('@')[0]}`);
}

async function showAllCommands(sReply, dbSettings, m, sections) {
  let ts = `\`\`\`── ${dbSettings.botName} ──`;
  ts += `\n\nKeterangan:\nⓁ = Menggunakan Limit\n🄶 = Menggunakan Limit Game`;
  const allDbCommands = await Command.find().lean();
  const commandMap = new Map(allDbCommands.map((cmd) => [cmd.name, cmd]));
  for (const section of sections) {
    const commandNames = pluginCache.helpMap.get(section.key);
    if (!commandNames || commandNames.size === 0) continue;
    ts += `\n\n${section.fullTitle}`;
    const sortedNames = [...commandNames.keys()].sort();
    sortedNames.forEach((name, i) => {
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
      const num = String(i + 1).padStart(2, '0');
      ts += `\n${num}. ${displayName} ${icon}`;
    });
  }
  ts += `\n\nGunakan commands untuk melihat per kategori`;
  ts += `\n\nRegards: ${dbSettings.botName}\`\`\``;
  await sReply(`${ts}\n\n@${m.sender.split('@')[0]}`);
}

async function showCategoryCommands(sReply, dbSettings, m, category, sections) {
  const section = sections.find((s) => s.key === category) || sections.find((s) => s.fullTitle.toLowerCase().includes(category));
  if (!section) {
    let ts = `\`\`\`Kategori tidak ditemukan!\n\n`;
    ts += `Kategori tersedia:\n`;
    sections.forEach((s, i) => {
      const num = String(i + 1).padStart(2, '0');
      ts += `${num}. ${s.key}\n`;
    });
    ts += `\nGunakan: commands <kategori>\`\`\``;
    return await sReply(ts);
  }
  const commandData = pluginCache.helpMap.get(section.key);
  if (!commandData || commandData.size === 0) {
    return await sReply(`Tidak ada perintah di kategori *${section.fullTitle}*`);
  }
  const allDbCommands = await Command.find().lean();
  const commandMap = new Map(allDbCommands.map((cmd) => [cmd.name, cmd]));
  let ts = `\`\`\`── ${dbSettings.botName} ──`;
  ts += `\n\n${section.fullTitle}`;
  ts += `\n\nTotal: ${commandData.size} perintah`;
  ts += `\nⓁ = Limit \n🄶 = Limit Game\n`;
  const commandNames = [...commandData.keys()].sort();
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
    const num = String(i + 1).padStart(2, '0');
    ts += `\n${num}. ${displayName} ${icon}`;
  });
  ts += `\n\ncommands - Lihat semua kategori`;
  ts += `\ncommands all - Lihat semua perintah`;
  ts += `\n\nRegards: ${dbSettings.botName}\`\`\``;
  await sReply(`${ts}\n\n@${m.sender.split('@')[0]}`);
}
