// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { User, Command, Group } from '../../database/index.js';

export const command = {
    name: 'settings',
    category: 'owner',
    description: 'Melihat info pengaturan bot.',
    aliases: ['set'],
    execute: async ({ m, toId, sReply, dbSettings }) => {
        const messageParts = [];
        let globalSettingsText = "*- Bot Config -*\n";
        const globalFlags = [
            { label: "Maintenance", value: dbSettings.maintenance },
            { label: "Auto Correct", value: dbSettings.autocorrect }
        ];
        for (const { label, value } of globalFlags) {
            const icon = value ? "⚙" : "⚔";
            const valueText = typeof value === 'boolean' ? (value ? 'On' : 'Off') : value;
            globalSettingsText += `\n${icon} ${label} : ${valueText}`;
        }
        if (m.isGroup) {
            let groupSettingsText = "*- Group Config -*\n";
            const groupData = await Group.findOne({ groupId: toId }).lean();
            const defaultGroupSettings = {
                antiTagStory: false,
                antilink: false,
                antiHidetag: false
            };
            const currentSettings = { ...defaultGroupSettings, ...groupData };
            const groupFeatures = [
                { label: "Anti Tag Story", value: currentSettings.antiTagStory },
                { label: "Anti Link", value: currentSettings.antilink },
                { label: "Anti Hidetag", value: currentSettings.antiHidetag }
            ];
            for (const feature of groupFeatures) {
                const icon = feature.value ? "⚙" : "⚔";
                const status = feature.value ? 'On' : 'Off';
                groupSettingsText += `\n${icon} ${feature.label} : ${status}`;
            }
            messageParts.push(groupSettingsText);
        }
        globalSettingsText += `\n\n${dbSettings.autocommand || 'Tidak diatur'}`;
        messageParts.push(globalSettingsText);
        const finalReply = messageParts.join('\n\n');
        await sReply(finalReply);
        await Command.findOneAndUpdate({ name: command.name }, { $inc: { count: 1 } }, { upsert: true });
        await User.findOneAndUpdate({ userId: m.sender }, { $inc: { [`commandStats.${command.name}`]: 1 } }, { upsert: true });
    }
};