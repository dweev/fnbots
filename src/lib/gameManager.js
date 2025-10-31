// ─── Info ────────────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info src/lib/gameManager.js ─────────────────

import log from './logger.js';

class GameStateManager {
  constructor() {
    this.activeGames = new Set();
    this.gameStartTimes = new Map();
  }
  isGameActive(serial) {
    return this.activeGames.has(serial);
  }
  async startGame(serial) {
    if (this.isGameActive(serial)) {
      throw new Error('Kamu masih memiliki permainan yang sedang berlangsung. Harap tunggu hingga selesai.');
    }
    this.activeGames.add(serial);
    this.gameStartTimes.set(serial, Date.now());
    return true;
  }
  endGame(serial) {
    this.activeGames.delete(serial);
    this.gameStartTimes.delete(serial);
  }
  forceEndGame(serial) {
    if (this.isGameActive(serial)) {
      this.endGame(serial);
      return true;
    }
    return false;
  }
  cleanupStaleGames() {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    let cleaned = 0;
    for (const [serial, startTime] of this.gameStartTimes.entries()) {
      if (startTime < fiveMinutesAgo) {
        log(`Cleaning up stale game for ${serial}`);
        this.activeGames.delete(serial);
        this.gameStartTimes.delete(serial);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      log(`Cleaned ${cleaned} stale games`);
    }

    return cleaned;
  }
  getStats() {
    return {
      activeGames: this.activeGames.size,
      oldestGameAge: this.gameStartTimes.size > 0 ? Date.now() - Math.min(...this.gameStartTimes.values()) : 0,
      games: Array.from(this.gameStartTimes.entries()).map(([serial, time]) => ({
        serial,
        duration: Date.now() - time
      }))
    };
  }
  async shutdown() {
    const activeCount = this.activeGames.size;
    log(`Shutting down game state manager with ${activeCount} active games`);
    this.activeGames.clear();
    this.gameStartTimes.clear();
  }
}

export const gameStateManager = new GameStateManager();
