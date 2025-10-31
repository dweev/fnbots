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
        {
          $addFields: {
            balanceNumeric: { $toDecimal: '$balance' }
          }
        },
        { $sort: { balanceNumeric: -1 } },
        { $limit: limit },
        {
          $addFields: {
            maxXp: {
              $arrayElemAt: [[0, 1250, 3800, 5400, 7600, 9300, 12000, 18000, 24000, 30000], '$level']
            },
            levelName: {
              $switch: {
                branches: [
                  { case: { $eq: ['$level', 1] }, then: 'Beginner' },
                  { case: { $eq: ['$level', 2] }, then: 'Intermediate' },
                  { case: { $eq: ['$level', 3] }, then: 'Public' },
                  { case: { $eq: ['$level', 4] }, then: 'Pro' },
                  { case: { $eq: ['$level', 5] }, then: 'Expert' },
                  { case: { $eq: ['$level', 6] }, then: 'Master' },
                  { case: { $eq: ['$level', 7] }, then: 'Grandmaster' },
                  { case: { $eq: ['$level', 8] }, then: 'Epic' },
                  { case: { $eq: ['$level', 9] }, then: 'Legend' }
                ],
                default: 'Mythic'
              }
            }
          }
        },
        { $project: { balanceNumeric: 0 } }
      ]);
    }
    let sortCriteria = { xp: -1 };
    if (type === 'level') sortCriteria = { level: -1, xp: -1 };
    return this.find().sort(sortCriteria).limit(limit);
  }
};
