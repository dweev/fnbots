// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
*/
// ─── Info plugins.js ─────────────────────

import config from '../../config.js';
import { readdir } from 'fs/promises';
import { join } from 'path';
import log from './logger.js';
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
        const files = await readdir(pluginPath);
        for (const file of files) {
            if (!file.endsWith('.js')) continue;
            const filePath = join(pluginPath, file);
            const plugin = await import(`file://${filePath}`);
            if (plugin.command && plugin.command.name && plugin.command.category) {
                const cmd = plugin.command;
                const commandName = cmd.name.toLowerCase();
                const categoryName = cmd.category.toLowerCase();
                if (!pluginCache.helpMap.has(categoryName)) {
                    log(`Peringatan: Kategori '${categoryName}' dari plugin '${file}' tidak ada di .env.`, true);
                    continue;
                }
                const dbCommand = await Command.findOrCreate(
                    commandName,
                    categoryName,
                    cmd.description || 'belum terdefinisikan...',
                    cmd.aliases || []
                );
                if (pluginCache.commands.has(commandName)) {
                    log(`Peringatan: Perintah '${commandName}' diduplikasi di ${file}`, true);
                    continue;
                }
                pluginCache.commands.set(commandName, { ...dbCommand.toObject(), execute: cmd.execute });
                pluginCache.helpMap.get(categoryName).set(commandName, commandName);
                const aliases = (dbCommand.aliases && dbCommand.aliases.length) ? dbCommand.aliases : (cmd.aliases || []);
                for (const alias of aliases) {
                    const aliasKey = alias.toLowerCase();
                    if (pluginCache.commands.has(aliasKey)) {
                        log(`Peringatan: Alias '${alias}' untuk perintah '${commandName}' diduplikasi di ${file}`, true);
                        continue;
                    }
                    pluginCache.commands.set(aliasKey, { ...dbCommand.toObject(), execute: cmd.execute });
                }
            }
        }
        log(`Berhasil memuat ${pluginCache.commands.size} perintah dari ${files.length} file plugin.`);
    } catch (error) {
        log(`Gagal memuat plugin: ${error.message}`, true);
        throw error;
    }
};