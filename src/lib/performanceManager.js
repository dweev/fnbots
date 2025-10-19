// ─── Info ────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info src/lib/performanceManager.js ──────────

import process from 'process';
import log from './logger.js';
import { LRUCache } from 'lru-cache';
import { schedule } from '../addon/bridge.js';
import { redis } from '../../database/index.js';
import { signalHandler } from './signalHandler.js';
import { restartManager } from './restartManager.js';
import { Mutex } from 'async-mutex';

// eslint-disable-next-line import/no-unresolved
import PQueue from 'p-queue';

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
  GAME_CLEANUP_INTERVAL: 60000,
  COOLDOWN_RESET: 60000
};

const REDIS_KEYS = {
  MEMORY_SETTINGS: 'system:memory:settings'
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
    this.syncMutex = new Mutex();
    this.syncQueue = new PQueue({ concurrency: 1 });
    this.syncJob = null;

    this.validateMemorySettings();
  }

  validateMemorySettings() {
    if (this.memorySettings.checkInterval < 10000) {
      log('Invalid checkInterval, using default', true);
      this.memorySettings.checkInterval = PERFORMANCE_CONFIG.MEMORY_CHECK_INTERVAL;
    }
    if (this.memorySettings.rssThreshold < 500) {
      log('Invalid rssThreshold, using default', true);
      this.memorySettings.rssThreshold = PERFORMANCE_CONFIG.HIGH_MEMORY_LIMIT;
    }
    if (this.memorySettings.warningThreshold < 0.1 || this.memorySettings.warningThreshold > 1) {
      log('Invalid warningThreshold, using default', true);
      this.memorySettings.warningThreshold = PERFORMANCE_CONFIG.MEMORY_THRESHOLD;
    }
    if (this.memorySettings.consecutiveWarningsBeforeRestart < 1) {
      log('Invalid consecutiveWarningsBeforeRestart, using default', true);
      this.memorySettings.consecutiveWarningsBeforeRestart = 3;
    }
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
      log(`Error updating user stats for ${userId}:\n${error}`, true);
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
      log(`Error updating group stats for ${groupId}:\n${error}`, true);
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
      log(`Error updating command stats for ${commandName}:\n${error}`, true);
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
        log(`Error warming whitelist cache for ${groupId}:\n${error}`, true);
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
        log(`Error warming group data cache for ${groupId}:\n${error}`, true);
        return null;
      }
    }
    return this.groupDataCache.get(groupId);
  }

  async syncToDatabase() {
    return this.syncQueue.add(async () => {
      const release = await this.syncMutex.acquire();

      try {
        await Promise.all([
          this.syncUserStats(),
          this.syncGroupStats(),
          this.syncCommandStats(),
          this.syncGlobalStats()
        ]);
        this.lastSyncTime = Date.now();
      } catch (error) {
        log(`Error during cache sync: ${error}`, true);
        throw error;
      } finally {
        release();
      }
    });
  }

  async syncUserStats() {
    const stream = redis.scanStream({ match: 'stats:user:*', count: 100 });
    const keysToSync = [];

    try {
      await new Promise((resolve, reject) => {
        const onData = (keys) => {
          keys.forEach(k => keysToSync.push(k));
        };

        const onEnd = async () => {
          cleanup();

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
        };

        const onError = (error) => {
          cleanup();
          stream.destroy();
          reject(error);
        };

        const cleanup = () => {
          stream.removeListener('data', onData);
          stream.removeListener('end', onEnd);
          stream.removeListener('error', onError);
        };

        stream.on('data', onData);
        stream.on('end', onEnd);
        stream.on('error', onError);
      });
    } catch (error) {
      if (!stream.destroyed) {
        stream.destroy();
      }
      log(`Error syncing user stats: ${error}`, true);
      throw error;
    }
  }

  async syncGroupStats() {
    const stream = redis.scanStream({ match: 'stats:group:*', count: 100 });
    const keysToSync = [];

    try {
      await new Promise((resolve, reject) => {
        const onData = (keys) => {
          keys.forEach(k => keysToSync.push(k));
        };

        const onEnd = async () => {
          cleanup();

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
        };

        const onError = (error) => {
          cleanup();
          stream.destroy();
          reject(error);
        };

        const cleanup = () => {
          stream.removeListener('data', onData);
          stream.removeListener('end', onEnd);
          stream.removeListener('error', onError);
        };

        stream.on('data', onData);
        stream.on('end', onEnd);
        stream.on('error', onError);
      });
    } catch (error) {
      if (!stream.destroyed) {
        stream.destroy();
      }
      log(`Error syncing group stats: ${error}`, true);
      throw error;
    }
  }

  async syncCommandStats() {
    const stream = redis.scanStream({ match: 'stats:command:*', count: 100 });
    const keysToSync = [];

    try {
      await new Promise((resolve, reject) => {
        const onData = (keys) => {
          keys.forEach(k => keysToSync.push(k));
        };

        const onEnd = async () => {
          cleanup();

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
        };

        const onError = (error) => {
          cleanup();
          stream.destroy();
          reject(error);
        };

        const cleanup = () => {
          stream.removeListener('data', onData);
          stream.removeListener('end', onEnd);
          stream.removeListener('error', onError);
        };

        stream.on('data', onData);
        stream.on('end', onEnd);
        stream.on('error', onError);
      });
    } catch (error) {
      if (!stream.destroyed) {
        stream.destroy();
      }
      log(`Error syncing command stats: ${error}`, true);
      throw error;
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
      log(`Error syncing global stats: ${error}`, true);
      throw error;
    }
  }

  startSyncTimer() {
    if (this.syncJob) {
      this.syncJob.stop();
    }
    this.syncJob = schedule('cache-sync', () => {
      this.syncToDatabase().catch(console.error);
    }, {
      intervalSeconds: Math.floor(PERFORMANCE_CONFIG.CACHE_SYNC_INTERVAL / 1000),
      concurrency: 'skip'
    });
    log('Cache sync timer started (native cron, every 5s)');
  }

  stopSyncTimer() {
    if (this.syncJob) {
      this.syncJob.stop();
      this.syncJob = null;
      log('Cache sync timer stopped');
    }
  }

  startMemoryMonitoring() {
    if (this.memoryMonitorJob) {
      this.memoryMonitorJob.stop();
    }
    this.memoryMonitorJob = schedule('memory-monitor', () => {
      this.checkMemoryUsage();
    }, {
      intervalSeconds: Math.floor(this.memorySettings.checkInterval / 1000),
      concurrency: 'skip'
    });
    log(`Memory monitoring started: Check every ${this.memorySettings.checkInterval / 1000}s, RSS threshold: ${this.memorySettings.rssThreshold}MB`);
  }

  stopMemoryMonitoring() {
    if (this.memoryMonitorJob) {
      this.memoryMonitorJob.stop();
      this.memoryMonitorJob = null;
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

  async updateMemorySettings(newSettings) {
    let restart = false;

    if (newSettings.checkInterval && newSettings.checkInterval !== this.memorySettings.checkInterval) {
      this.memorySettings.checkInterval = newSettings.checkInterval;
      restart = true;
    }
    if (newSettings.rssThreshold) this.memorySettings.rssThreshold = newSettings.rssThreshold;
    if (newSettings.warningThreshold) this.memorySettings.warningThreshold = newSettings.warningThreshold;
    if (newSettings.consecutiveWarningsBeforeRestart) this.memorySettings.consecutiveWarningsBeforeRestart = newSettings.consecutiveWarningsBeforeRestart;
    if (typeof newSettings.enableAutoRestart !== 'undefined') this.memorySettings.enableAutoRestart = newSettings.enableAutoRestart;

    try {
      await redis.set(
        REDIS_KEYS.MEMORY_SETTINGS,
        JSON.stringify(this.memorySettings)
      );
      log('Memory settings persisted to Redis');
    } catch {
      log('Failed to persist memory settings to Redis', true);
    }

    if (restart && this.memoryMonitorJob) {
      this.startMemoryMonitoring();
    }

    log(`Memory monitor settings updated: RSS threshold: ${this.memorySettings.rssThreshold}MB, Check interval: ${this.memorySettings.checkInterval / 1000}s`);
    return this.getMemorySettings();
  }

  async loadMemorySettings() {
    try {
      const saved = await redis.get(REDIS_KEYS.MEMORY_SETTINGS);

      if (saved) {
        const parsed = JSON.parse(saved);
        this.memorySettings = {
          ...this.memorySettings,
          ...parsed
        };
        log('Memory settings loaded from Redis');
      } else {
        log('No saved settings found, initializing with defaults');
        await redis.set(
          REDIS_KEYS.MEMORY_SETTINGS,
          JSON.stringify(this.memorySettings)
        );
        log('Default memory settings saved to Redis');
      }
    } catch (error) {
      log(`Failed to load/save memory settings: ${error}`, true);
    }
  }

  getMemorySettings() {
    return {
      ...this.memorySettings,
      currentStats: this.memoryStats,
      isMonitoring: !!this.memoryMonitorJob
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

      await new Promise((resolve, reject) => {
        const onData = (keys) => {
          keys.forEach(key => {
            if (key.startsWith('stats:user:')) counts.users++;
            else if (key.startsWith('stats:group:')) counts.groups++;
            else if (key.startsWith('stats:command:')) counts.commands++;
          });
        };

        const onEnd = () => {
          cleanup();
          resolve();
        };

        const onError = (error) => {
          cleanup();
          stream.destroy();
          reject(error);
        };

        const cleanup = () => {
          stream.removeListener('data', onData);
          stream.removeListener('end', onEnd);
          stream.removeListener('error', onError);
        };

        stream.on('data', onData);
        stream.on('end', onEnd);
        stream.on('error', onError);
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
          queueSize: this.syncQueue.size,
          queuePending: this.syncQueue.pending
        }
      };
    } catch (error) {
      log(`Error getting stats: ${error}`, true);
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
          queueSize: this.syncQueue.size,
          queuePending: this.syncQueue.pending
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

        await new Promise((resolve, reject) => {
          const onData = (keys) => {
            keysToDelete.push(...keys);
          };

          const onEnd = async () => {
            cleanup();

            try {
              if (keysToDelete.length > 0) {
                await redis.del(keysToDelete);
              }
              resolve();
            } catch (error) {
              reject(error);
            }
          };

          const onError = (error) => {
            cleanup();
            stream.destroy();
            reject(error);
          };

          const cleanup = () => {
            stream.removeListener('data', onData);
            stream.removeListener('end', onEnd);
            stream.removeListener('error', onError);
          };

          stream.on('data', onData);
          stream.on('end', onEnd);
          stream.on('error', onError);
        });
      }

      this.globalStatsCache.totalHits = 0;
      this.whitelistCache.clear();
      this.groupDataCache.clear();
      log('All caches cleared.');
    } catch (error) {
      log(`Error clearing caches: ${error}`, true);
    }
  }

  async shutdown() {
    console.log('Cache manager shutting down...');
    this.stopSyncTimer();
    this.stopMemoryMonitoring();
    await this.syncQueue.onIdle();
    await this.syncToDatabase();
  }
}

