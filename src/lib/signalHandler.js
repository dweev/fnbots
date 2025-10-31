// ─── Info ────────────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info src/lib/signalHandler.js ───────────────

import process from 'process';

class SignalHandler {
  constructor() {
    this.handlers = new Map();
    this.isShuttingDown = false;
    this.setupSignals();
  }
  setupSignals() {
    process.setMaxListeners(20);
    const signals = ['SIGINT', 'SIGTERM', 'SIGUSR2'];
    signals.forEach((signal) => {
      process.once(signal, async () => {
        if (this.isShuttingDown) return;
        this.isShuttingDown = true;
        console.log(`\n[${signal}] Shutdown signal received`);
        await this.executeShutdown(signal);
      });
    });
    process.once('exit', async (code) => {
      if (!this.isShuttingDown) {
        console.log(`Process exiting with code: ${code}`);
        await this.executeShutdown('EXIT');
      }
    });
  }
  register(name, handler, priority = 100) {
    if (this.handlers.has(name)) {
      console.warn(`Handler '${name}' already registered, replacing...`);
    }
    this.handlers.set(name, { handler, priority });
  }
  unregister(name) {
    return this.handlers.delete(name);
  }
  async executeShutdown(signal) {
    console.log(`Starting graceful shutdown...`);
    const sortedHandlers = Array.from(this.handlers.entries()).sort(([, a], [, b]) => a.priority - b.priority);
    for (const [name, { handler }] of sortedHandlers) {
      try {
        console.log(`Executing cleanup: ${name}`);
        await Promise.race([handler(signal), new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))]);
        console.log(`${name} completed`);
      } catch (error) {
        console.error(`${name} failed:`, error.message);
      }
    }
    console.log(`Graceful shutdown completed`);
    process.exit(0);
  }
  getStatus() {
    return {
      isShuttingDown: this.isShuttingDown,
      handlers: Array.from(this.handlers.keys())
    };
  }
}

export const signalHandler = new SignalHandler();
export default signalHandler;
