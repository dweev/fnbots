// ─── Info ────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info src/lib/performanceManager.js ──────────

import cron from 'node-cron';
import process from 'process';
import { LRUCache } from 'lru-cache';
import { signalHandler } from './signalHandler.js';
import { restartManager } from './restartManager.js';

const PERFORMANCE_CONFIG = {
  CACHE_SYNC_INTERVAL: 5000,
  BATCH_SIZE: 100,
  CACHE_SIZES: {
    whitelist: { max: 1000, ttl: 300000 },
    groupData: { max: 500, ttl: 60000 },
    userStats: 10000,
    groupStats: 5000,
    commandStats: 2000
  },
  MEMORY_CHECK_INTERVAL: 30000,
  MEMORY_THRESHOLD: 0.8,
  HIGH_MEMORY_LIMIT: 3000,
  ALIVE_CHECK_INTERVAL: 30000,
  COOLDOWN_RESET: 60000
};

class UnifiedCacheManager {
  constructor() {
    this.whitelistCache = new LRUCache(PERFORMANCE_CONFIG.CACHE_SIZES.whitelist);
    this.groupDataCache = new LRUCache(PERFORMANCE_CONFIG.CACHE_SIZES.groupData);
    this.userStatsCache = new Map();
    this.groupStatsCache = new Map();
    this.commandStatsCache = new Map();
    this.globalStatsCache = {
      totalHits: 0,
      lastSync: Date.now()
    };
    this.lastSyncTime = Date.now();
    this.syncInProgress = false;
    this.syncTimer = null;
    this.startSyncTimer();
  }
  updateUserStats(userId, updates) {
    if (!this.userStatsCache.has(userId)) {
      this.userStatsCache.set(userId, {
        userCount: 0,
        commandStats: {},
        limit: { current: 0 },
        limitgame: { current: 0 },
        lastUpdated: Date.now()
      });
    }
    const stats = this.userStatsCache.get(userId);
    if (updates.$inc) {
      Object.entries(updates.$inc).forEach(([key, value]) => {
        if (key === 'userCount') {
          stats.userCount += value;
        } else if (key === 'limit.current') {
          stats.limit.current += value;
        } else if (key === 'limitgame.current') {
          stats.limitgame.current += value;
        } else if (key.startsWith('commandStats.')) {
          const commandName = key.replace('commandStats.', '');
          stats.commandStats[commandName] = (stats.commandStats[commandName] || 0) + value;
        }
      });
    }
    stats.lastUpdated = Date.now();
  }
  updateGroupStats(groupId, updates) {
    if (!this.groupStatsCache.has(groupId)) {
      this.groupStatsCache.set(groupId, {
        messageCount: 0,
        commandCount: 0,
        lastUpdated: Date.now()
      });
    }
    const stats = this.groupStatsCache.get(groupId);
    if (updates.$inc) {
      if (updates.$inc.messageCount) stats.messageCount += updates.$inc.messageCount;
      if (updates.$inc.commandCount) stats.commandCount += updates.$inc.commandCount;
    }
    stats.lastUpdated = Date.now();
  }
  updateCommandStats(commandName, increment = 1) {
    if (!this.commandStatsCache.has(commandName)) {
      this.commandStatsCache.set(commandName, { count: 0, lastUpdated: Date.now() });
    }
    const stats = this.commandStatsCache.get(commandName);
    stats.count += increment;
    stats.lastUpdated = Date.now();
  }
  incrementGlobalStats() {
    this.globalStatsCache.totalHits++;
  }
  async warmWhitelistCache(groupId) {
    if (!this.whitelistCache.has(groupId)) {
      try {
        const { Whitelist } = await import('../../database/index.js');
        const isWhitelisted = await Whitelist.isWhitelisted(groupId, 'group');
        this.whitelistCache.set(groupId, isWhitelisted);
        return isWhitelisted;
      } catch (error) {
        console.error(`Error warming whitelist cache for ${groupId}:`, error);
        return false;
      }
    }
    return this.whitelistCache.get(groupId);
  }
  async warmGroupDataCache(groupId) {
    if (!this.groupDataCache.has(groupId)) {
      try {
        const { Group } = await import('../../database/index.js');
        const data = await Group.findOne({ groupId });
        this.groupDataCache.set(groupId, data);
        return data;
      } catch (error) {
        console.error(`Error warming group data cache for ${groupId}:`, error);
        return null;
      }
    }
    return this.groupDataCache.get(groupId);
  }
  async syncToDatabase() {
    if (this.syncInProgress) return;
    this.syncInProgress = true;
    try {
      await Promise.all([
        this.syncUserStats(),
        this.syncGroupStats(),
        this.syncCommandStats(),
        this.syncGlobalStats()
      ]);
      this.lastSyncTime = Date.now();
    } catch (error) {
      console.error('Error during cache sync:', error);
    } finally {
      this.syncInProgress = false;
    }
  }
  async syncUserStats() {
    if (this.userStatsCache.size === 0) return;
    const { User } = await import('../../database/index.js');
    const operations = [];
    const entries = Array.from(this.userStatsCache.entries()).slice(0, PERFORMANCE_CONFIG.BATCH_SIZE);
    for (const [userId, stats] of entries) {
      const updateDoc = { $inc: {} };
      if (stats.userCount > 0) updateDoc.$inc.userCount = stats.userCount;
      if (stats.limit.current !== 0) updateDoc.$inc['limit.current'] = stats.limit.current;
      if (stats.limitgame.current !== 0) updateDoc.$inc['limitgame.current'] = stats.limitgame.current;
      Object.entries(stats.commandStats).forEach(([cmd, count]) => {
        if (count > 0) updateDoc.$inc[`commandStats.${cmd}`] = count;
      });
      if (Object.keys(updateDoc.$inc).length > 0) {
        operations.push({
          updateOne: {
            filter: { userId },
            update: updateDoc,
            upsert: true
          }
        });
      }
      this.userStatsCache.delete(userId);
    }
    if (operations.length > 0) {
      await User.collection.bulkWrite(operations, { ordered: false });
    }
  }
  async syncGroupStats() {
    if (this.groupStatsCache.size === 0) return;
    const { Group } = await import('../../database/index.js');
    const operations = [];
    const entries = Array.from(this.groupStatsCache.entries()).slice(0, PERFORMANCE_CONFIG.BATCH_SIZE);
    for (const [groupId, stats] of entries) {
      const updateDoc = { $inc: {} };
      if (stats.messageCount > 0) updateDoc.$inc.messageCount = stats.messageCount;
      if (stats.commandCount > 0) updateDoc.$inc.commandCount = stats.commandCount;
      if (Object.keys(updateDoc.$inc).length > 0) {
        operations.push({
          updateOne: {
            filter: { groupId },
            update: updateDoc,
            upsert: true
          }
        });
      }
      this.groupStatsCache.delete(groupId);
    }
    if (operations.length > 0) {
      await Group.collection.bulkWrite(operations, { ordered: false });
    }
  }
  async syncCommandStats() {
    if (this.commandStatsCache.size === 0) return;
    const { Command } = await import('../../database/index.js');
    const operations = [];
    const entries = Array.from(this.commandStatsCache.entries()).slice(0, PERFORMANCE_CONFIG.BATCH_SIZE);
    for (const [commandName, stats] of entries) {
      if (stats.count > 0) {
        operations.push({
          updateOne: {
            filter: { name: commandName },
            update: { $inc: { count: stats.count } },
            upsert: true
          }
        });
      }
      this.commandStatsCache.delete(commandName);
    }
    if (operations.length > 0) {
      await Command.collection.bulkWrite(operations, { ordered: false });
    }
  }
  async syncGlobalStats() {
    if (this.globalStatsCache.totalHits > 0) {
      const { Settings } = await import('../../database/index.js');
      await Settings.collection.updateOne(
        {},
        { $inc: { totalHitCount: this.globalStatsCache.totalHits } },
        { upsert: true }
      );
      this.globalStatsCache.totalHits = 0;
    }
  }
  startSyncTimer() {
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.syncTimer = setInterval(() => {
      this.syncToDatabase().catch(console.error);
    }, PERFORMANCE_CONFIG.CACHE_SYNC_INTERVAL);
  }
  stopSyncTimer() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }
  checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);
    console.log(`Usage: ${heapUsedMB}MB/${heapTotalMB}MB | ${rssMB}MB | U:${this.userStatsCache.size} G:${this.groupStatsCache.size} C:${this.commandStatsCache.size}`);
    if (heapUsedMB > heapTotalMB * PERFORMANCE_CONFIG.MEMORY_THRESHOLD) {
      this.whitelistCache.clear();
      this.groupDataCache.clear();
      if (global.gc) {
        global.gc();
        console.log('Garbage collection triggered');
      }
    }
    return { heapUsedMB, heapTotalMB, rssMB };
  }
  getStats() {
    return {
      userStats: { size: this.userStatsCache.size },
      groupStats: { size: this.groupStatsCache.size },
      commandStats: { size: this.commandStatsCache.size },
      globalStats: {
        pendingHits: this.globalStatsCache.totalHits,
        lastSync: new Date(this.globalStatsCache.lastSync).toISOString()
      },
      whitelist: {
        size: this.whitelistCache.size,
        hitRate: this.whitelistCache.calculatedSize
      },
      groupData: {
        size: this.groupDataCache.size,
        hitRate: this.groupDataCache.calculatedSize
      },
      performance: {
        lastSync: new Date(this.lastSyncTime).toISOString(),
        syncInProgress: this.syncInProgress
      }
    };
  }
  async forceSync() {
    console.log('Force syncing all caches...');
    await this.syncToDatabase();
  }
  async clearAllCaches() {
    console.log('Clearing all caches...');
    await this.syncToDatabase();
    this.userStatsCache.clear();
    this.groupStatsCache.clear();
    this.commandStatsCache.clear();
    this.globalStatsCache.totalHits = 0;
    this.whitelistCache.clear();
    this.groupDataCache.clear();
  }
  async shutdown() {
    console.log('Cache manager shutting down...');
    this.stopSyncTimer();
    await this.syncToDatabase();
  }
}

