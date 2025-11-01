/**
 * @file src/models/DatabaseBot/methods/singleton.js
 * Metode statis untuk mendapatkan instance singleton dari database bot.
 * Created with ❤️ and 💦 By FN
 */

import log from '../../../lib/logger.js';

export const statics = {
  async getDatabase() {
    try {
      let db = await this.findOne({ docId: 'DATABASE_BOT_SINGLETON' });
      if (!db) {
        log('Creating new database instance...');
        db = new this();
        await db.save();
      }
      return db;
    } catch (error) {
      log(error, true);
      throw error;
    }
  }
};
