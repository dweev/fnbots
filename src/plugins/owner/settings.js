// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Group } from '../../../database/index.js';

export const command = {
  name: 'settings',
  category: 'owner',
  description: 'Menampilkan pengaturan global bot dan pengaturan grup (jika dijalankan di grup).',
  aliases: ['set'],
  execute: async ({ m, toId, sReply, dbSettings }) => {
    const messageParts = [];
    let globalSettingsText = '*- Bot Config -*\n';
    const globalFlags = [
      { label: 'Maintenance',       value: dbSettings.maintenance   },
      { label: 'Auto Correct',      value: dbSettings.autocorrect   },
      { label: 'Auto Like Story',   value: dbSettings.autolikestory },
      { label: 'Auto Read Story',   value: dbSettings.autoreadsw    },
      { label: 'Auto Read Message', value: dbSettings.autoread      },
      { label: 'Auto Resend',       value: dbSettings.antideleted   },
      { label: "Verify Users",      value: dbSettings.verify        },
    ];
    for (const { label, value } of globalFlags) {
      const icon = value ? '⚙' : '⚔';
      const status = value ? 'On' : 'Off';
      globalSettingsText += `\n${icon} ${label} : ${status}`;
    }
    if (m.isGroup) {
      let groupSettingsText = '*- Group Config -*\n';
      const groupData = await Group.findOne({ groupId: toId }).lean() || {};
      const defaults = {
        antiTagStory: false,
        antilink: false,
        antiHidetag: false,
        welcome: { state: false, pesan: '' },
        leave: { state: false, pesan: '' },
        warnings: { state: false, count: 5 }
      };
      const current = { ...defaults, ...groupData };
      const groupFeatures = [
        { label: 'Welcome',         value: current.welcome?.state },
        { label: 'Leave',           value: current.leave?.state },
        { label: 'Anti Tag Story',  value: current.antiTagStory },
        { label: 'Anti Link',       value: current.antilink },
        { label: 'Anti Hidetag',    value: current.antiHidetag },
        { label: "Verify Member",   value: current.verifyMember },
        { 
          label: 'Auto Kick Warn',  
          value: current.warnings?.state,
          extra: current.warnings?.state ? ` (${current.warnings?.count || 5})` : ''
        }
      ];
      for (const { label, value, extra = '' } of groupFeatures) {
        const icon = value ? '⚙' : '⚔';
        const status = value ? 'On' : 'Off';
        groupSettingsText += `\n${icon} ${label} : ${status}${extra}`;
      }
      messageParts.push(groupSettingsText);
    }
    globalSettingsText += `\n\n${dbSettings.autocommand || 'Tidak diatur'}`;
    messageParts.push(globalSettingsText);
    await sReply(messageParts.join('\n\n'));
  }
};