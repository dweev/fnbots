// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  jid: {
    type: String,
    required: true
  },
  lid: {
    type: String,
    default: ''
  },
  admin: {
    type: String,
    enum: ['admin', 'superadmin', null],
    default: null
  }
}, {
  _id: false
});
const groupMetadataSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  groupId: {
    type: String,
    required: true,
    unique: true
  },
  addressingMode: {
    type: String,
    default: ''
  },
  subject: {
    type: String,
    default: ''
  },
  subjectOwner: {
    type: String,
    default: ''
  },
  subjectOwnerPhoneNumber: {
    type: String,
    default: ''
  },
  subjectTime: {
    type: Number,
    default: 0
  },
  creation: {
    type: Number,
    default: 0
  },
  owner: {
    type: String,
    default: ''
  },
  ownerPhoneNumber: {
    type: String,
    default: ''
  },
  desc: {
    type: String,
    default: ''
  },
  descId: {
    type: String,
    default: ''
  },
  linkedParent: {
    type: String,
    default: ''
  },
  restrict: {
    type: Boolean,
    default: false
  },
  announce: {
    type: Boolean,
    default: false
  },
  isCommunity: {
    type: Boolean,
    default: false
  },
  isCommunityAnnounce: {
    type: Boolean,
    default: false
  },
  joinApprovalMode: {
    type: Boolean,
    default: false
  },
  memberAddMode: {
    type: Boolean,
    default: false
  },
  ephemeralDuration: {
    type: Number,
    default: 0
  },
  participants: [participantSchema],
  size: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  lastSynced: {
    type: Date,
    default: Date.now
  },
  updateCount: {
    type: Number,
    default: 0
  },
}, {
  timestamps: true,
  minimize: false
});

groupMetadataSchema.pre('save', function (next) {
  if (!this.groupId && this.id) this.groupId = this.id;
  if (!this.id && this.groupId) this.id = this.groupId;
  this.size = this.participants.length;
  this.lastUpdated = new Date();
  if (!this.isNew && this.isModified()) {
    const modifiedPaths = this.modifiedPaths();
    if (!modifiedPaths.includes('updateCount')) {
      this.updateCount += 1;
    }
  }
  next();
});

groupMetadataSchema.index({ subject: 1 });
groupMetadataSchema.index({ owner: 1 });
groupMetadataSchema.index({ 'participants.id': 1 });
groupMetadataSchema.index({ 'participants.jid': 1 });
groupMetadataSchema.index({ 'participants.admin': 1 });
groupMetadataSchema.index({ lastUpdated: -1 });
groupMetadataSchema.index({ size: -1 });

export default groupMetadataSchema;