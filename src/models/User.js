// ─── Info ────────────────────────────────
/*
  * Created with ❤️ and 💦 By FN
  * Follow https://github.com/Terror-Machine
  * Feel Free To Use
*/
// ─── Info User.js ────────────────────────

import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    isMaster: {
        type: Boolean,
        default: false
    },
    isVIP: {
        type: Boolean,
        default: false
    },
    isPremium: {
        type: Boolean,
        default: false
    },
    vipExpired: {
        type: Date,
        default: null
    },
    premiumExpired: {
        type: Date,
        default: null
    },
    commandStats: {
        type: Map,
        of: Number,
        default: {}
    },
    limit: {
        current: {
            type: Number,
            default: 100
        },
        warned: {
            type: Boolean,
            default: false
        },
        lastReset: {
            type: Date,
            default: Date.now
        }
    },
    limitgame: {
        current: {
            type: Number,
            default: 100
        },
        warned: {
            type: Boolean,
            default: false
        },
        lastReset: {
            type: Date,
            default: Date.now
        }
    },
    balance: {
        type: String,
        default: "0",
        get: v => BigInt(v),
        set: v => v.toString()
    },
    xp: {
        type: Number,
        default: 0
    },
    level: {
        type: Number,
        default: 1
    },
    gacha: {
        type: Boolean,
        default: false
    },
    inventory: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
    },
    commandCounts: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        getters: true
    },
    toObject: {
        virtuals: true,
        getters: true
    }
});

userSchema.virtual('isVIPActive').get(function () {
    return this.isVIP && this.vipExpired && this.vipExpired > new Date();
});
userSchema.virtual('isPremiumActive').get(function () {
    return this.isPremium && this.premiumExpired && this.premiumExpired > new Date();
});
userSchema.virtual('maxXp').get(function () {
    const xpThresholds = [0, 1250, 3800, 5400, 7600, 9300, 12000, 18000, 24000, 30000];
    return xpThresholds[this.level] || 50000;
});
userSchema.virtual('levelName').get(function () {
    const names = [null, 'Beginner', 'Intermediate', 'Public', 'Pro', 'Expert', 'Master', 'Grandmaster', 'Epic', 'Legend'];
    return names[this.level] || 'Mythic';
});

userSchema.methods.addCommandCount = function (commandName, count = 1) {
    const currentCount = this.commandStats.get(commandName) || 0;
    this.commandStats.set(commandName, currentCount + count);
    return this.save();
};
userSchema.methods.getCommandCount = function (commandName) {
    return this.commandStats.get(commandName) || 0;
};
userSchema.methods.addLimit = function (count = 1) {
    if (this.isMaster || this.isVIPActive || this.isPremiumActive) return Promise.resolve(this);
    return mongoose.model('User').updateOne(
        { _id: this._id },
        { $inc: { 'limit.current': -count } }
    ).then(() => {
        this.limit.current -= count;
        return this;
    });
};
userSchema.methods.addGameLimit = function (count = 1) {
    if (this.isMaster || this.isVIPActive || this.isPremiumActive) return this;
    this.limitgame.current -= count;
    return this.save();
};
userSchema.methods.isLimit = function () {
    if (this.isMaster || this.isVIPActive || this.isPremiumActive) return false;
    if (this.limit.current <= 0) {
        if (!this.limit.warned) {
            this.limit.warned = true;
            this.save();
        }
        return true;
    }
    if (this.limit.warned) {
        this.limit.warned = false;
        this.save();
    }
    return false;
};
userSchema.methods.isGameLimit = function () {
    if (this.isMaster || this.isVIPActive || this.isPremiumActive) return false;
    if (this.limitgame.current <= 0) {
        if (!this.limitgame.warned) {
            this.limitgame.warned = true;
            this.save();
        }
        return true;
    }
    if (this.limitgame.warned) {
        this.limitgame.warned = false;
        this.save();
    }
    return false;
};
userSchema.methods.resetLimits = function () {
    const now = new Date();
    const lastReset = new Date(this.limit.lastReset);
    if (now.getDate() !== lastReset.getDate() || now.getMonth() !== lastReset.getMonth()) {
        this.limit.current = this.isPremium ? 300 : 100;
        this.limitgame.current = this.isPremium ? 300 : 100;
        this.limit.lastReset = now;
        this.limitgame.lastReset = now;
        this.limit.warned = false;
        this.limitgame.warned = false;
        return this.save();
    }
    return this;
};
userSchema.methods.addBalance = async function (amount) {
    const amountStr = BigInt(amount).toString();
    const user = await mongoose.model('User').findById(this._id);
    const currentBalance = BigInt(user.balance);
    user.balance = (currentBalance + BigInt(amountStr)).toString();
    return user.save();
};
userSchema.methods.minBalance = async function (amount) {
    const currentBalance = BigInt(this.balance);
    this.balance = (currentBalance - BigInt(amount)).toString();
    return this.save();
};
userSchema.methods.addXp = async function (xpToAdd = 1) {
    const levelData = [
        { level: 1, xpAdd: 5, threshold: 1250 },
        { level: 2, xpAdd: 4, threshold: 3800 },
        { level: 3, xpAdd: 3, threshold: 5400 },
        { level: 4, xpAdd: 2, threshold: 7600 },
        { level: 5, xpAdd: 1, threshold: 9300 },
        { level: 6, xpAdd: 1, threshold: 12000 },
        { level: 7, xpAdd: 1, threshold: 18000 },
        { level: 8, xpAdd: 1, threshold: 24000 },
        { level: 9, xpAdd: 1, threshold: 30000 },
    ];
    const data = levelData.find(d => d.level === this.level);
    if (!data) return this;
    this.xp += xpToAdd;
    if (this.xp > data.threshold && this.level < 9) {
        this.level += 1;
        await this.save();
        return { levelUp: true, newLevel: this.level };
    }
    await this.save();
    return { levelUp: false };
};
userSchema.methods.getLevelFormat = function () {
    return {
        xp: `${this.xp}/${this.maxXp}`,
        role: this.levelName,
        balance: this.balance.toString()
    };
};
userSchema.methods.countHit = function () {
    this.commandCounts += 1;
    return this.save();
};
userSchema.methods.addToInventory = function (itemId, quantity = 1) {
    const currentQty = this.inventory.get(itemId) || 0;
    this.inventory.set(itemId, currentQty + quantity);
    return this.save();
};
userSchema.methods.removeFromInventory = function (itemId, quantity = 1) {
    const currentQty = this.inventory.get(itemId) || 0;
    if (currentQty <= quantity) {
        this.inventory.delete(itemId);
    } else {
        this.inventory.set(itemId, currentQty - quantity);
    }
    return this.save();
};

