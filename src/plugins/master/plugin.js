import { Command } from '../../../database/index.js';
import { pluginCache } from '../../lib/plugins.js';

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
    try {
      const commandDoc = await findCommandInDb(targetIdentifier);
      if (!commandDoc) return sReply(`Perintah atau alias '${targetIdentifier}' tidak ditemukan di database.`);
      await Command.updateOne({ _id: commandDoc._id }, { $set: { isEnabled: newState } });
      const cachedCommand = pluginCache.commands.get(commandDoc.name);
      if (cachedCommand) {
        cachedCommand.isEnabled = newState;
        const allIdentifiers = [commandDoc.name, ...(commandDoc.aliases || [])];
        allIdentifiers.forEach(id => {
          const cmd = pluginCache.commands.get(id);
          if (cmd) {
            cmd.isEnabled = newState;
          }
        });
      }
      const statusText = newState ? 'diaktifkan' : 'dinonaktifkan';
      await sReply(`Berhasil, perintah *${commandDoc.name}* telah ${statusText}.`);
    } catch (error) {
      await sReply(`Terjadi kesalahan: ${error.message}`);
    }
  }
};