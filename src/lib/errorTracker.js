// ─── Info ────────────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info src/lib/errorTracker.js ────────────────

import log from './logger.js';
import redis from '../cache/redis.js';
import { Command } from '../../database/index.js';
import { pluginCache } from './plugins.js';

class ErrorTracker {
  constructor() {
    this.MAX_CONSECUTIVE_ERRORS = 5;
    this.ERROR_RESET_TIME = 30 * 60 * 1000;
    this.REDIS_PREFIX = 'error_tracker:';
    this.DISABLED_PREFIX = 'disabled_cmd:';
    this.cleanupJobName = 'errorTrackerCleanup';
  }

  initialize(performanceManager) {
    if (this.initialized) {
      log('Error tracker already initialized');
      return;
    }
    performanceManager.scheduler.addIntervalJob(
      this.cleanupJobName,
      async () => {
        try {
          await this.cleanup();
        } catch (error) {
          log(`Error tracker cleanup failed: ${error.message}`, true);
        }
      },
      21600,
      { concurrency: 'skip' }
    );
    this.initialized = true;
    log('Error tracker initialized with performance manager');
  }

  _getKey(commandName) {
    return `${this.REDIS_PREFIX}${commandName.toLowerCase()}`;
  }

  _getDisabledKey(commandName) {
    return `${this.DISABLED_PREFIX}${commandName.toLowerCase()}`;
  }

  async trackError(commandName, errorMessage, errorStack = '') {
    const now = Date.now();
    const lowerName = commandName.toLowerCase();
    const key = this._getKey(lowerName);
    try {
      const existing = await redis.get(key);
      let tracker;
      if (existing) {
        tracker = JSON.parse(existing);
        if (now - tracker.lastErrorTime > this.ERROR_RESET_TIME) {
          tracker = {
            count: 0,
            errors: [],
            firstErrorTime: now,
            lastErrorTime: now
          };
        }
      } else {
        tracker = {
          count: 0,
          errors: [],
          firstErrorTime: now,
          lastErrorTime: now
        };
      }
      tracker.count++;
      tracker.lastErrorTime = now;
      tracker.errors.push({
        message: errorMessage,
        stack: errorStack ? errorStack.split('\n').slice(0, 3).join('\n') : '',
        timestamp: now
      });
      if (tracker.errors.length > this.MAX_CONSECUTIVE_ERRORS) {
        tracker.errors.shift();
      }
      await redis.setex(key, 3600, JSON.stringify(tracker));
      const shouldDisable = tracker.count >= this.MAX_CONSECUTIVE_ERRORS;
      if (shouldDisable) {
        await redis.setex(this._getDisabledKey(lowerName), 86400, 'true');
        log(`Command "${commandName}" reached ${this.MAX_CONSECUTIVE_ERRORS} consecutive errors and will be auto-disabled`, true);
      }
      return {
        shouldDisable,
        errorCount: tracker.count,
        errors: tracker.errors
      };
    } catch (error) {
      log(`Error tracking error for ${commandName}: ${error.message}`, true);
      return {
        shouldDisable: false,
        errorCount: 0,
        errors: []
      };
    }
  }

  async resetError(commandName) {
    const lowerName = commandName.toLowerCase();
    try {
      await redis.del(this._getKey(lowerName));
    } catch (error) {
      log(`Error resetting error count for ${commandName}: ${error.message}`, true);
    }
  }

  async disableCommand(commandName) {
    try {
      const lowerName = commandName.toLowerCase();
      const result = await Command.updateOne(
        { name: lowerName },
        {
          $set: {
            isEnabled: false,
            autoDisabledAt: new Date(),
            autoDisabledReason: 'Consecutive errors'
          }
        }
      );
      if (result.modifiedCount === 0) {
        log(`Failed to disable command "${commandName}" in database`, true);
        return false;
      }
      const commandDoc = await Command.findOne({ name: lowerName });
      if (commandDoc) {
        const allIdentifiers = [commandDoc.name, ...(commandDoc.aliases || [])];
        for (const identifier of allIdentifiers) {
          const idLower = identifier.toLowerCase();
          const cachedCmd = pluginCache.commands.get(idLower);
          if (cachedCmd) {
            cachedCmd.isEnabled = false;
          }
        }
      }
      log(`Command "${commandName}" has been auto-disabled due to consecutive errors`);
      return true;
    } catch (error) {
      log(`Error disabling command "${commandName}": ${error.message}`, true);
      return false;
    }
  }

