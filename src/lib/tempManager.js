// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info tempManager.js ─────────────────

import path from 'path';
import fs from 'fs-extra';
import log from './logger.js'
import config from '../../config.js';

class TempManager {
  constructor(baseDir = null) {
    this.baseDir = baseDir || path.resolve(process.cwd(), config.paths.tempDir);
  }
  async ensureDirectory() {
    try {
      await fs.ensureDir(this.baseDir);
    } catch (error) {
      throw new Error(`Failed to create temp directory: ${error.message}`);
    }
  }
  getPath(filename) {
    return path.resolve(this.baseDir, filename);
  }
  createTempFile(extension = '', prefix = 'temp-') {
    const filename = `${prefix}${Date.now()}-${Math.random().toString(36).substring(2, 11)}${extension}`;
    return this.getPath(filename);
  }
  async createTempFileWithContent(content, extension = '', prefix = 'temp-') {
    const filePath = this.createTempFile(extension, prefix);
    try {
      await fs.writeFile(filePath, content);
      return filePath;
    } catch (error) {
      throw new Error(`Failed to create temp file: ${error.message}`);
    }
  }
  async deleteFile(filename) {
    const filePath = this.getPath(filename);
    try {
      await fs.remove(filePath);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return false;
      }
      log(`Failed to delete file ${filePath}: ${error.message}`);
      return false;
    }
  }
  async getAllTempFiles() {
    try {
      const files = await fs.readdir(this.baseDir);
      return files
        .map(file => this.getPath(file))
        .filter(filePath => fs.statSync(filePath).isFile());
    } catch (error) {
      log(`Error reading temp directory: ${error.message}`);
      return [];
    }
  }
  async cleanupOldFiles(maxAgeHours = 24) {
    try {
      const files = await fs.readdir(this.baseDir);
      const now = Date.now();
      const maxAgeMs = maxAgeHours * config.performance.maxAgeHours;
      for (const file of files) {
        const filePath = this.getPath(file);
        const stats = await fs.stat(filePath);
        if (now - stats.mtimeMs > maxAgeMs) {
          await this.deleteFile(file);
          log(`Deleted old file: ${file}`);
        }
      }
    } catch (error) {
      log(`Error in cleanup: ${error.message}`, true);
    }
  }
}

export const tmpDir = new TempManager();