class UnifiedJobScheduler {
  constructor(cacheManager) {
    this.cacheManager = cacheManager;
    this.intervals = new Map();
    this.cronJobs = new Map();
    this.restarting = false;
  }
  addInterval(name, callback, interval) {
    if (this.intervals.has(name)) {
      clearInterval(this.intervals.get(name));
    }
    const intervalId = setInterval(callback, interval);
    this.intervals.set(name, intervalId);
    return intervalId;
  }
  removeInterval(name) {
    if (this.intervals.has(name)) {
      clearInterval(this.intervals.get(name));
      this.intervals.delete(name);
      return true;
    }
    return false;
  }
  addCronJob(name, schedule, task, options = {}) {
    if (this.cronJobs.has(name)) {
      this.cronJobs.get(name).stop();
    }
    const job = cron.schedule(schedule, task, {
      scheduled: true,
      timezone: 'Asia/Jakarta',
      ...options
    });
    this.cronJobs.set(name, job);
    return job;
  }
  removeCronJob(name) {
    if (this.cronJobs.has(name)) {
      this.cronJobs.get(name).stop();
      this.cronJobs.delete(name);
      return true;
    }
    return false;
  }
  setupStandardJobs(fn, config, dbSettings) {
    this.addInterval('gameCleanup', async () => {
      const { gameStateManager } = await import('./gameManager.js');
      gameStateManager.cleanupStaleGames();
    }, PERFORMANCE_CONFIG.COOLDOWN_RESET);
    this.addInterval('memoryMonitor', () => {
      const stats = this.cacheManager.checkMemoryUsage();
      if (stats.rssMB > PERFORMANCE_CONFIG.HIGH_MEMORY_LIMIT && !this.restarting) {
        console.log(`High RSS memory usage (${stats.rssMB}MB) detected, restarting...`);
        this.restarting = true;
        restartManager.restart('Memory overload', {
          cache: this.cacheManager
        }).catch(console.error);
      }
    }, PERFORMANCE_CONFIG.MEMORY_CHECK_INTERVAL);
    this.addInterval('aliveCheck', async () => {
      try {
        await fn.query({
          tag: 'iq',
          attrs: { to: 's.whatsapp.net', type: 'get', xmlns: 'w:p' }
        });
      } catch {
        if (!this.restarting) {
          console.log('Socket disconnected, attempting restart...');
          this.restarting = true;
          await restartManager.restart('Socket disconnected', {
            cache: this.cacheManager
          });
        }
      }
    }, PERFORMANCE_CONFIG.ALIVE_CHECK_INTERVAL);
    this.addCronJob('dailyReset', '0 0 21 * * *', async () => {
      await this.performDailyReset(config, dbSettings);
    });
    this.addCronJob('weeklyCleanup', '0 21 * * 2', async () => {
      await this.performWeeklyCleanup();
    });
    console.log('Standard jobs setup completed');
  }
  async performDailyReset(config, dbSettings) {
    console.log('Starting daily reset...');
    await this.cacheManager.forceSync();
    try {
      const { User, tmpDir } = await import('../../database/index.js');
      const batchSize = PERFORMANCE_CONFIG.BATCH_SIZE;
      let processed = 0;
      while (true) {
        const users = await User.find({}).skip(processed).limit(batchSize);
        if (users.length === 0) break;
        const bulkOps = users.map(user => ({
          updateOne: {
            filter: { _id: user._id },
            update: {
              $set: {
                'limit.current': this.calculateLimit(config, dbSettings, user),
                'limit.warnedLimit': false,
                'limitgame.current': this.calculateGameLimit(config, dbSettings, user),
                'limitgame.warnedLimit': false,
                gacha: true
              }
            }
          }
        }));
        await User.bulkWrite(bulkOps);
        processed += users.length;
      }
      if (tmpDir && typeof tmpDir.cleanupOldFiles === 'function') {
        await tmpDir.cleanupOldFiles();
      }
      console.log(`Daily reset completed. Total users: ${processed}`);
    } catch (error) {
      console.error('Daily reset failed:', error);
    }
  }
  async performWeeklyCleanup() {
    console.log('Starting weekly cleanup...');
    try {
      const { StoreMessages, StoreStory } = await import('../../database/index.js');
      const { exec } = await import('child_process');
      const util = await import('util');
      const execAsync = util.promisify(exec);
      const chatResult = await StoreMessages.cleanupOldData();
      const storyResult = await StoreStory.cleanupOldData();
      try {
        await execAsync('rm -rf ../logs/*');
      } catch (logError) {
        console.error('Log cleanup error:', logError);
      }
      console.log(`Weekly cleanup completed | Messages: ${chatResult.deletedCount}, Story: ${storyResult.deletedCount}`);
    } catch (error) {
      console.error('Weekly cleanup failed:', error);
    }
  }
  calculateLimit(config, dbSettings, user) {
    const isSadmin = config.ownerNumber.includes(user.userId);
    return user.isVIP || user.isMaster || isSadmin ? Infinity : user.isPremium ? dbSettings.limitCountPrem : dbSettings.limitCount;
  }
  calculateGameLimit(config, dbSettings, user) {
    const isSadmin = config.ownerNumber.includes(user.userId);
    return user.isVIP || user.isMaster || isSadmin ? Infinity : user.isPremium ? dbSettings.limitCountPrem : dbSettings.limitGame;
  }
  async shutdown() {
    console.log('Job scheduler shutting down...');
    for (const [name, intervalId] of this.intervals) {
      clearInterval(intervalId);
      console.log(`Cleared interval: ${name}`);
    }
    this.intervals.clear();
    for (const [name, job] of this.cronJobs) {
      job.stop();
      console.log(`Stopped cron job: ${name}`);
    }
    this.cronJobs.clear();
    console.log('Job scheduler shutdown completed');
  }
  getStatus() {
    return {
      intervals: Array.from(this.intervals.keys()),
      cronJobs: Array.from(this.cronJobs.keys()),
      restarting: this.restarting
    };
  }
}

class UnifiedPerformanceManager {
  constructor() {
    this.cacheManager = new UnifiedCacheManager();
    this.jobScheduler = new UnifiedJobScheduler(this.cacheManager);
    this.initialized = false;
  }
  async initialize(fn, config, dbSettings) {
    if (this.initialized) return;
    this.jobScheduler.setupStandardJobs(fn, config, dbSettings);
    this.setupGracefulShutdown();
    this.initialized = true;
  }
  setupGracefulShutdown() {
    signalHandler.register('performance-manager', async (signal) => {
      console.log(`${signal}: Performance manager cleanup...`);
      await this.jobScheduler.shutdown();
      await this.cacheManager.shutdown();
    }, 60);
  }
  get cache() {
    return this.cacheManager;
  }
  get scheduler() {
    return this.jobScheduler;
  }
  getFullStatus() {
    return {
      cache: this.cacheManager.getStats(),
      scheduler: this.jobScheduler.getStatus(),
      performance: {
        config: PERFORMANCE_CONFIG,
        initialized: this.initialized,
        uptime: process.uptime()
      }
    };
  }
}

export const performanceManager = new UnifiedPerformanceManager();
export default performanceManager;