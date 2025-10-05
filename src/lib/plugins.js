// ─── Info ────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info src/lib/plugins.js ─────────────────────

import fs from 'fs-extra';
import { join } from 'path';
import log from './logger.js';
import { pathToFileURL } from 'url';
import config from '../../config.js';
import { Command } from '../../database/index.js';

export const pluginCache = {
  commands: new Map(),
  helpMap: new Map(),
  isLoading: false,
};

const moduleUrlCache = new Set();

const clearModuleCache = (moduleUrl) => {
  try {
    const modulePath = new URL(moduleUrl).pathname;
    delete require.cache[require.resolve(modulePath)];
  } catch {
    // do nothing
  }
};

export const clearAllModuleCache = () => {
  for (const moduleUrl of moduleUrlCache) {
    clearModuleCache(moduleUrl);
  }
  moduleUrlCache.clear();
  if (global.gc) {
    global.gc();
  }
};

export const loadPlugins = async (pluginPath) => {
  if (pluginCache.isLoading) {
    throw new Error('Plugin loading already in progress');
  }
  pluginCache.isLoading = true;
  try {
    log('Clearing module cache...');
    clearAllModuleCache();
    pluginCache.commands.clear();
    pluginCache.helpMap.clear();
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
          const fileStats = await fs.stat(filePath);
          const timestamp = fileStats.mtime.getTime();
          const random = Math.random().toString(36).substring(7);
          const moduleUrl = pathToFileURL(filePath) + `?t=${timestamp}&r=${random}`;
          moduleUrlCache.add(moduleUrl);
          const baseUrl = pathToFileURL(filePath).toString();
          clearModuleCache(baseUrl);
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
            log(`Replacing command '${cmdName}' (old category: ${oldCommand.category || 'unknown'}, new category: ${categoryName})`);
            for (const [, commands] of pluginCache.helpMap.entries()) {
              if (commands.has(cmdName)) {
                commands.delete(cmdName);
                break;
              }
            }
            const oldAliases = oldCommand.aliases || [];
            for (const oldAlias of oldAliases) {
              const oldAliasLower = oldAlias.toLowerCase();
              if (pluginCache.commands.has(oldAliasLower)) {
                pluginCache.commands.delete(oldAliasLower);
              }
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
              cmd.displayName || cmdName,
              categoryName,
              cmd.description,
              cmd.aliases || [],
              flags
            );
          } catch (dbError) {
            log(`Database error for command ${cmdName}: ${dbError.message}`, true);
            errorCount++;
            continue;
          }
          const commandData = {
            ...dbCommand.toObject(),
            execute: cmd.execute
          };
          pluginCache.commands.set(cmdName, commandData);
          pluginCache.helpMap.get(categoryName).set(cmdName, cmdName);
          totalCommands++;
          const currentAliases = cmd.aliases || [];
          for (const alias of currentAliases) {
            const aliasLower = alias.toLowerCase();
            if (pluginCache.commands.has(aliasLower)) {
              const existingCommand = pluginCache.commands.get(aliasLower);
              if (existingCommand.name !== cmdName) {
                log(`Alias conflict: '${alias}' already used by command '${existingCommand.name}', skipping for '${cmdName}'`, true);
                continue;
              }
            }
            pluginCache.commands.set(aliasLower, commandData);
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
    log(`Plugin completed: ${totalCommands} commands loaded, ${errorCount} errors`);
    if (errorCount > 0) {
      log(`${errorCount} commands failed to load. Check logs above for details.`, true);
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
  clearAllModuleCache();
  pluginCache.commands.clear();
  pluginCache.helpMap.clear();
  pluginCache.isLoading = false;
};
export const reloadPlugin = async (pluginPath, categoryName, fileName) => {
  const filePath = join(pluginPath, categoryName, fileName);
  try {
    const baseUrl = pathToFileURL(filePath).toString();
    clearModuleCache(baseUrl);
    const fileStats = await fs.stat(filePath);
    const timestamp = fileStats.mtime.getTime();
    const random = Math.random().toString(36).substring(7);
    const moduleUrl = pathToFileURL(filePath) + `?t=${timestamp}&r=${random}`;
    const plugin = await import(moduleUrl);
    if (plugin.command && plugin.command.name) {
      const cmdName = plugin.command.name.toLowerCase();
      if (pluginCache.commands.has(cmdName)) {
        const oldCommand = pluginCache.commands.get(cmdName);
        const oldAliases = oldCommand.aliases || [];
        for (const oldAlias of oldAliases) {
          pluginCache.commands.delete(oldAlias.toLowerCase());
        }
        pluginCache.commands.delete(cmdName);
        for (const [, commands] of pluginCache.helpMap.entries()) {
          if (commands.has(cmdName)) {
            commands.delete(cmdName);
            break;
          }
        }
      }
      log(`Hot reloaded plugin: ${fileName}`);
      await loadPlugins(pluginPath);
    }
  } catch (error) {
    log(`Error hot reloading ${fileName}: ${error.message}`, true);
    throw error;
  }
};