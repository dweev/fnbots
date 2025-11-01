/**
 * @file src/models/Group/methods/moderation.js
 * Metode untuk mengelola moderasi grup, termasuk pelarangan anggota dan penyaringan kata.
 * Created with ❤️ and 💦 By FN
 */

export const methods = {
  banMember(userId) {
    if (!this.bannedMembers.includes(userId)) {
      this.bannedMembers.push(userId);
      return this.save();
    }
    return Promise.resolve(this);
  },
  unbanMember(userId) {
    this.bannedMembers = this.bannedMembers.filter((id) => id !== userId);
    return this.save();
  },
  isMemberBanned(userId) {
    return this.bannedMembers.includes(userId);
  },
  toggleFilter() {
    this.filter = !this.filter;
    return this.save();
  },
  addFilterWord(word) {
    const lowerCaseWord = word.toLowerCase();
    if (!this.filterWords.includes(lowerCaseWord)) {
      this.filterWords.push(lowerCaseWord);
      return this.save();
    }
    return this;
  },
  removeFilterWord(word) {
    const lowerCaseWord = word.toLowerCase();
    const initialLength = this.filterWords.length;
    this.filterWords = this.filterWords.filter((w) => w !== lowerCaseWord);
    if (this.filterWords.length !== initialLength) {
      return this.save();
    }
    return this;
  },
  clearAllFilterWords() {
    this.filterWords = [];
    return this.save();
  },
  checkMessage(message) {
    if (!this.filter) return false;
    const lowerMessage = message.toLowerCase();
    return this.filterWords.some((word) => lowerMessage.includes(word));
  }
};
