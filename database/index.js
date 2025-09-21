// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info connection index.js ────────────

import config from '../config.js';
import mongoose from 'mongoose';
import log from '../src/utils/logger.js';

class DatabaseConnection {
  constructor() {
    this.isConnected = false;
    this.connectionRetries = 0;
    this.maxRetries = 5;
  }
  async connect() {
    try {
      const MONGODB_URI = config.mongodbUri;
      mongoose.connection.on('connected', () => {
        this.isConnected = true;
        this.connectionRetries = 0;
        log('MongoDB connected successfully');
      });
      mongoose.connection.on('error', (error) => {
        this.isConnected = false;
        log(error, true);
      });
      mongoose.connection.on('disconnected', () => {
        this.isConnected = false;
        log('MongoDB disconnected');
        this.attemptReconnect();
      });
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
    } catch (error) {
      this.attemptReconnect();
      throw error;
    }
  }
  async attemptReconnect() {
    if (this.connectionRetries >= this.maxRetries) {
      log('Max reconnection attempts reached', true);
      return;
    }
    this.connectionRetries++;
    log(`Attempting reconnect (${this.connectionRetries}/${this.maxRetries})...`);
    setTimeout(() => {
      this.connect();
    }, 5000 * this.connectionRetries);
  }
  async disconnect() {
    if (this.isConnected) {
      await mongoose.disconnect();
      this.isConnected = false;
      log('MongoDB disconnected');
    }
  }
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected', connected: false };
      }
      await mongoose.connection.db.admin().ping();
      return {
        status: 'healthy',
        connected: true,
        retries: this.connectionRetries
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message,
        retries: this.connectionRetries
      };
    }
  }
  async withTransaction(callback) {
    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        result = await callback(session);
      });
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

const database = new DatabaseConnection();

import mongoStore from './StoreDB.js';
import User from '../src/models/User.js';
import Group from '../src/models/Group.js';
import Command from '../src/models/Command.js';
import Settings from '../src/models/Settings.js';
import Whitelist from '../src/models/Whitelist.js';
import StoreContact from '../src/models/StoreContact.js';
import StoreGroupMetadata from '../src/models/StoreGroupMetadata.js';
import DatabaseBot from '../src/models/DatabaseBot.js'
import StoreMessages from '../src/models/StoreMessages.js';
import StoreStory from '../src/models/StoreStory.js';

export {
  database,
  User,
  Group,
  Command,
  Settings,
  Whitelist,
  mongoStore,
  DatabaseBot,
  StoreContact,
  StoreGroupMetadata,
  StoreMessages,
  StoreStory
};