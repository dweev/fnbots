// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

export const command = {
  name: 'filter',
  category: 'manage',
  description: 'Memfilter group agar tidak spam dan kata terlarang.',
  isCommandWithoutPayment: true,
  execute: async ({ m, args, groupData, sReply }) => {
    if (!m.isGroup) return await sReply('Perintah hanya dapat digunakan di dalam group');
    if (!args[0]) return await sReply(`Gunakan *filter on/off* untuk mengatur filter group.\n\nStatus saat ini: ${groupData.filter ? 'Aktif' : 'Nonaktif'}`);
    const cmd = args[0].toLowerCase();
    if (cmd === 'on') {
      if (groupData.filter) return await sReply('Filter group sudah dalam keadaan aktif.');
      await groupData.toggleFilter();
      return await sReply('Filter group berhasil diaktifkan.');
    } else if (cmd === 'off') {
      if (!groupData.filter) return await sReply('Filter group sudah dalam keadaan nonaktif.');
      await groupData.toggleFilter();
      return await sReply('Filter group berhasil dinonaktifkan.');
    } else {
      return await sReply('Gunakan *filter on* atau *filter off*');
    }
  }
};
