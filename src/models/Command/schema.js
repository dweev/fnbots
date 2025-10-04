// ─── Info ─────────────────────────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info src/models/Command/schema.js ────────────────────────────────

import mongoose from 'mongoose';
import config from '../../../config.js';

const VALID_CATEGORIES = config.commandCategories;

const commandSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    index: true,
    validate: {
      validator: (v) => /^[a-zA-Z0-9]+$/.test(v),
      message: 'Command name must be alphanumeric'
    }
  },
  displayName: {
    type: String
  },
  count: {
    type: Number,
    default: 0,
    index: true
  },
  description: {
    type: String,
    default: 'belum terdefinisikan...'
  },
  category: {
    type: String,
    required: true,
    index: true,
    validate: {
      validator: (v) => VALID_CATEGORIES.includes(v),
      message: props => `${props.value} bukan kategori yang valid!`
    }
  },
  aliases: {
    type: [String],
    default: [],
    index: true
  },
  isLimitCommand: { type: Boolean, default: true },
  isLimitGameCommand: { type: Boolean, default: false },
  isCommandWithoutPayment: { type: Boolean, default: false }
}, { timestamps: true });

commandSchema.pre('save', function (next) {
  this.name = this.name.toLowerCase();
  if (!this.displayName) {
    this.displayName = this.name;
  }
  next();
});

export default commandSchema;