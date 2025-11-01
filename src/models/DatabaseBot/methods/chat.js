/**
 * @file src/models/DatabaseBot/methods/chat.js
 * Metode untuk mengelola koleksi "chat" (balasan otomatis berdasarkan kata kunci).
 * Created with ❤️ and 💦 By FN
 */

export const methods = {
  addChat(keyword, reply) {
    if (this.chat.has(keyword)) {
      throw new Error(`Keyword "${keyword}" sudah ada di database.`);
    }
    this.chat.set(keyword, reply);
    return this.save();
  },
  editChat(keyword, newReply) {
    if (!this.chat.has(keyword)) {
      throw new Error(`Keyword "${keyword}" tidak ditemukan.`);
    }
    this.chat.set(keyword, newReply);
    return this.save();
  },
  deleteChat(keyword) {
    if (!this.chat.has(keyword)) {
      throw new Error(`Keyword "${keyword}" tidak ditemukan.`);
    }
    this.chat.delete(keyword);
    return this.save();
  },
  getChat(keyword) {
    return this.chat.get(keyword);
  }
};
