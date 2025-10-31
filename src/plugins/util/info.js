// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info info.js ───────────────────────

import { pluginCache } from '../../lib/plugins.js';

export const command = {
  name: 'info',
  displayName: 'info',
  category: 'util',
  description: 'Menampilkan informasi detail tentang command tertentu.',
  aliases: ['cmdinfo', 'commandinfo', 'infocmd', 'infocommmand'],
  isCommandWithoutPayment: true,
  execute: async ({ sReply, args, dbSettings }) => {
    if (!args[0]) return await sReply(`Penggunaan: .info <nama_command>\n\nContoh:\n• .info setlastseen\n• .info set-lastseen\n• .info menu`);
    const searchQuery = args[0].toLowerCase();
    let foundCommand = null;
    let matchType = '';
    foundCommand = pluginCache.commands.get(searchQuery);
    if (foundCommand) {
      matchType = foundCommand.name === searchQuery ? 'name' : 'alias';
    }
    if (!foundCommand) {
      for (const [, cmdData] of pluginCache.commands.entries()) {
        if (cmdData.displayName && cmdData.displayName.toLowerCase() === searchQuery) {
          foundCommand = cmdData;
          matchType = 'displayName';
          break;
        }
      }
    }
    if (!foundCommand) {
      const partialMatches = [];
      for (const [cmdKey, cmdData] of pluginCache.commands.entries()) {
        if (cmdKey !== cmdData.name) continue;
        const checkFields = [cmdData.name, cmdData.displayName, ...(cmdData.aliases || [])].filter(Boolean);
        for (const field of checkFields) {
          if (field.toLowerCase().includes(searchQuery)) {
            partialMatches.push({
              command: cmdData,
              matchedField: field,
              exactMatch: field.toLowerCase() === searchQuery
            });
            break;
          }
        }
      }
      if (partialMatches.length > 0) {
        const exactMatch = partialMatches.find((m) => m.exactMatch);
        if (exactMatch) {
          foundCommand = exactMatch.command;
          matchType = 'partial_exact';
        } else if (partialMatches.length === 1) {
          foundCommand = partialMatches[0].command;
          matchType = 'partial_single';
        } else {
          const suggestions = partialMatches
            .slice(0, 5)
            .map((m) => `• ${m.command.displayName || m.command.name}`)
            .join('\n');

          return await sReply(`Command "${args[0]}" tidak ditemukan.\n\nMungkin yang kamu maksud:\n${suggestions}\n\nGunakan nama yang lebih spesifik.`);
        }
      }
    }
    if (!foundCommand) {
      return await sReply(`Command "${args[0]}" tidak ditemukan.\n\nGunakan *.menu* untuk melihat daftar semua command.`);
    }
    const displayName = foundCommand.displayName || foundCommand.name;
    const aliases = foundCommand.aliases && foundCommand.aliases.length > 0 ? foundCommand.aliases.join(', ') : 'Tidak ada';
    let commandIcon = '';
    if (foundCommand.isLimitGameCommand) {
      commandIcon = '🄶 ';
    } else if (!foundCommand.isCommandWithoutPayment) {
      commandIcon = 'Ⓛ ';
    }
    const categoryFormatted = foundCommand.category ? foundCommand.category.toUpperCase() : 'UNKNOWN';
    let response = `*── COMMAND INFO ──*\n\n`;
    response += `*Nama*: ${displayName}\n`;
    response += `*Kategori*: ${categoryFormatted}\n`;
    response += `*Deskripsi*: ${foundCommand.description}\n`;
    response += `*Alias*: ${aliases}\n`;
    response += `*Status*: ${commandIcon}${foundCommand.isCommandWithoutPayment ? 'Gratis' : 'Menggunakan Limit'}\n`;
    if (foundCommand.count !== undefined) {
      response += `*Penggunaan*: ${foundCommand.count}x\n`;
    }
    if (matchType === 'displayName') {
      response += `\n*Ditemukan berdasarkan display name*`;
    } else if (matchType === 'alias') {
      response += `\n*Ditemukan berdasarkan alias*`;
    }
    response += `\n\n*Contoh penggunaan*:\n`;
    response += `• .${displayName}\n`;
    if (foundCommand.aliases && foundCommand.aliases.length > 0) {
      response += `• .${foundCommand.aliases[0]}\n`;
    }
    response += `\nRegards: *${dbSettings.botName}*`;
    await sReply(response);
  }
};
