// ─── Info ─────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info database/StoreDB.js ─────────────────────

import config from '../config.js';
import log from '../src/lib/logger.js';
import { jidNormalizedUser } from 'baileys';
import { StoreContact, StoreMessages, StoreGroupMetadata, redis } from './index.js';

const REDIS_TTL = {
  CONTACT: 86400,
  GROUP: 3600,
  LID_MAPPING: 86400,
  MESSAGE: 1800,
  PRESENCE: 300,
  STATUS: 3600
};

const REDIS_PREFIX = {
  CONTACT: 'cache:contact:',
  GROUP: 'cache:groupmeta:',
  LID_TO_JID: 'cache:lid2jid:',
  JID_TO_LID: 'cache:jid2lid:',
  MESSAGES: 'cache:messages:',
  CONVERSATIONS: 'cache:conv:',
  PRESENCE: 'cache:presence:',
  STATUS: 'cache:status:'
};

class DBStore {
  constructor() {
    this.updateQueues = {
      contacts: new Map(),
      groups: new Map()
    };
    this.queueLocks = {
      contacts: false,
      groups: false
    };
    this.batchInterval = 2000;
    this.cacheCleanupInterval = config.performance.cacheCleanup;
    this.stats = {
      redisHits: 0,
      redisMisses: 0,
      dbHits: 0,
      dbMisses: 0,
      batchedWrites: 0,
      skippedWrites: 0,
      errors: 0
    };
    this.isConnected = false;
    this.authStore = null;
  }
  setAuthStore(authStore) {
    this.authStore = authStore;
    log('AuthStore injected into DBStore');
  }
  init() {
    this.startBatchProcessor();
    this.startCacheCleanup();
    this.startStatsLogger();
  }
  async connect() {
    this.isConnected = true;
    log("Warming up Redis cache...");
    await this.warmRedisCache();
    log('Redis + MongoDB ready');
    return this;
  }
  async disconnect() {
    await this.flushAllBatches();
    this.isConnected = false;
    log('Store disconnected');
  }
  async getRedis(key) {
    try {
      const data = await redis.get(key);
      if (data) {
        this.stats.redisHits++;
        return JSON.parse(data);
      }
      this.stats.redisMisses++;
      return null;
    } catch (error) {
      this.stats.errors++;
      log(`Redis GET error for ${key}: ${error.message}`, true);
      return null;
    }
  }
  async setRedis(key, value, ttl) {
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttl);
    } catch (error) {
      this.stats.errors++;
      log(`Redis SET error for ${key}: ${error.message}`, true);
    }
  }
  async delRedis(key) {
    try {
      await redis.del(key);
    } catch (error) {
      log(`Redis DEL error for ${key}: ${error.message}`, true);
    }
  }
  async mgetRedis(keys) {
    try {
      if (keys.length === 0) return [];
      const results = await redis.mget(keys);
      return results.map(r => r ? JSON.parse(r) : null);
    } catch (error) {
      this.stats.errors++;
      log(`Redis MGET error: ${error.message}`, true);
      return keys.map(() => null);
    }
  }
  async getRedisString(key) {
    try {
      const data = await redis.get(key);
      if (data) {
        this.stats.redisHits++;
        return data;
      }
      this.stats.redisMisses++;
      return null;
    } catch (error) {
      this.stats.errors++;
      log(`Redis GET error for ${key}: ${error.message}`, true);
      return null;
    }
  }
  async setRedisString(key, value, ttl) {
    try {
      await redis.set(key, value, 'EX', ttl);
    } catch (error) {
      this.stats.errors++;
      log(`Redis SET error for ${key}: ${error.message}`, true);
    }
  }
  startBatchProcessor() {
    setInterval(() => this.flushAllBatches(), this.batchInterval);
  }
  async flushAllBatches() {
    if (!this.isConnected) return;
    await Promise.all([
      this.flushBatch('contacts', StoreContact),
      this.flushBatch('groups', StoreGroupMetadata)
    ]);
  }
  async flushBatch(type, Model) {
    if (this.queueLocks[type]) return;
    if (this.updateQueues[type].size === 0) return;
    this.queueLocks[type] = true;
    try {
      const queue = new Map(this.updateQueues[type]);
      this.updateQueues[type].clear();
      const items = Array.from(queue.values());
      if (items.length > 0) {
        const itemsToUpdate = await this.filterDirtyItems(type, items, Model);
        if (itemsToUpdate.length > 0) {
          await Model.bulkUpsert(itemsToUpdate);
          this.stats.batchedWrites += itemsToUpdate.length;
          this.stats.skippedWrites += (items.length - itemsToUpdate.length);
          log(`Flushed ${itemsToUpdate.length}/${items.length} ${type} to database (${items.length - itemsToUpdate.length} skipped)`);
        } else {
          this.stats.skippedWrites += items.length;
          log(`Skipped flush for ${items.length} ${type} (no changes detected)`);
        }
      }
    } catch (error) {
      this.stats.errors++;
      log(`Batch flush error for ${type}: ${error.message}`, true);
    } finally {
      this.queueLocks[type] = false;
    }
  }
  async filterDirtyItems(type, items, Model) {
    if (items.length === 0) return [];
    try {
      const ids = items.map(item => {
        if (type === 'contacts') return item.jid;
        if (type === 'groups') return item.groupId;
        return null;
      }).filter(Boolean);
      if (ids.length === 0) return items;
      const queryField = type === 'contacts' ? 'jid' : 'groupId';
      const existingRecords = await Model.find({
        [queryField]: { $in: ids }
      }).lean();
      const existingMap = new Map(
        existingRecords.map(record => [
          type === 'contacts' ? record.jid : record.groupId,
          record
        ])
      );
      const dirtyItems = items.filter(item => {
        const id = type === 'contacts' ? item.jid : item.groupId;
        const existing = existingMap.get(id);
        if (!existing) return true;
        return this.hasChanges(existing, item, type);
      });
      return dirtyItems;
    } catch (error) {
      log(`Dirty check error for ${type}: ${error.message}`, true);
      return items;
    }
  }
  hasChanges(existing, updated, type) {
    const fieldsToCheck = type === 'contacts' ? ['name', 'notify', 'verifiedName', 'lid'] : ['subject', 'subjectOwner', 'subjectTime', 'creation', 'owner', 'desc', 'descOwner', 'descId', 'restrict', 'announce', 'size', 'participants'];
    for (const field of fieldsToCheck) {
      const existingVal = existing[field];
      const updatedVal = updated[field];
      if (existingVal === null && updatedVal === null) continue;
      if (Array.isArray(existingVal) && Array.isArray(updatedVal)) {
        if (JSON.stringify(existingVal) !== JSON.stringify(updatedVal)) {
          return true;
        }
        continue;
      }
      if (existingVal !== updatedVal) {
        return true;
      }
    }
    return false;
  }
  async warmRedisCache() {
    try {
      const activeGroups = await StoreGroupMetadata.find()
        .sort({ lastUpdated: -1 })
        .limit(50)
        .lean();
      const groupPipeline = redis.pipeline();
      for (const group of activeGroups) {
        groupPipeline.set(
          `${REDIS_PREFIX.GROUP}${group.groupId}`,
          JSON.stringify(group),
          'EX',
          REDIS_TTL.GROUP
        );
      }
      await groupPipeline.exec();
      const recentContacts = await StoreContact.find({})
        .sort({ updatedAt: -1 })
        .limit(1000)
        .lean();
      const contactPipeline = redis.pipeline();
      for (const contact of recentContacts) {
        contactPipeline.set(
          `${REDIS_PREFIX.CONTACT}${contact.jid}`,
          JSON.stringify(contact),
          'EX',
          REDIS_TTL.CONTACT
        );
        if (contact.lid) {
          contactPipeline.set(
            `${REDIS_PREFIX.LID_TO_JID}${contact.lid}`,
            contact.jid,
            'EX',
            REDIS_TTL.LID_MAPPING
          );
          contactPipeline.set(
            `${REDIS_PREFIX.JID_TO_LID}${contact.jid}`,
            contact.lid,
            'EX',
            REDIS_TTL.LID_MAPPING
          );
        }
      }
      await contactPipeline.exec();
      log(`Redis cache warmed: ${activeGroups.length} groups, ${recentContacts.length} contacts`);
    } catch (error) {
      this.stats.errors++;
      log(`Cache warming error: ${error.message}`, true);
    }
  }
  async getContact(jid) {
    if (!this.isConnected) return null;
    const redisKey = `${REDIS_PREFIX.CONTACT}${jid}`;
    const fromRedis = await this.getRedis(redisKey);
    if (fromRedis) return fromRedis;
    try {
      const contact = await StoreContact.findOne({ jid }).lean();
      this.stats.dbHits++;
      if (contact) {
        await this.setRedis(redisKey, contact, REDIS_TTL.CONTACT);
        if (contact.lid) {
          await this.cacheLidMapping(contact.lid, contact.jid);
        }
      } else {
        this.stats.dbMisses++;
      }
      return contact;
    } catch (error) {
      this.stats.errors++;
      log(`Get contact error: ${error.message}`, true);
      return null;
    }
  }
  async updateContact(jid, data) {
    if (!this.isConnected) return;
    const redisKey = `${REDIS_PREFIX.CONTACT}${jid}`;
    let existing = await this.getRedis(redisKey);
    if (!existing) {
      try {
        existing = await StoreContact.findOne({ jid }).lean();
      } catch (error) {
        log(`Error fetching existing contact: ${error.message}`, true);
      }
    }
    const updated = { ...existing };
    for (const key in data) {
      if (data[key] !== undefined && data[key] !== null) {
        updated[key] = data[key];
      }
    }
    updated.jid = jid;
    if (existing && !this.hasChanges(existing, updated, 'contacts')) {
      this.stats.skippedWrites++;
      return;
    }
    await this.setRedis(redisKey, updated, REDIS_TTL.CONTACT);
    delete updated._id;
    this.updateQueues.contacts.set(jid, updated);
    if (updated.lid) {
      await this.cacheLidMapping(updated.lid, jid);
    }
  }
  async getArrayContacts(jids) {
    if (!this.isConnected || !jids || jids.length === 0) return [];
    const redisKeys = jids.map(jid => `${REDIS_PREFIX.CONTACT}${jid}`);
    const redisResults = await this.mgetRedis(redisKeys);
    const foundInRedis = [];
    const missingJids = [];
    redisResults.forEach((result, index) => {
      if (result) {
        foundInRedis.push(result);
      } else {
        missingJids.push(jids[index]);
      }
    });
    if (missingJids.length === 0) return foundInRedis;
    let foundInDb = [];
    try {
      foundInDb = await StoreContact.find({ jid: { $in: missingJids } }).lean();
      this.stats.dbHits += foundInDb.length;
      if (foundInDb.length > 0) {
        const pipeline = redis.pipeline();
        for (const contact of foundInDb) {
          pipeline.set(
            `${REDIS_PREFIX.CONTACT}${contact.jid}`,
            JSON.stringify(contact),
            'EX',
            REDIS_TTL.CONTACT
          );
          if (contact.lid) {
            pipeline.set(
              `${REDIS_PREFIX.LID_TO_JID}${contact.lid}`,
              contact.jid,
              'EX',
              REDIS_TTL.LID_MAPPING
            );
            pipeline.set(
              `${REDIS_PREFIX.JID_TO_LID}${contact.jid}`,
              contact.lid,
              'EX',
              REDIS_TTL.LID_MAPPING
            );
          }
        }
        await pipeline.exec();
      }
    } catch (error) {
      this.stats.errors++;
      log(`Get array contacts error: ${error.message}`, true);
    }

    return [...foundInRedis, ...foundInDb];
  }
  async getGroupMetadata(groupId) {
    if (!this.isConnected) return null;
    const redisKey = `${REDIS_PREFIX.GROUP}${groupId}`;
    const fromRedis = await this.getRedis(redisKey);
    if (fromRedis) return fromRedis;
    try {
      const metadata = await StoreGroupMetadata.findOne({ groupId }).lean();
      this.stats.dbHits++;
      if (metadata) {
        await this.setRedis(redisKey, metadata, REDIS_TTL.GROUP);
      } else {
        this.stats.dbMisses++;
      }
      return metadata;
    } catch (error) {
      this.stats.errors++;
      log(`Get group metadata error: ${error.message}`, true);
      return null;
    }
  }
  async updateGroupMetadata(groupId, metadata) {
    if (!this.isConnected) return;
    const redisKey = `${REDIS_PREFIX.GROUP}${groupId}`;
    let existing = await this.getRedis(redisKey);
    if (!existing) {
      try {
        existing = await StoreGroupMetadata.findOne({ groupId }).lean();
      } catch (error) {
        log(`Error fetching existing group: ${error.message}`, true);
      }
    }
    const updated = { ...existing, ...metadata, groupId };
    if (existing && !this.hasChanges(existing, updated, 'groups')) {
      this.stats.skippedWrites++;
      return;
    }
    await this.setRedis(redisKey, updated, REDIS_TTL.GROUP);
    delete updated._id;
    this.updateQueues.groups.set(groupId, updated);
  }
  async syncGroupMetadata(fn, groupId) {
    if (!fn || !groupId) return null;
    try {
      const freshMetadata = await fn.groupMetadata(groupId);
      if (freshMetadata) {
        await this.updateGroupMetadata(groupId, freshMetadata);
        return freshMetadata;
      }
    } catch (error) {
      this.stats.errors++;
      log(`Sync group metadata error: ${error.message}`, true);
    }
    return null;
  }
  async clearGroupCacheByKey(groupId) {
    await this.delRedis(`${REDIS_PREFIX.GROUP}${groupId}`);
    this.updateQueues.groups.delete(groupId);
  }
  clearGroupsCache() {
    this.updateQueues.groups.clear();
    log('Groups queue cleared');
  }
  async cacheLidMapping(lid, jid) {
    if (!lid || !jid) return;
    try {
      const pipeline = redis.pipeline();
      pipeline.set(`${REDIS_PREFIX.LID_TO_JID}${lid}`, jid, 'EX', REDIS_TTL.LID_MAPPING);
      pipeline.set(`${REDIS_PREFIX.JID_TO_LID}${jid}`, lid, 'EX', REDIS_TTL.LID_MAPPING);
      await pipeline.exec();
    } catch (error) {
      log(`Cache LID mapping error: ${error.message}`, true);
    }
  }
  async resolveJid(id) {
    if (!id) return null;
    if (id.endsWith('@s.whatsapp.net')) {
      return jidNormalizedUser(id);
    }
    if (!id.endsWith('@lid')) {
      return id;
    }
    return await this.findJidByLid(id);
  }
  async findJidByLid(lid) {
    if (!lid) return null;
    const cached = await this.getRedisString(`${REDIS_PREFIX.LID_TO_JID}${lid}`);
    if (cached) return cached;
    if (this.authStore) {
      try {
        const jidFromAuth = await this.authStore.getPNForLID(lid);
        if (jidFromAuth) {
          await this.cacheLidMapping(lid, jidFromAuth);
          return jidFromAuth;
        }
      } catch (error) {
        log(`AuthStore lookup failed for LID ${lid}: ${error.message}`, true);
      }
    }
    try {
      const contact = await StoreContact.findOne({ lid }).lean();
      const jid = contact?.jid || null;
      if (jid) {
        await this.cacheLidMapping(lid, jid);
      }
      return jid;
    } catch (error) {
      this.stats.errors++;
      log(`Database lookup failed for LID ${lid}: ${error.message}`, true);
      return null;
    }
  }
  async getLidForJid(jid) {
    if (!jid) return null;
    const cached = await this.getRedisString(`${REDIS_PREFIX.JID_TO_LID}${jid}`);
    if (cached) return cached;
    if (this.authStore) {
      try {
        const lidFromAuth = await this.authStore.getLIDForPN(jid);
        if (lidFromAuth) {
          await this.cacheLidMapping(lidFromAuth, jid);
          return lidFromAuth;
        }
      } catch (error) {
        log(`AuthStore reverse lookup failed for JID ${jid}: ${error.message}`, true);
      }
    }
    try {
      const contact = await StoreContact.findOne({ jid }).lean();
      const lid = contact?.lid || null;
      if (lid) {
        await this.cacheLidMapping(lid, jid);
      }
      return lid;
    } catch (error) {
      this.stats.errors++;
      log(`Database reverse lookup failed for JID ${jid}: ${error.message}`, true);
      return null;
    }
  }
  async updateMessages(chatId, message, maxSize = 50) {
    try {
      const key = `${REDIS_PREFIX.MESSAGES}${chatId}`;
      await redis.rpush(key, JSON.stringify(message));
      await redis.ltrim(key, -maxSize, -1);
      await redis.expire(key, REDIS_TTL.MESSAGE);
    } catch (error) {
      log(`Update messages error: ${error.message}`, true);
    }
  }
  async getMessages(chatId, limit = 50) {
    try {
      const key = `${REDIS_PREFIX.MESSAGES}${chatId}`;
      const messages = await redis.lrange(key, -limit, -1);
      return messages.map(m => JSON.parse(m));
    } catch (error) {
      log(`Get messages error: ${error.message}`, true);
      return [];
    }
  }
  async updateConversations(chatId, conversation, maxSize = 200) {
    try {
      const key = `${REDIS_PREFIX.CONVERSATIONS}${chatId}`;
      await redis.rpush(key, JSON.stringify(conversation));
      await redis.ltrim(key, -maxSize, -1);
      await redis.expire(key, REDIS_TTL.MESSAGE);
    } catch (error) {
      log(`Update conversations error: ${error.message}`, true);
    }
  }
  async updatePresences(chatId, presenceUpdate) {
    try {
      const key = `${REDIS_PREFIX.PRESENCE}${chatId}`;
      const fields = Object.entries(presenceUpdate).flat();
      if (fields.length > 0) {
        await redis.hmset(key, ...fields.map(f => typeof f === 'object' ? JSON.stringify(f) : f));
        await redis.expire(key, REDIS_TTL.PRESENCE);
      }
    } catch (error) {
      log(`Update presences error: ${error.message}`, true);
    }
  }
  async getPresences(chatId) {
    try {
      const key = `${REDIS_PREFIX.PRESENCE}${chatId}`;
      const data = await redis.hgetall(key);
      const parsed = {};
      for (const [k, v] of Object.entries(data)) {
        try {
          parsed[k] = JSON.parse(v);
        } catch {
          parsed[k] = v;
        }
      }
      return parsed;
    } catch (error) {
      log(`Get presences error: ${error.message}`, true);
      return {};
    }
  }
  async addStatus(userId, statusMessage, maxSize = 20) {
    try {
      const key = `${REDIS_PREFIX.STATUS}${userId}`;
      await redis.rpush(key, JSON.stringify(statusMessage));
      await redis.ltrim(key, -maxSize, -1);
      await redis.expire(key, REDIS_TTL.STATUS);
    } catch (error) {
      log(`Add status error: ${error.message}`, true);
    }
  }
  async deleteStatus(userId, messageId) {
    try {
      const key = `${REDIS_PREFIX.STATUS}${userId}`;
      const statuses = await redis.lrange(key, 0, -1);
      const filtered = statuses
        .map(s => JSON.parse(s))
        .filter(status => status.key.id !== messageId);
      await redis.del(key);
      if (filtered.length > 0) {
        await redis.rpush(key, ...filtered.map(s => JSON.stringify(s)));
        await redis.expire(key, REDIS_TTL.STATUS);
      }
    } catch (error) {
      log(`Delete status error: ${error.message}`, true);
    }
  }
  async loadMessage(remoteJid, id) {
    try {
      const messages = await this.getMessages(remoteJid, 50);
      const messageFromCache = messages.find(msg => msg?.key?.id === id);
      if (messageFromCache) return messageFromCache;
    } catch (error) {
      log(`Load message from Redis error: ${error.message}`, true);
    }
    try {
      const chatHistory = await StoreMessages.findOne(
        { chatId: remoteJid, 'messages.key.id': id },
        { 'messages.$': 1 }
      ).lean();
      return chatHistory?.messages?.[0] || null;
    } catch (error) {
      this.stats.errors++;
      log(`Load message error: ${error.message}`, true);
      return null;
    }
  }
  async clearCache() {
    this.updateQueues.contacts.clear();
    this.updateQueues.groups.clear();
    try {
      const patterns = [
        `${REDIS_PREFIX.CONTACT}*`,
        `${REDIS_PREFIX.GROUP}*`,
        `${REDIS_PREFIX.LID_TO_JID}*`,
        `${REDIS_PREFIX.JID_TO_LID}*`,
        `${REDIS_PREFIX.MESSAGES}*`,
        `${REDIS_PREFIX.CONVERSATIONS}*`,
        `${REDIS_PREFIX.PRESENCE}*`,
        `${REDIS_PREFIX.STATUS}*`
      ];
      for (const pattern of patterns) {
        const stream = redis.scanStream({ match: pattern, count: 100 });
        const keysToDelete = [];
        stream.on('data', (keys) => keysToDelete.push(...keys));
        await new Promise((resolve, reject) => {
          stream.on('end', async () => {
            try {
              if (keysToDelete.length > 0) {
                for (let i = 0; i < keysToDelete.length; i += 1000) {
                  const batch = keysToDelete.slice(i, i + 1000);
                  await redis.del(batch);
                }
                log(`Deleted ${keysToDelete.length} keys for pattern ${pattern}`);
              }
              resolve();
            } catch (error) {
              reject(error);
            }
          });
          stream.on('error', reject);
        });
      }
      log('All caches cleared');
    } catch (error) {
      this.stats.errors++;
      log(`Failed to clear Redis cache: ${error.message}`, true);
    }
  }
  startCacheCleanup() {
    setInterval(async () => {
      await this.performMaintenance();
    }, this.cacheCleanupInterval);
  }
  async performMaintenance() {
    if (!this.isConnected) return;
    try {
      await this.flushAllBatches();
    } catch (error) {
      log(`Maintenance error: ${error.message}`, true);
    }
  }
  async forceCleanup() {
    log('Manual cleanup initiated');
    await this.flushAllBatches();
    await this.performMaintenance();
  }
  startStatsLogger() {
    setInterval(() => {
      const stats = this.getStats();
      if (stats.total > 0) {
        // log('Store Stats:', stats);
      }
    }, 30000);
  }
  getStats() {
    const total = this.stats.redisHits + this.stats.redisMisses;
    return {
      redis: {
        hits: this.stats.redisHits,
        misses: this.stats.redisMisses,
        hitRate: total > 0 ? (this.stats.redisHits / total * 100).toFixed(2) + '%' : '0%'
      },
      database: {
        hits: this.stats.dbHits,
        misses: this.stats.dbMisses
      },
      batches: {
        pendingContacts: this.updateQueues.contacts.size,
        pendingGroups: this.updateQueues.groups.size,
        totalWrites: this.stats.batchedWrites,
        skippedWrites: this.stats.skippedWrites,
        efficiency: this.stats.batchedWrites > 0
          ? ((this.stats.skippedWrites / (this.stats.batchedWrites + this.stats.skippedWrites)) * 100).toFixed(2) + '%'
          : '0%'
      },
      errors: this.stats.errors,
      total
    };
  }
}

export default new DBStore();