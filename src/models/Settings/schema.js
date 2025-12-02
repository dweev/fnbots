// ─── Info ─────────────────────────────────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info src/models/Settings/schema.js ───────────────────────────────

import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    botName: {
      type: String,
      default: 'FNBOTS'
    },
    botNumber: {
      type: String,
      default: null
    },
    rname: {
      type: String,
      default: '.'
    },
    sname: {
      type: String,
      default: '/'
    },
    packName: {
      type: String,
      default: 'FNBOTS'
    },
    packAuthor: {
      type: String,
      default: 'FN'
    },
    packID: {
      type: String,
      default: 'FN-Bot-Sticker'
    },
    pinoLogger: {
      type: String,
      default: 'silent',
      enum: ['silent', 'trace', 'debug', 'info', 'warn', 'error', 'fatal']
    },
    maintenance: {
      type: Boolean,
      default: false
    },
    totalHitCount: {
      type: Number,
      default: 0
    },
    autocommand: {
      type: String,
      default: null
    },
    autocorrect: {
      type: Number,
      default: 0,
      enum: [0, 1, 2]
    },
    sAdmin: {
      type: [String],
      default: []
    },
    groupIdentity: {
      type: String,
      default: null
    },
    linkIdentity: {
      type: String,
      default: null
    },
    restartId: {
      type: String,
      default: null
    },
    restartState: {
      type: Boolean,
      default: false
    },
    autojoin: {
      type: Boolean,
      default: false
    },
    changer: {
      type: Boolean,
      default: false
    },
    filter: {
      type: Boolean,
      default: false
    },
    chatbot: {
      type: Boolean,
      default: true
    },
    autosticker: {
      type: Boolean,
      default: false
    },
    antideleted: {
      type: Boolean,
      default: false
    },
    verify: {
      type: Boolean,
      default: false
    },
    autoreadsw: {
      type: Boolean,
      default: false
    },
    autolikestory: {
      type: Boolean,
      default: false
    },
    autoread: {
      type: Boolean,
      default: false
    },
    autodownload: {
      type: Boolean,
      default: false
    },
    anticall: {
      type: Boolean,
      default: false
    },
    limitCount: {
      type: Number,
      default: 100
    },
    limitGame: {
      type: Number,
      default: 100
    },
    limitCountPrem: {
      type: Number,
      default: 300
    },
    memberLimit: {
      type: Number,
      default: 50
    },
    antiEditMessage: {
      type: Boolean,
      default: false
    },
    self: {
      type: String,
      default: 'auto',
      enum: ['true', 'false', 'auto']
    },
    dataM: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

settingsSchema.index({}, { unique: true });
settingsSchema.index({ 'sAdmin': 1 });

settingsSchema.virtual('prefix').get(function () {
  return this.rname;
});
settingsSchema
  .virtual('botname')
  .get(function () {
    return this.botName;
  })
  .set(function (v) {
    this.botName = v;
  });
settingsSchema
  .virtual('totalhitcount')
  .get(function () {
    return this.totalHitCount;
  })
  .set(function (v) {
    this.totalHitCount = v;
  });

settingsSchema.pre('save', function () {
  if (this.rname === this.sname) {
    this.sname = this.rname === '.' ? '/' : '.';
  }
});

settingsSchema.set('toJSON', { virtuals: true });
settingsSchema.set('toObject', { virtuals: true });

export default settingsSchema;
