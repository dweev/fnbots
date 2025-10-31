// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

export const command = {
  name: 'liststory',
  category: 'list',
  description: 'Menampilkan semua daftar story dari daftar kontak bot.',
  isCommandWithoutPayment: true,
  execute: async ({ sReply, isSadmin, store }) => {
    if (!isSadmin) return;
    const usersWithStories = await store.getUsersWithStories();
    if (!usersWithStories || usersWithStories.length === 0) return await sReply('Saat ini tidak ada pengguna yang memiliki story aktif di database.');
    const cacheStats = await store.getStoryCacheStats();
    let replyText = '*Daftar Story Pengguna Aktif*\n\n';
    for (const [index, storyData] of usersWithStories.entries()) {
      let userNumber;
      if (storyData.userId.endsWith('@lid')) {
        userNumber = await store.findJidByLid(storyData.userId);
      } else {
        userNumber = storyData.userId;
      }
      replyText += `${index + 1}. @${userNumber.split('@')[0]} || *${storyData.storyCount}* story\n`;
    }
    replyText += `\nTotal Users: ${usersWithStories.length}\n`;
    replyText += `Cached: ${cacheStats.totalUsers}`;
    await sReply(replyText);
  }
};
