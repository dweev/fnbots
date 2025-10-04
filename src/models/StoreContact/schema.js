// ─── Info ─────────────────────────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info src/models/StoreContact/schema.js ───────────────────────────

import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema({
  jid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    default: ''
  },
  notify: {
    type: String,
    default: ''
  },
  verifiedName: {
    type: String,
    default: ''
  },
  lid: {
    type: String,
    default: '',
    index: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  minimize: false
});

contactSchema.index({ name: 1 });
contactSchema.index({ verifiedName: 1 });
contactSchema.index({ notify: 1 });
contactSchema.index({ lastUpdated: -1 });

export default contactSchema;