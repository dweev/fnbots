// ─── Info ──────────────────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info src/lib/restartManager.js ────────────────────

import log from './logger.js';
import { delay } from 'baileys';
import { spawn } from 'child_process';

const MAX_RESTART_ATTEMPTS = 5;
const BASE_DELAY_MS = 5000;
const MAX_DELAY_MS = 60_000;
const BACKOFF_FACTOR = 1.8;
const COOLDOWN_THRESHOLD = 5;
const COOLDOWN_DURATION = 5 * 60_000;

const isPm2 = process.env.pm_id !== undefined || process.env.NODE_APP_INSTANCE !== undefined;

function logRestartInfo() {
  log('Starting Engine...');
  log(`Running Mode: ${isPm2 ? 'PM2' : 'Node'}`);
  log(`Max Restart Attempts: ${MAX_RESTART_ATTEMPTS}`);
  log(`Cooldown Threshold: ${COOLDOWN_THRESHOLD}`);
}
logRestartInfo();

class RestartManager {
  constructor() {
    this.currentAttempts = parseInt(process.env.RESTART_ATTEMPTS, 10) || 0;
    this.isRestarting = false;
    this.cooldownUntil = 0;
    this.lastRestartAt = 0;
    this.restartTimer = null;
    if (this.currentAttempts > 0) {
      log(`Bot restarted. Attempt: ${this.currentAttempts}/${MAX_RESTART_ATTEMPTS}`);
    }
  }

  getAttempts() {
    return this.currentAttempts;
  }

  reset() {
    if (this.currentAttempts > 0 || this.cooldownUntil > 0 || this.isRestarting) {
      log(`Connection stable. Resetting all restart states.`);
      this.currentAttempts = 0;
      this.cooldownUntil = 0;
      this.lastRestartAt = 0;
      this.isRestarting = false;
      if (this.restartTimer) {
        clearTimeout(this.restartTimer);
        this.restartTimer = null;
      }
    }
  }

  isInCooldown() {
    return Date.now() < this.cooldownUntil;
  }

  isMaxAttemptsReached() {
    return this.currentAttempts >= MAX_RESTART_ATTEMPTS;
  }

  computeDelay(attempt) {
    const n = Math.max(0, attempt - 1);
    const raw = Math.min(MAX_DELAY_MS, Math.round(BASE_DELAY_MS * Math.pow(BACKOFF_FACTOR, n)));
    const jitter = raw * (0.2 + Math.random() * 0.3);
    const finalDelay = Math.max(500, raw + Math.round((Math.random() < 0.5 ? -1 : 1) * jitter));
    return finalDelay;
  }

  async restart(reason, performanceManager = null, socket = null) {
    if (this.isRestarting) {
      log('Restart already in progress, ignoring duplicate request.');
      return;
    }
    if (this.isInCooldown()) {
      const waitTime = this.cooldownUntil - Date.now();
      await log(`In cooldown period. Retry in ${Math.ceil(waitTime / 1000)}s...`);
      if (!this.restartTimer) {
        this.restartTimer = setTimeout(() => {
          this.restartTimer = null;
          this.restart(reason, performanceManager, socket);
        }, waitTime);
      }
      return;
    }
    this.isRestarting = true;
    const nextAttempt = this.currentAttempts + 1;
    try {
      if (nextAttempt > MAX_RESTART_ATTEMPTS) {
        await log(`FATAL: Max restart attempts reached (${MAX_RESTART_ATTEMPTS})`, true);
        await log(`Reason: ${reason}`, true);
        if (performanceManager) {
          try {
            const cache = performanceManager.cache || performanceManager;
            if (typeof cache.forceSync === 'function') {
              await cache.forceSync();
            }
          } catch (e) {
            log(`Cache sync failed before exit: ${e.message}`, true);
          }
        }
        this.isRestarting = false;
        process.exit(1);
      }
      if (nextAttempt >= COOLDOWN_THRESHOLD) {
        this.cooldownUntil = Date.now() + COOLDOWN_DURATION;
        this.currentAttempts = 0;
        this.isRestarting = false;
        await log(`Reached ${COOLDOWN_THRESHOLD} consecutive failures. Entering 5-minute cooldown...`);
        if (!this.restartTimer) {
          this.restartTimer = setTimeout(() => {
            this.restartTimer = null;
            log('Cooldown period ended. Ready for retry.');
          }, COOLDOWN_DURATION);
        }
        return;
      }
      const delayTime = this.computeDelay(nextAttempt);
      await log(`Restart triggered: ${reason}`);
      await log(`Attempt ${nextAttempt}/${MAX_RESTART_ATTEMPTS} in ${(delayTime / 1000).toFixed(1)}s...`);
      try {
        await this.performCleanup(performanceManager, socket);
      } catch (error) {
        log(`Cleanup error: ${error.message}`, true);
      }
      await delay(delayTime);
      this.lastRestartAt = Date.now();
      this.currentAttempts = nextAttempt;
      if (isPm2) {
        process.exit(1);
      } else {
        const child = spawn(process.argv[0], process.argv.slice(1), {
          detached: true,
          stdio: 'inherit',
          env: {
            ...process.env,
            RESTART_ATTEMPTS: this.currentAttempts.toString(),
            RESTARTED_BY_SELF: '1',
            LAST_RESTART_AT: this.lastRestartAt.toString()
          }
        });
        child.on('error', (error) => {
          log(`Spawn error: ${error.message}`, true);
          this.isRestarting = false;
          this.currentAttempts = Math.max(0, this.currentAttempts - 1);
          setTimeout(() => {
            this.restart(reason, performanceManager, socket);
          }, 5000);
        });
        child.unref();
        process.exit(0);
      }
    } catch (error) {
      await log(`Restart failed: ${error.message}`, true);
      await log(error.stack, true);
      this.isRestarting = false;
      setTimeout(() => {
        log('Retrying restart after failure...');
        this.restart(reason, performanceManager, socket);
      }, 5000);
    }
  }

