// ─── Info ──────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info database/hybrid.js ───────────────────────

import path from 'path';
import fs from 'fs-extra';
import mongoose from 'mongoose';
import config from '../config.js';
import { GridFSBucket } from 'mongodb';
import { Media } from './index.js';

const STORAGE_PATH = config.paths.databaseMedia;
const GRIDFS_BUCKET_NAME = 'media_files';

if (!fs.existsSync(STORAGE_PATH)) {
  fs.mkdirSync(STORAGE_PATH, { recursive: true });
}

let bucket;
mongoose.connection.once('open', () => {
  bucket = new GridFSBucket(mongoose.connection.db, { bucketName: GRIDFS_BUCKET_NAME });
  console.log('GridFS Bucket for hybrid media storage is ready.');
});

function toObjectId(id) {
  if (!id) return id;
  if (id instanceof mongoose.Types.ObjectId) return id;
  if (typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(id);
  }
  return id;
}

export async function saveMediaStream(name, type, mime, filePath) {
  if (!bucket) throw new Error('GridFS is not ready yet. Please wait for the database connection.');
  const stats = await fs.promises.stat(filePath);
  const size = stats.size;
  let doc;
  if (size < 16 * 1024 * 1024) {
    const buffer = await fs.promises.readFile(filePath);
    doc = await Media.create({
      name, type, mime, size,
      storageType: 'buffer',
      data: buffer
    });
    return doc;
  }
  if (size <= 100 * 1024 * 1024) {
    const uploadStream = bucket.openUploadStream(`${name}-${Date.now()}`, { contentType: mime });
    const fileId = await new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(filePath);
      readStream.pipe(uploadStream)
        .on('finish', () => resolve(uploadStream.id))
        .on('error', reject);
      readStream.on('error', reject);
    });
    try {
      doc = await Media.create({
        name, type, mime, size,
        storageType: 'gridfs',
        gridfsId: fileId
      });
      return doc;
    } catch (err) {
      await bucket.delete(toObjectId(fileId));
      throw err;
    }
  }
  const destPath = path.join(STORAGE_PATH, `${Date.now()}-${path.basename(filePath)}`);
  try {
    await fs.copy(filePath, destPath);
    doc = await Media.create({
      name, type, mime, size,
      storageType: 'local',
      path: destPath
    });
    return doc;
  } catch (err) {
    await fs.remove(destPath);
    throw err;
  }
}

export async function getMediaStream(identifier) {
  if (!bucket) throw new Error('GridFS is not ready yet. Please wait for the database connection.');
  const query = (typeof identifier === 'string' && mongoose.Types.ObjectId.isValid(identifier))
    ? { _id: identifier }
    : { name: identifier };
  const media = await Media.findOne(query);
  if (!media) throw new Error('Media not found');
  if (media.storageType === 'buffer') {
    const { Readable } = await import('stream');
    return { stream: Readable.from(media.data), mime: media.mime };
  }
  if (media.storageType === 'gridfs') {
    return { stream: bucket.openDownloadStream(toObjectId(media.gridfsId)), mime: media.mime };
  }
  if (media.storageType === 'local') {
    return { stream: fs.createReadStream(media.filePath), mime: media.mime };
  }
  throw new Error(`Unknown or unsupported storageType: ${media.storageType}`);
}

export async function deleteMedia(identifier) {
  if (!bucket) throw new Error('GridFS is not ready yet. Please wait for the database connection.');
  const media = await Media.findOne(identifier);
  if (!media) return null;
  const { storageType, gridfsId, filePath, name } = media;
  try {
    if (storageType === 'gridfs' && gridfsId) {
      await bucket.delete(toObjectId(gridfsId));
    } else if (storageType === 'local' && filePath) {
      await fs.remove(filePath);
    }
  } catch (e) {
    console.warn(`[hybrid.deleteMedia] Failed to delete physical file for ${name}:`, e.message);
  }
  await Media.deleteOne({ _id: media._id });
  return { name, storageType };
}

export async function findMedia(query = {}) {
  return Media.find(query).lean();
}