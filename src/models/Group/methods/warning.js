// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

function sanitizeKey(jid) {
  return jid.replace(/\./g, '_').replace(/@/g, '_');
}

export const methods = {
  addWarning(userId) {
    if (!this.warnings) this.warnings = { users: new Map(), state: true, count: 5 };
    if (!this.warnings.users) this.warnings.users = new Map();
    const key = sanitizeKey(userId);
    const currentWarnings = this.warnings.users.get(key) || 0;
    this.warnings.users.set(key, currentWarnings + 1);
    this.markModified('warnings');
    return this.save();
  },
  resetWarnings(userId) {
    if (this.warnings && this.warnings.users) {
      const key = sanitizeKey(userId);
      this.warnings.users.delete(key);
      this.markModified('warnings');
    }
    return this.save();
  },
  getWarnings(userId) {
    if (!this.warnings || !this.warnings.users) return 0;
    const key = sanitizeKey(userId);
    return this.warnings.users.get(key) || 0;
  },
  clearAllWarnings() {
    if (this.warnings && this.warnings.users) {
      this.warnings.users.clear();
      this.markModified('warnings');
    }
    return this.save();
  },
  setWarningState(state) {
    if (!this.warnings) this.warnings = { users: new Map(), state: true, count: 5 };
    this.warnings.state = state;
    this.markModified('warnings');
    return this.save();
  },
  toggleWarningState() {
    if (!this.warnings) this.warnings = { users: new Map(), state: true, count: 5 };
    this.warnings.state = !this.warnings.state;
    this.markModified('warnings');
    return this.save();
  },
  setWarningLimit(count) {
    if (!this.warnings) this.warnings = { users: new Map(), state: true, count: 5 };
    this.warnings.count = count;
    this.markModified('warnings');
    return this.save();
  },
  getWarningLimit() {
    return this.warnings?.count || 5;
  },
  isWarningEnabled() {
    return this.warnings?.state !== false;
  },
  checkWarningLimit(userId) {
    const userWarnings = this.getWarnings(userId);
    const limit = this.getWarningLimit();
    return userWarnings >= limit;
  }
};