  async performCleanup(performanceManager = null, socket = null) {
    log('Performing cleanup before restart...');
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    if (socket) {
      try {
        if (socket.ws) {
          const closeResult = socket.ws.close();
          if (closeResult && typeof closeResult.then === 'function') {
            await closeResult;
          }
          log('Socket WebSocket closed in cleanup');
        }
        if (socket.ev) {
          socket.ev.removeAllListeners();
          log('Socket event listeners removed in cleanup');
        }
      } catch (e) {
        log(`Socket cleanup error: ${e.message}`, true);
      }
    }
    if (performanceManager) {
      try {
        const cache = performanceManager.cache || performanceManager;
        if (typeof cache.forceSync === 'function') {
          await cache.forceSync();
          log('Cache synced in cleanup');
        }
      } catch (error) {
        log(`Cache sync failed in cleanup: ${error.message}`, true);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
    log('Cleanup completed');
  }

  async shutdown(performanceManager = null, socket = null) {
    if (this.isRestarting) {
      log('Shutdown already in progress.');
      return;
    }
    this.isRestarting = true;
    await log('Graceful shutdown initiated...');
    try {
      await this.performCleanup(performanceManager, socket);
    } catch (error) {
      log(`Cleanup error during shutdown: ${error.message}`, true);
    }
    if (isPm2) {
      const { exec } = await import('child_process');
      const util = await import('util');
      const execAsync = util.promisify(exec);
      try {
        await execAsync(`pm2 stop ${process.env.pm_id || 'fnbots'}`);
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
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    this.isRestarting = false;
    process.exit(code);
  }

  async permanentStop(reason = 'Manual stop') {
    await log(`Permanent stop requested: ${reason}`, true);
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    this.isRestarting = false;
    if (isPm2) {
      const { exec } = await import('child_process');
      const util = await import('util');
      const execAsync = util.promisify(exec);
      try {
        const processId = process.env.pm_id || process.env.name || 'fnbots';
        await log(`Stopping PM2 process: ${processId}`);
        await execAsync(`pm2 stop ${processId}`);
        setTimeout(() => process.exit(0), 2000);
      } catch (error) {
        await log(`PM2 stop command failed: ${error.message}`, true);
        await log('Forcing process exit...');
        process.exit(0);
      }
    } else {
      await log('Stopping Node process...');
      process.exit(0);
    }
  }

  getStatus() {
    return {
      attempts: this.currentAttempts,
      maxAttempts: MAX_RESTART_ATTEMPTS,
      cooldownThreshold: COOLDOWN_THRESHOLD,
      isRestarting: this.isRestarting,
      isInCooldown: this.isInCooldown(),
      cooldownEndsAt: this.cooldownUntil > 0 ? new Date(this.cooldownUntil) : null,
      lastRestartAt: this.lastRestartAt > 0 ? new Date(this.lastRestartAt) : null,
      nextCooldownIn: this.currentAttempts > 0 ? COOLDOWN_THRESHOLD - this.currentAttempts : null
    };
  }
}

export const restartManager = new RestartManager();
export default restartManager;
