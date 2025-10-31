// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

export const command = {
  name: 'creategroup',
  category: 'bot',
  description: 'Membuat group baru dengan bot sebagai adminnya.',
  isCommandWithoutPayment: true,
  execute: async ({ fn, quotedMsg, quotedParticipant, mentionedJidList, arg, dbSettings, sReply, serial }) => {
    const args = arg.split('|');
    const groupSubject = args[0]?.trim();
    if (!groupSubject) return await sReply(`Anda harus memberikan nama grup.\nContoh: ${dbSettings.rname}buatgroup Nama Yanto | @user1 @user2`);
    const participantSet = new Set();
    participantSet.add(serial);
    const mentioned = mentionedJidList;
    if (mentioned.length > 0) {
      mentioned.forEach((jid) => participantSet.add(jid));
    } else if (quotedMsg) {
      participantSet.add(quotedParticipant);
    } else if (args.length > 1 && args[1]) {
      const numbers = args[1].split(',').map((num) => num.trim());
      for (const num of numbers) {
        const sanitizedNumber = num.replace(/[^0-9]/g, '');
        if (sanitizedNumber) {
          participantSet.add(`${sanitizedNumber}@s.whatsapp.net`);
        }
      }
    }
    const participants = [...participantSet];
    if (participants.length < 2) return await sReply(`Grup memerlukan minimal 2 anggota. Silakan mention, balas pesan, atau berikan nomor.`);
    await fn.groupCreate(groupSubject, participants);
  }
};
