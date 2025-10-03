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
import { StoreContact, StoreMessages, StoreGroupMetadata } from './index.js';

class DBStore {
  constructor() {
    this.contactsCache = new Map();
    this.groupMetadataCache = new Map();
    this.cacheHits = new Map();
    this.cacheTimestamps = new Map();
    this.lidToJidCache = new Map();
    this.maxCacheSize = config.performance.maxCacheSize;
    this.cacheTTL = {
      groups: config.performance.cacheTTL
    };
    this.pendingUpdates = {
      contacts: new Map(),
      groups: new Map()
    };
    this.batchInterval = 2000;
    this.cacheCleanupInterval = config.performance.cacheCleanup;
    this.cacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      ttlExpirations: 0
    };
    this.isConnected = false;
    this.messages = {};
    this.conversations = {};
    this.presences = {};
    this.status = {};
  }
  init() {
    this.startBatchProcessor();
    this.startCacheCleanup();
    this.startStatsLogger();
  }
  async connect() {
    this.isConnected = true;
    log("Warming up MongoDB store caches...");
    await this.warmCaches();
    log('MongoDB store ready');
    return this;
  }
  async disconnect() {
    await this.processBatchUpdates();
    this.isConnected = false;
    this.clearGroupsCache();
  }
  startBatchProcessor() {
    setInterval(() => this.processBatchUpdates(), this.batchInterval);
  }
  async processBatchUpdates() {
    if (!this.isConnected) return;
    if (this.pendingUpdates.contacts.size > 0) {
      const contactsToUpdate = Array.from(this.pendingUpdates.contacts.values());
      try {
        await StoreContact.bulkUpsert(contactsToUpdate);
        this.pendingUpdates.contacts.clear();
      } catch (error) {
        log(error, true);
      }
    }
    if (this.pendingUpdates.groups.size > 0) {
      const groupsToUpdate = Array.from(this.pendingUpdates.groups.values());
      try {
        await StoreGroupMetadata.bulkUpsert(groupsToUpdate);
        this.pendingUpdates.groups.clear();
      } catch (error) {
        log(error, true);
      }
    }
  }
  async warmCaches() {
    try {
      const activeGroups = await StoreGroupMetadata.find().sort({ lastUpdated: -1 }).limit(50).lean();
      activeGroups.forEach(group => this.addGroupToCache(group.groupId, group));
      const allContacts = await StoreContact.find({}).lean();
      allContacts.forEach(contact => this.addContactToCache(contact.jid, contact));
      log(`Cache warmed: ${this.contactsCache.size} contacts, ${this.groupMetadataCache.size} groups`);
    } catch (error) {
      log(error, true);
    }
  }
  addLidToJidCache(lid, jid) {
    if (lid && jid) {
      this.lidToJidCache.set(lid, jid);
    }
  }
  getJidFromLidCache(lid) {
    return this.lidToJidCache.get(lid) || null;
  }
  addContactToCache(jid, data) {
    const safeMerge = (existing, newData) => {
      const merged = { ...existing };
      for (const key in newData) {
        if (newData[key] !== undefined && newData[key] !== null) {
          merged[key] = newData[key];
        }
      }
      return merged;
    };
    const existing = this.contactsCache.get(jid);
    let finalData;
    if (existing) {
      finalData = { ...safeMerge(existing, data), jid };
    } else {
      finalData = { ...data, jid };
    }
    this.contactsCache.set(jid, finalData);
    if (finalData.lid) {
      this.addLidToJidCache(finalData.lid, jid);
    }
    if (this.contactsCache.size > this.maxCacheSize.contacts) {
      const oldestJid = this.contactsCache.keys().next().value;
      if (oldestJid) {
        const contactToDelete = this.contactsCache.get(oldestJid);
        this.contactsCache.delete(oldestJid);
        if (contactToDelete && contactToDelete.lid) {
          this.lidToJidCache.delete(contactToDelete.lid);
        }
        this.cacheStats.evictions++;
      }
    }
    return finalData;
  }
  addGroupToCache(groupId, data) {
    const cache = this.groupMetadataCache;
    const maxSize = this.maxCacheSize.groups;
    if (cache.size >= maxSize) {
      this.applyLRUCleanup('groups', cache);
    }
    const existing = cache.get(groupId) || {};
    const mergedData = { ...existing, ...data };
    cache.set(groupId, mergedData);
    this.cacheHits.set(groupId, (this.cacheHits.get(groupId) || 0) + 1);
    this.cacheTimestamps.set(groupId, Date.now());
    return mergedData;
  }
  async getContact(jid) {
    if (!this.isConnected) return null;
    if (this.contactsCache.has(jid)) {
      this.cacheStats.hits++;
      const contactData = this.contactsCache.get(jid);
      this.contactsCache.delete(jid);
      this.contactsCache.set(jid, contactData);
      return contactData;
    }
    this.cacheStats.misses++;
    try {
      const contact = await StoreContact.findOne({ jid }).lean();
      if (contact) {
        this.addContactToCache(jid, contact);
      }
      return contact;
    } catch (error) {
      log(error, true);
      return null;
    }
  }
  async updateContact(jid, data) {
    if (!this.isConnected) return;
    const updatedContact = this.addContactToCache(jid, data);
    this.pendingUpdates.contacts.set(jid, updatedContact);
  }
  async getGroupMetadata(groupId) {
    if (!this.isConnected) return null;
    if (this.groupMetadataCache.has(groupId)) {
      this.cacheHits.set(groupId, (this.cacheHits.get(groupId) || 0) + 1);
      this.cacheTimestamps.set(groupId, Date.now());
      this.cacheStats.hits++;
      return this.groupMetadataCache.get(groupId);
    }
    this.cacheStats.misses++;
    try {
      const metadata = await StoreGroupMetadata.findOne({ groupId }).lean();
      if (metadata) {
        this.addGroupToCache(groupId, metadata);
      }
      return metadata;
    } catch (error) {
      log(error, true);
      return null;
    }
  }
  async updateGroupMetadata(groupId, metadata) {
    if (!this.isConnected) return;
    const updatedMetadata = this.addGroupToCache(groupId, metadata);
    this.pendingUpdates.groups.set(groupId, updatedMetadata);
  }
  startStatsLogger() {
    setInterval(() => {
      const stats = this.getCacheStats();
      const totalAccess = stats.contacts.hits + stats.contacts.misses;
      if (totalAccess > 0) {
        /*
        log('Cache Stats:', {
        hitRate: `${(stats.contacts.hitRate * 100).toFixed(1)}%`,
        contacts: stats.contacts.size,
        groups: `${stats.groups.size}/${this.maxCacheSize.groups}`,
        pendingUpdates: stats.pendingUpdates,
        ttlExpirations: stats.ttlExpirations,
        evictions: stats.evictions
        });
        */
      }
    }, 30000);
  }
  getCacheStats() {
    const totalAccess = this.cacheStats.hits + this.cacheStats.misses;
    return {
      contacts: {
        size: this.contactsCache.size,
        hits: this.cacheStats.hits,
        misses: this.cacheStats.misses,
        hitRate: totalAccess > 0 ? this.cacheStats.hits / totalAccess : 0,
      },
      groups: {
        size: this.groupMetadataCache.size,
        evictions: this.cacheStats.evictions
      },
      pendingUpdates: {
        contacts: this.pendingUpdates.contacts.size,
        groups: this.pendingUpdates.groups.size
      },
      ttlExpirations: this.cacheStats.ttlExpirations,
      evictions: this.cacheStats.evictions
    };
  }
  getCacheItemTTL(key) {
    if (!this.cacheTimestamps.has(key) || !this.groupMetadataCache.has(key)) {
      return null;
    }
    const timestamp = this.cacheTimestamps.get(key);
    const now = Date.now();
    const ttlMs = this.cacheTTL.groups - (now - timestamp);
    return {
      key,
      type: 'groups',
      ttlMs,
      ttlFormatted: this.formatTTL(ttlMs),
      expiresAt: new Date(timestamp + this.cacheTTL.groups),
      hitCount: this.cacheHits.get(key) || 0
    };
  }
  formatTTL(ms) {
    if (ms <= 0) return 'Expired';
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    return `${days}d ${hours}h ${minutes}m`;
  }
  getAllContacts() {
    return Array.from(this.contactsCache.values());
  }
  updateMessages(chatId, message, maxSize = 50) {
    if (!this.messages[chatId]) this.messages[chatId] = [];
    this.messages[chatId].push(message);
    this.messages[chatId] = this.messages[chatId].slice(-maxSize);
  }
  updateConversations(chatId, conversation, maxSize = 200) {
    if (!this.conversations[chatId]) this.conversations[chatId] = [];
    this.conversations[chatId].push(conversation);
    this.conversations[chatId] = this.conversations[chatId].slice(-maxSize);
  }
  updatePresences(chatId, presenceUpdate) {
    if (!this.presences[chatId]) this.presences[chatId] = {};
    Object.assign(this.presences[chatId], presenceUpdate);
  }
  addStatus(userId, statusMessage, maxSize = 20) {
    if (!this.status[userId]) this.status[userId] = [];
    this.status[userId].push(statusMessage);
    this.status[userId] = this.status[userId].slice(-maxSize);
  }
  deleteStatus(userId, messageId) {
    if (this.status[userId]) {
      this.status[userId] = this.status[userId].filter(
        status => status.key.id !== messageId
      );
    }
  }
  clearCache() {
    this.lidToJidCache.clear();
    this.contactsCache.clear();
    this.groupMetadataCache.clear();
    this.cacheHits.clear();
    this.cacheTimestamps.clear();
    this.pendingUpdates.contacts.clear();
    this.pendingUpdates.groups.clear();
    this.messages = {};
    this.conversations = {};
    this.presences = {};
    this.status = {};
  }
  clearGroupsCache() {
    this.groupMetadataCache.clear();
    for (const [key] of this.cacheHits) {
      if (this.groupMetadataCache.has(key)) {
        this.cacheHits.delete(key);
        this.cacheTimestamps.delete(key);
      }
    }
    this.pendingUpdates.groups.clear();
    log('Groups cache cleared');
  }
  clearGroupCacheByKey(groupId) {
    if (this.groupMetadataCache.has(groupId)) {
      this.groupMetadataCache.delete(groupId);
      this.cacheHits.delete(groupId);
      this.cacheTimestamps.delete(groupId);
    }
  }
  cleanupExpiredGroupsCache() {
    if (!this.isConnected) return;
    const now = Date.now();
    let expiredCount = 0;
    for (const [groupId, timestamp] of this.cacheTimestamps) {
      if (this.groupMetadataCache.has(groupId)) {
        if (now - timestamp > this.cacheTTL.groups) {
          this.groupMetadataCache.delete(groupId);
          this.cacheHits.delete(groupId);
          this.cacheTimestamps.delete(groupId);
          expiredCount++;
          this.cacheStats.ttlExpirations++;
        }
      }
    }
    if (expiredCount > 0) {
      log(`TTL cleanup: Removed ${expiredCount} expired group cache entries`);
    }
    if (this.groupMetadataCache.size > this.maxCacheSize.groups) {
      this.applyLRUCleanup('groups', this.groupMetadataCache);
    }
  }
  startCacheCleanup() {
    setInterval(() => {
      this.cleanupExpiredGroupsCache();
    }, this.cacheCleanupInterval);
  }
  applyLRUCleanup(type, cache) {
    const maxSize = this.maxCacheSize[type];
    const entries = Array.from(this.cacheHits.entries());
    if (entries.length > 0) {
      const relevantEntries = entries.filter(([key]) => cache.has(key));
      if (relevantEntries.length > 0) {
        const sortedByHits = relevantEntries.sort((a, b) => a[1] - b[1]);
        const itemsToRemove = cache.size - maxSize;
        for (let i = 0; i < itemsToRemove && i < sortedByHits.length; i++) {
          const [key] = sortedByHits[i];
          if (cache.has(key)) {
            cache.delete(key);
            this.cacheHits.delete(key);
            this.cacheTimestamps.delete(key);
            this.cacheStats.evictions++;
          }
        }
        log(`LRU cleanup: Removed ${itemsToRemove} ${type} due to size limit`);
      }
    }
  }
  async forceCleanup() {
    log('Manual groups cache cleanup initiated');
    this.cleanupExpiredGroupsCache();
  }
  findContacts(filterFn) {
    return Array.from(this.contactsCache.values()).filter(filterFn);
  }
  async resolveJid(id) {
    if (!id) return null;
    if (id.endsWith('@s.whatsapp.net')) {
      return jidNormalizedUser(id);
    }
    if (id.endsWith('@lid')) {
      return this.findJidByLid(id);
    }
    return id;
  }
  async findJidByLid(lid) {
    if (!lid) return null;
    const cachedJid = this.getJidFromLidCache(lid);
    if (cachedJid) {
      return cachedJid;
    }
    try {
      const contact = await StoreContact.findOne({ lid }).lean();
      const jid = contact?.jid || null;
      if (jid) {
        this.addLidToJidCache(lid, jid);
      }
      return jid;
    } catch (error) {
      log(error, true);
      return null;
    }
  }
  async loadMessage(remoteJid, id) {
    const messageArray = this.messages?.[remoteJid];
    if (messageArray) {
      const messageFromCache = messageArray.find(msg => msg?.key?.id === id);
      if (messageFromCache) {
        return messageFromCache;
      }
    }
    try {
      const chatHistory = await StoreMessages.findOne(
        { chatId: remoteJid, 'messages.key.id': id },
        { 'messages.$': 1 }
      ).lean();
      if (chatHistory && chatHistory.messages?.length > 0) {
        return chatHistory.messages[0];
      }
    } catch (error) {
      log(error, true);
    }
    return null;
  }
  async getArrayContacts(jids) {
    if (!this.isConnected || !jids || jids.length === 0) return [];
    const foundInCache = [];
    const jidsToFetchFromDb = [];
    for (const jid of jids) {
      if (this.contactsCache.has(jid)) {
        this.cacheStats.hits++;
        const contactData = this.contactsCache.get(jid);
        this.contactsCache.delete(jid);
        this.contactsCache.set(jid, contactData);
        foundInCache.push(contactData);
      } else {
        this.cacheStats.misses++;
        jidsToFetchFromDb.push(jid);
      }
    }
    let foundInDb = [];
    if (jidsToFetchFromDb.length > 0) {
      try {
        foundInDb = await StoreContact.find({ jid: { $in: jidsToFetchFromDb } }).lean();
        for (const contact of foundInDb) {
          this.addContactToCache(contact.jid, contact);
        }
      } catch (error) {
        log(error, true);
      }
    }
    return [...foundInCache, ...foundInDb];
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
      log(error, true);
    }
    return null;
  }
}

export default new DBStore();