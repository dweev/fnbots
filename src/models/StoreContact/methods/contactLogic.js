/**
 * @file src/models/StoreContact/methods/contactLogic.js
 * Mengelola metode dan statis untuk logika kontak.
 * Created with ❤️ and 💦 By FN
 */

export const methods = {
  updateData(newData) {
    Object.keys(newData).forEach((key) => {
      if (newData[key] !== undefined && newData[key] !== null) {
        this[key] = newData[key];
      }
    });
    this.lastUpdated = new Date();
    return this.save();
  }
};

export const statics = {
  async bulkUpsert(contactsArray) {
    if (!contactsArray || contactsArray.length === 0) return;
    const operations = contactsArray.map((contact) => ({
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
  }
};
