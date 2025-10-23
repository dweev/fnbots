// ─── Info ─────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info src/cache/cacheContact.js ───────────────

import log from '../lib/logger.js';
import { redis } from '../../database/index.js';

const REDIS_PREFIX = {
  CONTACT: 'cache:contact:',
  LID_TO_JID: 'cache:lid2jid:',
  JID_TO_LID: 'cache:jid2lid:',
  CONTACT_INDEX: 'cache:contact:index'
};

class ContactCache {
  static async addContact(jid, contactData) {
    try {
      const key = `${REDIS_PREFIX.CONTACT}${jid}`;
      const pipeline = redis.pipeline();
      pipeline.set(key, JSON.stringify(contactData));
      pipeline.sadd(REDIS_PREFIX.CONTACT_INDEX, jid);
      if (contactData.lid) {
        pipeline.set(`${REDIS_PREFIX.LID_TO_JID}${contactData.lid}`, jid);
        pipeline.set(`${REDIS_PREFIX.JID_TO_LID}${jid}`, contactData.lid);
      }
      await pipeline.exec();
      return true;
    } catch (error) {
      log(`Add contact to cache error: ${error.message}`, true);
      return false;
    }
  }
  static async getContact(jid) {
    try {
      const key = `${REDIS_PREFIX.CONTACT}${jid}`;
      const data = await redis.get(key);
      if (!data) return null;
      return JSON.parse(data);
    } catch (error) {
      log(`Get contact from cache error: ${error.message}`, true);
      return null;
    }
  }
  static async getArrayContacts(jids) {
    try {
      if (!jids || jids.length === 0) {
        return { contacts: [], missingJids: [] };
      }
      const keys = jids.map(jid => `${REDIS_PREFIX.CONTACT}${jid}`);
      const results = await redis.mget(keys);
      const contacts = [];
      const missingJids = [];
      results.forEach((result, index) => {
        if (result) {
          contacts.push(JSON.parse(result));
        } else {
          missingJids.push(jids[index]);
        }
      });
      return { contacts, missingJids };
    } catch (error) {
      log(`Get array contacts from cache error: ${error.message}`, true);
      return { contacts: [], missingJids: jids };
    }
  }
  static async bulkAddContacts(contactsArray) {
    try {
      if (!contactsArray || contactsArray.length === 0) {
        return false;
      }
      const pipeline = redis.pipeline();
      for (const contact of contactsArray) {
        const key = `${REDIS_PREFIX.CONTACT}${contact.jid}`;
        pipeline.set(key, JSON.stringify(contact));
        pipeline.sadd(REDIS_PREFIX.CONTACT_INDEX, contact.jid);
        if (contact.lid) {
          pipeline.set(`${REDIS_PREFIX.LID_TO_JID}${contact.lid}`, contact.jid);
          pipeline.set(`${REDIS_PREFIX.JID_TO_LID}${contact.jid}`, contact.lid);
        }
      }
      await pipeline.exec();
      return true;
    } catch (error) {
      log(`Bulk add contacts to cache error: ${error.message}`, true);
      return false;
    }
  }
  static async updateContact(jid, updates) {
    try {
      const existing = await this.getContact(jid);
      if (!existing) {
        return await this.addContact(jid, { jid, ...updates });
      }
      const merged = {
        ...existing,
        ...updates,
        jid,
        lastUpdated: new Date()
      };
      return await this.addContact(jid, merged);
    } catch (error) {
      log(`Update contact cache error: ${error.message}`, true);
      return false;
    }
  }
  static async deleteContact(jid, lid = null) {
    try {
      const pipeline = redis.pipeline();
      if (!lid) {
        const contact = await this.getContact(jid);
        lid = contact?.lid;
      }
      pipeline.del(`${REDIS_PREFIX.CONTACT}${jid}`);
      pipeline.srem(REDIS_PREFIX.CONTACT_INDEX, jid);
      if (lid) {
        pipeline.del(`${REDIS_PREFIX.LID_TO_JID}${lid}`);
        pipeline.del(`${REDIS_PREFIX.JID_TO_LID}${jid}`);
      }
      await pipeline.exec();
      log(`Contact deleted from cache: ${jid}`);
      return true;
    } catch (error) {
      log(`Delete contact from cache error: ${error.message}`, true);
      return false;
    }
  }
  static async bulkDeleteContacts(jids) {
    try {
      if (!jids || jids.length === 0) {
        return 0;
      }
      const { contacts } = await this.getArrayContacts(jids);
      const pipeline = redis.pipeline();
      for (const jid of jids) {
        pipeline.del(`${REDIS_PREFIX.CONTACT}${jid}`);
        pipeline.srem(REDIS_PREFIX.CONTACT_INDEX, jid);
      }
      for (const contact of contacts) {
        if (contact.lid) {
          pipeline.del(`${REDIS_PREFIX.LID_TO_JID}${contact.lid}`);
          pipeline.del(`${REDIS_PREFIX.JID_TO_LID}${contact.jid}`);
        }
      }
      await pipeline.exec();
      log(`Bulk deleted ${jids.length} contacts from cache`);
      return jids.length;
    } catch (error) {
      log(`Bulk delete contacts error: ${error.message}`, true);
      return 0;
    }
  }
  static async findJidByLid(lid) {
    try {
      const jid = await redis.get(`${REDIS_PREFIX.LID_TO_JID}${lid}`);
      return jid;
    } catch (error) {
      log(`Find JID by LID error: ${error.message}`, true);
      return null;
    }
  }
  static async batchFindJidByLid(lids) {
    try {
      if (!lids || lids.length === 0) return [];
      const keys = lids.map(lid => `${REDIS_PREFIX.LID_TO_JID}${lid}`);
      const results = await redis.mget(keys);
      return results;
    } catch (error) {
      log(`Batch find JID by LID error: ${error.message}`, true);
      return lids.map(() => null);
    }
  }
  static async findLidByJid(jid) {
    try {
      const lid = await redis.get(`${REDIS_PREFIX.JID_TO_LID}${jid}`);
      return lid;
    } catch (error) {
      log(`Find LID by JID error: ${error.message}`, true);
      return null;
    }
  }
  static async cacheLidMapping(lid, jid) {
    try {
      if (!lid || !jid) return false;
      const pipeline = redis.pipeline();
      pipeline.set(`${REDIS_PREFIX.LID_TO_JID}${lid}`, jid);
      pipeline.set(`${REDIS_PREFIX.JID_TO_LID}${jid}`, lid);
      await pipeline.exec();
      return true;
    } catch (error) {
      log(`Cache LID mapping error: ${error.message}`, true);
      return false;
    }
  }
  static async batchCacheLidMapping(mappings) {
    try {
      if (!mappings || mappings.length === 0) return false;
      const pipeline = redis.pipeline();
      for (const { lid, jid } of mappings) {
        if (lid && jid) {
          pipeline.set(`${REDIS_PREFIX.LID_TO_JID}${lid}`, jid);
          pipeline.set(`${REDIS_PREFIX.JID_TO_LID}${jid}`, lid);
        }
      }
      await pipeline.exec();
      log(`Batch cached ${mappings.length} LID mappings`);
      return true;
    } catch (error) {
      log(`Batch cache LID mapping error: ${error.message}`, true);
      return false;
    }
  }
  static async getAllCachedJids() {
    try {
      const jids = await redis.smembers(REDIS_PREFIX.CONTACT_INDEX);
      return jids || [];
    } catch (error) {
      log(`Get all cached JIDs error: ${error.message}`, true);
      return [];
    }
  }
  static async invalidateCache(jid) {
    try {
      await this.deleteContact(jid);
      log(`Contact cache invalidated: ${jid}`);
      return true;
    } catch (error) {
      log(`Invalidate contact cache error: ${error.message}`, true);
      return false;
    }
  }
  static async clearAllCaches() {
    try {
      log('Clearing all contact caches...');
      const patterns = [
        `${REDIS_PREFIX.CONTACT}*`,
        `${REDIS_PREFIX.LID_TO_JID}*`,
        `${REDIS_PREFIX.JID_TO_LID}*`
      ];
      let totalDeleted = 0;
      for (const pattern of patterns) {
        const stream = redis.scanStream({ match: pattern, count: 100 });
        const keysToDelete = [];
        await new Promise((resolve, reject) => {
          stream.on('data', (keys) => {
            keysToDelete.push(...keys);
          });
          stream.on('end', resolve);
          stream.on('error', reject);
        });
        if (keysToDelete.length > 0) {
          for (let i = 0; i < keysToDelete.length; i += 1000) {
            const batch = keysToDelete.slice(i, i + 1000);
            await redis.del(...batch);
          }
          totalDeleted += keysToDelete.length;
        }
      }
      await redis.del(REDIS_PREFIX.CONTACT_INDEX);
      log(`Cleared ${totalDeleted} contact cache keys`);
      return totalDeleted;
    } catch (error) {
      log(`Clear all contact caches error: ${error.message}`, true);
      return 0;
    }
  }
  static async getStats() {
    try {
      const jids = await this.getAllCachedJids();
      const stats = {
        totalContacts: jids.length,
        persistent: true,
        sampleSize: Math.min(100, jids.length),
        contacts: []
      };
      for (const jid of jids.slice(0, 100)) {
        const contact = await this.getContact(jid);
        stats.contacts.push({
          jid,
          name: contact?.name || '',
          hasLid: !!contact?.lid,
          lid: contact?.lid || null
        });
      }
      return stats;
    } catch (error) {
      log(`Get contact cache stats error: ${error.message}`, true);
      return {
        totalContacts: 0,
        persistent: true,
        contacts: []
      };
    }
  }
  static async getMemoryUsage() {
    try {
      const jids = await this.getAllCachedJids();
      let totalSize = 0;
      const sampleSize = Math.min(100, jids.length);
      for (const jid of jids.slice(0, sampleSize)) {
        const contact = await this.getContact(jid);
        if (contact) {
          totalSize += JSON.stringify(contact).length;
        }
      }
      const avgSize = totalSize / sampleSize;
      const estimatedTotal = avgSize * jids.length;
      return {
        totalContacts: jids.length,
        avgContactSize: Math.round(avgSize),
        estimatedTotalBytes: Math.round(estimatedTotal),
        estimatedTotalMB: (estimatedTotal / (1024 * 1024)).toFixed(2)
      };
    } catch (error) {
      log(`Get memory usage error: ${error.message}`, true);
      return null;
    }
  }
}

export default ContactCache;