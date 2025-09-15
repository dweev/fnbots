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
        default: false,
        index: true
    },
    isPremium: {
        type: Boolean,
        default: false,
        index: true
    },
    vipExpired: {
        type: Date,
        default: null,
        index: true
    },
    premiumExpired: {
        type: Date,
        default: null,
        index: true
    },
    commandStats: {
        type: Map,
        of: Number,
        default: {}
    }
}, {
    timestamps: true
});

userSchema.virtual('isVIPActive').get(function () {
    return this.isVIP && this.vipExpired && this.vipExpired > new Date();
});
userSchema.virtual('isPremiumActive').get(function () {
    return this.isPremium && this.premiumExpired && this.premiumExpired > new Date();
});
userSchema.methods.addCommandCount = function (commandName, count = 1) {
    const currentCount = this.commandStats.get(commandName) || 0;
    this.commandStats.set(commandName, currentCount + count);
    return this.save();
};
userSchema.methods.getCommandCount = function (commandName) {
    return this.commandStats.get(commandName) || 0;
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
    return this.updateOne(
        { userId },
        { $set: { isPremium: false, premiumExpired: null } }
    );
};
userSchema.statics.removeVIP = function (userId) {
    return this.updateOne(
        { userId },
        { $set: { isVIP: false, vipExpired: null } }
    );
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

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

export default mongoose.model('User', userSchema);