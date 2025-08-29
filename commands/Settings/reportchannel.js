export const data = {
    name: "settings_reportchannel",
    description: "Set the channel for user reports",
    options: [
        {
            name: "channel",
            type: 7,
            description: "The channel to send user reports to",
            required: true
        }
    ]
};

import { QuickDB } from 'quick.db';
const db = new QuickDB();

export async function execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    await db.set(`reportChannel_${interaction.guild.id}`, channel.id);
    await interaction.reply(`User reports will be sent to <#${channel.id}>.`);
}
