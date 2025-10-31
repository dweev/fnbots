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
  category: 'manage',
  description: 'Menampilkan pengaturan global bot dan pengaturan grup (jika dijalankan di grup).',
  aliases: ['set'],
  isCommandWithoutPayment: true,
  execute: async ({ m, toId, sReply, dbSettings }) => {
    const messageParts = [];
    let globalSettingsText = '*- Bot Config -*\n';
    // prettier-ignore
    const globalFlags = [
      { label: 'Bot Name',           value: dbSettings.botName         },
      { label: 'Bot Number',         value: dbSettings.botNumber       },
      { label: 'Prefix Utama',       value: dbSettings.rname           },
      { label: 'Prefix Alternatif',  value: dbSettings.sname           },
      { label: 'Mode Self',          value: dbSettings.self            },
      { label: 'Limit Harian',       value: dbSettings.limitCount      },
      { label: 'Limit Game',         value: dbSettings.limitGame       },
      { label: 'Limit Premium',      value: dbSettings.limitCountPrem  },
      { label: 'Limit Member Join',  value: dbSettings.memberLimit     },
      { label: 'Maintenance',        value: dbSettings.maintenance     },
      { label: 'Verify Users',       value: dbSettings.verify          },
      { label: 'Grup Verifikasi',    value: dbSettings.groupIdentity   },
      { label: 'Level Logger',       value: dbSettings.pinoLogger      },
      { label: 'Auto Changer Voice', value: dbSettings.changer         },
      { label: 'Auto Correct',       value: dbSettings.autocorrect     },
      { label: 'Auto Download',      value: dbSettings.autodownload    },
      { label: 'Auto Join',          value: dbSettings.autojoin        },
      { label: 'Auto Like Story',    value: dbSettings.autolikestory   },
      { label: 'Auto Read Story',    value: dbSettings.autoreadsw      },
      { label: 'Auto Read Message',  value: dbSettings.autoread        },
      { label: 'Auto Respon',        value: dbSettings.chatbot         },
      { label: 'Auto Reject Call',   value: dbSettings.anticall        },
      { label: 'Auto Sticker',       value: dbSettings.autosticker     },
      { label: 'Anti Delete',        value: dbSettings.antideleted     },
      { label: 'Anti Edit Message',  value: dbSettings.antiEditMessage },
      { label: 'Pack Name',          value: dbSettings.packName        },
      { label: 'Pack Author',        value: dbSettings.packAuthor      },
    ];
    for (const { label, value } of globalFlags) {
      if (value !== null && value !== undefined && value !== '') {
        const icon = value === true || (typeof value === 'number' && value > 0) || typeof value === 'string' ? '⚙' : '⚔';
        const valueText = typeof value === 'boolean' ? '' : `: ${value}`;
        globalSettingsText += `\n${icon} ${label}${valueText}`;
      }
    }
    if (m.isGroup) {
      let groupSettingsText = '*- Group Config -*\n';
      const groupData = (await Group.findOne({ groupId: toId }).lean()) || {};
      const defaults = {
        antiTagStory: false,
        antilink: false,
        antiHidetag: false,
        welcome: { state: false },
        leave: { state: false },
        warnings: { state: false, count: 5 }
      };
      const current = { ...defaults, ...groupData };
      // prettier-ignore
      const groupFeatures = [
        { label: 'Welcome',          value: current.welcome?.state     },
        { label: 'Leave',            value: current.leave?.state       },
        { label: 'Filter Kata',      value: current.filter             },
        { label: 'Anti Tag Story',   value: current.antiTagStory       },
        { label: 'Anti Link Grup',   value: current.antilink           },
        { label: 'Anti Hidetag',     value: current.antiHidetag        },
        { label: 'Verify Member',    value: current.verifyMember       },
        { 
          label: 'Auto Kick (Warn)', 
          value: current.warnings?.state,
          extra: current.warnings?.state ? `: ${current.warnings?.count || 5}x` : ''
        }
      ];
      for (const { label, value, extra = '' } of groupFeatures) {
        const icon = value ? '⚙' : '⚔';
        groupSettingsText += `\n${icon} ${label}${extra}`;
      }
      messageParts.push(groupSettingsText);
    }
    globalSettingsText += `\n\n${dbSettings.autocommand || 'Tidak diatur'}`;
    messageParts.push(globalSettingsText);
    await sReply(messageParts.join('\n\n'));
  }
};
