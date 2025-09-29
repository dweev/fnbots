// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info connection index.js ────────────

import mongoose from 'mongoose';
import config from '../config.js';
import log from '../src/lib/logger.js';

mongoose.set('strictQuery', false);

class DatabaseConnection {
  constructor() {
    this.isConnected = false;
    this.connectionRetries = 0;
    this.maxRetries = 5;
    this.isReconnecting = false;
  }
  async connect() {
    const MONGODB_URI = config.mongodbUri;
    try {
      mongoose.connection.on('connected', () => {
        this.isConnected = true;
        this.isReconnecting = false;
        this.connectionRetries = 0;
        log('MongoDB connected successfully');
      });
      mongoose.connection.on('error', (error) => {
        this.isConnected = false;
        log(`MongoDB error: ${error.message}`, true);
      });
      mongoose.connection.on('disconnected', () => {
        this.isConnected = false;
        log('MongoDB disconnected');
        this.attemptReconnect();
      });
      const start = Date.now();
      await mongoose.connect(MONGODB_URI, {
        maxPoolSize: 50,
        minPoolSize: 10,
        serverSelectionTimeoutMS: config.performance.serverSelectionTimeoutMS,
        socketTimeoutMS: config.performance.socketTimeoutMS,
      });
      log(`MongoDB connection established in ${Date.now() - start}ms`);
    } catch (error) {
      log(`MongoDB connection error: ${error.message}`, true);
      this.attemptReconnect();
    }
  }
  async attemptReconnect() {
    if (this.isConnected || this.isReconnecting) return;
    if (this.connectionRetries >= this.maxRetries) {
      log('Max reconnection attempts reached', true);
      return;
    }
    this.isReconnecting = true;
    this.connectionRetries++;
    const delay = config.performance.serverSelectionTimeoutMS * this.connectionRetries;
    log(`Attempting reconnect (${this.connectionRetries}/${this.maxRetries}) after ${delay}ms...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    await this.connect();
  }

  async disconnect() {
    if (this.isConnected) {
      await mongoose.disconnect();
      this.isConnected = false;
      log('MongoDB disconnected manually');
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
        retries: this.connectionRetries,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message,
        retries: this.connectionRetries,
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
import User from '../src/models/User/index.js';
import Media from '../src/models/Media/index.js';
import Group from '../src/models/Group/index.js';
import Command from '../src/models/Command/index.js';
import Settings from '../src/models/Settings/index.js';
import Whitelist from '../src/models/Whitelist/index.js';
import StoreContact from '../src/models/StoreContact/index.js';
import StoreGroupMetadata from '../src/models/StoreGroupMetadata/index.js';
import { saveMediaStream, getMediaStream, deleteMedia, findMedia } from './hybrid.js';
import StoreMessages from '../src/models/StoreMessages/index.js';
import DatabaseBot from '../src/models/DatabaseBot/index.js';
import StoreStory from '../src/models/StoreStory/index.js';
import OTPSession from '../src/models/OTPSession/index.js';

export {
  database,
  User,
  Group,
  Media,
  Command,
  Settings,
  Whitelist,
  mongoStore,
  DatabaseBot,
  StoreContact,
  StoreGroupMetadata,
  StoreMessages,
  StoreStory,
  OTPSession,
  saveMediaStream,
  getMediaStream,
  deleteMedia,
  findMedia
};