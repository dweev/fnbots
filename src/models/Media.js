// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info Media.js ───────────────────────

import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['sticker', 'image', 'audio', 'video'],
    index: true
  },
  mime: {
    type: String,
    required: true
  },
  data: {
    type: Buffer,
    required: true
  }
}, { timestamps: true });

export default mongoose.model('Media', mediaSchema);