// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info src/lib/restartManager.js ──────

import log from './logger.js';
import { delay } from 'baileys';
import { spawn } from 'child_process';

const MAX_RESTART_ATTEMPTS = 5;
const RESTART_DELAY_MS = 6000;
const isPm2 = process.env.pm_id !== undefined || process.env.NODE_APP_INSTANCE !== undefined;
const isSelfRestarted = process.env.RESTARTED_BY_SELF === '1';

function logRestartInfo() {
  log('Starting Engine...');
  log(`Running Mode: ${isPm2 ? 'PM2' : 'Node'} | RestartedBySelf: ${isSelfRestarted}`);
};
logRestartInfo();

class RestartManager {
  constructor() {
    this.currentAttempts = parseInt(process.env.RESTART_ATTEMPTS, 10) || 0;
    this.isRestarting = false;
    if (this.currentAttempts > 0) {
      log(`Bot restarted. Attempt: ${this.currentAttempts}/${MAX_RESTART_ATTEMPTS}`);
    }
  }
  getAttempts() {
    return this.currentAttempts;
  }
  reset() {
    if (this.currentAttempts > 0) {
      log(`Connection stable. Resetting restart counter.`);
      this.currentAttempts = 0;
    }
  }
  isMaxAttemptsReached() {
    return this.currentAttempts >= MAX_RESTART_ATTEMPTS;
  }
  async restart(reason, performanceManager = null) {
    if (this.isRestarting) {
      log('Restart already in progress, ignoring duplicate request.');
      return;
    }
    this.isRestarting = true;
    const nextAttempt = this.currentAttempts + 1;
    if (nextAttempt > MAX_RESTART_ATTEMPTS) {
      await log(`FATAL: Max restart attempts (${MAX_RESTART_ATTEMPTS}) reached.`);
      await log(`Reason: ${reason}`);
      if (performanceManager) {
        await performanceManager.cache.forceSync();
      }
      process.exit(1);
    }
    await log(`Restart triggered: ${reason}`);
    await log(`Attempt ${nextAttempt}/${MAX_RESTART_ATTEMPTS} in ${RESTART_DELAY_MS / 1000}s...`);
    if (performanceManager) {
      try {
        await performanceManager.cache.forceSync();
        log('Cache synced successfully before restart');
      } catch (error) {
        log(`Cache sync failed: ${error.message}`, true);
      }
    }
    await delay(RESTART_DELAY_MS);
    if (isPm2) {
      process.exit(1);
    } else {
      spawn(process.argv[0], process.argv.slice(1), {
        detached: true,
        stdio: 'inherit',
        env: {
          ...process.env,
          RESTART_ATTEMPTS: nextAttempt.toString(),
          RESTARTED_BY_SELF: '1'
        }
      });
      process.exit(0);
    }
  }
  async shutdown(performanceManager = null) {
    if (this.isRestarting) {
      log('Shutdown already in progress.');
      return;
    }
    this.isRestarting = true;
    await log('Graceful shutdown initiated...');
    if (performanceManager) {
      try {
        await performanceManager.cache.forceSync();
        log('Cache synced successfully');
      } catch (error) {
        log(`Cache sync failed: ${error.message}`, true);
      }
    }
    if (isPm2) {
      const { exec } = await import('child_process');
      const util = await import('util');
      const execAsync = util.promisify(exec);
      try {
        await execAsync(`pm2 stop ${process.env.pm_id}`);
      } catch (error) {
        log(`PM2 stop failed: ${error.message}`, true);
        process.exit(0);
      }
    } else {
      process.exit(0);
    }
  }
  forceExit(code = 1) {
    log(`Force exit with code ${code}`);
    process.exit(code);
  }
}

export const restartManager = new RestartManager();
export default restartManager;