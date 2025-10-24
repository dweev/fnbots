// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import log from '../../lib/logger.js';
import { pluginCache } from '../../lib/plugins.js';
import { Command } from '../../../database/index.js';

async function findCommandInDb(identifier) {
  const target = identifier.toLowerCase();
  return await Command.findOne({ $or: [{ name: target }, { aliases: target }] });
}

export const command = {
  name: 'plugin',
  category: 'master',
  description: 'Mengaktifkan atau menonaktifkan sebuah plugin/perintah.',
  aliases: ['plugins', 'cmd'],
  isCommandWithoutPayment: true,
  execute: async ({ sReply, args, dbSettings }) => {
    const [subCmd, targetIdentifier] = args;
    if (!subCmd || !targetIdentifier) {
      let guide = `*Panduan Perintah Plugin*\n\n`;
      guide += `Gunakan perintah ini untuk mengelola status aktif/nonaktif dari plugin lain.\n\n`;
      guide += `*Contoh Penggunaan:*\n`;
      guide += `\`\`\`${dbSettings.rname}plugin on sticker\`\`\`\n`;
      guide += `\`\`\`${dbSettings.rname}plugin off play\`\`\`\n\n`;
      guide += `*Sub-perintah:*\n`;
      guide += `• *on*: Mengaktifkan plugin.\n`;
      guide += `• *off*: Menonaktifkan plugin.`;
      return sReply(guide);
    }
    const state = subCmd.toLowerCase();
    if (state !== 'on' && state !== 'off') return sReply(`Sub-perintah tidak valid. Gunakan 'on' atau 'off'.`);
    const newState = state === 'on';
    const commandDoc = await findCommandInDb(targetIdentifier);
    if (!commandDoc) return sReply(`Perintah atau alias '${targetIdentifier}' tidak ditemukan di database.`);
    try {
      await Command.updateOne(
        { _id: commandDoc._id },
        { $set: { isEnabled: newState } }
      );
      log(`Plugin ${commandDoc.name} set to isEnabled=${newState}`);
    } catch (error) {
      log(`Error updating command in database: ${error.message}`, true);
      return sReply(`Gagal menyimpan perubahan ke database: ${error.message}`);
    }
    const allIdentifiers = [commandDoc.name, ...(commandDoc.aliases || [])];
    let updatedCount = 0;
    for (const identifier of allIdentifiers) {
      const idLower = identifier.toLowerCase();
      const cachedCmd = pluginCache.commands.get(idLower);
      if (cachedCmd) {
        cachedCmd.isEnabled = newState;
        updatedCount++;
      }
    }
    const statusText = newState ? 'diaktifkan' : 'dinonaktifkan';
    const aliasInfo = commandDoc.aliases?.length > 0 ? ` (termasuk ${commandDoc.aliases.length} alias)` : '';
    await sReply(
      `Berhasil!\n\n` +
      `Perintah: *${commandDoc.name}*${aliasInfo}\n` +
      `Status: *${statusText.toUpperCase()}*\n` +
      `Cache updated: ${updatedCount} entries`
    );
  }
};