// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

export const methods = {
  addBalance(amount) {
    this.balance = BigInt(this.balance) + BigInt(amount);
    return this.save();
  },
  minBalance(amount) {
    this.balance = BigInt(this.balance) - BigInt(amount);
    return this.save();
  },
  addToInventory(itemId, quantity = 1) {
    const currentQty = this.inventory.get(itemId) || 0;
    this.inventory.set(itemId, currentQty + quantity);
    this.markModified('inventory');
    return this.save();
  },
  removeFromInventory(itemId, quantity = 1) {
    const currentQty = this.inventory.get(itemId) || 0;
    if (currentQty <= quantity) {
      this.inventory.delete(itemId);
    } else {
      this.inventory.set(itemId, currentQty - quantity);
    }
    this.markModified('inventory');
    return this.save();
  }
};

export const statics = {
  getLeaderboard(type = 'xp', limit = 20) {
    if (type === 'balance') {
      return this.aggregate([
        { $addFields: { balanceNumeric: { $toLong: "$balance" } } },
        { $sort: { balanceNumeric: -1 } },
        { $limit: limit },
        { $project: { balanceNumeric: 0 } }
      ]);
    }
    let sortCriteria = { xp: -1 };
    if (type === 'level') sortCriteria = { level: -1, xp: -1 };
    return this.find().sort(sortCriteria).limit(limit);
  }
};