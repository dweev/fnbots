/**
 * @file src/models/StoreGroupMetadata/methods/sync.js
 * Mengelola metode dan statis untuk sinkronisasi metadata grup.
 * Created with ❤️ and 💦 By FN
 */

export const methods = {
  syncWithBaileys(baileysData) {
    Object.keys(this.schema.paths).forEach((key) => {
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
  }
};
