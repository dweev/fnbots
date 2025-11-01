/**
 * @file src/models/DatabaseBot/methods/bacot.js
 * Metode untuk mengelola koleksi "bacot" (pesan acak).
 * Created with ❤️ and 💦 By FN
 */

export const methods = {
  addBacot(text) {
    if (this.bacot.includes(text)) {
      throw new Error('Teks tersebut sudah ada.');
    }
    this.bacot.push(text);
    return this.save();
  },

  deleteBacot(text) {
    const initialLength = this.bacot.length;
    this.bacot = this.bacot.filter((b) => b !== text);
    if (this.bacot.length === initialLength) {
      throw new Error('Teks tersebut tidak ditemukan.');
    }
    return this.save();
  },

  getRandomBacot() {
    if (this.bacot.length === 0) return null;
    const index = Math.floor(Math.random() * this.bacot.length);
    return this.bacot[index];
  }
};
