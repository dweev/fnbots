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
  description: 'Menampilkan semua daftar perintah bot.',
  aliases: ['menu', 'help'],
  isCommandWithoutPayment: true,
  execute: async ({ sReply, isSadmin, isMaster, isVIP, isPremium, dbSettings, m }) => {
    let ts = `*── ${dbSettings.botName} ──*`;
    ts += `\n\n*Keterangan:*\nⓁ = Menggunakan Limit\n🄶 = Menggunakan Limit Game`;
    const allDbCommands = await Command.find().lean();
    const commandMap = new Map(allDbCommands.map(cmd => [cmd.name, cmd]));
    const formatCommandListWithIcons = (commandNameMap) => {
      if (!commandNameMap || commandNameMap.size === 0) return '';
      const commandNames = [...commandNameMap.keys()].sort();
      let listString = '';
      commandNames.forEach((name, i) => {
        const cmdData = commandMap.get(name);
        let icon = 'Ⓛ';
        if (cmdData) {
          if (cmdData.isLimitGameCommand) {
            icon = '🄶';
          } else if (cmdData.isCommandWithoutPayment) {
            icon = '';
          }
        }
        listString += `\n${i + 1}. ${name} ${icon}`;
      });
      return listString;
    };
    const menuSections = [
      { title: 'MASTER COMMANDS',     data: pluginCache.helpMap.get('master'),      required: isSadmin                                      },
      { title: 'OWNER COMMANDS',      data: pluginCache.helpMap.get('owner'),       required: isSadmin || isMaster                          },
      { title: 'MANAGE BOT',          data: pluginCache.helpMap.get('bot'),         required: isSadmin || isMaster                          },
      { title: 'VIP COMMANDS',        data: pluginCache.helpMap.get('vip'),         required: isSadmin || isMaster || isVIP                 },
      { title: 'PREMIUM COMMANDS',    data: pluginCache.helpMap.get('premium'),     required: isSadmin || isMaster || isVIP || isPremium    },
      { title: 'GROUP COMMANDS',      data: pluginCache.helpMap.get('manage'),      required: isSadmin || isMaster || isVIP || isPremium    },
      { title: 'MEDIA COMMANDS',      data: pluginCache.helpMap.get('media'),       required: true                                          },
      { title: 'CONVERT COMMANDS',    data: pluginCache.helpMap.get('convert'),     required: true                                          },
      { title: 'AUDIO MANIPULATION',  data: pluginCache.helpMap.get('audio'),       required: true                                          },
      { title: 'TEXT MANIPULATION',   data: pluginCache.helpMap.get('text'),        required: true                                          },
      { title: 'IMAGE MANIPULATION',  data: pluginCache.helpMap.get('image'),       required: true                                          },
      { title: 'AI COMMANDS',         data: pluginCache.helpMap.get('ai'),          required: true                                          },
      { title: 'ANIME COMMANDS',      data: pluginCache.helpMap.get('anime'),       required: true                                          },
      { title: 'FUN COMMANDS',        data: pluginCache.helpMap.get('fun'),         required: true                                          },
      { title: 'NGAJI COMMANDS',      data: pluginCache.helpMap.get('ngaji'),       required: true                                          },
      { title: 'GAME COMMANDS',       data: pluginCache.helpMap.get('game'),        required: true                                          },
      { title: 'PVE STATELESS GAME',  data: pluginCache.helpMap.get('stateless'),   required: true                                          },
      { title: 'PVE STATEFUL GAME',   data: pluginCache.helpMap.get('statefull'),   required: true                                          },
      { title: 'PVP GAME',            data: pluginCache.helpMap.get('pvpgame'),     required: true                                          },
      { title: 'MATH COMMANDS',       data: pluginCache.helpMap.get('math'),        required: true                                          },
      { title: 'UTIL COMMANDS',       data: pluginCache.helpMap.get('util'),        required: true                                          },
      { title: 'LIST COMMANDS',       data: pluginCache.helpMap.get('list'),        required: true                                          },
    ];
    for (const section of menuSections) {
      if (section.required && section.data && section.data.size > 0) {
        const commandListString = formatCommandListWithIcons(section.data);
        if (commandListString) {
          ts += `\n\n*${section.title}*${commandListString}`;
        }
      }
    }
    ts += `\n\nRegards: *${dbSettings.botName}*`;
    await sReply(`${ts}\n\n@${m.sender.split('@')[0]}`);
  }
};