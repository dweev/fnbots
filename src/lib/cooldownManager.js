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
    this.mediaSpamSet = new Set();
    this.mediaSpamProcessedSet = new Set();
    this.commandQueue = new PQueue({
      interval: 1000,
      intervalCap: 10,
      concurrency: 5,
      timeout: 30000,
      throwOnTimeout: false,
      autoStart: true
    });
    this.cleanupIntervalId = null;
    this.setupCleanupInterval();
    this.registerShutdownHandler();
  }
  trySetCooldown(userId, cooldownMs) {
    const now = Date.now();
    const lastExec = this.userCooldowns.get(userId) || 0;
    if (now - lastExec < cooldownMs) {
      return false;
    }
    this.userCooldowns.set(userId, now);
    return true;
  }
  setupCleanupInterval() {
    this.cleanupIntervalId = setInterval(() => {
      this.cleanupUserCooldowns();
    }, 5 * 60 * 1000);
  }
  registerShutdownHandler() {
    signalHandler.register('cooldownCleanup', () => {
      clearInterval(this.cleanupIntervalId);
      this.commandQueue.pause();
      this.commandQueue.clear();
      this.userCooldowns.clear();
      this.spamSet.clear();
      this.banSet.clear();
      this.mediaSpamSet.clear();
      this.mediaSpamProcessedSet.clear();
      log('Cooldown manager cleanup completed');
      return Promise.resolve();
    }, 40);
  }
  cleanupUserCooldowns() {
    const now = Date.now();
    const cooldownTime = config.performance.commandCooldown || 5000;
    let removedCount = 0;
    this.userCooldowns.forEach((timestamp, userId) => {
      if (now - timestamp > cooldownTime * 2) {
        this.userCooldowns.delete(userId);
        removedCount++;
      }
    });
    if (removedCount > 0) {
      log(`Cleaned up ${removedCount} expired user cooldowns`);
    }
  }
  setUserCooldown(userId) {
    this.userCooldowns.set(userId, Date.now());
  }
  getUserCooldown(userId) {
    return this.userCooldowns.get(userId) || 0;
  }
  checkCooldown(userId, cooldownMs) {
    const now = Date.now();
    const lastExec = this.userCooldowns.get(userId) || 0;
    return now - lastExec < cooldownMs;
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
  checkMediaSpam(userId) {
    const isSpamming = this.mediaSpamSet.has(userId);
    const alreadyProcessed = this.mediaSpamProcessedSet.has(userId);
    this.mediaSpamSet.add(userId);
    setTimeout(() => {
      this.mediaSpamSet.delete(userId);
      this.mediaSpamProcessedSet.delete(userId);
    }, 1000);
    return {
      isSpamming: isSpamming,
      alreadyProcessed: alreadyProcessed
    };
  }
  markMediaSpamProcessed(userId) {
    this.mediaSpamProcessedSet.add(userId);
  }
  async addToQueue(task) {
    return this.commandQueue.add(task);
  }
  getQueueSize() {
    return this.commandQueue.size;
  }
  isSpamming(userId) {
    return this.spamSet.has(userId);
  }
  isBanned(userId) {
    return this.banSet.has(userId);
  }
  getStats() {
    return {
      queueSize: this.commandQueue.size,
      queuePending: this.commandQueue.pending,
      activeCooldowns: this.userCooldowns.size,
      spammedUsers: this.spamSet.size,
      bannedUsers: this.banSet.size,
      mediaSpamTracked: this.mediaSpamSet.size,
      mediaSpamProcessed: this.mediaSpamProcessedSet.size,
      queueCapacity: {
        interval: 1000,
        intervalCap: 10,
        concurrency: 5
      }
    };
  }
}

export const cooldownManager = new CooldownManager();
export default cooldownManager;