// ─── Info ────────────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────────────

import { redis, store } from '../../../database/index.js';
import { performanceManager } from '../../lib/performanceManager.js';
import { cooldownManager } from '../../lib/cooldownManager.js';
import { gameStateManager } from '../../lib/gameManager.js';
import ContactCache from '../../cache/cacheContact.js';
import GroupCache from '../../cache/cacheGroupMetadata.js';
import MessageCache from '../../cache/cacheMessage.js';
import StoryCache from '../../cache/cacheStory.js';
import OTPSession from '../../cache/otpSession.js';

export const command = {
  name: 'cachestats',
  category: 'master',
  description: 'Menampilkan statistik lengkap cache dan performance manager.',
  isCommandWithoutPayment: true,
  aliases: ['statcache', 'perfstats'],
  isEnabled: true,
  execute: async ({ sReply }) => {
    // prettier-ignore
    const [
      perfFullStatus,
      storeStats,
      contactStats,
      groupStats,
      messageStats,
      storyStats,
      otpStats,
      cooldownStats,
      gameStats
    ] = await Promise.all([
      performanceManager.getFullStatus(),
      store.getStats ? store.getStats() : {},
      ContactCache.getStats(),
      GroupCache.getStats(),
      MessageCache.getStats(),
      StoryCache.getStats(),
      OTPSession.getStats(),
      Promise.resolve(cooldownManager.getStats()),
      Promise.resolve(gameStateManager.getStats())
    ]);
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
    const allKeys = [];

    await new Promise((resolve, reject) => {
      stream.on('data', (keys) => {
        allKeys.push(...keys);
      });
      stream.on('end', resolve);
      stream.on('error', reject);
    });

    allKeys.forEach((key) => {
      if (key.startsWith('cache:contact:')) cacheCounts.contacts++;
      else if (key.startsWith('cache:groupmetadata:')) cacheCounts.groups++;
      else if (key.startsWith('cache:lid2jid:')) cacheCounts.lidToJid++;
      else if (key.startsWith('cache:jid2lid:')) cacheCounts.jidToLid++;
      else if (key.startsWith('cache:messages:')) cacheCounts.messages++;
      else if (key.startsWith('cache:conversation:')) cacheCounts.conversations++;
      else if (key.startsWith('cache:presence:')) cacheCounts.presence++;
      else if (key.startsWith('cache:story:')) cacheCounts.status++;
    });

    cacheCounts.presence = messageStats.totalPresenceChats || 0;

    const uptimeHours = Math.floor(perfFullStatus.uptime / 3600);
    const uptimeMinutes = Math.floor((perfFullStatus.uptime % 3600) / 60);
    const uptimeSeconds = Math.floor(perfFullStatus.uptime % 60);

    let statsText = `*Performance Manager Statistics*\n\n`;

    statsText += `*System Status:*\n`;
    statsText += `Initialized: ${perfFullStatus.initialized ? 'Yes' : 'No'}\n`;
    statsText += `Uptime: ${uptimeHours}h ${uptimeMinutes}m ${uptimeSeconds}s\n`;
    statsText += `Node Memory: ${perfFullStatus.memory?.currentStats?.lastUsage?.rss || 0}MB\n\n`;

    statsText += `*Performance Manager Cache:*\n`;
    statsText += `User Stats Keys: ${perfFullStatus.cache?.redisCacheStats?.users || 0}\n`;
    statsText += `Group Stats Keys: ${perfFullStatus.cache?.redisCacheStats?.groups || 0}\n`;
    statsText += `Command Stats Keys: ${perfFullStatus.cache?.redisCacheStats?.commands || 0}\n`;
    statsText += `Pending Hits: ${perfFullStatus.cache?.globalStats?.pendingHits || 0}\n`;
    statsText += `Last Sync: ${perfFullStatus.cache?.globalStats?.lastSync || 'N/A'}\n\n`;

    statsText += `*LRU Caches:*\n`;
    statsText += `Whitelist: ${perfFullStatus.cache?.lruCaches?.whitelist?.size || 0}/${perfFullStatus.cache?.lruCaches?.whitelist?.max || 0}\n`;
    statsText += `Group Data: ${perfFullStatus.cache?.lruCaches?.groupData?.size || 0}/${perfFullStatus.cache?.lruCaches?.groupData?.max || 0}\n`;
    statsText += `Group Metadata: ${perfFullStatus.cache?.lruCaches?.groupMetadata?.size || 0}/${perfFullStatus.cache?.lruCaches?.groupMetadata?.max || 0}\n`;
    statsText += `Contact Data: ${perfFullStatus.cache?.lruCaches?.contactData?.size || 0}/${perfFullStatus.cache?.lruCaches?.contactData?.max || 0}\n\n`;

    statsText += `*Redis Cache Keys:*\n`;
    statsText += `Contacts: ${cacheCounts.contacts}\n`;
    statsText += `Groups: ${cacheCounts.groups}\n`;
    statsText += `LID to JID Mappings: ${cacheCounts.lidToJid}\n`;
    statsText += `JID to LID Mappings: ${cacheCounts.jidToLid}\n`;
    statsText += `Messages: ${cacheCounts.messages}\n`;
    statsText += `Conversations: ${cacheCounts.conversations}\n`;
    statsText += `Presence: ${cacheCounts.presence}\n`;
    statsText += `Stories: ${cacheCounts.status}\n\n`;

    statsText += `*Contact Cache:*\n`;
    statsText += `Total Contacts: ${contactStats.totalContacts || 0}\n`;
    statsText += `Persistent: ${contactStats.persistent ? 'Yes' : 'No'}\n`;
    statsText += `Sample Size: ${contactStats.sampleSize || 0}\n\n`;

    statsText += `*Group Cache:*\n`;
    statsText += `Total Groups: ${groupStats.totalGroups || 0}\n`;
    statsText += `Hot Groups: ${groupStats.hotGroups || 0}\n`;
    statsText += `Sample Size: ${groupStats.groups?.length || 0}\n\n`;

    statsText += `*Message Cache:*\n`;
    statsText += `Total Chats: ${messageStats.totalChats || 0}\n`;
    statsText += `Presence Chats: ${messageStats.totalPresenceChats || 0}\n`;
    statsText += `Cached Messages: ${messageStats.chats?.reduce((sum, c) => sum + c.messageCount, 0) || 0}\n\n`;

    statsText += `*Story Cache:*\n`;
    statsText += `Total Users: ${storyStats.totalUsers || 0}\n`;
    statsText += `Total Stories: ${storyStats.users?.reduce((sum, u) => sum + u.storyCount, 0) || 0}\n\n`;

    statsText += `*OTP Sessions:*\n`;
    statsText += `Active Sessions: ${otpStats.activeSessions || 0}\n`;
    statsText += `Blocked Users: ${otpStats.blockedUsers || 0}\n\n`;

    statsText += `*Store Database:*\n`;
    statsText += `Redis Hits: ${storeStats.redis?.hits || 0}\n`;
    statsText += `Redis Misses: ${storeStats.redis?.misses || 0}\n`;
    statsText += `Hit Rate: ${storeStats.redis?.hitRate || '0%'}\n`;
    statsText += `DB Hits: ${storeStats.database?.hits || 0}\n`;
    statsText += `DB Misses: ${storeStats.database?.misses || 0}\n`;
    statsText += `Total Operations: ${storeStats.total || 0}\n\n`;

    statsText += `*Batch Operations:*\n`;
    statsText += `Pending Contacts: ${storeStats.batches?.pendingContacts || 0}\n`;
    statsText += `Pending Groups: ${storeStats.batches?.pendingGroups || 0}\n`;
    statsText += `Total Writes: ${storeStats.batches?.totalWrites || 0}\n`;
    statsText += `Skipped Writes: ${storeStats.batches?.skippedWrites || 0}\n`;
    statsText += `Efficiency: ${storeStats.batches?.efficiency || '0%'}\n`;
    statsText += `Errors: ${storeStats.errors || 0}\n\n`;

    statsText += `*Optimization Stats:*\n`;
    statsText += `LID Mappings: ${storeStats.optimization?.lidMappings || 0}\n`;
    statsText += `Coalesced Requests: ${storeStats.optimization?.coalescedRequests || 0}\n`;
    statsText += `Circuit Breaker Trips: ${storeStats.optimization?.circuitBreakerTrips || 0}\n`;
    statsText += `Circuit State: ${storeStats.optimization?.circuitBreakerState || 'CLOSED'}\n\n`;

    statsText += `*Cooldown Manager:*\n`;
    statsText += `Global Queue Size: ${cooldownStats.globalQueue?.size || 0}\n`;
    statsText += `Global Queue Pending: ${cooldownStats.globalQueue?.pending || 0}\n`;
    statsText += `User Queues: ${cooldownStats.userQueues?.total || 0}\n`;
    statsText += `Active User Queues: ${cooldownStats.userQueues?.active || 0}\n`;
    statsText += `Active Cooldowns: ${cooldownStats.tracking?.activeCooldowns || 0}\n`;
    statsText += `Spammed Users: ${cooldownStats.tracking?.spammedUsers || 0}\n`;
    statsText += `Banned Users: ${cooldownStats.tracking?.bannedUsers || 0}\n`;
    statsText += `Media Spam Tracked: ${cooldownStats.tracking?.mediaSpamTracked || 0}\n\n`;

    statsText += `*Game Manager:*\n`;
    statsText += `Active Games: ${gameStats.activeGames || 0}\n`;
    const oldestAge = gameStats.oldestGameAge || 0;
    const ageMinutes = Math.floor(oldestAge / 60000);
    const ageSeconds = Math.floor((oldestAge % 60000) / 1000);
    statsText += `Oldest Game Age: ${ageMinutes}m ${ageSeconds}s\n\n`;

    statsText += `*Job Scheduler:*\n`;
    statsText += `Total Jobs: ${perfFullStatus.scheduler?.totalJobs || 0}\n`;
    statsText += `Restarting: ${perfFullStatus.scheduler?.restarting ? 'Yes' : 'No'}\n\n`;

    if (perfFullStatus.scheduler?.jobs && perfFullStatus.scheduler.jobs.length > 0) {
      statsText += `*Active Jobs:*\n`;
      perfFullStatus.scheduler.jobs.forEach((job) => {
        const nextRun = job.secondsToNext > 0 ? `${job.secondsToNext}s` : 'Running';
        statsText += `${job.name}: ${job.isRunning ? 'Active' : 'Idle'} (next: ${nextRun})\n`;
      });
      statsText += `\n`;
    }

    statsText += `*Memory Monitor:*\n`;
    statsText += `RSS Threshold: ${perfFullStatus.memory?.rssThreshold || 0}MB\n`;
    statsText += `Warning Threshold: ${Math.round((perfFullStatus.memory?.warningThreshold || 0) * 100)}%\n`;
    statsText += `Auto Restart: ${perfFullStatus.memory?.enableAutoRestart ? 'Yes' : 'No'}\n`;
    statsText += `Check Interval: ${(perfFullStatus.memory?.checkInterval || 0) / 1000}s\n`;
    statsText += `Current Warnings: ${perfFullStatus.memory?.currentStats?.warnings || 0}\n`;
    statsText += `Max Warnings: ${perfFullStatus.memory?.consecutiveWarningsBeforeRestart || 0}\n\n`;

    statsText += `*Configuration:*\n`;
    statsText += `Sync Interval: ${perfFullStatus.config?.CACHE_SYNC_INTERVAL ? perfFullStatus.config.CACHE_SYNC_INTERVAL / 1000 : 5}s\n`;
    statsText += `Batch Size: ${perfFullStatus.config?.BATCH_SIZE || 100}\n`;
    statsText += `Whitelist Cache Max: ${perfFullStatus.config?.CACHE_SIZES?.whitelist?.max || 1000}\n`;
    statsText += `Group Cache Max: ${perfFullStatus.config?.CACHE_SIZES?.groupData?.max || 500}\n`;

    await sReply(statsText);
  }
};
