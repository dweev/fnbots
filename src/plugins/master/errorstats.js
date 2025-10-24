// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import errorTracker from '../../lib/errorTracker.js';

export const command = {
  name: 'errorstats',
  category: 'master',
  description: 'Menampilkan statistik error dari commands.',
  aliases: ['errstats', 'errorstat'],
  isCommandWithoutPayment: true,
  execute: async ({ sReply, args }) => {
    const [subCmd, commandName] = args;
    if (subCmd === 'info') {
      const { performanceManager } = await import('../../lib/performanceManager.js');
      const schedulerStatus = performanceManager.scheduler.getStatus();
      const cleanupJob = schedulerStatus.jobs.find(j => j.name === 'errorTrackerCleanup');
      let reply = `*Error Tracker Info*\n\n`;
      reply += `Max Consecutive Errors: ${errorTracker.MAX_CONSECUTIVE_ERRORS}\n`;
      reply += `Error Reset Time: ${errorTracker.ERROR_RESET_TIME / 60000} minutes\n\n`;
      if (cleanupJob) {
        const nextCleanup = cleanupJob.secondsToNext;
        const hours = Math.floor(nextCleanup / 3600);
        const minutes = Math.floor((nextCleanup % 3600) / 60);
        reply += `*Cleanup Scheduler:*\n`;
        reply += `Status: ${cleanupJob.isRunning ? '🟢 Running' : '🔴 Stopped'}\n`;
        reply += `Next cleanup: ${hours}h ${minutes}m\n`;
      }
      return sReply(reply);
    }
    if (commandName) {
      const stats = await errorTracker.getErrorStats(commandName);
      if (!stats) return sReply(`Tidak ada data error untuk command *${commandName}*.`);
      const lastErrorDate = new Date(stats.lastErrorTime).toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta'
      });
      let reply = `*Error Stats: ${commandName}*\n\n`;
      reply += `Error Count: ${stats.count}/${errorTracker.MAX_CONSECUTIVE_ERRORS}\n`;
      reply += `Last Error: ${lastErrorDate}\n`;
      reply += `Status: ${stats.count >= errorTracker.MAX_CONSECUTIVE_ERRORS ? '🔴 DISABLED' : '🟢 Active'}\n\n`;
      if (stats.errors && stats.errors.length > 0) {
        reply += `*Recent Errors:*\n\n`;
        stats.errors.forEach((err, idx) => {
          const time = new Date(err.timestamp).toLocaleString('id-ID', {
            timeZone: 'Asia/Jakarta',
            hour: '2-digit',
            minute: '2-digit'
          });
          reply += `${idx + 1}. [${time}] ${err.message}\n`;
        });
      }
      return sReply(reply);
    }
    const allStats = errorTracker.getErrorStats();
    const entries = Object.entries(allStats);
    if (entries.length === 0) return sReply('Tidak ada command yang mengalami error.');
    if (subCmd === 'clear') {
      errorTracker.clearAll();
      return sReply('Semua error tracking telah di-reset.');
    }
    let reply = `*Error Statistics*\n\n`;
    reply += `Total Commands with Errors: ${entries.length}\n`;
    reply += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    entries.sort((a, b) => b[1].errorCount - a[1].errorCount);
    entries.forEach(([cmd, data], idx) => {
      const statusIcon = data.isDisabled ? '🔴' :
        data.errorCount >= 3 ? '🟡' : '🟢';
      const lastError = new Date(data.lastError).toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit'
      });
      reply += `${idx + 1}. ${statusIcon} *${cmd}*\n`;
      reply += `   Errors: ${data.errorCount}/${errorTracker.MAX_CONSECUTIVE_ERRORS}\n`;
      reply += `   Last: ${lastError}\n`;
      if (data.isDisabled) {
        reply += `   Status: DISABLED\n`;
      }
      reply += `\n`;
    });
    reply += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    reply += `🟢 = Normal\n`;
    reply += `🟡 = Warning (≥3 errors)\n`;
    reply += `🔴 = Auto-disabled\n\n`;
    reply += `_Use: .errorstats clear to reset all_\n`;
    reply += `_Use: .errorstats [command] for details_`;
    return sReply(reply);
  }
};