// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

export const methods = {
  incrementCount(amount = 1) {
    this.count += amount;
    return this.save();
  },
  updateDescription(newDescription) {
    this.description = newDescription;
    return this.save();
  },
  async changeCategory(newCategory) {
    const VALID_CATEGORIES = (await import('../../../../config.js')).default.commandCategories;
    if (VALID_CATEGORIES.includes(newCategory)) {
      this.category = newCategory;
      return this.save();
    }
    throw new Error('Invalid category');
  }
};

export const statics = {
  async findOrCreate(name, displayName, category, description, aliases, flags = {}) {
    const normalizedName = name.toLowerCase();
    let command = await this.findOne({ name: normalizedName });
    if (!command) {
      command = new this({
        name: normalizedName,
        displayName: displayName || normalizedName,
        category,
        description,
        aliases,
        isLimitCommand: flags.isLimitCommand,
        isLimitGameCommand: flags.isLimitGameCommand,
        isCommandWithoutPayment: flags.isCommandWithoutPayment
      });
      await command.save();
    }
    return command;
  },
  resetAll() {
    return this.deleteMany({});
  }
};
