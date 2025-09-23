// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info Commands.js ────────────────────

import mongoose from 'mongoose';
import config from '../../config.js';

const VALID_CATEGORIES = config.commandCategories;
const commandSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    index: true,
    validate: {
      validator: function (v) {
        return /^[a-zA-Z0-9]+$/.test(v);
      },
      message: 'Command name must be alphanumeric'
    }
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
      validator: function (v) {
        return VALID_CATEGORIES.includes(v);
      },
      message: props => `${props.value} bukan kategori yang valid!`
    }
  },
  aliases: {
    type: [String],
    default: [],
    index: true
  }
}, {
  timestamps: true
});

commandSchema.pre('save', function (next) {
  this.name = this.name.toLowerCase();
  next();
});
commandSchema.methods.incrementCount = function (amount = 1) {
  this.count += amount;
  return this.save();
};
commandSchema.methods.updateDescription = function (newDescription) {
  this.description = newDescription;
  return this.save();
};
commandSchema.methods.changeCategory = function (newCategory) {
  if (VALID_CATEGORIES.includes(newCategory)) {
    this.category = newCategory;
    return this.save();
  }
  throw new Error('Invalid category');
};

commandSchema.statics.updateCount = async function (commandName, amount = 1) {
  return this.findOneAndUpdate(
    { name: commandName.toLowerCase() },
    { $inc: { count: amount } },
    { upsert: true, new: true }
  );
};
commandSchema.statics.getTopCommands = function (limit = 10) {
  return this.find().sort({ count: -1 }).limit(limit);
};
commandSchema.statics.getCommandsByCategory = function (category, limit = 20) {
  return this.find({ category }).sort({ count: -1 }).limit(limit);
};
commandSchema.statics.getCommandStats = function () {
  return this.aggregate([
    {
      $group: {
        _id: '$category',
        totalCommands: { $sum: 1 },
        totalUsage: { $sum: '$count' },
        averageUsage: { $avg: '$count' }
      }
    }
  ]);
};
commandSchema.statics.findOrCreate = async function (name, category, description = 'belum terdefinisikan...', aliases) {
  const normalizedName = name.toLowerCase();
  let command = await this.findOne({ name: normalizedName });
  if (!command) {
    command = new this({
      name: normalizedName,
      category,
      description,
      aliases
    });
    await command.save();
  }
  return command;
};
commandSchema.statics.migrateFromJSON = async function (jsonData) {
  const commands = [];
  for (const [name, data] of Object.entries(jsonData)) {
    const command = await this.findOrCreate(
      name,
      data.category || 'util',
      data.description || 'belum terdefinisikan...'
    );
    if (data.count) {
      command.count = data.count;
      await command.save();
    }
    commands.push(command);
  }
  return commands;
};
commandSchema.statics.addAlias = async function (commandName, alias) {
  const normalizedName = commandName.toLowerCase();
  const normalizedAlias = alias.toLowerCase();
  const aliasExistsAsCommand = await this.findOne({ name: normalizedAlias });
  if (aliasExistsAsCommand) {
    throw new Error(`Gagal! Nama '${normalizedAlias}' sudah digunakan oleh perintah lain.`);
  }
  const aliasExistsAsAlias = await this.findOne({ aliases: normalizedAlias });
  if (aliasExistsAsAlias) {
    throw new Error(`Gagal! Nama '${normalizedAlias}' sudah menjadi alias untuk perintah '${aliasExistsAsAlias.name}'.`);
  }
  const command = await this.findOne({ name: normalizedName });
  if (!command) {
    throw new Error(`Perintah utama '${normalizedName}' tidak ditemukan.`);
  }
  if (!command.aliases.includes(normalizedAlias)) {
    command.aliases.push(normalizedAlias);
    await command.save();
  }
  return command;
};
commandSchema.statics.removeAlias = async function (commandName, alias) {
  const normalizedName = commandName.toLowerCase();
  const normalizedAlias = alias.toLowerCase();
  const command = await this.findOne({ name: normalizedName });
  if (!command) {
    throw new Error(`Perintah utama '${normalizedName}' tidak ditemukan.`);
  }
  command.aliases = command.aliases.filter(a => a !== normalizedAlias);
  await command.save();
  return command;
};
commandSchema.statics.resetAll = async function () {
  return this.deleteMany({});
};

export default mongoose.model('Command', commandSchema);