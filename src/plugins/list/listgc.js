// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { StoreGroupMetadata } from '../../../database/index.js';
import dayjs from '../../utils/dayjs.js';

export const command = {
  name: 'listgc',
  category: 'list',
  description: 'Menampilkan semua daftar grup tempat bot berada.',
  isCommandWithoutPayment: true,
  execute: async ({ sReply, isSadmin, isMaster }) => {
    if (!(isSadmin || isMaster)) return;
    const allGroupMetadata = await StoreGroupMetadata.find({}).lean();
    if (!allGroupMetadata || allGroupMetadata.length === 0) return await sReply('Saat ini bot tidak berada di dalam grup manapun.');
    let message = '';
    message += `┌─  G R O U P   L I S T\n`;
    message += `│\n`;
    message += `├ Total Grup : ${allGroupMetadata.length}\n`;
    message += `│\n`;
    allGroupMetadata.forEach((metadata, index) => {
      if (!metadata.subject) return;
      const ownerJid = metadata.owner || '';
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