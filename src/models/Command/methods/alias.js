/**
 * @file src/models/Command/methods/alias.js
 * Metode statis untuk menambah dan menghapus alias pada perintah.
 * Created with ❤️ and 💦 By FN
 */

export const statics = {
  async addAlias(commandName, alias) {
    const normalizedName = commandName.toLowerCase();
    const normalizedAlias = alias.toLowerCase();
    const [aliasExistsAsCommand, aliasExistsAsAlias] = await Promise.all([this.findOne({ name: normalizedAlias }), this.findOne({ aliases: normalizedAlias })]);
    if (aliasExistsAsCommand) throw new Error(`Gagal! Nama '${normalizedAlias}' sudah digunakan oleh perintah lain.`);
    if (aliasExistsAsAlias) throw new Error(`Gagal! Nama '${normalizedAlias}' sudah menjadi alias untuk '${aliasExistsAsAlias.name}'.`);
    const command = await this.findOne({ name: normalizedName });
    if (!command) throw new Error(`Perintah utama '${normalizedName}' tidak ditemukan.`);
    if (!command.aliases.includes(normalizedAlias)) {
      command.aliases.push(normalizedAlias);
      await command.save();
    }
    return command;
  },
  async removeAlias(commandName, alias) {
    const normalizedName = commandName.toLowerCase();
    const normalizedAlias = alias.toLowerCase();
    const command = await this.findOne({ name: normalizedName });
    if (!command) throw new Error(`Perintah utama '${normalizedName}' tidak ditemukan.`);

    command.aliases = command.aliases.filter((a) => a !== normalizedAlias);
    await command.save();
    return command;
  }
};
