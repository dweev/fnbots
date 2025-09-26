// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info plugins.js ─────────────────────

import fs from 'fs-extra';
import { join } from 'path';
import log from './logger.js';
import config from '../../config.js';
import { Command } from '../../database/index.js';

export const pluginCache = {
  commands: new Map(),
  helpMap: new Map(),
  isLoading: false,
};

let moduleUrlCache = new Set();

export const loadPlugins = async (pluginPath) => {
  if (pluginCache.isLoading) {
    throw new Error('Plugin loading already in progress');
  }
  pluginCache.isLoading = true;
  try {
    pluginCache.commands.clear();
    pluginCache.helpMap.clear();
    moduleUrlCache.clear();
    for (const cat of config.commandCategories) {
      pluginCache.helpMap.set(cat, new Map());
    }
    const categoryFolders = await fs.readdir(pluginPath);
    let totalCommands = 0;
    let errorCount = 0;
    for (const folder of categoryFolders) {
      const categoryPath = join(pluginPath, folder);
      let stats;
      try {
        stats = await fs.stat(categoryPath);
      } catch (error) {
        log(`Cannot access folder ${folder}: ${error.message}`, true);
        errorCount++;
        continue;
      }
      if (!stats.isDirectory()) {
        continue;
      }
      if (!config.commandCategories.includes(folder)) {
        log(`Skipping unknown category folder: ${folder}`, true);
        continue;
      }
      const categoryName = folder;
      let commandFiles;
      try {
        commandFiles = await fs.readdir(categoryPath);
      } catch (error) {
        log(`Cannot read category folder ${categoryName}: ${error.message}`, true);
        errorCount++;
        continue;
      }
      for (const file of commandFiles) {
        if (!file.endsWith('.js')) continue;
        const filePath = join(categoryPath, file);
        try {
          let moduleUrl = `file://${filePath}`;
          const fileStats = await fs.stat(filePath);
          moduleUrl += `?t=${fileStats.mtime.getTime()}`;
          moduleUrlCache.add(moduleUrl);
          const plugin = await import(moduleUrl);
          if (!plugin.command) {
            log(`No command export found in ${file}`, true);
            errorCount++;
            continue;
          }
          if (!plugin.command.name) {
            log(`Command name missing in ${file}`, true);
            errorCount++;
            continue;
          }
          const cmd = plugin.command;
          const cmdName = cmd.name.toLowerCase();
          if (pluginCache.commands.has(cmdName)) {
            const oldCommand = pluginCache.commands.get(cmdName);
            log(`Replacing duplicate command '${cmdName}' (old: ${oldCommand.category || 'unknown'}, new: ${categoryName})`, true);
            for (const [category, commands] of pluginCache.helpMap.entries()) {
              if (commands.has(cmdName)) {
                commands.delete(cmdName);
                break;
              }
            }
            const oldAliases = oldCommand.aliases || [];
            for (const oldAlias of oldAliases) {
              pluginCache.commands.delete(oldAlias.toLowerCase());
            }
            pluginCache.commands.delete(cmdName);
          }
          if (cmd.category && cmd.category !== categoryName) {
            log(`Command ${cmdName} category mismatch: file in ${categoryName} but command says ${cmd.category}`, true);
          }
          const flags = {
            isLimitCommand: Boolean(cmd.isLimitCommand),
            isLimitGameCommand: Boolean(cmd.isLimitGameCommand),
            isCommandWithoutPayment: Boolean(cmd.isCommandWithoutPayment),
          };
          let dbCommand;
          try {
            dbCommand = await Command.findOrCreate(
              cmdName,
              categoryName,
              cmd.description || 'belum terdefinisikan...',
              cmd.aliases || [],
              flags
            );
          } catch (dbError) {
            log(`Database error for command ${cmdName}: ${dbError.message}`, true);
            errorCount++;
            continue;
          }
          pluginCache.commands.set(cmdName, {
            ...dbCommand.toObject(),
            execute: cmd.execute
          });
          pluginCache.helpMap.get(categoryName).set(cmdName, cmdName);
          totalCommands++;
          const aliases = dbCommand.aliases || [];
          for (const alias of aliases) {
            const aliasLower = alias.toLowerCase();
            if (pluginCache.commands.has(aliasLower)) {
              const oldAliasCommand = pluginCache.commands.get(aliasLower);
              log(`Replacing duplicate alias '${alias}' (old command: ${oldAliasCommand.name}, new command: ${cmdName})`, true);
              pluginCache.commands.delete(aliasLower);
            }
            pluginCache.commands.set(aliasLower, {
              ...dbCommand.toObject(),
              execute: cmd.execute
            });
          }
        } catch (error) {
          log(`Error loading ${file}: ${error.message}`, true);
          if (error.stack) {
            log(`Stack trace: ${error.stack}`, true);
          }
          errorCount++;
        }
      }
    }
    log(`Plugin ${totalCommands} commands loaded, ${errorCount} errors`);
    if (errorCount > 0) {
      log(`Plugin ${errorCount} errors. Check logs above for details.`, true);
    }
  } catch (error) {
    log(`Critical error during plugin loading: ${error.message}`, true);
    throw error;
  } finally {
    pluginCache.isLoading = false;
  }
};

export const getCommandInfo = (commandName) => {
  return pluginCache.commands.get(commandName.toLowerCase());
};
export const hasCommand = (commandName) => {
  return pluginCache.commands.has(commandName.toLowerCase());
};
export const getCommandsByCategory = (category) => {
  const categoryCommands = pluginCache.helpMap.get(category);
  if (!categoryCommands) return [];
  return Array.from(categoryCommands.keys()).map(cmdName =>
    pluginCache.commands.get(cmdName)
  ).filter(cmd => cmd !== undefined);
};
export const getPluginStats = () => {
  const stats = {
    totalCommands: pluginCache.commands.size,
    categories: pluginCache.helpMap.size,
    commandsByCategory: {}
  };
  for (const [category, commands] of pluginCache.helpMap.entries()) {
    stats.commandsByCategory[category] = commands.size;
  }
  return stats;
};
export const cleanupPlugins = () => {
  pluginCache.commands.clear();
  pluginCache.helpMap.clear();
  moduleUrlCache.clear();
  pluginCache.isLoading = false;
};