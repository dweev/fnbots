// ─── Info ─────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info src/cache/StoreDB.js ────────────────────

import log from '../lib/logger.js';
import config from '../../config.js';
import StoryCache from './storyCache.js';
import { jidNormalizedUser } from 'baileys';
import { StoreContact, StoreMessages, StoreGroupMetadata, redis } from '../../database/index.js';

const REDIS_TTL = {
  CONTACT: 86400,
  GROUP: 3600,
  LID_MAPPING: 86400,
  MESSAGE: 1800,
  PRESENCE: 300
};

const REDIS_PREFIX = {
  CONTACT: 'cache:contact:',
  GROUP: 'cache:groupmetadata:',
  LID_TO_JID: 'cache:getLIDForPN:',
  JID_TO_LID: 'cache:getPNForLID:',
  MESSAGES: 'cache:messages:',
  CONVERSATIONS: 'cache:conversation:',
  PRESENCE: 'cache:presence:'
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
  sanitizeParticipants(participants) {
    if (!Array.isArray(participants)) return [];
    return participants.map(p => ({
      id: p.id || p.jid,
      jid: p.jid,
      lid: p.lid || '',
      admin: p.admin || null
    }));
  }
  sanitizeGroupData(rawData, existing = null) {
    const participants = this.sanitizeParticipants(rawData.participants || []);
    const sanitized = {
      id: rawData.id || rawData.groupId,
      groupId: rawData.groupId || rawData.id,
      notify: rawData.notify || '',
      addressingMode: rawData.addressingMode || '',
      subject: rawData.subject || '',
      subjectOwner: rawData.subjectOwner || '',
      subjectOwnerPn: rawData.subjectOwnerPn || '',
      subjectTime: rawData.subjectTime || 0,
      size: participants.length,
      creation: rawData.creation || 0,
      owner: rawData.owner || '',
      ownerPn: rawData.ownerPn || '',
      owner_country_code: rawData.owner_country_code || '',
      desc: rawData.desc || '',
      descId: rawData.descId || '',
      descOwner: rawData.descOwner || '',
      descOwnerPn: rawData.descOwnerPn || '',
      descTime: rawData.descTime || 0,
      linkedParent: rawData.linkedParent || '',
      restrict: rawData.restrict || false,
      announce: rawData.announce || false,
      isCommunity: rawData.isCommunity || false,
      isCommunityAnnounce: rawData.isCommunityAnnounce || false,
      joinApprovalMode: rawData.joinApprovalMode || false,
      memberAddMode: rawData.memberAddMode || false,
      ephemeralDuration: rawData.ephemeralDuration || 0,
      participants: participants,
      lastUpdated: new Date(),
      lastSynced: new Date()
    };
    if (existing) {
      sanitized.updateCount = (existing.updateCount || 0) + 1;
    } else {
      sanitized.updateCount = 0;
    }
    return sanitized;
  }
  sanitizeContactData(rawData, existing = null) {
    const sanitized = {
      jid: rawData.jid,
      name: rawData.name || '',
      notify: rawData.notify || '',
      verifiedName: rawData.verifiedName || '',
      lid: rawData.lid || ''
    };
    if (existing) {
      sanitized.updateCount = (existing.updateCount || 0) + 1;
      sanitized.lastUpdated = new Date();
    } else {
      sanitized.updateCount = 0;
      sanitized.createdAt = new Date();
      sanitized.lastUpdated = new Date();
    }
    return sanitized;
  }
  hasParticipantsChanged(existingParticipants = [], updatedParticipants = []) {
    if (existingParticipants.length !== updatedParticipants.length) {
      return true;
    }
    const existingMap = new Map(
      existingParticipants.map(p => [
        p.id || p.jid,
        { jid: p.jid, lid: p.lid || '', admin: p.admin || null }
      ])
    );
    for (const updatedP of updatedParticipants) {
      const key = updatedP.id || updatedP.jid;
      const existing = existingMap.get(key);
      if (!existing) {
        return true;
      }
      if (existing.jid !== updatedP.jid ||
        existing.lid !== (updatedP.lid || '') ||
        existing.admin !== (updatedP.admin || null)) {
        return true;
      }
    }
    return false;
  }
  hasChanges(existing, updated, type) {
    if (type === 'contacts') {
      const fieldsToCheck = ['name', 'notify', 'verifiedName', 'lid'];
      for (const field of fieldsToCheck) {
        if (existing[field] !== updated[field]) {
          return true;
        }
      }
      return false;
    }
    if (type === 'groups') {
      const primitiveFields = [
        'subject', 'subjectOwner', 'subjectOwnerPn', 'subjectTime',
        'owner', 'ownerPn', 'owner_country_code', 'desc', 'descOwner',
        'descOwnerPn', 'descId', 'descTime', 'creation', 'size', 'restrict',
        'announce', 'isCommunity', 'isCommunityAnnounce', 'notify', 'addressingMode',
        'linkedParent', 'joinApprovalMode', 'memberAddMode', 'ephemeralDuration'
      ];
      for (const field of primitiveFields) {
        const existingVal = existing[field];
        const updatedVal = updated[field];
        if (existingVal === null && updatedVal === null) continue;
        if (existingVal !== updatedVal) {
          return true;
        }
      }
      if (this.hasParticipantsChanged(existing.participants, updated.participants)) {
        return true;
      }
      return false;
    }
    return false;
  }
  startBatchProcessor() {
    setInterval(() => this.flushAllBatches(), this.batchInterval);
  }
  async flushAllBatches() {
    if (!this.isConnected) return;
    await Promise.all([
      this.flushBatch('contacts'),
      this.flushBatch('groups')
    ]);
  }
  async flushBatch(type) {
    while (this.queueLocks[type]) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (this.updateQueues[type].size === 0) return;
    this.queueLocks[type] = true;
    try {
      const queue = new Map(this.updateQueues[type]);
      this.updateQueues[type].clear();
      const items = Array.from(queue.values());
      if (items.length > 0) {
        if (type === 'groups') {
          await this.bulkUpsertGroups(items);
        } else if (type === 'contacts') {
          await this.bulkUpsertContacts(items);
        }
      }
    } catch (error) {
      this.stats.errors++;
      log(`Batch flush error for ${type}: ${error.message}`, true);
    } finally {
      this.queueLocks[type] = false;
    }
  }
  async bulkUpsertGroups(groupsArray) {
    if (!this.isConnected || !groupsArray || groupsArray.length === 0) {
      return { upsertedCount: 0, modifiedCount: 0 };
    }
    try {
      log(`Bulk upserting ${groupsArray.length} groups...`);
      const groupIds = groupsArray.map(g => g.id || g.groupId);
      const existingGroups = await StoreGroupMetadata.find({
        groupId: { $in: groupIds }
      }).lean();
      const existingMap = new Map(
        existingGroups.map(g => [g.groupId, g])
      );
      const sanitizedGroups = groupsArray.map(rawGroup => {
        const groupId = rawGroup.id || rawGroup.groupId;
        const existing = existingMap.get(groupId);
        return this.sanitizeGroupData(rawGroup, existing);
      });
      const dirtyGroups = sanitizedGroups.filter(updated => {
        const existing = existingMap.get(updated.groupId);
        return !existing || this.hasChanges(existing, updated, 'groups');
      });
      if (dirtyGroups.length === 0) {
        log(`Skipped bulk upsert: no changes detected in ${groupsArray.length} groups`);
        this.stats.skippedWrites += groupsArray.length;
        return { upsertedCount: 0, modifiedCount: 0 };
      }
      const operations = dirtyGroups.map(group => ({
        updateOne: {
          filter: { groupId: group.groupId },
          update: {
            $set: group,
            $setOnInsert: { createdAt: new Date() }
          },
          upsert: true
        }
      }));
      const result = await StoreGroupMetadata.bulkWrite(operations, { ordered: false });
      const pipeline = redis.pipeline();
      for (const group of dirtyGroups) {
        pipeline.set(
          `${REDIS_PREFIX.GROUP}${group.groupId}`,
          JSON.stringify(group),
          'EX',
          REDIS_TTL.GROUP
        );
      }
      await pipeline.exec();
      this.stats.batchedWrites += dirtyGroups.length;
      this.stats.skippedWrites += (groupsArray.length - dirtyGroups.length);
      log(`Bulk upsert complete: ${result.upsertedCount} inserted, ${result.modifiedCount} modified, ${groupsArray.length - dirtyGroups.length} skipped`);
      log(`Cached ${dirtyGroups.length} groups in Redis`);
      return result;
    } catch (error) {
      this.stats.errors++;
      log(`bulkUpsertGroups error: ${error.message}`, true);
      throw error;
    }
  }
  async bulkUpsertContacts(contactsArray) {
    if (!this.isConnected || !contactsArray || contactsArray.length === 0) {
      return { upsertedCount: 0, modifiedCount: 0 };
    }
    try {
      log(`Bulk upserting ${contactsArray.length} contacts...`);
      const jids = contactsArray.map(c => c.jid);
      const existingContacts = await StoreContact.find({ jid: { $in: jids } }).lean();
      const existingMap = new Map(
        existingContacts.map(c => [c.jid, c])
      );
      const sanitizedContacts = contactsArray.map(rawContact => {
        const existing = existingMap.get(rawContact.jid);
        return this.sanitizeContactData(rawContact, existing);
      });
      const dirtyContacts = sanitizedContacts.filter(updated => {
        const existing = existingMap.get(updated.jid);
        return !existing || this.hasChanges(existing, updated, 'contacts');
      });
      if (dirtyContacts.length === 0) {
        log(`Skipped bulk upsert: no changes detected in ${contactsArray.length} contacts`);
        this.stats.skippedWrites += contactsArray.length;
        return { upsertedCount: 0, modifiedCount: 0 };
      }
      const operations = dirtyContacts.map(contact => ({
        updateOne: {
          filter: { jid: contact.jid },
          update: {
            $set: contact,
            $setOnInsert: { createdAt: new Date() }
          },
          upsert: true
        }
      }));
      const result = await StoreContact.bulkWrite(operations, { ordered: false });
      const pipeline = redis.pipeline();
      for (const contact of dirtyContacts) {
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
      this.stats.batchedWrites += dirtyContacts.length;
      this.stats.skippedWrites += (contactsArray.length - dirtyContacts.length);
      log(`Bulk upsert complete: ${result.upsertedCount} inserted, ${result.modifiedCount} modified, ${contactsArray.length - dirtyContacts.length} skipped`);
      return result;
    } catch (error) {
      this.stats.errors++;
      log(`bulkUpsertContacts error: ${error.message}`, true);
      throw error;
    }
  }
  async warmRedisCache() {
    try {
      const activeGroups = await StoreGroupMetadata.find().sort({ lastUpdated: -1 }).limit(50).lean();
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
      const recentContacts = await StoreContact.find({}).sort({ updatedAt: -1 }).limit(5000).lean();
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
    const merged = { ...(existing || {}), ...data, jid };
    const updated = this.sanitizeContactData(merged, existing);
    if (existing && !this.hasChanges(existing, updated, 'contacts')) {
      this.stats.skippedWrites++;
      return;
    }
    await this.setRedis(redisKey, updated, REDIS_TTL.CONTACT);
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
    const merged = { ...(existing || {}), ...metadata, groupId };
    const updated = this.sanitizeGroupData(merged, existing);
    if (existing && !this.hasChanges(existing, updated, 'groups')) {
      this.stats.skippedWrites++;
      return;
    }
    await this.setRedis(redisKey, updated, REDIS_TTL.GROUP);
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
        `${REDIS_PREFIX.PRESENCE}*`
      ];
      for (const pattern of patterns) {
        const stream = redis.scanStream({ match: pattern, count: 100 });
        const keysToDelete = [];
        stream.on('data', (keys) => {
          stream.pause();
          keysToDelete.push(...keys);
          stream.resume();
        });
        await new Promise((resolve, reject) => {
          stream.on('end', async () => {
            try {
              if (keysToDelete.length > 0) {
                for (let i = 0; i < keysToDelete.length; i += 1000) {
                  const batch = keysToDelete.slice(i, i + 1000);
                  await redis.del(...batch);
                }
                log(`Deleted ${keysToDelete.length} keys for pattern ${pattern}`);
              } else {
                log(`No keys found for pattern ${pattern}`);
              }
              resolve();
            } catch (error) {
              reject(error);
            }
          });
          stream.on('error', reject);
        });
      }
      log('All caches cleared successfully');
    } catch (error) {
      this.stats.errors++;
      log(`Failed to clear Redis cache: ${error.message}`, true);
      throw error;
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
        efficiency: this.stats.batchedWrites > 0 ? ((this.stats.skippedWrites / (this.stats.batchedWrites + this.stats.skippedWrites)) * 100).toFixed(2) + '%' : '0%'
      },
      errors: this.stats.errors,
      total
    };
  }
  async getAllGroups(projection = null) {
    if (!this.isConnected) return [];
    try {
      const pattern = `${REDIS_PREFIX.GROUP}*`;
      const groupKeys = [];
      const stream = redis.scanStream({
        match: pattern,
        count: 100
      });
      await new Promise((resolve, reject) => {
        stream.on('data', (keys) => {
          groupKeys.push(...keys);
        });
        stream.on('end', resolve);
        stream.on('error', reject);
      });
      if (groupKeys.length > 0) {
        const cachedGroups = await this.mgetRedis(groupKeys);
        const validGroups = cachedGroups.filter(g => g !== null);
        if (validGroups.length > 0) {
          this.stats.redisHits += validGroups.length;
          log(`Cache hit: ${validGroups.length} groups from Redis`);
          if (projection) {
            return validGroups.map(group => {
              const filtered = {};
              for (const key in projection) {
                if (projection[key] === 1 && group[key] !== undefined) {
                  filtered[key] = group[key];
                }
              }
              return filtered;
            });
          }
          return validGroups;
        }
      }
      this.stats.redisMisses++;
      log('Cache miss: Fetching groups from database...');
      const query = StoreGroupMetadata.find({});
      if (projection) {
        query.select(projection);
      }
      const groups = await query.lean();
      this.stats.dbHits += groups.length;
      if (groups.length > 0) {
        const pipeline = redis.pipeline();
        for (const group of groups) {
          pipeline.set(
            `${REDIS_PREFIX.GROUP}${group.groupId}`,
            JSON.stringify(group),
            'EX',
            REDIS_TTL.GROUP
          );
        }
        await pipeline.exec();
        log(`Cached ${groups.length} groups in Redis`);
      }
      return groups;
    } catch (error) {
      this.stats.errors++;
      log(`getAllGroups error: ${error.message}`, true);
      return [];
    }
  }
  async getArrayGroups(groupIds, projection = null) {
    if (!this.isConnected || !groupIds || groupIds.length === 0) return [];
    try {
      const redisKeys = groupIds.map(id => `${REDIS_PREFIX.GROUP}${id}`);
      const redisResults = await this.mgetRedis(redisKeys);
      const foundInRedis = [];
      const missingIds = [];
      redisResults.forEach((result, index) => {
        if (result) {
          foundInRedis.push(result);
        } else {
          missingIds.push(groupIds[index]);
        }
      });
      if (missingIds.length === 0) {
        log(`Cache hit: ${foundInRedis.length}/${groupIds.length} groups`);
        return foundInRedis;
      }
      log(`Partial cache miss: ${missingIds.length}/${groupIds.length} groups, fetching from DB...`);
      const query = StoreGroupMetadata.find({ groupId: { $in: missingIds } });
      if (projection) {
        query.select(projection);
      }
      const foundInDb = await query.lean();
      this.stats.dbHits += foundInDb.length;
      if (foundInDb.length > 0) {
        const pipeline = redis.pipeline();
        for (const group of foundInDb) {
          pipeline.set(
            `${REDIS_PREFIX.GROUP}${group.groupId}`,
            JSON.stringify(group),
            'EX',
            REDIS_TTL.GROUP
          );
        }
        await pipeline.exec();
        log(`Cached ${foundInDb.length} missing groups`);
      }
      return [...foundInRedis, ...foundInDb];
    } catch (error) {
      this.stats.errors++;
      log(`getArrayGroups error: ${error.message}`, true);
      return [];
    }
  }
  async deleteGroup(groupId) {
    if (!this.isConnected || !groupId) return false;
    try {
      log(`Deleting group: ${groupId}`);
      await this.delRedis(`${REDIS_PREFIX.GROUP}${groupId}`);
      this.updateQueues.groups.delete(groupId);
      const deleteResult = await StoreGroupMetadata.deleteOne({ groupId });
      const success = deleteResult.deletedCount > 0;
      log(`Delete group ${groupId}: ${success ? 'success' : 'not found'}`);
      return success;
    } catch (error) {
      this.stats.errors++;
      log(`deleteGroup error: ${error.message}`, true);
      return false;
    }
  }
  async bulkDeleteGroups(groupIds) {
    if (!this.isConnected || !groupIds || groupIds.length === 0) {
      return { deletedCount: 0, errors: 0 };
    }
    try {
      log(`Bulk deleting ${groupIds.length} groups...`);
      const pipeline = redis.pipeline();
      for (const groupId of groupIds) {
        pipeline.del(`${REDIS_PREFIX.GROUP}${groupId}`);
        this.updateQueues.groups.delete(groupId);
      }
      await pipeline.exec();
      log(`Deleted ${groupIds.length} groups from Redis cache`);
      const deleteResult = await StoreGroupMetadata.deleteMany({
        groupId: { $in: groupIds }
      });
      log(`Deleted ${deleteResult.deletedCount}/${groupIds.length} groups from database`);
      return {
        deletedCount: deleteResult.deletedCount,
        errors: 0
      };
    } catch (error) {
      this.stats.errors++;
      log(`bulkDeleteGroups error: ${error.message}`, true);
      return {
        deletedCount: 0,
        errors: 1
      };
    }
  }
  async syncStaleGroups(activeGroupIds) {
    if (!this.isConnected) return { removed: 0, errors: 0 };
    try {
      log('Starting stale group detection...');
      const storedGroups = await this.getAllGroups({ groupId: 1 });
      const storedGroupIds = storedGroups.map(g => g.groupId);
      log(`Stored: ${storedGroupIds.length} groups, Active: ${activeGroupIds.size} groups`);
      const staleGroupIds = storedGroupIds.filter(id => !activeGroupIds.has(id));
      if (staleGroupIds.length === 0) {
        log('No stale groups found. All data synchronized.');
        return { removed: 0, errors: 0 };
      }
      log(`Detected ${staleGroupIds.length} stale groups. Starting cleanup...`);
      const result = await this.bulkDeleteGroups(staleGroupIds);
      log(`Stale group cleanup complete: ${result.deletedCount} removed`);
      return {
        removed: result.deletedCount,
        errors: result.errors
      };
    } catch (error) {
      this.stats.errors++;
      log(`syncStaleGroups error: ${error.message}`, true);
      return { removed: 0, errors: 1 };
    }
  }
  async deleteContact(jid) {
    if (!this.isConnected || !jid) return false;
    try {
      log(`Deleting contact: ${jid}`);
      const contact = await this.getContact(jid);
      await this.delRedis(`${REDIS_PREFIX.CONTACT}${jid}`);
      if (contact?.lid) {
        await this.delRedis(`${REDIS_PREFIX.LID_TO_JID}${contact.lid}`);
        await this.delRedis(`${REDIS_PREFIX.JID_TO_LID}${jid}`);
        log(`Deleted LID mappings for ${jid}`);
      }
      this.updateQueues.contacts.delete(jid);
      const deleteResult = await StoreContact.deleteOne({ jid });
      const success = deleteResult.deletedCount > 0;
      log(`Delete contact ${jid}: ${success ? 'success' : 'not found'}`);
      return success;
    } catch (error) {
      this.stats.errors++;
      log(`deleteContact error: ${error.message}`, true);
      return false;
    }
  }
  async bulkDeleteContacts(jids) {
    if (!this.isConnected || !jids || jids.length === 0) {
      return { deletedCount: 0, errors: 0 };
    }
    try {
      log(`Bulk deleting ${jids.length} contacts...`);
      const contacts = await this.getArrayContacts(jids);
      const pipeline = redis.pipeline();
      for (const jid of jids) {
        pipeline.del(`${REDIS_PREFIX.CONTACT}${jid}`);
        this.updateQueues.contacts.delete(jid);
      }
      for (const contact of contacts) {
        if (contact?.lid) {
          pipeline.del(`${REDIS_PREFIX.LID_TO_JID}${contact.lid}`);
          pipeline.del(`${REDIS_PREFIX.JID_TO_LID}${contact.jid}`);
        }
      }
      await pipeline.exec();
      log(`Deleted ${jids.length} contacts from Redis cache`);
      const deleteResult = await StoreContact.deleteMany({
        jid: { $in: jids }
      });
      log(`Deleted ${deleteResult.deletedCount}/${jids.length} contacts from database`);
      return {
        deletedCount: deleteResult.deletedCount,
        errors: 0
      };
    } catch (error) {
      this.stats.errors++;
      log(`bulkDeleteContacts error: ${error.message}`, true);
      return {
        deletedCount: 0,
        errors: 1
      };
    }
  }

  async addStatus(userId, statusMessage, maxSize = 20) {
    try {
      await StoryCache.addStatus(userId, statusMessage, maxSize);
    } catch (error) {
      log(`Add status error: ${error.message}`, true);
    }
  }
  async getStatuses(userId) {
    try {
      const cached = await StoryCache.getStatusesFromCache(userId);
      if (cached !== null) {
        return cached;
      }
      const { StoreStory } = await import('../../database/index.js');
      const doc = await StoreStory.findOne({ userId }).lean();
      const stories = doc?.statuses || [];
      if (stories.length > 0) {
        await StoryCache.populateCacheFromDB(userId, stories);
      }
      return stories;
    } catch (error) {
      log(`Get statuses error: ${error.message}`, true);
      return [];
    }
  }
  async getSpecificStatus(userId, messageId) {
    try {
      const cached = await StoryCache.getSpecificStatus(userId, messageId);
      if (cached) {
        return cached;
      }
      const { StoreStory } = await import('../../database/index.js');
      const doc = await StoreStory.findOne({ userId }).lean();
      const story = doc?.statuses?.find(s => s.key?.id === messageId);
      return story || null;
    } catch (error) {
      log(`Get specific status error: ${error.message}`, true);
      return null;
    }
  }
  async deleteStatus(userId, messageId) {
    try {
      await StoryCache.deleteStatus(userId, messageId);
    } catch (error) {
      log(`Delete status error: ${error.message}`, true);
    }
  }
  async bulkDeleteStatuses(userId, messageIds) {
    try {
      await StoryCache.bulkDeleteStatuses(userId, messageIds);
    } catch (error) {
      log(`Bulk delete statuses error: ${error.message}`, true);
    }
  }
  async invalidateStoryCache(userId) {
    return StoryCache.invalidateCache(userId);
  }
  async getStoryCacheStats() {
    return StoryCache.getStats();
  }
}

const store = new DBStore();
export default store;