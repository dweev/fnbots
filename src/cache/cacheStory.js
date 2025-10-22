// ─── Info ─────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info src/cache/cacheStory.js ─────────────────

import log from '../lib/logger.js';
import { redis } from '../../database/index.js';

const REDIS_TTL = {
  STORY: 7 * 24 * 60 * 60,
};

const REDIS_PREFIX = {
  STORY: 'cache:story:',
  STORY_INDEX: 'cache:story:index'
};

class StoryCache {
  static async addStatus(userId, statusMessage, maxSize = 20) {
    try {
      const messageId = statusMessage.key.id;
      const key = `${REDIS_PREFIX.STORY}${userId}`;
      const pipeline = redis.pipeline();
      pipeline.hset(key, messageId, JSON.stringify(statusMessage));
      pipeline.expire(key, REDIS_TTL.STORY);
      pipeline.sadd(REDIS_PREFIX.STORY_INDEX, userId);
      pipeline.expire(REDIS_PREFIX.STORY_INDEX, REDIS_TTL.STORY);
      await pipeline.exec();
      const allStories = await redis.hgetall(key);
      const storyCount = Object.keys(allStories).length;
      if (storyCount > maxSize) {
        const storiesWithTime = Object.entries(allStories).map(([id, data]) => {
          const parsed = JSON.parse(data);
          return {
            messageId: id,
            timestamp: parsed.messageTimestamp || 0
          };
        });
        storiesWithTime.sort((a, b) => a.timestamp - b.timestamp);
        const toDelete = storiesWithTime.slice(0, storyCount - maxSize);
        if (toDelete.length > 0) {
          const deleteIds = toDelete.map(s => s.messageId);
          await redis.hdel(key, ...deleteIds);
          log(`Trimmed ${deleteIds.length} old stories for ${userId}`);
        }
      }
      return true;
    } catch (error) {
      log(`Add status to Redis error: ${error.message}`, true);
      return false;
    }
  }
  static async getStatusesFromCache(userId) {
    try {
      const key = `${REDIS_PREFIX.STORY}${userId}`;
      const cached = await redis.hgetall(key);
      if (!cached || Object.keys(cached).length === 0) {
        log(`Cache miss for stories: ${userId}`);
        return null;
      }
      const stories = Object.values(cached).map(data => JSON.parse(data));
      stories.sort((a, b) => (b.messageTimestamp || 0) - (a.messageTimestamp || 0));
      return stories;
    } catch (error) {
      log(`Get statuses from cache error: ${error.message}`, true);
      return null;
    }
  }
  static async populateCacheFromDB(userId, stories) {
    try {
      if (!stories || stories.length === 0) {
        return false;
      }
      const key = `${REDIS_PREFIX.STORY}${userId}`;
      const pipeline = redis.pipeline();
      for (const story of stories) {
        const messageId = story.key?.id;
        if (messageId) {
          pipeline.hset(key, messageId, JSON.stringify(story));
        }
      }
      pipeline.expire(key, REDIS_TTL.STORY);
      pipeline.sadd(REDIS_PREFIX.STORY_INDEX, userId);
      await pipeline.exec();
      log(`Cache populated from DB for ${userId} (${stories.length} stories)`);
      return true;
    } catch (error) {
      log(`Populate cache from DB error: ${error.message}`, true);
      return false;
    }
  }
  static async deleteStatus(userId, messageId) {
    try {
      const key = `${REDIS_PREFIX.STORY}${userId}`;
      const deleted = await redis.hdel(key, messageId);
      if (deleted > 0) {
        log(`Story deleted from cache: ${userId}/${messageId}`);
        const remaining = await redis.hlen(key);
        if (remaining === 0) {
          await redis.del(key);
          await redis.srem(REDIS_PREFIX.STORY_INDEX, userId);
          log(`No more stories for ${userId}, cleaned up cache`);
        }
      }
      return deleted > 0;
    } catch (error) {
      log(`Delete status from cache error: ${error.message}`, true);
      return false;
    }
  }
  static async bulkDeleteStatuses(userId, messageIds) {
    try {
      if (!messageIds || messageIds.length === 0) {
        return 0;
      }
      const key = `${REDIS_PREFIX.STORY}${userId}`;
      const deleted = await redis.hdel(key, ...messageIds);
      log(`Bulk deleted ${deleted}/${messageIds.length} stories from cache for ${userId}`);
      const remaining = await redis.hlen(key);
      if (remaining === 0) {
        await redis.del(key);
        await redis.srem(REDIS_PREFIX.STORY_INDEX, userId);
        log(`No more stories for ${userId}, cleaned up cache`);
      }
      return deleted;
    } catch (error) {
      log(`Bulk delete statuses error: ${error.message}`, true);
      return 0;
    }
  }
  static async getSpecificStatus(userId, messageId) {
    try {
      const key = `${REDIS_PREFIX.STORY}${userId}`;
      const data = await redis.hget(key, messageId);
      if (!data) {
        return null;
      }
      return JSON.parse(data);
    } catch (error) {
      log(`Get specific status error: ${error.message}`, true);
      return null;
    }
  }
  static async getUsersWithStories() {
    try {
      const userIds = await redis.smembers(REDIS_PREFIX.STORY_INDEX);
      return userIds || [];
    } catch (error) {
      log(`Get users with stories error: ${error.message}`, true);
      return [];
    }
  }
  static async getStoryCount(userId) {
    try {
      const key = `${REDIS_PREFIX.STORY}${userId}`;
      return await redis.hlen(key);
    } catch (error) {
      log(`Get story count error: ${error.message}`, true);
      return 0;
    }
  }
  static async invalidateCache(userId) {
    try {
      const key = `${REDIS_PREFIX.STORY}${userId}`;
      await redis.del(key);
      await redis.srem(REDIS_PREFIX.STORY_INDEX, userId);
      log(`Cache invalidated for ${userId}`);
      return true;
    } catch (error) {
      log(`Invalidate cache error: ${error.message}`, true);
      return false;
    }
  }
  static async clearAllCaches() {
    try {
      log('Clearing all story caches...');
      const pattern = `${REDIS_PREFIX.STORY}*`;
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
        log(`Cleared ${keysToDelete.length} story cache keys`);
      }
      await redis.del(REDIS_PREFIX.STORY_INDEX);
      return keysToDelete.length;
    } catch (error) {
      log(`Clear all caches error: ${error.message}`, true);
      return 0;
    }
  }
  static async getStats() {
    try {
      const userIds = await this.getUsersWithStories();
      const stats = {
        totalUsers: userIds.length,
        users: []
      };
      for (const userId of userIds) {
        const count = await this.getStoryCount(userId);
        const key = `${REDIS_PREFIX.STORY}${userId}`;
        const ttl = await redis.ttl(key);
        stats.users.push({
          userId,
          storyCount: count,
          ttl: ttl > 0 ? ttl : 0
        });
      }
      return stats;
    } catch (error) {
      log(`Get cache stats error: ${error.message}`, true);
      return {
        totalUsers: 0,
        users: []
      };
    }
  }
}

export default StoryCache;