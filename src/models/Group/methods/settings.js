/**
 * @file src/models/Group/methods/settings.js
 * Metode untuk mengelola pengaturan grup.
 * Created with ❤️ and 💦 By FN
 */

export const methods = {
  incrementMessageCount() {
    this.messageCount += 1;
    return this.save();
  },
  incrementCommandCount() {
    this.commandCount += 1;
    return this.save();
  },
  toggleSetting(settingName) {
    if (typeof this[settingName] === 'boolean') {
      this[settingName] = !this[settingName];
    }
    return this.save();
  },
  updateMessages(welcomeMsg = null, leaveMsg = null) {
    if (welcomeMsg !== null) this.welcome.pesan = welcomeMsg;
    if (leaveMsg !== null) this.leave.pesan = leaveMsg;
    return this.save();
  },
  muteChat() {
    this.isMuted = true;
    return this.save();
  },
  unmuteChat() {
    this.isMuted = false;
    return this.save();
  },
  toggleMuteChat() {
    this.isMuted = !this.isMuted;
    return this.save();
  }
};