userSchema.statics.getExpiredPremiumUsers = function () {
    return this.find({
        isPremium: true,
        premiumExpired: { $ne: null, $lte: new Date() }
    });
};
userSchema.statics.getExpiredVIPUsers = function () {
    return this.find({
        isVIP: true,
        vipExpired: { $ne: null, $lte: new Date() }
    });
};
userSchema.statics.addPremium = async function (userId, durationMs) {
    const user = await this.findOneAndUpdate(
        { userId },
        {
            $set: { isPremium: true },
            $inc: { __v: 1 }
        },
        { new: true, upsert: true }
    );
    const newExpiry = (user.premiumExpired && user.premiumExpired > new Date() ? user.premiumExpired.getTime() : Date.now()) + durationMs;
    user.premiumExpired = new Date(newExpiry);
    return user.save();
};
userSchema.statics.addVIP = async function (userId, durationMs) {
    const user = await this.findOneAndUpdate(
        { userId },
        {
            $set: { isVIP: true },
            $inc: { __v: 1 }
        },
        { new: true, upsert: true }
    );
    const newExpiry = (user.vipExpired && user.vipExpired > new Date() ? user.vipExpired.getTime() : Date.now()) + durationMs;
    user.vipExpired = new Date(newExpiry);
    return user.save();
};
userSchema.statics.removePremium = function (userId) {
    return this.updateOne({ userId }, {
        $set: {
            isPremium: false,
            premiumExpired: null,
            'limit.current': 100,
            'limitgame.current': 100
        }
    });
};
userSchema.statics.removeVIP = function (userId) {
    return this.updateOne({ userId }, {
        $set: { isVIP: false, vipExpired: null }
    });
};
userSchema.statics.getLeaderboard = function (type = 'xp', limit = 20) {
    let sortCriteria = {};
    switch (type) {
        case 'xp':
            sortCriteria = { xp: -1, level: -1 };
            break;
        case 'balance':
            sortCriteria = { balance: -1 };
            break;
        case 'level':
            sortCriteria = { level: -1, xp: -1 };
            break;
        default:
            sortCriteria = { xp: -1 };
    }
    return this.find().sort(sortCriteria).limit(limit);
};
userSchema.statics.getUserRank = async function (userId, type = 'xp') {
    let sortCriteria = {};
    switch (type) {
        case 'xp':
            sortCriteria = { xp: -1, level: -1 };
            break;
        case 'balance':
            sortCriteria = { balance: -1 };
            break;
        case 'level':
            sortCriteria = { level: -1, xp: -1 };
            break;
        default:
            sortCriteria = { xp: -1 };
    }
    const users = await this.find().sort(sortCriteria);
    const rank = users.findIndex(user => user.userId === userId);
    return rank >= 0 ? rank + 1 : null;
};
userSchema.statics.findActiveVIPs = function () {
    return this.find({
        isVIP: true,
        vipExpired: { $gt: new Date() }
    });
};
userSchema.statics.findActivePremiums = function () {
    return this.find({
        isPremium: true,
        premiumExpired: { $gt: new Date() }
    });
};
userSchema.statics.getMasterUsers = function () {
    return this.find({ isMaster: true });
};
userSchema.statics.getActiveVIPUsers = function () {
    return this.find({
        isVIP: true,
        vipExpired: { $gt: new Date() }
    });
};
userSchema.statics.getActivePremiumUsers = function () {
    return this.find({
        isPremium: true,
        premiumExpired: { $gt: new Date() }
    });
};
userSchema.pre('save', function(next) {
    if (this.isNew) {
        this.limit.current = this.isPremium ? 300 : 100;
        this.limitgame.current = this.isPremium ? 300 : 100;
    } else if (this.isModified('isPremium')) {
        this.limit.current = this.isPremium ? 300 : 100;
        this.limitgame.current = this.isPremium ? 300 : 100;
    }
    next();
});

export default mongoose.model('User', userSchema);