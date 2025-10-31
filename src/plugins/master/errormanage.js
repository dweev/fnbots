// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import errorTracker from '../../lib/errorTracker.js';

export const command = {
  name: 'errormanage',
  category: 'master',
  description: 'Manage error tracker system.',
  aliases: ['errmanage', 'errorctl'],
  isCommandWithoutPayment: true,
  execute: async ({ sReply, args, dbSettings }) => {
    const [action, ...rest] = args;
    if (!action) {
      let guide = `*Error Tracker Management*\n\n`;
      guide += `*Available Actions:*\n\n`;
      guide += `• \`list\` - List all disabled commands\n`;
      guide += `• \`reset [command]\` - Reset error count\n`;
      guide += `• \`enable [command]\` - Enable disabled command\n`;
      guide += `• \`cleanup\` - Run manual cleanup\n`;
      guide += `• \`status\` - Show system status\n\n`;
      guide += `*Examples:*\n`;
      guide += `\`\`\`${dbSettings.rname}errormanage list\`\`\`\n`;
      guide += `\`\`\`${dbSettings.rname}errormanage reset play\`\`\`\n`;
      guide += `\`\`\`${dbSettings.rname}errormanage enable sticker\`\`\``;
      return sReply(guide);
    }
    switch (action.toLowerCase()) {
      case 'list': {
        const disabled = await errorTracker.getDisabledCommands();
        if (disabled.length === 0) return sReply('Tidak ada command yang di-disable oleh error tracker.');
        let reply = `*🔴 Disabled Commands*\n\n`;
        reply += `Total: ${disabled.length}\n\n`;
        for (let i = 0; i < disabled.length; i++) {
          const cmd = disabled[i];
          const stats = await errorTracker.getErrorStats(cmd);
          reply += `${i + 1}. *${cmd}*\n`;
          if (stats) {
            const lastError = new Date(stats.lastErrorTime).toLocaleString('id-ID', {
              timeZone: 'Asia/Jakarta',
              dateStyle: 'short',
              timeStyle: 'short'
            });
            reply += `   Errors: ${stats.count}\n`;
            reply += `   Last: ${lastError}\n`;
          }
          reply += `\n`;
        }
        reply += `_Use: .errormanage enable [command] to re-enable_`;
        return sReply(reply);
      }
      case 'reset': {
        const cmdName = rest[0];
        if (!cmdName) return sReply('Masukkan nama command.\nContoh: `.errormanage reset play`');
        await errorTracker.removeFromDisabled(cmdName);
        return sReply(`Error counter untuk *${cmdName}* telah di-reset.\n\n_Note: Command masih disabled di database. Gunakan .plugin on ${cmdName} untuk mengaktifkan._`);
      }
      case 'enable': {
        const cmdName = rest[0];
        if (!cmdName) return sReply('Masukkan nama command.\nContoh: `.errormanage enable play`');
        const isDisabled = await errorTracker.isCommandDisabled(cmdName);
        if (!isDisabled) return sReply(`Command *${cmdName}* tidak ada dalam daftar disabled error tracker.`);
        await errorTracker.removeFromDisabled(cmdName);
        const { Command } = await import('../../../database/index.js');
        const { pluginCache } = await import('../../lib/plugins.js');
        const commandDoc = await Command.findOne({
          $or: [{ name: cmdName.toLowerCase() }, { aliases: cmdName.toLowerCase() }]
        });
        if (!commandDoc) {
          return sReply(`Command *${cmdName}* tidak ditemukan di database.`);
        }
        await Command.updateOne({ _id: commandDoc._id }, { $set: { isEnabled: true } });
        const allIdentifiers = [commandDoc.name, ...(commandDoc.aliases || [])];
        for (const identifier of allIdentifiers) {
          const cachedCmd = pluginCache.commands.get(identifier.toLowerCase());
          if (cachedCmd) {
            cachedCmd.isEnabled = true;
          }
        }
        return sReply(`Command *${commandDoc.name}* telah diaktifkan kembali.\n\nError tracking telah di-reset.`);
      }
      case 'cleanup': {
        await errorTracker.cleanup();
        return sReply('Cleanup completed.');
      }
      case 'status': {
        const { performanceManager } = await import('../../lib/performanceManager.js');
        const schedulerStatus = performanceManager.scheduler.getStatus();
        const cleanupJob = schedulerStatus.jobs.find((j) => j.name === 'errorTrackerCleanup');
        const allStats = await errorTracker.getErrorStats();
        const entries = Object.entries(allStats);
        const disabledCount = entries.filter(([, data]) => data.isDisabled).length;
        let reply = `*Error Tracker Status*\n\n`;
        reply += `*Configuration:*\n`;
        reply += `Max Errors: ${errorTracker.MAX_CONSECUTIVE_ERRORS}\n`;
        reply += `Reset Time: ${errorTracker.ERROR_RESET_TIME / 60000}m\n\n`;
        reply += `*Statistics:*\n`;
        reply += `Tracked Commands: ${entries.length}\n`;
        reply += `Auto-disabled: ${disabledCount}\n\n`;
        if (cleanupJob) {
          const nextCleanup = cleanupJob.secondsToNext;
          const hours = Math.floor(nextCleanup / 3600);
          const minutes = Math.floor((nextCleanup % 3600) / 60);
          reply += `*Cleanup Scheduler:*\n`;
          reply += `Status: ${cleanupJob.isRunning ? '🟢 Running' : '🔴 Stopped'}\n`;
          reply += `Next run: ${hours}h ${minutes}m\n`;
        }
        return sReply(reply);
      }
      default:
        return sReply(`Action tidak dikenal: *${action}*\n\nGunakan tanpa parameter untuk melihat panduan.`);
    }
  }
};
