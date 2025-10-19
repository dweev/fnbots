// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { performanceManager } from '../../lib/performanceManager.js';

export const command = {
  name: 'checkmemory',
  category: 'master',
  description: 'Monitor dan kelola penggunaan memori aplikasi.\nLihat ".memory help" untuk detail perintah.',
  isCommandWithoutPayment: true,
  aliases: ['memory'],
  execute: async ({ args, sReply }) => {
    const subCommand = args[0]?.toLowerCase();

    if (!subCommand || subCommand === 'status') {
      const settings = performanceManager.getMemorySettings();
      const memUsage = process.memoryUsage();
      const rssInMB = Math.round(memUsage.rss / 1024 / 1024);
      const heapUsedInMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalInMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      const externalMB = Math.round(memUsage.external / 1024 / 1024);
      const rssPercent = Math.round((rssInMB / settings.rssThreshold) * 100);

      const response = `*Memory Monitor Status*\n\n` +
        `Status: ${settings.isMonitoring ? 'Running' : 'Stopped'}\n` +
        `Auto-Restart: ${settings.enableAutoRestart ? 'Enabled' : 'Disabled'}\n` +
        `Check Interval: ${settings.checkInterval / 1000}s\n` +
        `Persistence: Redis\n\n` +
        `*Current Usage:*\n` +
        `RSS: ${rssInMB}MB / ${settings.rssThreshold}MB (${rssPercent}%)\n` +
        `Heap: ${heapUsedInMB}MB / ${heapTotalInMB}MB\n` +
        `External: ${externalMB}MB\n\n` +
        `*Warning Configuration:*\n` +
        `Consecutive Warnings: ${settings.currentStats.warnings}\n` +
        `Restart Threshold: ${settings.consecutiveWarningsBeforeRestart} warnings\n` +
        `Warning Trigger: ${Math.round(settings.warningThreshold * 100)}% of RSS\n\n` +
        `Use .memory help for commands`;

      return sReply(response);
    }

    if (subCommand === 'help') {
      return sReply(
        `*Memory Monitor Commands*\n\n` +
        `*Information:*\n` +
        `.memory status - Current status\n` +
        `.memory check - Force check\n` +
        `.memory info - Detailed config\n\n` +
        `*Control:*\n` +
        `.memory start - Start monitor\n` +
        `.memory stop - Stop monitor\n` +
        `.memory gc - Force GC\n` +
        `.memory reset - Reset to defaults\n\n` +
        `*Settings:*\n` +
        `.memory set rss [MB] - RSS threshold (min: 500)\n` +
        `.memory set interval [seconds] - Check interval (min: 10)\n` +
        `.memory set autorestart [on/off] - Auto-restart toggle\n` +
        `.memory set warnings [count] - Warnings before restart (1-10)\n` +
        `.memory set threshold [0.1-1.0] - Warning percentage\n\n` +
        `Settings persist across restarts via Redis`
      );
    }

    if (subCommand === 'info') {
      const settings = performanceManager.getMemorySettings();
      const memUsage = process.memoryUsage();
      const rssInMB = Math.round(memUsage.rss / 1024 / 1024);
      const heapUsedInMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalInMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      const arrayBuffersMB = Math.round(memUsage.arrayBuffers / 1024 / 1024);
      const externalMB = Math.round(memUsage.external / 1024 / 1024);

      const lastCheckAgo = Math.round((Date.now() - settings.currentStats.lastCheck) / 1000);
      const uptime = Math.round(process.uptime());
      const uptimeHours = Math.floor(uptime / 3600);
      const uptimeMinutes = Math.floor((uptime % 3600) / 60);

      const response = `*Memory Monitor Details*\n\n` +
        `*System:*\n` +
        `Uptime: ${uptimeHours}h ${uptimeMinutes}m\n` +
        `Last Check: ${lastCheckAgo}s ago\n` +
        `Monitoring: ${settings.isMonitoring ? 'Active' : 'Inactive'}\n\n` +
        `*Memory Usage:*\n` +
        `RSS: ${rssInMB}MB\n` +
        `Heap Used: ${heapUsedInMB}MB\n` +
        `Heap Total: ${heapTotalInMB}MB\n` +
        `Array Buffers: ${arrayBuffersMB}MB\n` +
        `External: ${externalMB}MB\n\n` +
        `*Configuration:*\n` +
        `RSS Threshold: ${settings.rssThreshold}MB\n` +
        `Warning Threshold: ${Math.round(settings.warningThreshold * 100)}%\n` +
        `Check Interval: ${settings.checkInterval / 1000}s\n` +
        `Warning Count: ${settings.consecutiveWarningsBeforeRestart}\n` +
        `Auto-Restart: ${settings.enableAutoRestart ? 'Yes' : 'No'}\n\n` +
        `*Current Status:*\n` +
        `Consecutive Warnings: ${settings.currentStats.warnings}\n` +
        `Last RSS: ${settings.currentStats.lastUsage.rss}MB\n` +
        `Last Heap: ${settings.currentStats.lastUsage.heapUsed}MB`;

      return sReply(response);
    }

    if (subCommand === 'start') {
      performanceManager.startMemoryMonitoring();
      return sReply('Memory monitoring started');
    }

    if (subCommand === 'stop') {
      performanceManager.stopMemoryMonitoring();
      return sReply('Memory monitoring stopped');
    }

    if (subCommand === 'check') {
      const stats = performanceManager.cache.checkMemoryUsage();
      const settings = performanceManager.getMemorySettings();
      const rssPercent = Math.round((stats.rssMB / settings.rssThreshold) * 100);
      const heapPercent = Math.round((stats.heapUsedMB / stats.heapTotalMB) * 100);

      return sReply(
        `*Memory Check Results*\n\n` +
        `RSS: ${stats.rssMB}MB / ${settings.rssThreshold}MB (${rssPercent}%)\n` +
        `Heap: ${stats.heapUsedMB}MB / ${stats.heapTotalMB}MB (${heapPercent}%)\n` +
        `Consecutive Warnings: ${settings.currentStats.warnings}\n` +
        `Warning Threshold: ${settings.consecutiveWarningsBeforeRestart}\n` +
        `Auto-Restart: ${settings.enableAutoRestart ? 'Active' : 'Inactive'}\n` +
        `Status: ${rssPercent >= settings.warningThreshold * 100 ? 'WARNING' : 'NORMAL'}`
      );
    }

    if (subCommand === 'reset') {
      const defaultSettings = {
        checkInterval: 600000,
        rssThreshold: 3000,
        warningThreshold: 0.8,
        consecutiveWarningsBeforeRestart: 3,
        enableAutoRestart: true
      };

      await performanceManager.updateMemorySettings(defaultSettings);

      return sReply(
        `Settings reset to defaults:\n\n` +
        `RSS Threshold: 3000MB\n` +
        `Check Interval: 600s\n` +
        `Warning Threshold: 80%\n` +
        `Warnings Count: 3\n` +
        `Auto-Restart: Enabled`
      );
    }

    if (subCommand === 'set') {
      const param = args[1]?.toLowerCase();
      const value = args[2];

      if (!param || !value) {
        return sReply('Usage: .memory set [parameter] [value]\nSee .memory help for parameters');
      }

      const newSettings = {};

      if (param === 'rss') {
        const rss = Number(value);
        if (isNaN(rss) || rss < 500) {
          return sReply('Invalid RSS value. Must be >= 500 MB');
        }
        newSettings.rssThreshold = rss;
      } else if (param === 'interval') {
        const seconds = Number(value);
        if (isNaN(seconds) || seconds < 10) {
          return sReply('Invalid interval. Must be >= 10 seconds');
        }
        newSettings.checkInterval = seconds * 1000;
      } else if (param === 'autorestart') {
        if (['on', 'true', '1', 'yes'].includes(value.toLowerCase())) {
          newSettings.enableAutoRestart = true;
        } else if (['off', 'false', '0', 'no'].includes(value.toLowerCase())) {
          newSettings.enableAutoRestart = false;
        } else {
          return sReply('Invalid value. Use: on/off, true/false, yes/no, 1/0');
        }
      } else if (param === 'warnings') {
        const count = Number(value);
        if (isNaN(count) || count < 1 || count > 10) {
          return sReply('Invalid warnings count. Must be between 1-10');
        }
        newSettings.consecutiveWarningsBeforeRestart = count;
      } else if (param === 'threshold') {
        const threshold = Number(value);
        if (isNaN(threshold) || threshold < 0.1 || threshold > 1) {
          return sReply('Invalid threshold. Must be between 0.1-1.0 (10%-100%)');
        }
        newSettings.warningThreshold = threshold;
      } else {
        return sReply('Invalid parameter. See .memory help for valid parameters');
      }

      const updated = await performanceManager.updateMemorySettings(newSettings);

      let message = 'Settings updated and saved to Redis:\n\n';
      if (newSettings.rssThreshold) {
        message += `RSS Threshold: ${updated.rssThreshold}MB\n`;
      }
      if (newSettings.checkInterval) {
        message += `Check Interval: ${updated.checkInterval / 1000}s\n`;
      }
      if (typeof newSettings.enableAutoRestart !== 'undefined') {
        message += `Auto-Restart: ${updated.enableAutoRestart ? 'Enabled' : 'Disabled'}\n`;
      }
      if (newSettings.consecutiveWarningsBeforeRestart) {
        message += `Warnings Threshold: ${updated.consecutiveWarningsBeforeRestart}\n`;
      }
      if (newSettings.warningThreshold) {
        message += `Warning Trigger: ${Math.round(updated.warningThreshold * 100)}%\n`;
      }
      message += `\nSettings persist across restarts`;

      return sReply(message);
    }

    if (subCommand === 'gc') {
      if (!global.gc) {
        return sReply('Garbage collection not available\nStart Node.js with --expose-gc flag');
      }

      const before = process.memoryUsage();
      const heapBeforeMB = Math.round(before.heapUsed / 1024 / 1024);
      const rssBeforeMB = Math.round(before.rss / 1024 / 1024);

      await sReply('Running garbage collection...');

      global.gc();

      setTimeout(async () => {
        const after = process.memoryUsage();
        const heapAfterMB = Math.round(after.heapUsed / 1024 / 1024);
        const rssAfterMB = Math.round(after.rss / 1024 / 1024);
        const heapFreed = heapBeforeMB - heapAfterMB;
        const rssFreed = rssBeforeMB - rssAfterMB;

        await sReply(
          `*Garbage Collection Complete*\n\n` +
          `*Heap Memory:*\n` +
          `Before: ${heapBeforeMB}MB\n` +
          `After: ${heapAfterMB}MB\n` +
          `Freed: ${heapFreed}MB\n\n` +
          `*RSS Memory:*\n` +
          `Before: ${rssBeforeMB}MB\n` +
          `After: ${rssAfterMB}MB\n` +
          `Freed: ${rssFreed}MB`
        );
      }, 1000);

      return;
    }

    return sReply('Unknown command. Use .memory help for available commands');
  }
};