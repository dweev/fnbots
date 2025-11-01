/**
 * @file src/models/Group/methods/afk.js
 * Metode untuk mengelola status AFK (Away From Keyboard) pengguna.
 * Created with ❤️ and 💦 By FN
 */

export const methods = {
  addAfkUser(userId, reason = '') {
    this.afkUsers = this.afkUsers.filter((afk) => afk.userId !== userId);
    this.afkUsers.push({ userId, time: new Date(), reason });
    return this.save();
  },
  checkAfkUser(userId) {
    return this.afkUsers.some((afk) => afk.userId === userId);
  },
  getAfkData(userId) {
    return this.afkUsers.find((afk) => afk.userId === userId) || null;
  },
  async handleUserReturn(userId, currentTime) {
    const afkUser = this.getAfkData(userId);
    if (afkUser) {
      const duration = currentTime - afkUser.time;
      this.afkUsers = this.afkUsers.filter((afk) => afk.userId !== userId);
      await this.save();
      return { success: true, afkData: afkUser, duration };
    }
    return { success: false };
  },
  clearAllAfk() {
    this.afkUsers = [];
    return this.save();
  }
};
