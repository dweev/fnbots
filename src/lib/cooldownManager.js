// ─── Info ────────────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info src/lib/cooldownManager.js ───────────

import log from './logger.js';
import { LRUCache } from 'lru-cache';
import config from '../../config.js';
import signalHandler from './signalHandler.js';

// eslint-disable-next-line import/no-unresolved
import PQueue from 'p-queue';

class CooldownManager {
  constructor() {
    this.userCooldowns = new Map();
    this.groupCooldowns = new LRUCache({
      max: 1000,
      ttl: config.performance.groupCooldownMS,
      updateAgeOnGet: false
    });
    this.spamSet = new Set();
    this.banSet = new Set();
    this.mediaSpamTracking = new Map();
    this.userQueues = new Map();
    this.commandQueue = new PQueue({
      interval: 1000,
      intervalCap: 50,
      concurrency: 10,
      timeout: 180000,
      throwOnTimeout: true,
      autoStart: true
    });
    this.cleanupIntervalId = null;
    this.setupCleanupInterval();
    this.registerShutdownHandler();
  }
  trySetCooldown(userId, cooldownMs) {
    const now = Date.now();
    const lastExec = this.userCooldowns.get(userId) || 0;
    const elapsed = now - lastExec;
    if (elapsed < cooldownMs) {
      return {
        allowed: false,
        remaining: Math.ceil((cooldownMs - elapsed) / 1000)
      };
    }
    this.userCooldowns.set(userId, now);
    return { allowed: true, remaining: 0 };
  }
  getUserQueue(userId) {
    if (!this.userQueues.has(userId)) {
      this.userQueues.set(
        userId,
        new PQueue({
          concurrency: 1,
          timeout: 120000,
          throwOnTimeout: true,
          autoStart: true
        })
      );
    }
    return this.userQueues.get(userId);
  }
  checkMediaSpam(userId) {
    const now = Date.now();
    const tracking = this.mediaSpamTracking.get(userId);
    if (!tracking) {
      this.mediaSpamTracking.set(userId, {
        count: 1,
        firstSeen: now,
        processed: false
      });
      setTimeout(() => {
        this.mediaSpamTracking.delete(userId);
      }, 1000);
      return {
        isSpamming: false,
        alreadyProcessed: false,
        count: 1
      };
    }
    if (now - tracking.firstSeen < 1000) {
      tracking.count++;
      const isSpamming = tracking.count >= 2;
      const alreadyProcessed = tracking.processed;
      return {
        isSpamming,
        alreadyProcessed,
        count: tracking.count
      };
    }
    this.mediaSpamTracking.set(userId, {
      count: 1,
      firstSeen: now,
      processed: false
    });
    setTimeout(() => {
      this.mediaSpamTracking.delete(userId);
    }, 1000);
    return {
      isSpamming: false,
      alreadyProcessed: false,
      count: 1
    };
  }
  markMediaSpamProcessed(userId) {
    const tracking = this.mediaSpamTracking.get(userId);
    if (tracking) {
      tracking.processed = true;
    }
  }
  async addToQueue(task, userId = null) {
    try {
      if (userId) {
        const userQueue = this.getUserQueue(userId);
        const result = await userQueue.add(async () => {
          try {
            return await task();
          } catch (error) {
            if (error.name === 'TimeoutError') {
              log(`User queue timeout for ${userId}: ${error.message}`);
              throw new Error(`Command timeout - silakan coba lagi`);
            }
            throw error;
          }
        });
        if (userQueue.size === 0 && userQueue.pending === 0) {
          userQueue.pause();
          userQueue.clear();
          this.userQueues.delete(userId);
        }
        return result;
      }
      return await this.commandQueue.add(async () => {
        try {
          return await task();
        } catch (error) {
          if (error.name === 'TimeoutError') {
            log(`Global queue timeout: ${error.message}`);
            throw new Error(`Command timeout - silakan coba lagi`);
          }
          throw error;
        }
      });
    } catch (error) {
      if (userId && this.userQueues.has(userId)) {
        const userQueue = this.userQueues.get(userId);
        if (userQueue.size === 0 && userQueue.pending === 0) {
          userQueue.pause();
          userQueue.clear();
          this.userQueues.delete(userId);
        }
      }
      throw error;
    }
  }
  setupCleanupInterval() {
    this.cleanupIntervalId = setInterval(
      () => {
        this.cleanupUserCooldowns();
      },
      5 * 60 * 1000
    );
  }
  cleanupUserCooldowns() {
    const now = Date.now();
    const maxIdleTime = 10 * 60 * 1000;
    let removedCount = 0;
    this.userCooldowns.forEach((timestamp, userId) => {
      if (now - timestamp > maxIdleTime) {
        this.userCooldowns.delete(userId);
        removedCount++;
      }
    });
    if (removedCount > 0) {
      log(`Cleaned up ${removedCount} expired user cooldowns`);
    }
  }
  registerShutdownHandler() {
    signalHandler.register(
      'cooldownCleanup',
      async () => {
        clearInterval(this.cleanupIntervalId);
        this.commandQueue.pause();
        this.userQueues.forEach((queue) => queue.pause());
        const globalIdleTimeout = new Promise((resolve) => {
          setTimeout(() => {
            log('Global queue idle timeout - forcing cleanup');
            resolve();
          }, 30000);
        });
        await Promise.race([this.commandQueue.onIdle(), globalIdleTimeout]);
        const userQueuesIdle = Array.from(this.userQueues.values()).map((q) => Promise.race([q.onIdle(), new Promise((resolve) => setTimeout(resolve, 10000))]));
        await Promise.all(userQueuesIdle);
        this.commandQueue.clear();
        this.userQueues.forEach((queue) => queue.clear());
        this.userQueues.clear();
        this.userCooldowns.clear();
        this.spamSet.clear();
        this.banSet.clear();
        this.mediaSpamTracking.clear();
        log('Cooldown manager cleanup completed');
        return Promise.resolve();
      },
      40
    );
  }
  addToSpamSet(userId) {
    this.spamSet.add(userId);
    setTimeout(() => {
      this.spamSet.delete(userId);
    }, config.performance.spamDuration);
  }
  addToBanSet(userId) {
    this.banSet.add(userId);
    setTimeout(() => {
      this.banSet.delete(userId);
    }, config.performance.banDuration);
  }
  isSpamming(userId) {
    return this.spamSet.has(userId);
  }
  isBanned(userId) {
    return this.banSet.has(userId);
  }
  getUserCooldown(userId) {
    return this.userCooldowns.get(userId) || 0;
  }
  getStats() {
    return {
      globalQueue: {
        size: this.commandQueue.size,
        pending: this.commandQueue.pending,
        capacity: {
          interval: 1000,
          intervalCap: 50,
          concurrency: 10,
          timeout: 180000
        }
      },
      userQueues: {
        total: this.userQueues.size,
        active: Array.from(this.userQueues.values()).filter((q) => q.size > 0 || q.pending > 0).length
      },
      tracking: {
        activeCooldowns: this.userCooldowns.size,
        spammedUsers: this.spamSet.size,
        bannedUsers: this.banSet.size,
        mediaSpamTracked: this.mediaSpamTracking.size
      }
    };
  }
  canSendAfkNotification(groupId) {
    const lastTime = this.groupCooldowns.get(groupId);
    const now = Date.now();
    if (!lastTime || now - lastTime >= config.performance.groupCooldownMS) {
      this.groupCooldowns.set(groupId, now);
      return true;
    }
    return false;
  }
}

export const cooldownManager = new CooldownManager();
export default cooldownManager;