  async generateErrorReport(commandName, errorDetails) {
    const { errorCount, errors } = errorDetails;
    const key = this._getKey(commandName.toLowerCase());
    try {
      const existing = await redis.get(key);
      if (!existing) return null;
      const tracker = JSON.parse(existing);
      const duration = tracker.lastErrorTime - tracker.firstErrorTime;
      const durationMinutes = Math.floor(duration / 60000);
      const durationSeconds = Math.floor((duration % 60000) / 1000);
      let report = `⚠️ *AUTO-DISABLE ALERT* ⚠️\n\n`;
      report += `Command: *${commandName}*\n`;
      report += `Status: *DISABLED*\n`;
      report += `Reason: ${errorCount} consecutive errors\n`;
      report += `Duration: ${durationMinutes}m ${durationSeconds}s\n\n`;
      report += `━━━━━━━━━━━━━━━━━━━━\n\n`;
      report += `*Recent Errors:*\n\n`;
      errors.forEach((err, idx) => {
        const time = new Date(err.timestamp).toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta'
        });
        report += `${idx + 1}. [${time}]\n`;
        report += `   ${err.message}\n`;
        if (err.stack) {
          report += `   \`\`\`${err.stack}\`\`\`\n`;
        }
        report += `\n`;
      });
      report += `━━━━━━━━━━━━━━━━━━━━\n\n`;
      report += `Untuk mengaktifkan kembali:\n`;
      report += `\`\`\`.plugin on ${commandName}\`\`\``;
      return report;
    } catch (error) {
      log(`Error generating error report: ${error.message}`, true);
      return null;
    }
  }

  async isCommandDisabled(commandName) {
    try {
      const result = await redis.get(this._getDisabledKey(commandName.toLowerCase()));
      return result === 'true';
    } catch (error) {
      log(`Error checking disabled status: ${error.message}`, true);
      return false;
    }
  }

  async getErrorStats(commandName = null) {
    try {
      if (commandName) {
        const key = this._getKey(commandName.toLowerCase());
        const data = await redis.get(key);
        if (!data) return null;
        const tracker = JSON.parse(data);
        const isDisabled = await this.isCommandDisabled(commandName);
        return {
          ...tracker,
          isDisabled
        };
      }
      const pattern = `${this.REDIS_PREFIX}*`;
      const keys = await redis.keys(pattern);
      const stats = {};
      for (const key of keys) {
        const cmdName = key.replace(this.REDIS_PREFIX, '');
        const data = await redis.get(key);
        if (data) {
          const tracker = JSON.parse(data);
          const isDisabled = await this.isCommandDisabled(cmdName);
          stats[cmdName] = {
            errorCount: tracker.count,
            lastError: new Date(tracker.lastErrorTime).toISOString(),
            isDisabled
          };
        }
      }
      return stats;
    } catch (error) {
      log(`Error getting error stats: ${error.message}`, true);
      return commandName ? null : {};
    }
  }

  async clearAll() {
    try {
      const errorKeys = await redis.keys(`${this.REDIS_PREFIX}*`);
      const disabledKeys = await redis.keys(`${this.DISABLED_PREFIX}*`);
      const allKeys = [...errorKeys, ...disabledKeys];
      if (allKeys.length > 0) {
        await redis.del(...allKeys);
        log(`Error tracker cleared: ${allKeys.length} keys deleted`);
      } else {
        log('Error tracker: No keys to clear');
      }
    } catch (error) {
      log(`Error clearing error tracker: ${error.message}`, true);
    }
  }

  async removeFromDisabled(commandName) {
    const lowerName = commandName.toLowerCase();
    try {
      await redis.del(this._getKey(lowerName));
      await redis.del(this._getDisabledKey(lowerName));
      log(`Command "${commandName}" removed from error tracking`);
    } catch (error) {
      log(`Error removing from disabled: ${error.message}`, true);
    }
  }

  async getDisabledCommands() {
    try {
      const pattern = `${this.DISABLED_PREFIX}*`;
      const keys = await redis.keys(pattern);
      return keys.map((key) => key.replace(this.DISABLED_PREFIX, ''));
    } catch (error) {
      log(`Error getting disabled commands: ${error.message}`, true);
      return [];
    }
  }

  async cleanup() {
    try {
      const pattern = `${this.REDIS_PREFIX}*`;
      const keys = await redis.keys(pattern);
      const now = Date.now();
      let cleaned = 0;
      for (const key of keys) {
        const data = await redis.get(key);
        if (data) {
          const tracker = JSON.parse(data);
          if (now - tracker.lastErrorTime > 86400000) {
            await redis.del(key);
            cleaned++;
          }
        }
      }
      if (cleaned > 0) {
        log(`Error tracker cleanup: ${cleaned} entries removed`);
      }
    } catch (error) {
      log(`Error during cleanup: ${error.message}`, true);
    }
  }

  async shutdown() {
    log('Error tracker shutting down...');
    this.initialized = false;
  }
}

export default new ErrorTracker();
