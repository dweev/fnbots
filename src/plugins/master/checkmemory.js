import { performanceManager } from '../../lib/performanceManager.js';

export const command = {
  name: 'checkmemory',
  category: 'master',
  description: 'Monitor dan kelola penggunaan memori aplikasi.\nUsage: memory [status|start|stop|set|check|gc|help]\nLihat "{prefix}memory help" untuk detail perintah.',
  isCommandWithoutPayment: true,
  execute: async ({ args, sReply }) => {
    const subCommand = args[0]?.toLowerCase();
    if (!subCommand || subCommand === 'status') {
      const settings = performanceManager.cache.getMemorySettings();
      const memUsage = process.memoryUsage();
      const rssInMB = Math.round(memUsage.rss / 1024 / 1024);
      const heapUsedInMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalInMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      const rssPercent = Math.round((rssInMB / settings.rssThreshold) * 100);
      const response = `*Memory Monitor Status*\n\n` +
        `*Status*: ${settings.isMonitoring ? 'Running' : 'Stopped'}\n` +
        `*Auto-Restart*: ${settings.enableAutoRestart ? 'Enabled' : 'Disabled'}\n` +
        `*Check Interval*: ${settings.checkInterval / 1000}s\n\n` +
        `*Current Usage:*\n` +
        `RSS: ${rssInMB}MB / ${settings.rssThreshold}MB (${rssPercent}%)\n` +
        `Heap: ${heapUsedInMB}MB / ${heapTotalInMB}MB\n\n` +
        `*Warnings*: ${settings.currentStats.warnings} consecutive\n` +
        `*Auto-Restart*: After ${settings.consecutiveWarningsBeforeRestart} warnings or threshold exceeded\n\n` +
        `Use '{prefix}memory help' for more commands.`;
      return sReply(response);
    } else if (subCommand === 'help') {
      return sReply(
        `*Memory Monitor Commands*\n\n` +
        `🔹 {prefix}memory status - Show status\n` +
        `🔹 {prefix}memory start - Start monitoring\n` +
        `🔹 {prefix}memory stop - Stop monitoring\n` +
        `🔹 {prefix}memory set [param] [value] - Update settings\n` +
        `   - rss [MB] - RSS threshold\n` +
        `   - interval [ms] - Check interval\n` +
        `   - autorestart [on/off] - Toggle auto-restart\n` +
        `   - warnings [count] - Warnings before restart\n` +
        `🔹 {prefix}memory check - Force memory check\n` +
        `🔹 {prefix}memory gc - Force garbage collection`
      );
    } else if (subCommand === 'start') {
      performanceManager.cache.startMemoryMonitoring();
      return sReply('Memory monitoring started');
    } else if (subCommand === 'stop') {
      performanceManager.cache.stopMemoryMonitoring();
      return sReply('Memory monitoring stopped');
    } else if (subCommand === 'check') {
      const stats = performanceManager.cache.checkMemoryUsage();
      const settings = performanceManager.cache.getMemorySettings();
      return sReply(
        `*Memory Check Results*\n\n` +
        `RSS: ${stats.rssMB}MB (${Math.round((stats.rssMB / settings.rssThreshold) * 100)}%)\n` +
        `Heap: ${stats.heapUsedMB}MB / ${stats.heapTotalMB}MB\n` +
        `Warnings: ${settings.currentStats.warnings} consecutive\n` +
        `Auto-Restart: ${settings.enableAutoRestart ? 'Enabled' : 'Disabled'}`
      );
    } else if (subCommand === 'set') {
      const param = args[1]?.toLowerCase();
      if (!param) {
        return sReply('Invalid parameters. Use: {prefix}memory set [rss|interval|autorestart|warnings] [value]');
      }
      const newSettings = {};
      if (param === 'rss') {
        const value = Number(args[2]);
        if (isNaN(value) || value < 100) {
          return sReply('Invalid RSS value. Use a number greater than 100 MB.');
        }
        newSettings.rssThreshold = value;
      } else if (param === 'interval') {
        const value = Number(args[2]);
        if (isNaN(value) || value < 10000) {
          return sReply('Invalid interval. Use a number greater than 10000 ms (10 seconds).');
        }
        newSettings.checkInterval = value;
      } else if (param === 'autorestart') {
        const value = args[2]?.toLowerCase();
        if (value === 'on' || value === 'true' || value === '1') {
          newSettings.enableAutoRestart = true;
        } else if (value === 'off' || value === 'false' || value === '0') {
          newSettings.enableAutoRestart = false;
        } else {
          return sReply('Invalid value. Use "on" or "off".');
        }
      } else if (param === 'warnings') {
        const value = Number(args[2]);
        if (isNaN(value) || value < 1) {
          return sReply('Invalid warnings count. Use a number greater than 0.');
        }
        newSettings.consecutiveWarningsBeforeRestart = value;
      } else {
        return sReply('Invalid parameter. Use rss, interval, autorestart, or warnings.');
      }
      performanceManager.cache.updateMemorySettings(newSettings);
      let message = 'Memory monitor settings updated:';
      if (newSettings.rssThreshold) {
        message += `\n- RSS threshold: ${newSettings.rssThreshold}MB`;
      }
      if (newSettings.checkInterval) {
        message += `\n- Check interval: ${newSettings.checkInterval / 1000}s`;
      }
      if (typeof newSettings.enableAutoRestart !== 'undefined') {
        message += `\n- Auto-restart: ${newSettings.enableAutoRestart ? 'Enabled' : 'Disabled'}`;
      }
      if (newSettings.consecutiveWarningsBeforeRestart) {
        message += `\n- Warnings before restart: ${newSettings.consecutiveWarningsBeforeRestart}`;
      }
      return sReply(message);
    } else if (subCommand === 'gc' && global.gc) {
      const before = process.memoryUsage();
      const heapUsedBeforeMB = Math.round(before.heapUsed / 1024 / 1024);
      sReply('Forcing garbage collection...');
      global.gc();
      setTimeout(async () => {
        const after = process.memoryUsage();
        const heapUsedAfterMB = Math.round(after.heapUsed / 1024 / 1024);
        const freedMB = heapUsedBeforeMB - heapUsedAfterMB;
        await sReply(
          `Garbage collection complete\n` +
          `Heap usage: ${heapUsedBeforeMB}MB → ${heapUsedAfterMB}MB ` +
          `(freed ${freedMB}MB)`
        );
      }, 1000);
      return;
    } else if (subCommand === 'gc' && !global.gc) {
      return sReply('Garbage collection not available. Start Node.js with --expose-gc flag.');
    } else {
      return sReply('Unknown subcommand. Use {prefix}memory help for available commands.');
    }
  }
};