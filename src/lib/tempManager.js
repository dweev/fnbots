// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info tempManager.js ─────────────────

import fs from 'fs-extra';
import path from 'path';
import log from '../utils/logger.js'

class TempManager {
  constructor(baseDir = null) {
    this.baseDir = baseDir || path.resolve(process.cwd(), 'src/sampah');
    this.ensureDirectory();
  }
  ensureDirectory() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }
  getPath(filename) {
    return path.resolve(this.baseDir, filename);
  }
  createTempFile(extension = '', prefix = 'temp-') {
    const filename = `${prefix}${Date.now()}-${Math.random().toString(36).substring(2, 11)}${extension}`;
    return this.getPath(filename);
  }
  createTempFileWithContent(content, extension = '', prefix = 'temp-') {
    const filePath = this.createTempFile(extension, prefix);
    fs.writeFileSync(filePath, content);
    return filePath;
  }
  deleteFile(filename) {
    const filePath = this.getPath(filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }
  getAllTempFiles() {
    try {
      return fs.readdirSync(this.baseDir)
        .map(file => this.getPath(file))
        .filter(filePath => fs.statSync(filePath).isFile());
    } catch (error) {
      log(error, true);
      return [];
    }
  }
  async cleanupOldFiles(maxAgeHours = 24) {
    try {
      const files = await fs.readdir(this.baseDir);
      const now = Date.now();
      const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
      for (const file of files) {
        const filePath = this.getPath(file);
        const stats = await fs.stat(filePath);
        if (now - stats.mtimeMs > maxAgeMs) {
          await fs.unlink(filePath);
          log(`Deleted old file: ${file}`);
        }
      }
    } catch (error) {
      log(error, true);
      throw error;
    }
  }
}

export const tmpDir = new TempManager();