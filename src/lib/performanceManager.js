// ─── Info ────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info src/lib/performanceManager.js ──────────

import cron from 'node-cron';
import process from 'process';
import log from './logger.js';
import { LRUCache } from 'lru-cache';
import { redis } from '../../database/index.js';
import { signalHandler } from './signalHandler.js';
import { restartManager } from './restartManager.js';

const PERFORMANCE_CONFIG = {
  CACHE_SYNC_INTERVAL: 5000,
  BATCH_SIZE: 100,
  CACHE_SIZES: {
    whitelist: { max: 1000, ttl: 300000 },
    groupData: { max: 500, ttl: 60000 },
  },
  MEMORY_CHECK_INTERVAL: 600000,
  MEMORY_THRESHOLD: 0.8,
  HIGH_MEMORY_LIMIT: 3000,
  ALIVE_CHECK_INTERVAL: 30000,
  COOLDOWN_RESET: 60000
};

class UnifiedCacheManager {
  constructor() {
    this.whitelistCache = new LRUCache(PERFORMANCE_CONFIG.CACHE_SIZES.whitelist);
    this.groupDataCache = new LRUCache(PERFORMANCE_CONFIG.CACHE_SIZES.groupData);
    this.globalStatsCache = {
      totalHits: 0,
      lastSync: Date.now()
    };
    this.memorySettings = {
      checkInterval: PERFORMANCE_CONFIG.MEMORY_CHECK_INTERVAL,
      rssThreshold: PERFORMANCE_CONFIG.HIGH_MEMORY_LIMIT,
      warningThreshold: PERFORMANCE_CONFIG.MEMORY_THRESHOLD,
      consecutiveWarningsBeforeRestart: 3,
      enableAutoRestart: true
    };
    this.memoryStats = {
      warnings: 0,
      lastCheck: Date.now(),
      lastUsage: { rss: 0, heapUsed: 0, heapTotal: 0 }
    };
    this.lastSyncTime = Date.now();
    this.syncInProgress = false;
    this.syncTimer = null;
    this.memoryMonitorInterval = null;
    this.startSyncTimer();
  }
  async updateUserStats(userId, updates) {
    try {
      const key = `stats:user:${userId}`;
      const pipeline = redis.pipeline();
      if (updates.$inc) {
        Object.entries(updates.$inc).forEach(([field, value]) => {
          pipeline.hincrby(key, field, value);
        });
      }
      pipeline.hset(key, 'lastUpdated', Date.now());
      await pipeline.exec();
    } catch (error) {
      console.error(`Error updating user stats for ${userId}:`, error);
    }
  }
  async updateGroupStats(groupId, updates) {
    try {
      const key = `stats:group:${groupId}`;
      const pipeline = redis.pipeline();
      if (updates.$inc) {
        if (updates.$inc.messageCount) {
          pipeline.hincrby(key, 'messageCount', updates.$inc.messageCount);
        }
        if (updates.$inc.commandCount) {
          pipeline.hincrby(key, 'commandCount', updates.$inc.commandCount);
        }
      }
      pipeline.hset(key, 'lastUpdated', Date.now());
      await pipeline.exec();
    } catch (error) {
      console.error(`Error updating group stats for ${groupId}:`, error);
    }
  }
  async updateCommandStats(commandName, increment = 1) {
    try {
      const key = `stats:command:${commandName}`;
      const pipeline = redis.pipeline();
      pipeline.hincrby(key, 'count', increment);
      pipeline.hset(key, 'lastUpdated', Date.now());
      await pipeline.exec();
    } catch (error) {
      console.error(`Error updating command stats for ${commandName}:`, error);
    }
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
    try {
      const stream = redis.scanStream({ match: 'stats:user:*', count: 100 });
      const keysToSync = [];
      stream.on('data', (keys) => {
        keys.forEach(k => keysToSync.push(k));
      });
      await new Promise((resolve, reject) => {
        stream.on('end', async () => {
          try {
            if (keysToSync.length === 0) {
              resolve();
              return;
            }
            const { User } = await import('../../database/index.js');
            const operations = [];
            for (const key of keysToSync) {
              const stats = await redis.hgetall(key);
              const userId = key.split(':')[2];
              const updateDoc = { $inc: {} };
              Object.entries(stats).forEach(([field, value]) => {
                if (field !== 'lastUpdated' && parseInt(value) !== 0) {
                  updateDoc.$inc[field] = parseInt(value);
                }
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
            }
            if (operations.length > 0) {
              await User.collection.bulkWrite(operations, { ordered: false });
              await redis.del(keysToSync);
            }
            resolve();
          } catch (error) {
            reject(error);
          }
        });
        stream.on('error', reject);
      });
    } catch (error) {
      console.error('Error syncing user stats:', error);
    }
  }
  async syncGroupStats() {
    try {
      const stream = redis.scanStream({ match: 'stats:group:*', count: 100 });
      const keysToSync = [];
      stream.on('data', (keys) => {
        keys.forEach(k => keysToSync.push(k));
      });
      await new Promise((resolve, reject) => {
        stream.on('end', async () => {
          try {
            if (keysToSync.length === 0) {
              resolve();
              return;
            }
            const { Group } = await import('../../database/index.js');
            const operations = [];
            for (const key of keysToSync) {
              const stats = await redis.hgetall(key);
              const groupId = key.split(':')[2];
              const updateDoc = { $inc: {} };
              if (stats.messageCount) {
                updateDoc.$inc.messageCount = parseInt(stats.messageCount);
              }
              if (stats.commandCount) {
                updateDoc.$inc.commandCount = parseInt(stats.commandCount);
              }
              if (Object.keys(updateDoc.$inc).length > 0) {
                operations.push({
                  updateOne: {
                    filter: { groupId },
                    update: updateDoc,
                    upsert: true
                  }
                });
              }
            }
            if (operations.length > 0) {
              await Group.collection.bulkWrite(operations, { ordered: false });
              await redis.del(keysToSync);
            }
            resolve();
          } catch (error) {
            reject(error);
          }
        });
        stream.on('error', reject);
      });
    } catch (error) {
      console.error('Error syncing group stats:', error);
    }
  }
  async syncCommandStats() {
    try {
      const stream = redis.scanStream({ match: 'stats:command:*', count: 100 });
      const keysToSync = [];
      stream.on('data', (keys) => {
        keys.forEach(k => keysToSync.push(k));
      });
      await new Promise((resolve, reject) => {
        stream.on('end', async () => {
          try {
            if (keysToSync.length === 0) {
              resolve();
              return;
            }
            const { Command } = await import('../../database/index.js');
            const operations = [];
            for (const key of keysToSync) {
              const stats = await redis.hgetall(key);
              const commandName = key.split(':')[2];
              if (stats.count && parseInt(stats.count) > 0) {
                operations.push({
                  updateOne: {
                    filter: { name: commandName },
                    update: { $inc: { count: parseInt(stats.count) } },
                    upsert: true
                  }
                });
              }
            }
            if (operations.length > 0) {
              await Command.collection.bulkWrite(operations, { ordered: false });
              await redis.del(keysToSync);
            }
            resolve();
          } catch (error) {
            reject(error);
          }
        });
        stream.on('error', reject);
      });
    } catch (error) {
      console.error('Error syncing command stats:', error);
    }
  }
  async syncGlobalStats() {
    try {
      if (this.globalStatsCache.totalHits > 0) {
        const { Settings } = await import('../../database/index.js');
        await Settings.collection.updateOne(
          {},
          { $inc: { totalHitCount: this.globalStatsCache.totalHits } },
          { upsert: true }
        );
        this.globalStatsCache.totalHits = 0;
      }
    } catch (error) {
      console.error('Error syncing global stats:', error);
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
  startMemoryMonitoring() {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
    }

    this.memoryMonitorInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, this.memorySettings.checkInterval);

    log(`Memory monitoring started: Check interval: ${this.memorySettings.checkInterval / 1000}s, RSS threshold: ${this.memorySettings.rssThreshold}MB`);
  }
  stopMemoryMonitoring() {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
      this.memoryMonitorInterval = null;
      log('Memory monitoring stopped');
    }
  }
  checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const rssInMB = Math.round(memUsage.rss / 1024 / 1024);
    const heapUsedInMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalInMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    this.memoryStats.lastCheck = Date.now();
    this.memoryStats.lastUsage = {
      rss: rssInMB,
      heapUsed: heapUsedInMB,
      heapTotal: heapTotalInMB
    };
    log(`Memory usage: RSS: ${rssInMB}MB | Heap: ${heapUsedInMB}MB/${heapTotalInMB}MB`);
    const rssRatio = rssInMB / this.memorySettings.rssThreshold;
    if (rssRatio >= this.memorySettings.warningThreshold) {
      this.memoryStats.warnings++;
      log(`Memory warning #${this.memoryStats.warnings}: RSS at ${Math.round(rssRatio * 100)}% threshold (${rssInMB}MB / ${this.memorySettings.rssThreshold}MB)`, true);
      if (global.gc) {
        log('Forcing garbage collection');
        global.gc();
      }
      if (this.memorySettings.enableAutoRestart &&
        this.memoryStats.warnings >= this.memorySettings.consecutiveWarningsBeforeRestart) {
        log(`${this.memoryStats.warnings} consecutive memory warnings, initiating restart`, true);
        this.restartDueToMemory('Consecutive memory warnings');
        return { rssMB: rssInMB, heapUsedMB: heapUsedInMB, heapTotalMB: heapTotalInMB };
      }
    } else {
      if (this.memoryStats.warnings > 0) {
        log('Memory usage returned to normal levels');
        this.memoryStats.warnings = 0;
      }
    }
    if (this.memorySettings.enableAutoRestart && rssInMB >= this.memorySettings.rssThreshold) {
      log(`RSS threshold exceeded: ${rssInMB}MB >= ${this.memorySettings.rssThreshold}MB`, true);
      this.restartDueToMemory('RSS threshold exceeded');
    }
    return {
      rssMB: rssInMB,
      heapUsedMB: heapUsedInMB,
      heapTotalMB: heapTotalInMB
    };
  }
  updateMemorySettings(newSettings) {
    let restart = false;
    if (newSettings.checkInterval && newSettings.checkInterval !== this.memorySettings.checkInterval) {
      this.memorySettings.checkInterval = newSettings.checkInterval;
      restart = true;
    }
    if (newSettings.rssThreshold) this.memorySettings.rssThreshold = newSettings.rssThreshold;
    if (newSettings.warningThreshold) this.memorySettings.warningThreshold = newSettings.warningThreshold;
    if (newSettings.consecutiveWarningsBeforeRestart) this.memorySettings.consecutiveWarningsBeforeRestart = newSettings.consecutiveWarningsBeforeRestart;
    if (typeof newSettings.enableAutoRestart !== 'undefined') this.memorySettings.enableAutoRestart = newSettings.enableAutoRestart;
    if (restart && this.memoryMonitorInterval) {
      this.startMemoryMonitoring();
    }
    log(`Memory monitor settings updated: RSS threshold: ${this.memorySettings.rssThreshold}MB, Check interval: ${this.memorySettings.checkInterval / 1000}s`);
    return this.getMemorySettings();
  }
  getMemorySettings() {
    return {
      ...this.memorySettings,
      currentStats: this.memoryStats,
      isMonitoring: !!this.memoryMonitorInterval
    };
  }
  async restartDueToMemory(reason) {
    this.stopMemoryMonitoring();
    await restartManager.restart(`Memory monitor: ${reason}`);
  }
  async getStats() {
    try {
      const counts = {
        users: 0,
        groups: 0,
        commands: 0
      };
      const stream = redis.scanStream({ match: 'stats:*', count: 100 });
      stream.on('data', (keys) => {
        keys.forEach(key => {
          if (key.startsWith('stats:user:')) counts.users++;
          else if (key.startsWith('stats:group:')) counts.groups++;
          else if (key.startsWith('stats:command:')) counts.commands++;
        });
      });
      await new Promise((resolve, reject) => {
        stream.on('end', resolve);
        stream.on('error', reject);
      });
      return {
        redisCacheStats: counts,
        globalStats: {
          pendingHits: this.globalStatsCache.totalHits,
          lastSync: new Date(this.globalStatsCache.lastSync).toISOString()
        },
        whitelist: {
          size: this.whitelistCache.size
        },
        groupData: {
          size: this.groupDataCache.size
        },
        performance: {
          lastSync: new Date(this.lastSyncTime).toISOString(),
          syncInProgress: this.syncInProgress
        }
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        redisCacheStats: { users: 0, groups: 0, commands: 0 },
        globalStats: {
          pendingHits: this.globalStatsCache.totalHits,
          lastSync: new Date(this.globalStatsCache.lastSync).toISOString()
        },
        whitelist: { size: this.whitelistCache.size },
        groupData: { size: this.groupDataCache.size },
        performance: {
          lastSync: new Date(this.lastSyncTime).toISOString(),
          syncInProgress: this.syncInProgress
        }
      };
    }
  }
  async forceSync() {
    console.log('Force syncing all caches...');
    await this.syncToDatabase();
  }
  async clearAllCaches() {
    console.log('Clearing all caches...');
    await this.forceSync();
    try {
      const patterns = ['stats:user:*', 'stats:group:*', 'stats:command:*'];
      for (const pattern of patterns) {
        const stream = redis.scanStream({ match: pattern, count: 100 });
        const keysToDelete = [];
        stream.on('data', (keys) => {
          keysToDelete.push(...keys);
        });
        await new Promise((resolve, reject) => {
          stream.on('end', async () => {
            try {
              if (keysToDelete.length > 0) {
                await redis.del(keysToDelete);
              }
              resolve();
            } catch (error) {
              reject(error);
            }
          });
          stream.on('error', reject);
        });
      }
      this.globalStatsCache.totalHits = 0;
      this.whitelistCache.clear();
      this.groupDataCache.clear();
      console.log('All caches cleared.');
    } catch (error) {
      console.error('Error clearing caches:', error);
    }
  }
  async shutdown() {
    console.log('Cache manager shutting down...');
    this.stopSyncTimer();
    this.stopMemoryMonitoring();
    await this.syncToDatabase();
  }
};
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
};
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
    this.cacheManager.startMemoryMonitoring();
    this.initialized = true;
  }
  setupGracefulShutdown() {
    signalHandler.register('performance-manager', async (signal) => {
      log(`${signal}: Performance manager cleanup...`);
      await this.jobScheduler.shutdown();
      await this.cacheManager.shutdown();
    }, 60);
  }
  getMemorySettings() {
    return this.cacheManager.getMemorySettings();
  }
  updateMemorySettings(newSettings) {
    return this.cacheManager.updateMemorySettings(newSettings);
  }
  startMemoryMonitoring() {
    return this.cacheManager.startMemoryMonitoring();
  }
  stopMemoryMonitoring() {
    return this.cacheManager.stopMemoryMonitoring();
  }
  get cache() {
    return this.cacheManager;
  }
  get scheduler() {
    return this.jobScheduler;
  }
  async getFullStatus() {
    return {
      cache: await this.cacheManager.getStats(),
      scheduler: this.jobScheduler.getStatus(),
      memory: this.cacheManager.getMemorySettings(),
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