// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    index: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['sticker', 'image', 'audio', 'video'],
    index: true,
  },
  mime: {
    type: String,
    required: true,
  },
  storageType: {
    type: String,
    enum: ['buffer', 'gridfs', 'local'],
    default: 'buffer',
    index: true,
  },
  data: {
    type: Buffer,
    required: function () {
      return this.storageType === 'buffer';
    },
  },
  gridfsId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  path: {
    type: String,
    default: null,
  },
  size: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

mediaSchema.index({ name: 1, type: 1 }, { unique: true });

export default mediaSchema;