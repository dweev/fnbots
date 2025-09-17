// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info Contact.js ─────────────────────

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

contactSchema.methods.updateData = function (newData) {
  Object.keys(newData).forEach(key => {
    if (newData[key] !== undefined && newData[key] !== null) {
      this[key] = newData[key];
    }
  });
  this.lastUpdated = new Date();
  return this.save();
};
contactSchema.statics.bulkUpsert = async function (contactsArray) {
  if (contactsArray.length === 0) return;
  const operations = contactsArray.map(contact => ({
    updateOne: {
      filter: { jid: contact.jid },
      update: {
        $set: contact,
        $setOnInsert: { createdAt: new Date() }
      },
      upsert: true
    }
  }));
  return await this.bulkWrite(operations, { ordered: false });
};

export default mongoose.model('Contact', contactSchema);