class UnifiedJobScheduler {
  constructor(cacheManager) {
    this.cacheManager = cacheManager;
    this.jobs = new Map();
    this.restarting = false;
  }

  addIntervalJob(name, callback, seconds, options = {}) {
    if (this.jobs.has(name)) {
      this.jobs.get(name).stop();
    }
    const job = schedule(name, callback, {
      intervalSeconds: seconds,
      concurrency: options.concurrency || 'skip',
      maxQueue: options.maxQueue || 10
    });
    this.jobs.set(name, job);
    log(`Interval job '${name}' started (every ${seconds}s, mode: ${options.concurrency || 'skip'})`);
    return job;
  }

  addCronJob(name, cronExpression, callback, options = {}) {
    if (this.jobs.has(name)) {
      this.jobs.get(name).stop();
    }
    const job = schedule(cronExpression, callback, {
      name,
      concurrency: options.concurrency || 'skip',
      maxQueue: options.maxQueue || 10
    });
    this.jobs.set(name, job);
    log(`Cron job '${name}' scheduled: ${cronExpression} (mode: ${options.concurrency || 'skip'})`);
    return job;
  }

  setupStandardJobs(fn, config, dbSettings) {
    this.addIntervalJob(
      'gameCleanup',
      async () => {
        try {
          const { gameStateManager } = await import('./gameManager.js');
          await gameStateManager.cleanupStaleGames();
        } catch (error) {
          log(`gameCleanup error: ${error.message}`, true);
        }
      },
      60,
      { concurrency: 'skip' }
    );

    this.addIntervalJob(
      'aliveCheck',
      async () => {
        try {
          await fn.query({
            tag: 'iq',
            attrs: { to: 's.whatsapp.net', type: 'get', xmlns: 'w:p' }
          });
        } catch {
          if (!this.restarting) {
            log('Socket disconnected, attempting restart', true);
            this.restarting = true;
            try {
              await restartManager.restart('Socket disconnected', {
                cache: this.cacheManager
              });
            } catch (restartError) {
              log(`Restart failed: ${restartError.message}`, true);
              this.restarting = false;
            }
          }
        }
      },
      30,
      { concurrency: 'parallel' }
    );

    this.addCronJob(
      'dailyReset',
      '0 21 * * *',
      async () => {
        const now = new Date();
        const jakartaTime = now.toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta',
          dateStyle: 'short',
          timeStyle: 'medium'
        });
        log(`Daily reset triggered at ${jakartaTime}`);
        try {
          const startTime = Date.now();
          await this.performDailyReset(config, dbSettings);
          const duration = Math.round((Date.now() - startTime) / 1000);
          log(`Daily reset completed in ${duration}s`);
        } catch (error) {
          log(`Daily reset failed: ${error}`, true);
        }
      },
      { concurrency: 'skip' }
    );

    this.addCronJob(
      'weeklyCleanup',
      '0 21 * * 2',
      async () => {
        const now = new Date();
        const jakartaTime = now.toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta',
          dateStyle: 'short',
          timeStyle: 'medium'
        });
        log(`Weekly cleanup triggered at ${jakartaTime}`);
        try {
          const startTime = Date.now();
          await this.performWeeklyCleanup();
          const duration = Math.round((Date.now() - startTime) / 1000);
          log(`Weekly cleanup completed in ${duration}s`);
        } catch (error) {
          log(`Weekly cleanup error: ${error}`, true);
        }
      },
      { concurrency: 'skip' }
    );

    log('All standard jobs setup completed');
  }

  async performDailyReset(config, dbSettings) {
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

      log(`Daily reset processed ${processed} users`);
    } catch (error) {
      throw error;
    }
  }

  async performWeeklyCleanup() {
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
        log(`Log cleanup error: ${logError.message}`, true);
      }

      log(`Weekly cleanup: ${chatResult.deletedCount} messages, ${storyResult.deletedCount} stories`);
    } catch (error) {
      throw error;
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

  removeJob(name) {
    if (this.jobs.has(name)) {
      this.jobs.get(name).stop();
      this.jobs.delete(name);
      log(`Job '${name}' stopped`);
      return true;
    }
    return false;
  }

  async shutdown() {
    log('Job scheduler shutting down');
    for (const [name, job] of this.jobs) {
      try {
        job.stop();
      } catch (error) {
        log(`Error stopping job ${name}: ${error.message}`, true);
      }
    }
    this.jobs.clear();
  }

  getStatus() {
    const jobsStatus = [];
    for (const [name, job] of this.jobs) {
      jobsStatus.push({
        name,
        isRunning: job.isRunning(),
        secondsToNext: job.secondsToNext()
      });
    }
    return {
      totalJobs: this.jobs.size,
      jobs: jobsStatus,
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
    if (this.initialized) {
      log('Performance manager already initialized', true);
      return;
    }

    log('Initializing performance manager with native cron');

    await this.cacheManager.loadMemorySettings();
    this.cacheManager.startSyncTimer();
    this.jobScheduler.setupStandardJobs(fn, config, dbSettings);
    this.setupGracefulShutdown();
    this.cacheManager.startMemoryMonitoring();

    this.initialized = true;
    log('Performance manager initialized successfully');
  }

  setupGracefulShutdown() {
    signalHandler.register('performance-manager', async (signal) => {
      log(`${signal}: Performance manager cleanup`);
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

  async getFullStatus() {
    const cacheStats = await this.cacheManager.getStats();
    const schedulerStatus = this.jobScheduler.getStatus();
    const memorySettings = this.cacheManager.getMemorySettings();

    return {
      initialized: this.initialized,
      uptime: process.uptime(),
      cache: cacheStats,
      scheduler: schedulerStatus,
      memory: memorySettings,
      config: PERFORMANCE_CONFIG
    };
  }

  async forceSync() {
    return this.cacheManager.forceSync();
  }

  async clearAllCaches() {
    return this.cacheManager.clearAllCaches();
  }
}

export const performanceManager = new UnifiedPerformanceManager();
export default performanceManager;