// ─── Info ─────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info src/cache/cacheGroupMetadata.js ─────────

import log from '../lib/logger.js';
import { redis } from '../../database/index.js';

const REDIS_TTL = {
  GROUP: 60 * 60,
};

const REDIS_PREFIX = {
  GROUP: 'cache:groupmetadata:',
  GROUP_INDEX: 'cache:group:index'
};

class GroupCache {
  static async addGroup(groupId, groupData) {
    try {
      const key = `${REDIS_PREFIX.GROUP}${groupId}`;
      const pipeline = redis.pipeline();
      pipeline.set(key, JSON.stringify(groupData), 'EX', REDIS_TTL.GROUP);
      pipeline.sadd(REDIS_PREFIX.GROUP_INDEX, groupId);
      pipeline.expire(REDIS_PREFIX.GROUP_INDEX, REDIS_TTL.GROUP);
      await pipeline.exec();
      log(`Group cached: ${groupId}`);
      return true;
    } catch (error) {
      log(`Add group to cache error: ${error.message}`, true);
      return false;
    }
  }
  static async getGroup(groupId) {
    try {
      const key = `${REDIS_PREFIX.GROUP}${groupId}`;
      const data = await redis.get(key);
      if (!data) {
        log(`Cache miss for group: ${groupId}`);
        return null;
      }
      return JSON.parse(data);
    } catch (error) {
      log(`Get group from cache error: ${error.message}`, true);
      return null;
    }
  }
  static async getArrayGroups(groupIds) {
    try {
      if (!groupIds || groupIds.length === 0) return [];
      const keys = groupIds.map(id => `${REDIS_PREFIX.GROUP}${id}`);
      const results = await redis.mget(keys);
      const groups = [];
      const missingIds = [];
      results.forEach((result, index) => {
        if (result) {
          groups.push(JSON.parse(result));
        } else {
          missingIds.push(groupIds[index]);
        }
      });
      log(`Cache hit: ${groups.length}/${groupIds.length} groups`);
      return { groups, missingIds };
    } catch (error) {
      log(`Get array groups from cache error: ${error.message}`, true);
      return { groups: [], missingIds: groupIds };
    }
  }
  static async bulkAddGroups(groupsArray) {
    try {
      if (!groupsArray || groupsArray.length === 0) {
        return false;
      }
      const pipeline = redis.pipeline();
      for (const group of groupsArray) {
        const groupId = group.groupId || group.id;
        const key = `${REDIS_PREFIX.GROUP}${groupId}`;
        pipeline.set(key, JSON.stringify(group), 'EX', REDIS_TTL.GROUP);
        pipeline.sadd(REDIS_PREFIX.GROUP_INDEX, groupId);
      }
      await pipeline.exec();
      log(`Bulk cached ${groupsArray.length} groups`);
      return true;
    } catch (error) {
      log(`Bulk add groups to cache error: ${error.message}`, true);
      return false;
    }
  }
  static async deleteGroup(groupId) {
    try {
      const key = `${REDIS_PREFIX.GROUP}${groupId}`;
      const pipeline = redis.pipeline();
      pipeline.del(key);
      pipeline.srem(REDIS_PREFIX.GROUP_INDEX, groupId);
      await pipeline.exec();
      log(`Group deleted from cache: ${groupId}`);
      return true;
    } catch (error) {
      log(`Delete group from cache error: ${error.message}`, true);
      return false;
    }
  }
  static async bulkDeleteGroups(groupIds) {
    try {
      if (!groupIds || groupIds.length === 0) {
        return 0;
      }
      const pipeline = redis.pipeline();
      for (const groupId of groupIds) {
        pipeline.del(`${REDIS_PREFIX.GROUP}${groupId}`);
        pipeline.srem(REDIS_PREFIX.GROUP_INDEX, groupId);
      }
      await pipeline.exec();
      log(`Bulk deleted ${groupIds.length} groups from cache`);
      return groupIds.length;
    } catch (error) {
      log(`Bulk delete groups error: ${error.message}`, true);
      return 0;
    }
  }
  static async getAllCachedGroupIds() {
    try {
      const groupIds = await redis.smembers(REDIS_PREFIX.GROUP_INDEX);
      return groupIds || [];
    } catch (error) {
      log(`Get all cached group IDs error: ${error.message}`, true);
      return [];
    }
  }
  static async getAllCachedGroups() {
    try {
      const groupIds = await this.getAllCachedGroupIds();
      if (groupIds.length === 0) {
        return [];
      }
      const { groups } = await this.getArrayGroups(groupIds);
      return groups;
    } catch (error) {
      log(`Get all cached groups error: ${error.message}`, true);
      return [];
    }
  }
  static async updateGroupParticipants(groupId, participants) {
    try {
      const group = await this.getGroup(groupId);
      if (!group) {
        log(`Cannot update participants: group ${groupId} not in cache`);
        return false;
      }
      group.participants = participants;
      group.size = participants.length;
      group.lastUpdated = new Date();
      await this.addGroup(groupId, group);
      log(`Updated participants for group ${groupId}`);
      return true;
    } catch (error) {
      log(`Update group participants error: ${error.message}`, true);
      return false;
    }
  }
  static async updateGroupMetadata(groupId, metadata) {
    try {
      const group = await this.getGroup(groupId);
      const updated = {
        ...(group || {}),
        ...metadata,
        groupId: groupId,
        lastUpdated: new Date()
      };
      await this.addGroup(groupId, updated);
      log(`Updated metadata for group ${groupId}`);
      return true;
    } catch (error) {
      log(`Update group metadata error: ${error.message}`, true);
      return false;
    }
  }
  static async getGroupCount() {
    try {
      return await redis.scard(REDIS_PREFIX.GROUP_INDEX);
    } catch (error) {
      log(`Get group count error: ${error.message}`, true);
      return 0;
    }
  }
  static async invalidateCache(groupId) {
    try {
      await this.deleteGroup(groupId);
      log(`Group cache invalidated: ${groupId}`);
      return true;
    } catch (error) {
      log(`Invalidate group cache error: ${error.message}`, true);
      return false;
    }
  }
  static async clearAllCaches() {
    try {
      log('Clearing all group caches...');
      const pattern = `${REDIS_PREFIX.GROUP}*`;
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
        log(`Cleared ${keysToDelete.length} group cache keys`);
      }
      await redis.del(REDIS_PREFIX.GROUP_INDEX);
      return keysToDelete.length;
    } catch (error) {
      log(`Clear all group caches error: ${error.message}`, true);
      return 0;
    }
  }
  static async getStats() {
    try {
      const groupIds = await this.getAllCachedGroupIds();
      const stats = {
        totalGroups: groupIds.length,
        groups: []
      };
      for (const groupId of groupIds.slice(0, 50)) {
        const key = `${REDIS_PREFIX.GROUP}${groupId}`;
        const ttl = await redis.ttl(key);
        const group = await this.getGroup(groupId);
        stats.groups.push({
          groupId,
          subject: group?.subject || '',
          participantCount: group?.participants?.length || 0,
          ttl: ttl > 0 ? ttl : 0
        });
      }
      return stats;
    } catch (error) {
      log(`Get group cache stats error: ${error.message}`, true);
      return {
        totalGroups: 0,
        groups: []
      };
    }
  }
  static async warmCache(groups) {
    try {
      if (!groups || groups.length === 0) {
        return false;
      }
      await this.bulkAddGroups(groups);
      log(`Warmed group cache with ${groups.length} groups`);
      return true;
    } catch (error) {
      log(`Warm group cache error: ${error.message}`, true);
      return false;
    }
  }
  static async isGroupCached(groupId) {
    try {
      const exists = await redis.exists(`${REDIS_PREFIX.GROUP}${groupId}`);
      return exists === 1;
    } catch (error) {
      log(`Check group cached error: ${error.message}`, true);
      return false;
    }
  }
  static async getGroupsByPattern(pattern) {
    try {
      const allGroups = await this.getAllCachedGroups();
      if (!pattern) return allGroups;
      const regex = new RegExp(pattern, 'i');
      return allGroups.filter(group =>
        regex.test(group.subject) ||
        regex.test(group.groupId)
      );
    } catch (error) {
      log(`Get groups by pattern error: ${error.message}`, true);
      return [];
    }
  }
  static async refreshGroupTTL(groupId) {
    try {
      const key = `${REDIS_PREFIX.GROUP}${groupId}`;
      await redis.expire(key, REDIS_TTL.GROUP);
      log(`Refreshed TTL for group: ${groupId}`);
      return true;
    } catch (error) {
      log(`Refresh group TTL error: ${error.message}`, true);
      return false;
    }
  }
}

export default GroupCache;