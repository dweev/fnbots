// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { performanceManager } from '../../lib/performanceManager.js';

export const command = {
  name: 'cachestats',
  category: 'owner',
  description: 'Menampilkan statistik cache.',
  isCommandWithoutPayment: true,
  aliases: ['statcache'],
  isEnabled: true,
  execute: async ({ sReply }) => {
    const stats = await performanceManager.getFullStatus();
    let statsText = `*Performance Statistics*\n\n`;
    statsText += `*Redis Cache Statistics:*\n`;
    statsText += `• User Stats: ${stats.cache.redisCacheStats.users} keys\n`;
    statsText += `• Group Stats: ${stats.cache.redisCacheStats.groups} keys\n`;
    statsText += `• Command Stats: ${stats.cache.redisCacheStats.commands} keys\n`;
    statsText += `• Global Hits: ${stats.cache.globalStats.pendingHits} pending\n`;
    statsText += `• Whitelist Cache: ${stats.cache.whitelist.size} entries\n`;
    statsText += `• Group Data Cache: ${stats.cache.groupData.size} entries\n\n`;
    statsText += `*Performance:*\n`;
    statsText += `• Last Sync: ${stats.cache.performance.lastSync}\n`;
    statsText += `• Sync In Progress: ${stats.cache.performance.syncInProgress ? 'Yes' : 'No'}\n`;
    statsText += `• Uptime: ${Math.floor(stats.performance.uptime / 3600)}h ${Math.floor((stats.performance.uptime % 3600) / 60)}m\n\n`;
    statsText += `*Job Scheduler:*\n`;
    statsText += `• Active Intervals: ${stats.scheduler.intervals.length > 0 ? stats.scheduler.intervals.join(', ') : 'None'}\n`;
    statsText += `• Cron Jobs: ${stats.scheduler.cronJobs.length > 0 ? stats.scheduler.cronJobs.join(', ') : 'None'}\n`;
    statsText += `• Restarting: ${stats.scheduler.restarting ? 'Yes' : 'No'}\n\n`;
    statsText += `*System:*\n`;
    statsText += `• Initialized: ${stats.performance.initialized ? 'Yes' : 'No'}\n`;
    await sReply(statsText);
  }
};