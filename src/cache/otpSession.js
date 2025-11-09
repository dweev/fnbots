// ─── Info ─────────────────────────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info src/cache/otpSession.js ─────────────────────────────

import log from '../lib/logger.js';
import { redis } from '../../database/index.js';

const REDIS_PREFIX = {
  SESSION: 'otp:session:',
  BLOCKED: 'otp:blocked:',
  USER_SESSIONS: 'otp:user:',
  VERIFICATION_CACHE: 'cache:group:has_active_verification'
};

const OTP_TTL = 5 * 60;
const BLOCK_TTL = 60 * 60;

class OTPSession {
  static async hasAnyActiveVerification(Group) {
    try {
      const cached = await redis.get(REDIS_PREFIX.VERIFICATION_CACHE);
      if (cached !== null) {
        return cached === 'true';
      }
      const count = await Group.countDocuments({
        verifyMember: true,
        isActive: true
      });
      const hasActive = count > 0;
      await redis.set(REDIS_PREFIX.VERIFICATION_CACHE, hasActive.toString());
      return hasActive;
    } catch (error) {
      await log(`Error checking active verification: ${error.message}`, true);
      return false;
    }
  }
  static async invalidateVerificationCache() {
    try {
      await redis.del(REDIS_PREFIX.VERIFICATION_CACHE);
      await log('GroupVerification cache invalidated');
      return true;
    } catch (error) {
      await log(`Error invalidating verification cache: ${error.message}`, true);
      return false;
    }
  }
  static async refreshVerificationCache(Group) {
    try {
      await this.invalidateVerificationCache();
      return await this.hasAnyActiveVerification(Group);
    } catch (error) {
      await log(`Error refreshing verification cache: ${error.message}`, true);
      return false;
    }
  }
  static async getVerificationCacheStatus() {
    try {
      const cached = await redis.get(REDIS_PREFIX.VERIFICATION_CACHE);
      return {
        isCached: cached !== null,
        value: cached === 'true',
        rawValue: cached
      };
    } catch (error) {
      await log(`Error getting cache status: ${error.message}`, true);
      return { isCached: false, value: false, rawValue: null };
    }
  }
  static validateUserId(userId) {
    if (!userId || !userId.includes('@s.whatsapp.net')) {
      throw new Error('User ID must be a valid WhatsApp JID');
    }
  }
  static validateGroupId(groupId) {
    if (!groupId || !groupId.endsWith('@g.us')) {
      throw new Error('Group ID must end with @g.us');
    }
  }
  static getSessionKey(userId, groupId) {
    return `${REDIS_PREFIX.SESSION}${userId}:${groupId}`;
  }
  static getBlockedKey(userId) {
    return `${REDIS_PREFIX.BLOCKED}${userId}`;
  }
  static getUserSessionsKey(userId) {
    return `${REDIS_PREFIX.USER_SESSIONS}${userId}`;
  }
  static async createSession(userId, groupId, otp) {
    try {
      this.validateUserId(userId);
      this.validateGroupId(groupId);
      if (!otp || otp.length !== 6) {
        throw new Error('OTP must be 6 characters');
      }
      const sessionKey = this.getSessionKey(userId, groupId);
      const userSessionsKey = this.getUserSessionsKey(userId);
      const sessionData = {
        userId,
        groupId,
        otp,
        attempts: 0,
        isBlocked: false,
        createdAt: new Date().toISOString(),
        expireAt: new Date(Date.now() + OTP_TTL * 1000).toISOString()
      };
      const pipeline = redis.pipeline();
      pipeline.set(sessionKey, JSON.stringify(sessionData), 'EX', OTP_TTL);
      pipeline.sadd(userSessionsKey, groupId);
      pipeline.expire(userSessionsKey, OTP_TTL);
      await pipeline.exec();
      await log(`OTP session created: ${userId} -> ${groupId}`);
      return sessionData;
    } catch (error) {
      throw error;
    }
  }
  static async verifyOTP(userId, inputOTP) {
    try {
      this.validateUserId(userId);
      const blockedKey = this.getBlockedKey(userId);
      const isBlocked = await redis.exists(blockedKey);
      if (isBlocked) {
        const ttl = await redis.ttl(blockedKey);
        return {
          success: false,
          reason: 'USER_BLOCKED',
          blockedFor: ttl > 0 ? ttl : 0
        };
      }
      const userSessionsKey = this.getUserSessionsKey(userId);
      const groupIds = await redis.smembers(userSessionsKey);
      if (!groupIds || groupIds.length === 0) {
        return { success: false, reason: 'SESSION_NOT_FOUND' };
      }
      let session = null;
      let sessionKey = null;
      for (const groupId of groupIds) {
        const key = this.getSessionKey(userId, groupId);
        const data = await redis.get(key);
        if (data) {
          session = JSON.parse(data);
          sessionKey = key;
          break;
        }
      }
      if (!session) {
        return { success: false, reason: 'SESSION_NOT_FOUND' };
      }
      if (session.otp === inputOTP) {
        await redis.del(sessionKey);
        await redis.srem(userSessionsKey, session.groupId);
        await log(`OTP verified successfully: ${userId}`);
        return {
          success: true,
          groupId: session.groupId,
          reason: 'OTP_VERIFIED'
        };
      }
      session.attempts += 1;
      if (session.attempts >= 4) {
        session.isBlocked = true;
        const pipeline = redis.pipeline();
        pipeline.del(sessionKey);
        pipeline.srem(userSessionsKey, session.groupId);
        pipeline.set(
          blockedKey,
          JSON.stringify({
            userId,
            blockedAt: new Date().toISOString(),
            reason: 'MAX_ATTEMPTS_EXCEEDED'
          }),
          'EX',
          BLOCK_TTL
        );
        await pipeline.exec();
        await log(`User blocked due to max attempts: ${userId}`);
        return {
          success: false,
          reason: 'MAX_ATTEMPTS_EXCEEDED',
          attempts: session.attempts
        };
      }
      const ttl = await redis.ttl(sessionKey);
      await redis.set(sessionKey, JSON.stringify(session), 'EX', ttl > 0 ? ttl : OTP_TTL);
      await log(`Wrong OTP attempt ${session.attempts}/4: ${userId}`);
      return {
        success: false,
        reason: 'WRONG_OTP',
        attempts: session.attempts,
        remainingAttempts: 4 - session.attempts
      };
    } catch (error) {
      await log(`Verify OTP error: ${error.message}`, true);
      throw error;
    }
  }
  static async getSession(userId) {
    try {
      if (!userId || typeof userId !== 'string' || !userId.includes('@s.whatsapp.net')) {
        return null;
      }
      const blockedKey = this.getBlockedKey(userId);
      const isBlocked = await redis.exists(blockedKey);
      if (isBlocked) {
        return null;
      }
      const userSessionsKey = this.getUserSessionsKey(userId);
      const groupIds = await redis.smembers(userSessionsKey);
      if (!groupIds || groupIds.length === 0) {
        return null;
      }
      for (const groupId of groupIds) {
        const sessionKey = this.getSessionKey(userId, groupId);
        const data = await redis.get(sessionKey);
        if (data) {
          const session = JSON.parse(data);
          session.isExpired = function () {
            return new Date() > new Date(this.expireAt);
          };
          session.getRemainingTime = function () {
            const now = new Date();
            const remaining = new Date(this.expireAt).getTime() - now.getTime();
            return Math.max(0, Math.floor(remaining / 1000));
          };
          return session;
        }
      }
      return null;
    } catch (error) {
      if (!error.message.includes('valid WhatsApp JID')) {
        await log(`Get session error: ${error}`, true);
      }
      return null;
    }
  }
  static async deleteSession(userId, groupId = null) {
    try {
      this.validateUserId(userId);
      const userSessionsKey = this.getUserSessionsKey(userId);
      if (groupId) {
        const sessionKey = this.getSessionKey(userId, groupId);
        const pipeline = redis.pipeline();
        pipeline.del(sessionKey);
        pipeline.srem(userSessionsKey, groupId);
        await pipeline.exec();
        await log(`OTP session deleted: ${userId} -> ${groupId}`);
        return true;
      }
      const groupIds = await redis.smembers(userSessionsKey);
      if (groupIds && groupIds.length > 0) {
        const pipeline = redis.pipeline();
        for (const gid of groupIds) {
          const sessionKey = this.getSessionKey(userId, gid);
          pipeline.del(sessionKey);
        }
        pipeline.del(userSessionsKey);
        await pipeline.exec();
        await log(`All OTP sessions deleted for user: ${userId}`);
        return true;
      }
      return false;
    } catch (error) {
      await log(`Delete session error: ${error.message}`, true);
      return false;
    }
  }
  static async getBlockedUsers() {
    try {
      const pattern = `${REDIS_PREFIX.BLOCKED}*`;
      const keys = [];
      const stream = redis.scanStream({
        match: pattern,
        count: 100
      });
      await new Promise((resolve, reject) => {
        stream.on('data', (resultKeys) => {
          keys.push(...resultKeys);
        });
        stream.on('end', resolve);
        stream.on('error', reject);
      });
      const blockedUsers = [];
      for (const key of keys) {
        const data = await redis.get(key);
        if (data) {
          const blocked = JSON.parse(data);
          const ttl = await redis.ttl(key);
          blockedUsers.push({
            userId: blocked.userId,
            blockedAt: blocked.blockedAt,
            reason: blocked.reason,
            expiresIn: ttl
          });
        }
      }
      return blockedUsers;
    } catch (error) {
      await log(`Get blocked users error: ${error.message}`, true);
      return [];
    }
  }
  static async unblockUser(userId) {
    try {
      this.validateUserId(userId);
      const blockedKey = this.getBlockedKey(userId);
      const result = await redis.del(blockedKey);
      if (result > 0) {
        await log(`User unblocked: ${userId}`);
        return true;
      }
      return false;
    } catch (error) {
      await log(`Unblock user error: ${error.message}`, true);
      return false;
    }
  }
  static async getAllSessions() {
    try {
      const pattern = `${REDIS_PREFIX.SESSION}*`;
      const keys = [];
      const stream = redis.scanStream({
        match: pattern,
        count: 100
      });
      await new Promise((resolve, reject) => {
        stream.on('data', (resultKeys) => {
          keys.push(...resultKeys);
        });
        stream.on('end', resolve);
        stream.on('error', reject);
      });
      const sessions = [];
      for (const key of keys) {
        const data = await redis.get(key);
        if (data) {
          const session = JSON.parse(data);
          const ttl = await redis.ttl(key);
          sessions.push({
            ...session,
            expiresIn: ttl
          });
        }
      }
      return sessions;
    } catch (error) {
      await log(`Get all sessions error: ${error.message}`, true);
      return [];
    }
  }
  static async getStats() {
    try {
      const [sessions, blocked] = await Promise.all([this.getAllSessions(), this.getBlockedUsers()]);
      return {
        activeSessions: sessions.length,
        blockedUsers: blocked.length,
        sessions: sessions,
        blocked: blocked
      };
    } catch (error) {
      await log(`Get stats error: ${error.message}`, true);
      return {
        activeSessions: 0,
        blockedUsers: 0,
        sessions: [],
        blocked: []
      };
    }
  }
}

export default OTPSession;
