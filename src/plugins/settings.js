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
    description: 'Melihat settings Bot.',
    aliases: ['set'],
    execute: async ({ m, toId, sReply, dbSettings }) => {
        const messageParts = [];
        const globalFlags = [
            { label: "Maintenance", value: dbSettings.maintenance }
        ];
        let globalSettingsText = "*- Bot Config -*\n";
        for (const { label, value } of globalFlags) {
            const icon = value ? "⚙" : "⚔";
            const valueText = (typeof value === 'string' || typeof value === 'number') ? ` : ${value}` : '';
            globalSettingsText += `\n${icon} ${label}${valueText}`;
        }
        if (m.isGroup) {
            let groupSettingsText = "*- Group Config -*\n";
            const group = await Group.findOne({ groupId: toId });
            if (group) {
                const groupFeatures = [
                    { label: "Anti Tag Story", value: group.antiTagStory },
                    { label: "Anti Link", value: group.antilink },
                    { label: "Anti Hidetag", value: group.antiHidetag }
                ];
                for (const feature of groupFeatures) {
                    const icon = feature.value ? "⚙" : "⚔";
                    groupSettingsText += `\n${icon} ${feature.label}`;
                }
            }
            messageParts.push(groupSettingsText);
        }
        globalSettingsText += "\n\n" + dbSettings.autocommand;
        messageParts.push(globalSettingsText);
        const finalReply = messageParts.join('\n\n');
        await sReply(finalReply);
        await Command.findOneAndUpdate({ name: command.name }, { $inc: { count: 1 } }, { upsert: true });
        await User.findOneAndUpdate({ userId: m.sender }, { $inc: { [`commandStats.${command.name}`]: 1 } }, { upsert: true });
    }
};