// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

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
