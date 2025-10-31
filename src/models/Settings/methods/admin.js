// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

export const methods = {
  addSAdmin(userId) {
    if (!this.sAdmin.includes(userId)) {
      this.sAdmin.push(userId);
      return this.save();
    }
    return this;
  },
  removeSAdmin(userId) {
    const initialLength = this.sAdmin.length;
    this.sAdmin = this.sAdmin.filter((id) => id !== userId);
    if (this.sAdmin.length !== initialLength) {
      return this.save();
    }
    return this;
  }
};

export const statics = {
  async isSAdmin(userId) {
    const settings = await this.getSettings();
    return settings.sAdmin.includes(userId);
  },
  async getSAdmins() {
    const settings = await this.getSettings();
    return settings.sAdmin;
  }
};
