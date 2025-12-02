/**
 * @file src/models/User/methods/moderation.js
 * Mengelola metode untuk logika moderasi pengguna.
 * Created with ❤️ and 💦 By FN
 */

export const methods = {
  mute() {
    this.isMuted = true;
    return this.save();
  },
  unmute() {
    this.isMuted = false;
    return this.save();
  }
};
