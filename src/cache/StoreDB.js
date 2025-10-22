// ─── Info ─────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info src/cache/StoreDB.js ────────────────────

import log from '../lib/logger.js';
import config from '../../config.js';
import { jidNormalizedUser } from 'baileys';
import { GroupCache, ContactCache, MessageCache, StoryCache } from './index.js';
import { StoreContact, StoreMessages, StoreGroupMetadata } from '../../database/index.js';

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
      errors: 0,
      lidMappings: 0
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
      await GroupCache.bulkAddGroups(dirtyGroups);
      this.stats.batchedWrites += dirtyGroups.length;
      this.stats.skippedWrites += (groupsArray.length - dirtyGroups.length);
      log(`Bulk upsert complete: ${result.upsertedCount} inserted, ${result.modifiedCount} modified, ${groupsArray.length - dirtyGroups.length} skipped`);
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
      await ContactCache.bulkAddContacts(dirtyContacts);
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
      await GroupCache.bulkAddGroups(activeGroups);
      const recentContacts = await StoreContact.find({}).sort({ lastUpdated: -1 }).limit(5000).lean();
      await ContactCache.bulkAddContacts(recentContacts);
      log(`Redis cache warmed: ${activeGroups.length} groups, ${recentContacts.length} contacts (persistent)`);
    } catch (error) {
      this.stats.errors++;
      log(`Cache warming error: ${error.message}`, true);
    }
  }
  async getContact(jid) {
    if (!this.isConnected) return null;
    const fromCache = await ContactCache.getContact(jid);
    if (fromCache) {
      this.stats.redisHits++;
      return fromCache;
    }
    this.stats.redisMisses++;
    try {
      const contact = await StoreContact.findOne({ jid }).lean();
      this.stats.dbHits++;
      if (contact) {
        await ContactCache.addContact(jid, contact);
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
    let existing = await ContactCache.getContact(jid);
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
    await ContactCache.addContact(jid, updated);
    this.updateQueues.contacts.set(jid, updated);
  }
  async getArrayContacts(jids) {
    if (!this.isConnected || !jids || jids.length === 0) return [];
    const { contacts: foundInCache, missingJids } = await ContactCache.getArrayContacts(jids);
    this.stats.redisHits += foundInCache.length;
    this.stats.redisMisses += missingJids.length;
    if (missingJids.length === 0) return foundInCache;
    let foundInDb = [];
    try {
      foundInDb = await StoreContact.find({ jid: { $in: missingJids } }).lean();
      this.stats.dbHits += foundInDb.length;
      if (foundInDb.length > 0) {
        await ContactCache.bulkAddContacts(foundInDb);
      }
    } catch (error) {
      this.stats.errors++;
      log(`Get array contacts error: ${error.message}`, true);
    }
    return [...foundInCache, ...foundInDb];
  }
  async deleteContact(jid) {
    if (!this.isConnected || !jid) return false;
    try {
      log(`Deleting contact: ${jid}`);
      await ContactCache.deleteContact(jid);
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
      await ContactCache.bulkDeleteContacts(jids);
      for (const jid of jids) {
        this.updateQueues.contacts.delete(jid);
      }
      const deleteResult = await StoreContact.deleteMany({ jid: { $in: jids } });
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
  async handleLIDMapping(lid, jid) {
    const normalizedLid = lid?.includes('@') ? lid : lid ? `${lid}@lid` : null;
    const normalizedJid = jid?.includes('@') ? jid : jid ? `${jid}@s.whatsapp.net` : null;
    if (!normalizedLid && !normalizedJid) return;
    try {
      if (normalizedLid && normalizedJid) {
        await ContactCache.cacheLidMapping(normalizedLid, normalizedJid);
        this.stats.lidMappings++;
      }
      let existing = null;
      if (normalizedJid) {
        existing = await ContactCache.getContact(normalizedJid);
      }
      if (!existing && (normalizedJid || normalizedLid)) {
        try {
          const query = {};
          if (normalizedJid) query.jid = normalizedJid;
          else if (normalizedLid) query.lid = normalizedLid;
          existing = await StoreContact.findOne(query).lean();
        } catch (error) {
          log(`Error fetching contact for LID mapping: ${error.message}`, true);
        }
      }
      const merged = {
        ...(existing || {}),
        ...(normalizedJid && { jid: normalizedJid }),
        ...(normalizedLid && { lid: normalizedLid })
      };
      if (merged.jid) {
        const sanitized = this.sanitizeContactData(merged, existing);
        await ContactCache.addContact(merged.jid, sanitized);
        this.updateQueues.contacts.set(merged.jid, sanitized);
        log(`LID mapping queued: ${normalizedLid || 'null'} ↔ ${normalizedJid || 'null'}`);
      }
    } catch (error) {
      this.stats.errors++;
      log(`handleLIDMapping error: ${error.message}`, true);
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
    const cached = await ContactCache.findJidByLid(lid);
    if (cached) {
      this.stats.redisHits++;
      return cached;
    }
    this.stats.redisMisses++;
    try {
      const contact = await StoreContact.findOne({ lid }).lean();
      const jid = contact?.jid || null;
      if (jid) {
        await ContactCache.cacheLidMapping(lid, jid);
        this.stats.dbHits++;
      } else {
        this.stats.dbMisses++;
      }
      return jid;
    } catch (error) {
      this.stats.errors++;
      log(`Database lookup failed for LID ${lid}: ${error.message}`, true);
      return null;
    }
  }
  async getLIDForPN(phoneNumber) {
    const normalizedPN = phoneNumber?.includes('@') ? phoneNumber : `${phoneNumber}@s.whatsapp.net`;
    const cachedLid = await ContactCache.findLidByJid(normalizedPN);
    if (cachedLid) {
      this.stats.redisHits++;
      return cachedLid;
    }
    this.stats.redisMisses++;
    try {
      const contact = await StoreContact.findOne({ jid: normalizedPN }).lean();
      const lid = contact?.lid || null;
      if (lid) {
        await ContactCache.cacheLidMapping(lid, normalizedPN);
        this.stats.dbHits++;
      } else {
        this.stats.dbMisses++;
      }
      return lid;
    } catch (error) {
      this.stats.errors++;
      log(`getLIDForPN error: ${error.message}`, true);
      return null;
    }
  }
  async getPNForLID(lid) {
    return await this.findJidByLid(lid);
  }
  async getGroupMetadata(groupId) {
    if (!this.isConnected) return null;
    const fromCache = await GroupCache.getGroup(groupId);
    if (fromCache) {
      this.stats.redisHits++;
      return fromCache;
    }
    this.stats.redisMisses++;
    try {
      const metadata = await StoreGroupMetadata.findOne({ groupId }).lean();
      this.stats.dbHits++;
      if (metadata) {
        await GroupCache.addGroup(groupId, metadata);
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
    let existing = await GroupCache.getGroup(groupId);
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
    await GroupCache.addGroup(groupId, updated);
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
  async getAllGroups(projection = null) {
    if (!this.isConnected) return [];
    try {
      const cachedGroups = await GroupCache.getAllCachedGroups();
      if (cachedGroups.length > 0) {
        this.stats.redisHits += cachedGroups.length;
        if (projection) {
          return cachedGroups.map(group => {
            const filtered = {};
            for (const key in projection) {
              if (projection[key] === 1 && group[key] !== undefined) {
                filtered[key] = group[key];
              }
            }
            return filtered;
          });
        }
        return cachedGroups;
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
        await GroupCache.bulkAddGroups(groups);
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
      const { groups: foundInCache, missingIds } = await GroupCache.getArrayGroups(groupIds);
      this.stats.redisHits += foundInCache.length;
      this.stats.redisMisses += missingIds.length;
      if (missingIds.length === 0) {
        return foundInCache;
      }
      log(`Partial cache miss: ${missingIds.length}/${groupIds.length} groups, fetching from DB...`);
      const query = StoreGroupMetadata.find({ groupId: { $in: missingIds } });
      if (projection) {
        query.select(projection);
      }
      const foundInDb = await query.lean();
      this.stats.dbHits += foundInDb.length;
      if (foundInDb.length > 0) {
        await GroupCache.bulkAddGroups(foundInDb);
        log(`Cached ${foundInDb.length} missing groups`);
      }
      return [...foundInCache, ...foundInDb];
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
      await GroupCache.deleteGroup(groupId);
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
      await GroupCache.bulkDeleteGroups(groupIds);
      for (const groupId of groupIds) {
        this.updateQueues.groups.delete(groupId);
      }
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
  clearGroupsCache() {
    this.updateQueues.groups.clear();
    log('Groups queue cleared');
  }
  async updateMessages(chatId, message, maxSize = 50) {
    try {
      await MessageCache.addMessage(chatId, message, maxSize);
    } catch (error) {
      log(`Update messages error: ${error.message}`, true);
    }
  }
  async getMessages(chatId, limit = 50) {
    try {
      const cached = await MessageCache.getMessages(chatId, limit);
      if (cached !== null) {
        this.stats.redisHits++;
        return cached;
      }
      this.stats.redisMisses++;
      return [];
    } catch (error) {
      log(`Get messages error: ${error.message}`, true);
      return [];
    }
  }
  async loadMessage(remoteJid, id) {
    try {
      const messageFromCache = await MessageCache.getSpecificMessage(remoteJid, id);
      if (messageFromCache) {
        this.stats.redisHits++;
        return messageFromCache;
      }
      this.stats.redisMisses++;
    } catch (error) {
      log(`Load message from Redis error: ${error.message}`, true);
    }
    try {
      const chatHistory = await StoreMessages.findOne(
        { chatId: remoteJid, 'messages.key.id': id },
        { 'messages.$': 1 }
      ).lean();
      this.stats.dbHits++;
      return chatHistory?.messages?.[0] || null;
    } catch (error) {
      this.stats.errors++;
      log(`Load message error: ${error.message}`, true);
      return null;
    }
  }
  async updateConversations(chatId, conversation, maxSize = 200) {
    try {
      await MessageCache.addConversation(chatId, conversation, maxSize);
    } catch (error) {
      log(`Update conversations error: ${error.message}`, true);
    }
  }
  async updatePresences(chatId, presenceUpdate) {
    try {
      await MessageCache.updatePresences(chatId, presenceUpdate);
    } catch (error) {
      log(`Update presences error: ${error.message}`, true);
    }
  }
  async getPresences(chatId) {
    try {
      const presences = await MessageCache.getPresences(chatId);
      if (presences && Object.keys(presences).length > 0) {
        this.stats.redisHits++;
      } else {
        this.stats.redisMisses++;
      }
      return presences;
    } catch (error) {
      log(`Get presences error: ${error.message}`, true);
      return {};
    }
  }
  async deletePresence(chatId) {
    try {
      return await MessageCache.deletePresence(chatId);
    } catch (error) {
      log(`Delete presence error: ${error.message}`, true);
      return false;
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
        this.stats.redisHits++;
        return cached;
      }
      this.stats.redisMisses++;
      const { StoreStory } = await import('../../database/index.js');
      const doc = await StoreStory.findOne({ userId }).lean();
      const stories = doc?.statuses || [];
      this.stats.dbHits++;
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
        this.stats.redisHits++;
        return cached;
      }
      this.stats.redisMisses++;
      const { StoreStory } = await import('../../database/index.js');
      const doc = await StoreStory.findOne({ userId }).lean();
      const story = doc?.statuses?.find(s => s.key?.id === messageId);
      this.stats.dbHits++;
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
  async getUsersWithStories() {
    try {
      const cachedUsers = await StoryCache.getUsersWithStories();
      if (cachedUsers.length > 0) {
        this.stats.redisHits++;
        return cachedUsers.map(userId => ({ userId, storyCount: 1 }));
      }
      this.stats.redisMisses++;
      const { StoreStory } = await import('../../database/index.js');
      const usersWithStories = await StoreStory.aggregate([
        {
          $project: {
            userId: 1,
            storyCount: { $size: "$statuses" }
          }
        },
        {
          $match: {
            storyCount: { $gt: 0 }
          }
        }
      ]);
      this.stats.dbHits++;
      return usersWithStories;
    } catch (error) {
      this.stats.errors++;
      log(`getUsersWithStories error: ${error.message}`, true);
      return [];
    }
  }
  saveConversation(chatId, conversationData, maxSize) {
    try {
      this.updateConversations(chatId, conversationData, maxSize);
      import('../../database/index.js')
        .then(({ StoreMessages }) => StoreMessages.addConversation(chatId, conversationData))
        .catch(err => {
          this.stats.errors++;
          log(`Conversation DB write error: ${err.message}`, true);
        });
    } catch (error) {
      this.stats.errors++;
      log(`saveConversation error: ${error.message}`, true);
    }
  }
  saveMessage(chatId, message, maxSize) {
    try {
      this.updateMessages(chatId, message, maxSize);
      import('../../database/index.js')
        .then(({ StoreMessages }) => StoreMessages.addMessage(chatId, message))
        .catch(err => {
          this.stats.errors++;
          log(`Message DB write error: ${err.message}`, true);
        });
    } catch (error) {
      this.stats.errors++;
      log(`saveMessage error: ${error.message}`, true);
    }
  }
  async saveStoryStatus(userId, statusMessage, maxSize) {
    try {
      await this.addStatus(userId, statusMessage, maxSize);
    } catch (error) {
      this.stats.errors++;
      log(`saveStoryStatus error: ${error.message}`, true);
    }
  }
  async clearCache() {
    this.updateQueues.contacts.clear();
    this.updateQueues.groups.clear();
    try {
      await Promise.all([
        ContactCache.clearAllCaches(),
        GroupCache.clearAllCaches(),
        MessageCache.clearAllCaches(),
        StoryCache.clearAllCaches()
      ]);
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
    setInterval(async () => {
      const stats = await this.getStats();
      if (stats.total > 0) {
        // log('Store Stats:', stats);
      }
    }, 30000);
  }
  async getStats() {
    const total = this.stats.redisHits + this.stats.redisMisses;
    const [contactStats, groupStats, messageStats, storyStats] = await Promise.all([
      ContactCache.getStats(),
      GroupCache.getStats(),
      MessageCache.getStats(),
      StoryCache.getStats()
    ]);
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
      lidMappings: this.stats.lidMappings,
      cacheStats: {
        contacts: contactStats,
        groups: groupStats,
        messages: messageStats,
        stories: storyStats
      },
      errors: this.stats.errors,
      total
    };
  }
}

const store = new DBStore();
export default store;