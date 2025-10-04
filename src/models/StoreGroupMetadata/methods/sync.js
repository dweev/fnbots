// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

export const methods = {
  syncWithBaileys(baileysData) {
    Object.keys(this.schema.paths).forEach(key => {
      if (baileysData[key] !== undefined) {
        this[key] = baileysData[key];
      }
    });
    this.lastSynced = new Date();
    return this.save();
  }
};

export const statics = {
  async fromBaileys(baileysData) {
    const groupId = baileysData.id || baileysData.groupId;
    if (!groupId) throw new Error('Group ID is required');
    let group = await this.findOne({ groupId });
    if (!group) {
      group = new this({ id: groupId, groupId: groupId });
    }
    return group.syncWithBaileys(baileysData);
  },
  async bulkUpsert(groupsArray) {
    if (!groupsArray || groupsArray.length === 0) return;
    const operations = groupsArray.map(group => ({
      updateOne: {
        filter: { groupId: group.id || group.groupId },
        update: {
          $set: group,
          $setOnInsert: { createdAt: new Date() }
        },
        upsert: true
      }
    }));
    return this.bulkWrite(operations, { ordered: false });
  }
};