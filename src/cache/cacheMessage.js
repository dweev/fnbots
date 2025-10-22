// ─── Info ─────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info src/cache/cacheMessage.js ───────────────

import log from '../lib/logger.js';
import { redis } from '../../database/index.js';

const REDIS_TTL = {
  MESSAGE: 30 * 60,
  CONVERSATION: 30 * 60,
  PRESENCE: 300
};

const REDIS_PREFIX = {
  MESSAGES:       'cache:messages:',
  CONVERSATIONS:  'cache:conversation:',
  CHAT_INDEX:     'cache:chat:index',
  PRESENCE:       'cache:presence:'
};

class MessageCache {
  static async addMessage(chatId, message, maxSize = 50) {
    try {
      const key = `${REDIS_PREFIX.MESSAGES}${chatId}`;
      const pipeline = redis.pipeline();
      pipeline.rpush(key, JSON.stringify(message));
      pipeline.ltrim(key, -maxSize, -1);
      pipeline.expire(key, REDIS_TTL.MESSAGE);
      pipeline.sadd(REDIS_PREFIX.CHAT_INDEX, chatId);
      pipeline.expire(REDIS_PREFIX.CHAT_INDEX, REDIS_TTL.MESSAGE);
      await pipeline.exec();
      return true;
    } catch (error) {
      log(`Add message to cache error: ${error.message}`, true);
      return false;
    }
  }
  static async getMessages(chatId, limit = 50) {
    try {
      const key = `${REDIS_PREFIX.MESSAGES}${chatId}`;
      const messages = await redis.lrange(key, -limit, -1);
      if (!messages || messages.length === 0) {
        log(`Cache miss for messages: ${chatId}`);
        return null;
      }
      const parsed = messages.map(m => JSON.parse(m));
      log(`Cache hit for messages: ${chatId} (${parsed.length} messages)`);
      return parsed;
    } catch (error) {
      log(`Get messages from cache error: ${error.message}`, true);
      return null;
    }
  }
  static async populateCacheFromDB(chatId, messages, maxSize = 50) {
    try {
      if (!messages || messages.length === 0) {
        return false;
      }
      const key = `${REDIS_PREFIX.MESSAGES}${chatId}`;
      const pipeline = redis.pipeline();
      const messagesToCache = messages.slice(-maxSize);
      for (const message of messagesToCache) {
        pipeline.rpush(key, JSON.stringify(message));
      }
      pipeline.expire(key, REDIS_TTL.MESSAGE);
      pipeline.sadd(REDIS_PREFIX.CHAT_INDEX, chatId);
      await pipeline.exec();
      log(`Message cache populated from DB for ${chatId} (${messagesToCache.length} messages)`);
      return true;
    } catch (error) {
      log(`Populate message cache from DB error: ${error.message}`, true);
      return false;
    }
  }
  static async getSpecificMessage(chatId, messageId) {
    try {
      const key = `${REDIS_PREFIX.MESSAGES}${chatId}`;
      const messages = await redis.lrange(key, 0, -1);
      for (const msgStr of messages) {
        const msg = JSON.parse(msgStr);
        if (msg?.key?.id === messageId) {
          return msg;
        }
      }
      return null;
    } catch (error) {
      log(`Get specific message error: ${error.message}`, true);
      return null;
    }
  }
  static async deleteMessage(chatId, messageId) {
    try {
      const key = `${REDIS_PREFIX.MESSAGES}${chatId}`;
      const messages = await redis.lrange(key, 0, -1);
      let deletedCount = 0;
      for (const msgStr of messages) {
        const msg = JSON.parse(msgStr);
        if (msg?.key?.id === messageId) {
          await redis.lrem(key, 1, msgStr);
          deletedCount++;
          log(`Message deleted from cache: ${chatId}/${messageId}`);
          break;
        }
      }
      return deletedCount > 0;
    } catch (error) {
      log(`Delete message from cache error: ${error.message}`, true);
      return false;
    }
  }
  static async getMessageCount(chatId) {
    try {
      const key = `${REDIS_PREFIX.MESSAGES}${chatId}`;
      return await redis.llen(key);
    } catch (error) {
      log(`Get message count error: ${error.message}`, true);
      return 0;
    }
  }
  static async invalidateCache(chatId) {
    try {
      const key = `${REDIS_PREFIX.MESSAGES}${chatId}`;
      await redis.del(key);
      await redis.srem(REDIS_PREFIX.CHAT_INDEX, chatId);
      log(`Message cache invalidated for ${chatId}`);
      return true;
    } catch (error) {
      log(`Invalidate message cache error: ${error.message}`, true);
      return false;
    }
  }
  static async addConversation(chatId, conversation, maxSize = 200) {
    try {
      const key = `${REDIS_PREFIX.CONVERSATIONS}${chatId}`;
      const pipeline = redis.pipeline();
      pipeline.rpush(key, JSON.stringify(conversation));
      pipeline.ltrim(key, -maxSize, -1);
      pipeline.expire(key, REDIS_TTL.CONVERSATION);
      await pipeline.exec();
      return true;
    } catch (error) {
      log(`Add conversation to cache error: ${error.message}`, true);
      return false;
    }
  }
  static async getConversations(chatId, limit = 200) {
    try {
      const key = `${REDIS_PREFIX.CONVERSATIONS}${chatId}`;
      const conversations = await redis.lrange(key, -limit, -1);
      if (!conversations || conversations.length === 0) {
        return null;
      }
      return conversations.map(c => JSON.parse(c));
    } catch (error) {
      log(`Get conversations from cache error: ${error.message}`, true);
      return null;
    }
  }
  static async updatePresences(chatId, presenceUpdate) {
    try {
      if (!presenceUpdate || Object.keys(presenceUpdate).length === 0) {
        return false;
      }
      const key = `${REDIS_PREFIX.PRESENCE}${chatId}`;
      const pipeline = redis.pipeline();
      for (const [jid, presenceData] of Object.entries(presenceUpdate)) {
        const value = typeof presenceData === 'object'
          ? JSON.stringify(presenceData)
          : presenceData;
        pipeline.hset(key, jid, value);
      }
      pipeline.expire(key, REDIS_TTL.PRESENCE);
      await pipeline.exec();
      log(`Presence updated for chat: ${chatId} (${Object.keys(presenceUpdate).length} users)`);
      return true;
    } catch (error) {
      log(`Update presences error: ${error.message}`, true);
      return false;
    }
  }
  static async getPresences(chatId) {
    try {
      const key = `${REDIS_PREFIX.PRESENCE}${chatId}`;
      const data = await redis.hgetall(key);
      if (!data || Object.keys(data).length === 0) {
        log(`No presence data found for: ${chatId}`);
        return {};
      }
      const parsed = {};
      for (const [k, v] of Object.entries(data)) {
        try {
          parsed[k] = JSON.parse(v);
        } catch {
          parsed[k] = v;
        }
      }
      log(`Presence retrieved for chat: ${chatId} (${Object.keys(parsed).length} users)`);
      return parsed;
    } catch (error) {
      log(`Get presences error: ${error.message}`, true);
      return {};
    }
  }
  static async deletePresence(chatId) {
    try {
      const key = `${REDIS_PREFIX.PRESENCE}${chatId}`;
      const result = await redis.del(key);
      if (result > 0) {
        log(`Presence deleted for chat: ${chatId}`);
        return true;
      }
      return false;
    } catch (error) {
      log(`Delete presence error: ${error.message}`, true);
      return false;
    }
  }
  static async getAllPresenceKeys() {
    try {
      const pattern = `${REDIS_PREFIX.PRESENCE}*`;
      const keys = [];
      const stream = redis.scanStream({ match: pattern, count: 100 });
      await new Promise((resolve, reject) => {
        stream.on('data', (resultKeys) => {
          keys.push(...resultKeys);
        });
        stream.on('end', resolve);
        stream.on('error', reject);
      });
      return keys;
    } catch (error) {
      log(`Get all presence keys error: ${error.message}`, true);
      return [];
    }
  }
  static async getChatsWithMessages() {
    try {
      const chatIds = await redis.smembers(REDIS_PREFIX.CHAT_INDEX);
      return chatIds || [];
    } catch (error) {
      log(`Get chats with messages error: ${error.message}`, true);
      return [];
    }
  }
  static async clearAllCaches() {
    try {
      log('Clearing all message caches...');
      const patterns = [
        `${REDIS_PREFIX.MESSAGES}*`,
        `${REDIS_PREFIX.CONVERSATIONS}*`,
        `${REDIS_PREFIX.PRESENCE}*`
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
      await redis.del(REDIS_PREFIX.CHAT_INDEX);
      log(`Cleared ${totalDeleted} message cache keys (including presence data)`);
      return totalDeleted;
    } catch (error) {
      log(`Clear all message caches error: ${error.message}`, true);
      return 0;
    }
  }
  static async getStats() {
    try {
      const chatIds = await this.getChatsWithMessages();
      const presenceKeys = await this.getAllPresenceKeys();
      const stats = {
        totalChats: chatIds.length,
        totalPresenceChats: presenceKeys.length,
        chats: [],
        presences: []
      };
      for (const chatId of chatIds) {
        const messageCount = await this.getMessageCount(chatId);
        const key = `${REDIS_PREFIX.MESSAGES}${chatId}`;
        const ttl = await redis.ttl(key);
        stats.chats.push({
          chatId,
          messageCount,
          ttl: ttl > 0 ? ttl : 0
        });
      }
      for (const key of presenceKeys) {
        const chatId = key.replace(REDIS_PREFIX.PRESENCE, '');
        const presenceData = await redis.hgetall(key);
        const ttl = await redis.ttl(key);
        stats.presences.push({
          chatId,
          userCount: Object.keys(presenceData || {}).length,
          ttl: ttl > 0 ? ttl : 0
        });
      }
      return stats;
    } catch (error) {
      log(`Get message cache stats error: ${error.message}`, true);
      return {
        totalChats: 0,
        totalPresenceChats: 0,
        chats: [],
        presences: []
      };
    }
  }
}

export default MessageCache;