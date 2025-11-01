/**
 * @file src/models/User/methods/moderation.js
 * Mengelola metode untuk logika moderasi pengguna.
 * Created with ❤️ and 💦 By FN
 */

export const methods = {
  muteUser(userId) {
    if (!this.mutedUsers.some((u) => u.userId === userId)) {
      this.mutedUsers.push({ userId });
    }
    return this.save();
  },
  unmuteUser(userId) {
    const initialLength = this.mutedUsers.length;
    this.mutedUsers = this.mutedUsers.filter((u) => u.userId !== userId);
    if (this.mutedUsers.length !== initialLength) {
      return this.save();
    }
    return this;
  },
  isUserMuted(userId) {
    return this.mutedUsers.some((u) => u.userId === userId);
  },
  clearAllMutedUsers() {
    this.mutedUsers = [];
    return this.save();
  }
};
