// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import dayjs from '../../utils/dayjs.js';

export const command = {
  name: 'listgc',
  category: 'list',
  description: 'Menampilkan semua daftar grup tempat bot berada.',
  isCommandWithoutPayment: true,
  execute: async ({ sReply, isSadmin, isMaster, store }) => {
    if (!(isSadmin || isMaster)) return;
    const allGroupMetadata = await store.getAllGroups({ owner: 1, ownerPn: 1, subject: 1, participants: 1, id: 1, creation: 1 });
    if (!allGroupMetadata || allGroupMetadata.length === 0) return await sReply('Saat ini bot tidak berada di dalam grup manapun.');
    let message = '';
    message += `┌─  G R O U P   L I S T\n`;
    message += `│\n`;
    message += `├ Total Grup : ${allGroupMetadata.length}\n`;
    message += `│\n`;
    allGroupMetadata.forEach((metadata, index) => {
      let ownerJid;
      if (metadata.owner.endsWith('@lid')) {
        ownerJid = metadata.ownerPn || '';
      } else {
        ownerJid = metadata.owner || '';
      }
      if (!metadata.subject) return;
      let ownerMention = '-';
      if (ownerJid) {
        ownerMention = `@${ownerJid.split('@')[0]}`;
      }
      const creationDate = metadata.creation ? dayjs.unix(metadata.creation).format('DD/MM/YYYY') : 'Tidak Diketahui';
      message += `├─ ─── [ ${index + 1} ] ───\n`;
      message += `│  \n`;
      message += `│  ❒ Nama: ${metadata.subject}\n`;
      message += `│  ❒ ID: ${metadata.id}\n`;
      message += `│  ❒ Owner: ${ownerMention}\n`;
      message += `│  ❒ Dibuat: ${creationDate}\n`;
      message += `│  ❒ Anggota: ${metadata.participants.length}\n`;
      message += `│\n`;
    });
    message += `└─ ─── FNBOTS`;
    await sReply(message);
  },
};