// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info plugins.js ─────────────────────

import { join } from 'path';
import log from './logger.js';
import config from '../../config.js';
import { readdir, stat } from 'fs/promises';
import { Command } from '../../database/index.js';

export const pluginCache = {
  commands: new Map(),
  helpMap: new Map(),
};
export const loadPlugins = async (pluginPath) => {
  try {
    pluginCache.commands.clear();
    pluginCache.helpMap.clear();
    for (const cat of config.commandCategories) {
      pluginCache.helpMap.set(cat, new Map());
    }
    const categoryFolders = await readdir(pluginPath);
    for (const folder of categoryFolders) {
      const categoryPath = join(pluginPath, folder);
      const stats = await stat(categoryPath);
      if (stats.isDirectory() && config.commandCategories.includes(folder)) {
        const categoryName = folder;
        const commandFiles = await readdir(categoryPath);
        for (const file of commandFiles) {
          if (!file.endsWith('.js')) continue;
          const filePath = join(categoryPath, file);
          try {
            const plugin = await import(`file://${filePath}?v=${Date.now()}`);
            if (plugin.command && plugin.command.name) {
              const cmd = plugin.command;
              const commandName = cmd.name.toLowerCase();
              if (pluginCache.commands.has(commandName)) {
                log(`Peringatan: Perintah duplikat '${commandName}' ditemukan di ${file}`, true);
                continue;
              }
              const dbCommand = await Command.findOrCreate(
                commandName,
                categoryName,
                cmd.description || 'belum terdefinisikan...',
                cmd.aliases || []
              );
              pluginCache.commands.set(commandName, { ...dbCommand.toObject(), execute: cmd.execute });
              pluginCache.helpMap.get(categoryName).set(commandName, commandName);
              const aliases = dbCommand.aliases || [];
              for (const alias of aliases) {
                if (pluginCache.commands.has(alias.toLowerCase())) {
                  log(`Peringatan: Alias duplikat '${alias}' dari perintah '${commandName}'`, true);
                  continue;
                }
                pluginCache.commands.set(alias.toLowerCase(), { ...dbCommand.toObject(), execute: cmd.execute });
              }
            }
          } catch (error) {
            log(error, true);
          }
        }
      }
    }
  } catch (error) {
    log(error, true);
    throw error;
  }
};