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
  category: 'master',
  description: 'Menampilkan statistik cache dan performance manager.',
  isCommandWithoutPayment: true,
  aliases: ['statcache', 'perfstats'],
  isEnabled: true,
  execute: async ({ sReply }) => {
    const stats = await performanceManager.getFullStatus();
    
    const uptimeHours = Math.floor(stats.uptime / 3600);
    const uptimeMinutes = Math.floor((stats.uptime % 3600) / 60);
    const uptimeSeconds = Math.floor(stats.uptime % 60);
    
    let statsText = `*Performance Manager Statistics*\n\n`;
    
    statsText += `*System Status:*\n`;
    statsText += `Initialized: ${stats.initialized ? 'Yes' : 'No'}\n`;
    statsText += `Uptime: ${uptimeHours}h ${uptimeMinutes}m ${uptimeSeconds}s\n\n`;
    
    statsText += `*Redis Cache:*\n`;
    statsText += `User Stats Keys: ${stats.cache.redisCacheStats.users}\n`;
    statsText += `Group Stats Keys: ${stats.cache.redisCacheStats.groups}\n`;
    statsText += `Command Stats Keys: ${stats.cache.redisCacheStats.commands}\n`;
    statsText += `Pending Hits: ${stats.cache.globalStats.pendingHits}\n`;
    statsText += `Last Global Sync: ${stats.cache.globalStats.lastSync}\n\n`;
    
    statsText += `*LRU Cache:*\n`;
    statsText += `Whitelist: ${stats.cache.whitelist.size} entries\n`;
    statsText += `Group Data: ${stats.cache.groupData.size} entries\n\n`;
    
    statsText += `*Sync Performance:*\n`;
    statsText += `Last Sync: ${stats.cache.performance.lastSync}\n`;
    statsText += `Queue Size: ${stats.cache.performance.queueSize}\n`;
    statsText += `Queue Pending: ${stats.cache.performance.queuePending}\n\n`;
    
    statsText += `*Job Scheduler:*\n`;
    statsText += `Total Jobs: ${stats.scheduler.totalJobs}\n`;
    statsText += `Restarting: ${stats.scheduler.restarting ? 'Yes' : 'No'}\n\n`;
    
    if (stats.scheduler.jobs && stats.scheduler.jobs.length > 0) {
      statsText += `*Active Jobs:*\n`;
      stats.scheduler.jobs.forEach(job => {
        const nextRun = job.secondsToNext > 0 ? `${job.secondsToNext}s` : 'Running';
        statsText += `${job.name}: ${job.isRunning ? 'Active' : 'Idle'} (next: ${nextRun})\n`;
      });
      statsText += `\n`;
    }
    
    statsText += `*Configuration:*\n`;
    statsText += `Sync Interval: ${stats.config.CACHE_SYNC_INTERVAL / 1000}s\n`;
    statsText += `Batch Size: ${stats.config.BATCH_SIZE}\n`;
    statsText += `Whitelist Cache Max: ${stats.config.CACHE_SIZES.whitelist.max}\n`;
    statsText += `Group Cache Max: ${stats.config.CACHE_SIZES.groupData.max}\n`;
    
    await sReply(statsText);
  }
};