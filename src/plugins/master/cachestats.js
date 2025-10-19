// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { redis, mongoStore } from '../../../database/index.js';
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
    const storeStats = mongoStore.getStats();
    
    const cacheCounts = {
      contacts: 0,
      groups: 0,
      lidToJid: 0,
      jidToLid: 0,
      messages: 0,
      conversations: 0,
      presence: 0,
      status: 0
    };
    
    const stream = redis.scanStream({ match: 'cache:*', count: 1000 });
    
    await new Promise((resolve, reject) => {
      stream.on('data', (keys) => {
        keys.forEach(key => {
          if (key.startsWith('cache:contact:')) cacheCounts.contacts++;
          else if (key.startsWith('cache:groupmetadata:')) cacheCounts.groups++;
          else if (key.startsWith('cache:getLIDForPN:')) cacheCounts.lidToJid++;
          else if (key.startsWith('cache:getPNForLID:')) cacheCounts.jidToLid++;
          else if (key.startsWith('cache:messages:')) cacheCounts.messages++;
          else if (key.startsWith('cache:conversation:')) cacheCounts.conversations++;
          else if (key.startsWith('cache:presence:')) cacheCounts.presence++;
          else if (key.startsWith('cache:storystatus:')) cacheCounts.status++;
        });
      });
      stream.on('end', resolve);
      stream.on('error', reject);
    });
    
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
    
    statsText += `*Store Cache Sizes:*\n`;
    statsText += `Contacts: ${cacheCounts.contacts}\n`;
    statsText += `Groups: ${cacheCounts.groups}\n`;
    statsText += `GetLIDForPN: ${cacheCounts.lidToJid}\n`;
    statsText += `GetPNForLID: ${cacheCounts.jidToLid}\n`;
    statsText += `Messages: ${cacheCounts.messages}\n`;
    statsText += `Conversations: ${cacheCounts.conversations}\n`;
    statsText += `Presence: ${cacheCounts.presence}\n`;
    statsText += `Status: ${cacheCounts.status}\n\n`;
    
    statsText += `*Sync Performance:*\n`;
    statsText += `Last Sync: ${stats.cache.performance.lastSync}\n`;
    statsText += `Queue Size: ${stats.cache.performance.queueSize}\n`;
    statsText += `Queue Pending: ${stats.cache.performance.queuePending}\n\n`;
    
    statsText += `*Store Cache Statistics:*\n`;
    statsText += `Redis Hits: ${storeStats.redis.hits}\n`;
    statsText += `Redis Misses: ${storeStats.redis.misses}\n`;
    statsText += `Redis Hit Rate: ${storeStats.redis.hitRate}\n`;
    statsText += `DB Hits: ${storeStats.database.hits}\n`;
    statsText += `DB Misses: ${storeStats.database.misses}\n`;
    statsText += `Total Operations: ${storeStats.total}\n\n`;
    
    statsText += `*Batch Operations:*\n`;
    statsText += `Pending Contacts: ${storeStats.batches.pendingContacts}\n`;
    statsText += `Pending Groups: ${storeStats.batches.pendingGroups}\n`;
    statsText += `Total Writes: ${storeStats.batches.totalWrites}\n`;
    statsText += `Skipped Writes: ${storeStats.batches.skippedWrites}\n`;
    statsText += `Efficiency: ${storeStats.batches.efficiency}\n`;
    statsText += `Errors: ${storeStats.errors}\n\n`;
    
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