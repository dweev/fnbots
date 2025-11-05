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
import { StoreContact, StoreMessages, StoreGroupMetadata, StoreStory } from '../../database/index.js';

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
    this.pendingFetches = new Map();
    this.lidMappingLocks = new Map();
    this.lidMappingPromises = new Map();
    this.jidResolutionCache = new Map();
    this.circuitBreaker = {
      failures: 0,
      lastFailure: 0,
      threshold: 5,
      timeout: 30000,
      state: 'CLOSED'
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
      lidMappings: 0,
      coalescedRequests: 0,
      circuitBreakerTrips: 0
    };
    this.isConnected = false;
    this.authStore = null;
    this.fn = null;
  }

  // ─── Info Initialization ──────────────────────────
  /*
   * Created with ❤️ and 💦 By FN
   * Follow https://github.com/Terror-Machine
   * Feel Free To Use
   */
  // ─── Info Initialization Methods ──────────────────

  setAuthStore(authStore) {
    this.authStore = authStore;
    log('AuthStore injected into DBStore');
  }

  setSocket(fn) {
    this.fn = fn;
    log('Socket injected into DBStore');
  }

  init() {
    this.startBatchProcessor();
    this.startCacheCleanup();
    this.startStatsLogger();
    this.startCacheRefresh();
    this.startCircuitBreakerReset();
  }

  async connect() {
    this.isConnected = true;
    log('Warming up Redis cache...');
    await this.warmRedisCache();
    log('Redis + MongoDB ready');
    return this;
  }

  async disconnect() {
    await this.flushAllBatches();
    this.isConnected = false;
    log('Store disconnected');
  }

  // ─── Info Circuit Breaker ─────────────────────────
  /*
   * Created with ❤️ and 💦 By FN
   * Follow https://github.com/Terror-Machine
   * Feel Free To Use
   */
  // ─── Info Circuit Breaker Methods ─────────────────

  checkCircuitBreaker() {
    if (this.circuitBreaker.state === 'OPEN') {
      const now = Date.now();
      if (now - this.circuitBreaker.lastFailure > this.circuitBreaker.timeout) {
        this.circuitBreaker.state = 'HALF_OPEN';
        this.circuitBreaker.failures = 0;
        log('Circuit breaker entering HALF_OPEN state');
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
  }

  recordCircuitBreakerSuccess() {
    if (this.circuitBreaker.state === 'HALF_OPEN') {
      this.circuitBreaker.state = 'CLOSED';
      this.circuitBreaker.failures = 0;
      log('Circuit breaker reset to CLOSED');
    }
  }

  recordCircuitBreakerFailure() {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailure = Date.now();
    if (this.circuitBreaker.failures >= this.circuitBreaker.threshold) {
      this.circuitBreaker.state = 'OPEN';
      this.stats.circuitBreakerTrips++;
      log(`Circuit breaker tripped: ${this.circuitBreaker.failures} failures`, true);
    }
  }

  startCircuitBreakerReset() {
    setInterval(() => {
      if (this.circuitBreaker.state === 'CLOSED' && this.circuitBreaker.failures > 0) {
        this.circuitBreaker.failures = Math.max(0, this.circuitBreaker.failures - 1);
      }
    }, 60000);
  }

  // ─── Info Data Sanitization ───────────────────────
  /*
   * Created with ❤️ and 💦 By FN
   * Follow https://github.com/Terror-Machine
   * Feel Free To Use
   */
  // ─── Info Data Sanitization Methods ───────────────

  sanitizeParticipants(participants) {
    if (!Array.isArray(participants)) return [];
    const participantsMap = new Map();
    for (const p of participants) {
      let jid;
      if (p.phoneNumber) {
        jid = p.phoneNumber;
      } else if (p.id && p.id.includes('@s.whatsapp.net')) {
        jid = p.id;
      } else {
        jid = p.id;
      }
      let lid = '';
      if (p.lid) {
        lid = p.lid;
      } else if (p.id && p.id.includes('@lid')) {
        lid = p.id;
      }
      const normalizedKey = jid.replace(/@.*$/, '');
      if (participantsMap.has(normalizedKey)) {
        const existing = participantsMap.get(normalizedKey);
        participantsMap.set(normalizedKey, {
          ...existing,
          lid: lid || existing.lid,
          admin: p.admin || existing.admin
        });
      } else {
        participantsMap.set(normalizedKey, {
          id: jid,
          phoneNumber: jid,
          lid: lid,
          admin: p.admin || null
        });
      }
    }
    return Array.from(participantsMap.values());
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

  // ─── Info Change Detection ────────────────────────
  /*
   * Created with ❤️ and 💦 By FN
   * Follow https://github.com/Terror-Machine
   * Feel Free To Use
   */
  // ─── Info Change Detection Methods ────────────────

  hasParticipantsChanged(existingParticipants = [], updatedParticipants = []) {
    if (existingParticipants.length !== updatedParticipants.length) {
      return true;
    }
    const existingMap = new Map(
      existingParticipants.map((p) => {
        const key = p.phoneNumber || p.id;
        return [
          key,
          {
            phoneNumber: p.phoneNumber || p.id,
            lid: p.lid || '',
            admin: p.admin || null
          }
        ];
      })
    );
    for (const updatedP of updatedParticipants) {
      const key = updatedP.phoneNumber || updatedP.id;
      const existing = existingMap.get(key);
      if (!existing) {
        return true;
      }
      const updatedPhoneNumber = updatedP.phoneNumber || updatedP.id;
      const updatedLid = updatedP.lid || '';
      const updatedAdmin = updatedP.admin || null;
      if (existing.phoneNumber !== updatedPhoneNumber || existing.lid !== updatedLid || existing.admin !== updatedAdmin) {
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
      const primitiveFields = ['subject', 'subjectOwner', 'subjectOwnerPn', 'subjectTime', 'owner', 'ownerPn', 'owner_country_code', 'desc', 'descOwner', 'descOwnerPn', 'descId', 'descTime', 'creation', 'size', 'restrict', 'announce', 'isCommunity', 'isCommunityAnnounce', 'notify', 'addressingMode', 'linkedParent', 'joinApprovalMode', 'memberAddMode', 'ephemeralDuration'];
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

  // ─── Info Batch Processing ───────────────────────
  /*
   * Created with ❤️ and 💦 By FN
   * Follow https://github.com/Terror-Machine
   * Feel Free To Use
   */
  // ─── Info Batch Processing Methods ────────────────

  startBatchProcessor() {
    setInterval(() => this.flushAllBatches(), this.batchInterval);
  }

  startCacheRefresh() {
    setInterval(
      async () => {
        if (!this.isConnected || !this.fn) return;
        try {
          log('Running scheduled group cache refresh...');
          const participatingGroups = await this.fn.groupFetchAllParticipating();
          if (participatingGroups && Object.keys(participatingGroups).length > 0) {
            const groupsToUpdate = Object.values(participatingGroups);
            const currentGroupIds = new Set(Object.keys(participatingGroups));
            await this.bulkUpsertGroups(groupsToUpdate);
            const syncResult = await this.syncStaleGroups(currentGroupIds);
            log(`Cache refresh complete: ${groupsToUpdate.length} groups updated, ${syncResult.removed} stale removed`);
          }
        } catch (error) {
          this.stats.errors++;
          log(`Scheduled cache refresh error: ${error.message}`, true);
        }
      },
      23 * 60 * 60 * 1000
    );
  }

  async flushAllBatches() {
    if (!this.isConnected) return;
    await Promise.all([this.flushBatch('contacts'), this.flushBatch('groups')]);
  }

  async flushBatch(type) {
    while (this.queueLocks[type]) {
      await new Promise((resolve) => setTimeout(resolve, 100));
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

  // ─── Info Group Operations ────────────────────────
  /*
   * Created with ❤️ and 💦 By FN
   * Follow https://github.com/Terror-Machine
   * Feel Free To Use
   */
  // ─── Info Group Operations Methods ────────────────

  async bulkUpsertGroups(groupsArray) {
    if (!this.isConnected || !groupsArray || groupsArray.length === 0) {
      return { upsertedCount: 0, modifiedCount: 0 };
    }
    const BATCH_SIZE = 500;
    let totalUpserted = 0;
    let totalModified = 0;
    try {
      log(`Bulk upserting ${groupsArray.length} groups in batches of ${BATCH_SIZE}...`);
      for (let i = 0; i < groupsArray.length; i += BATCH_SIZE) {
        const chunk = groupsArray.slice(i, i + BATCH_SIZE);
        const chunkIds = chunk.map((g) => g.id || g.groupId);
        const existingGroups = await StoreGroupMetadata.find({
          groupId: { $in: chunkIds }
        }).lean();
        const existingMap = new Map(existingGroups.map((g) => [g.groupId, g]));
        const sanitizedGroups = chunk.map((rawGroup) => {
          const groupId = rawGroup.id || rawGroup.groupId;
          const existing = existingMap.get(groupId);
          return this.sanitizeGroupData(rawGroup, existing);
        });
        const dirtyGroups = sanitizedGroups.filter((updated) => {
          const existing = existingMap.get(updated.groupId);
          return !existing || this.hasChanges(existing, updated, 'groups');
        });
        if (dirtyGroups.length === 0) {
          this.stats.skippedWrites += chunk.length;
          continue;
        }
        const operations = dirtyGroups.map((group) => ({
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
        totalUpserted += result.upsertedCount;
        totalModified += result.modifiedCount;
        this.stats.batchedWrites += dirtyGroups.length;
        this.stats.skippedWrites += chunk.length - dirtyGroups.length;
        log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${result.upsertedCount} inserted, ${result.modifiedCount} modified`);
      }
      log(`Bulk upsert complete: ${totalUpserted} inserted, ${totalModified} modified`);
      return { upsertedCount: totalUpserted, modifiedCount: totalModified };
    } catch (error) {
      this.stats.errors++;
      log(`bulkUpsertGroups error: ${error.message}`, true);
      throw error;
    }
  }

  async getGroupMetadata(groupId) {
    if (!this.isConnected) return null;
    const fromCache = await GroupCache.getGroup(groupId);
    if (fromCache) {
      this.stats.redisHits++;
      return fromCache;
    }
    this.stats.redisMisses++;
    if (this.pendingFetches.has(groupId)) {
      this.stats.coalescedRequests++;
      log(`Coalescing fetch request for group: ${groupId}`);
      return await this.pendingFetches.get(groupId);
    }
    const fetchPromise = this._fetchGroupMetadata(groupId);
    this.pendingFetches.set(groupId, fetchPromise);
    try {
      const metadata = await fetchPromise;
      return metadata;
    } finally {
      this.pendingFetches.delete(groupId);
    }
  }

  async _fetchGroupMetadata(groupId) {
    try {
      let metadata = await StoreGroupMetadata.findOne({ groupId }).lean();
      if (!metadata) {
        this.stats.dbMisses++;
        if (this.fn) {
          try {
            this.checkCircuitBreaker();
            const freshMetadata = await this.fn.groupMetadata(groupId);
            if (freshMetadata) {
              await this.updateGroupMetadata(groupId, freshMetadata);
              metadata = freshMetadata;
              this.recordCircuitBreakerSuccess();
              log(`Fetched fresh metadata for group: ${groupId}`);
            }
          } catch (fetchError) {
            this.recordCircuitBreakerFailure();
            log(`Failed to fetch metadata from WA: ${fetchError.message}`, true);
            throw fetchError;
          }
        }
      } else {
        this.stats.dbHits++;
        if (this.fn) {
          this._refreshGroupInBackground(groupId).catch((err) => {
            log(`Background refresh failed: ${err.message}`, true);
          });
        }
      }
      if (metadata) {
        await GroupCache.addGroup(groupId, metadata);
      }
      return metadata;
    } catch (error) {
      this.stats.errors++;
      log(`_fetchGroupMetadata error: ${error.message}`, true);
      throw error;
    }
  }

  async _refreshGroupInBackground(groupId) {
    try {
      this.checkCircuitBreaker();
      const freshMetadata = await this.fn.groupMetadata(groupId);
      if (freshMetadata) {
        await this.updateGroupMetadata(groupId, freshMetadata);
        this.recordCircuitBreakerSuccess();
        log(`Background refresh complete: ${groupId}`);
      }
    } catch (error) {
      this.recordCircuitBreakerFailure();
      log(`Background refresh silent fail: ${error.message}`, true);
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
      this.checkCircuitBreaker();
      const freshMetadata = await fn.groupMetadata(groupId);
      if (freshMetadata) {
        await this.updateGroupMetadata(groupId, freshMetadata);
        this.recordCircuitBreakerSuccess();
        return freshMetadata;
      }
    } catch (error) {
      this.stats.errors++;
      this.recordCircuitBreakerFailure();
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
          return cachedGroups.map((group) => {
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
      const storedGroupIds = storedGroups.map((g) => g.groupId);
      log(`Stored: ${storedGroupIds.length} groups, Active: ${activeGroupIds.size} groups`);
      const staleGroupIds = storedGroupIds.filter((id) => !activeGroupIds.has(id));
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

  // ─── Info Contact Operations ──────────────────────
  /*
   * Created with ❤️ and 💦 By FN
   * Follow https://github.com/Terror-Machine
   * Feel Free To Use
   */
  // ─── Info Contact Operations Methods ──────────────

  async bulkUpsertContacts(contactsArray) {
    if (!this.isConnected || !contactsArray || contactsArray.length === 0) {
      return { upsertedCount: 0, modifiedCount: 0 };
    }
    const BATCH_SIZE = 500;
    let totalUpserted = 0;
    let totalModified = 0;
    try {
      log(`Bulk upserting ${contactsArray.length} contacts in batches of ${BATCH_SIZE}...`);
      for (let i = 0; i < contactsArray.length; i += BATCH_SIZE) {
        const chunk = contactsArray.slice(i, i + BATCH_SIZE);
        const jids = chunk.map((c) => c.jid);
        const existingContacts = await StoreContact.find({ jid: { $in: jids } }).lean();
        const existingMap = new Map(existingContacts.map((c) => [c.jid, c]));
        const sanitizedContacts = chunk.map((rawContact) => {
          const existing = existingMap.get(rawContact.jid);
          return this.sanitizeContactData(rawContact, existing);
        });
        const dirtyContacts = sanitizedContacts.filter((updated) => {
          const existing = existingMap.get(updated.jid);
          return !existing || this.hasChanges(existing, updated, 'contacts');
        });
        if (dirtyContacts.length === 0) {
          this.stats.skippedWrites += chunk.length;
          continue;
        }
        const operations = dirtyContacts.map((contact) => ({
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
        totalUpserted += result.upsertedCount;
        totalModified += result.modifiedCount;
        this.stats.batchedWrites += dirtyContacts.length;
        this.stats.skippedWrites += chunk.length - dirtyContacts.length;
        log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${result.upsertedCount} inserted, ${result.modifiedCount} modified`);
      }
      log(`Bulk upsert complete: ${totalUpserted} inserted, ${totalModified} modified`);
      return { upsertedCount: totalUpserted, modifiedCount: totalModified };
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
      log(`Redis cache warmed: ${activeGroups.length} groups, ${recentContacts.length} contacts`);
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

  async getAllContacts() {
    if (!this.isConnected) return [];
    try {
      const contacts = await StoreContact.find({
        jid: { $regex: /@s\.whatsapp\.net$/ }
      }).lean();
      this.stats.dbHits += contacts.length;
      if (contacts.length > 0) {
        await ContactCache.bulkAddContacts(contacts);
      }
      return contacts;
    } catch (error) {
      this.stats.errors++;
      log(`getAllContacts error: ${error.message}`, true);
      return [];
    }
  }

  // ─── Info LID & JID Resolution ────────────────────
  /*
   * Created with ❤️ and 💦 By FN
   * Follow https://github.com/Terror-Machine
   * Feel Free To Use
   */
  // ─── Info LID & JID Resolution Methods ────────────

  async handleLIDMapping(lid, jid) {
    const normalizedLid = lid?.includes('@') ? lid : lid ? `${lid}@lid` : null;
    const normalizedJid = jid?.includes('@') ? jid : jid ? `${jid}@s.whatsapp.net` : null;
    if (!normalizedLid && !normalizedJid) return;
    const lockKey = normalizedJid || normalizedLid;
    if (this.lidMappingPromises.has(lockKey)) {
      await log(`[LID] Coalescing mapping request for ${lockKey}`);
      return this.lidMappingPromises.get(lockKey);
    }
    const promise = this._doLIDMapping(normalizedLid, normalizedJid);
    this.lidMappingPromises.set(lockKey, promise);
    try {
      return await promise;
    } finally {
      this.lidMappingPromises.delete(lockKey);
    }
  }

  async _doLIDMapping(normalizedLid, normalizedJid) {
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
        const query = {};
        if (normalizedJid) query.jid = normalizedJid;
        else if (normalizedLid) query.lid = normalizedLid;
        try {
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
        await log(`LID mapping completed: ${normalizedLid || 'null'} ↔ ${normalizedJid || 'null'}`);
      }
    } catch (error) {
      this.stats.errors++;
      await log(`_doLIDMapping error: ${error.message}`, true);
      throw error;
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

  async batchResolveJids(ids) {
    if (!ids || ids.length === 0) return [];
    const results = [];
    const toResolve = [];
    for (const id of ids) {
      if (!id) {
        results.push(null);
        continue;
      }
      if (id.endsWith('@s.whatsapp.net')) {
        results.push(jidNormalizedUser(id));
        continue;
      }
      if (!id.endsWith('@lid')) {
        results.push(id);
        continue;
      }
      const cached = this.jidResolutionCache.get(id);
      if (cached) {
        results.push(cached);
        continue;
      }
      toResolve.push(id);
      results.push(null);
    }
    if (toResolve.length === 0) return results;
    const cacheResults = await ContactCache.batchFindJidByLid(toResolve);
    const stillMissing = [];
    for (let i = 0; i < toResolve.length; i++) {
      const lid = toResolve[i];
      const jid = cacheResults[i];
      if (jid) {
        this.jidResolutionCache.set(lid, jid);
        const idx = ids.indexOf(lid);
        if (idx !== -1) results[idx] = jid;
      } else {
        stillMissing.push(lid);
      }
    }
    if (stillMissing.length > 0) {
      try {
        const dbContacts = await StoreContact.find({ lid: { $in: stillMissing } }).lean();
        for (const contact of dbContacts) {
          if (contact.jid && contact.lid) {
            this.jidResolutionCache.set(contact.lid, contact.jid);
            await ContactCache.cacheLidMapping(contact.lid, contact.jid);
            const idx = ids.indexOf(contact.lid);
            if (idx !== -1) results[idx] = contact.jid;
          }
        }
      } catch (error) {
        this.stats.errors++;
        log(`Batch DB lookup failed: ${error.message}`, true);
      }
    }
    return results;
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

  // ─── Info Message Operations ──────────────────────
  /*
   * Created with ❤️ and 💦 By FN
   * Follow https://github.com/Terror-Machine
   * Feel Free To Use
   */
  // ─── Info Message Operations Methods ──────────────

  async updateMessages(chatId, message, maxSize = 50) {
    try {
      await MessageCache.addMessage(chatId, message, maxSize);
      import('../../database/index.js')
        .then(({ StoreMessages }) => StoreMessages.addMessage(chatId, message))
        .catch((err) => {
          this.stats.errors++;
          log(`Message DB write error: ${err.message}`, true);
        });
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

  async getConversations(chatId, limit = 20) {
    if (!this.isConnected) return [];
    try {
      const cached = await MessageCache.getConversations(chatId, limit);
      if (cached !== null && cached.length > 0) {
        this.stats.redisHits++;
        return cached;
      }
      this.stats.redisMisses++;
      const chatData = await StoreMessages.findOne({ chatId }).lean();
      if (!chatData || !chatData.conversations || chatData.conversations.length === 0) {
        this.stats.dbMisses++;
        return [];
      }
      this.stats.dbHits++;
      const conversations = chatData.conversations;
      const conversationsToCache = conversations.slice(-limit);
      if (conversationsToCache.length > 0) {
        await MessageCache.populateCacheFromConversations(chatId, conversationsToCache, limit);
      }
      return conversationsToCache;
    } catch (error) {
      this.stats.errors++;
      log(`Get conversations error: ${error.message}`, true);
      return [];
    }
  }

  async getPrivateChatStats() {
    if (!this.isConnected) return [];
    try {
      const sortedUsers = await StoreMessages.aggregate([
        {
          $match: {
            chatId: { $regex: /@s\.whatsapp\.net$/ }
          }
        },
        {
          $unwind: '$messages'
        },
        {
          $match: {
            'messages.fromMe': false,
            'messages.sender': { $exists: true }
          }
        },
        {
          $match: {
            'messages.type': { $nin: ['reactionMessage', 'protocolMessage'] }
          }
        },
        {
          $group: {
            _id: '$messages.sender',
            count: { $sum: 1 }
          }
        },
        {
          $sort: {
            count: -1
          }
        }
      ]);
      this.stats.dbHits++;
      return sortedUsers;
    } catch (error) {
      this.stats.errors++;
      log(`Get private chat stats error: ${error.message}`, true);
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
      const chatHistory = await StoreMessages.findOne({ chatId: remoteJid, 'messages.key.id': id }, { 'messages.$': 1 }).lean();
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
      import('../../database/index.js')
        .then(({ StoreMessages }) => StoreMessages.addConversation(chatId, conversation, maxSize))
        .catch((err) => {
          this.stats.errors++;
          log(`Conversation DB write error: ${err.message}`, true);
        });
    } catch (error) {
      log(`Update conversations error: ${error.message}`, true);
    }
  }

  async saveConversation(chatId, conversationData, maxSize = 200) {
    try {
      await this.updateConversations(chatId, conversationData, maxSize);
      return true;
    } catch (error) {
      this.stats.errors++;
      log(`saveConversation error: ${error.message}`, true);
      return false;
    }
  }

  async saveMessage(chatId, message, maxSize) {
    try {
      await this.updateMessages(chatId, message, maxSize);
      return true;
    } catch (error) {
      this.stats.errors++;
      log(`saveMessage error: ${error.message}`, true);
      return false;
    }
  }

  // ─── Info Presence Operations ─────────────────────
  /*
   * Created with ❤️ and 💦 By FN
   * Follow https://github.com/Terror-Machine
   * Feel Free To Use
   */
  // ─── Info Presence Operations Methods ─────────────

  async updatePresences(chatId, presenceUpdate) {
    try {
      await MessageCache.updatePresences(chatId, presenceUpdate);
      import('../../database/index.js')
        .then(({ StoreMessages }) => StoreMessages.updatePresences(chatId, presenceUpdate))
        .catch((err) => {
          this.stats.errors++;
          log(`Presence DB write error: ${err.message}`, true);
        });
      return true;
    } catch (error) {
      log(`Update presences error: ${error.message}`, true);
      return false;
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

  // ─── Info Story Operations ────────────────────────
  /*
   * Created with ❤️ and 💦 By FN
   * Follow https://github.com/Terror-Machine
   * Feel Free To Use
   */
  // ─── Info Story Operations Methods ────────────────

  async addStatus(userId, statusMessage, maxSize = 20) {
    try {
      await StoryCache.addStatus(userId, statusMessage, maxSize);
      import('../../database/index.js')
        .then(({ StoreStory }) => StoreStory.addStatus(userId, statusMessage, maxSize))
        .catch((err) => {
          this.stats.errors++;
          log(`Story DB write error: ${err.message}`, true);
        });
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
      const doc = await StoreStory.findOne({ userId }).lean();
      const story = doc?.statuses?.find((s) => s.key?.id === messageId);
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
      import('../../database/index.js')
        .then(({ StoreStory }) => StoreStory.deleteStatus(userId, messageId))
        .catch((err) => {
          this.stats.errors++;
          log(`Story DB delete error: ${err.message}`, true);
        });
    } catch (error) {
      log(`Delete status error: ${error.message}`, true);
    }
  }

  async bulkDeleteStatuses(userId, messageIds) {
    try {
      await StoryCache.bulkDeleteStatuses(userId, messageIds);
      import('../../database/index.js')
        .then(({ StoreStory }) => StoreStory.bulkDeleteStatuses(userId, messageIds))
        .then((result) => {
          log(`Bulk deleted ${result.modifiedCount} stories from DB for ${userId}`);
        })
        .catch((err) => {
          this.stats.errors++;
          log(`Bulk story DB delete error: ${err.message}`, true);
        });
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
        return cachedUsers.map((userId) => ({ userId, storyCount: 1 }));
      }
      this.stats.redisMisses++;
      const usersWithStories = await StoreStory.aggregate([
        {
          $project: {
            userId: 1,
            storyCount: { $size: '$statuses' }
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

  async saveStoryStatus(userId, statusMessage, maxSize) {
    try {
      await this.addStatus(userId, statusMessage, maxSize);
    } catch (error) {
      this.stats.errors++;
      log(`saveStoryStatus error: ${error.message}`, true);
    }
  }

  // ─── Info Cache Management ────────────────────────
  /*
   * Created with ❤️ and 💦 By FN
   * Follow https://github.com/Terror-Machine
   * Feel Free To Use
   */
  // ─── Info Cache Management Methods ────────────────

  async clearCache() {
    this.updateQueues.contacts.clear();
    this.updateQueues.groups.clear();
    try {
      await Promise.all([ContactCache.clearAllCaches(), GroupCache.clearAllCaches(), MessageCache.clearAllCaches(), StoryCache.clearAllCaches()]);
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

  // ─── Info Statistics & Monitoring ─────────────────
  /*
   * Created with ❤️ and 💦 By FN
   * Follow https://github.com/Terror-Machine
   * Feel Free To Use
   */
  // ─── Info Statistics & Monitoring Methods ─────────

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
    const [contactStats, groupStats, messageStats, storyStats] = await Promise.all([ContactCache.getStats(), GroupCache.getStats(), MessageCache.getStats(), StoryCache.getStats()]);
    return {
      redis: {
        hits: this.stats.redisHits,
        misses: this.stats.redisMisses,
        hitRate: total > 0 ? ((this.stats.redisHits / total) * 100).toFixed(2) + '%' : '0%'
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
      optimization: {
        lidMappings: this.stats.lidMappings,
        coalescedRequests: this.stats.coalescedRequests,
        circuitBreakerTrips: this.stats.circuitBreakerTrips,
        circuitBreakerState: this.circuitBreaker.state
      },
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
