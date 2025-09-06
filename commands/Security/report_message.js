import { ContextMenuCommandBuilder, ApplicationCommandType, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } from 'discord.js';
import { QuickDB } from 'quick.db';
const db = new QuickDB();

export const data = {
    name: 'Report Message',
    type: ApplicationCommandType.Message,
};

export async function execute(interaction) {
    // Save the report context in QuickDB with a short expiry (e.g., 5 minutes)
    const dbKey = `pendingReport_message_${interaction.user.id}`;
    await db.set(dbKey, {
        messageId: interaction.targetMessage.id,
        channelId: interaction.targetMessage.channel.id,
        guildId: interaction.guild.id,
        timestamp: Date.now()
    });
    // Optionally, clean up any previous report for this user

    // Show modal for report reason
    const modal = new ModalBuilder()
        .setCustomId('reportMessageModal')
        .setTitle('Report Message by ' + interaction.targetMessage.author.tag);

    const reasonInput = new TextInputBuilder()
        .setCustomId('reportReasonInput')
        .setLabel('Reason for report')
        .setStyle(TextInputStyle.Paragraph)
        .setMinLength(10)
        .setMaxLength(1000)
        .setPlaceholder('Describe the reason for reporting this message...')
        .setRequired(true);

    const reasonRow = new ActionRowBuilder().addComponents(reasonInput);
    modal.addComponents(reasonRow);
    await interaction.showModal(modal);
}

// Modal submit handler (to be used in index.js)
export async function handleModalSubmit(interaction) {
    if (interaction.customId !== 'reportMessageModal') return;
    const reason = interaction.fields.getTextInputValue('reportReasonInput');
    const reporter = interaction.user;
    const guild = interaction.guild;

    // Retrieve the report context from QuickDB
    const dbKey = `pendingReport_message_${reporter.id}`;
    const reportInfo = await db.get(dbKey);
    // Clean up after handling
    await db.delete(dbKey);

    const channelId = reportInfo?.channelId;
    const messageId = reportInfo?.messageId;

    const reportChannelId = await db.get(`reportChannel_${guild.id}`);
    const reportedMessage = await guild.channels.cache.get(channelId)?.messages.fetch(messageId).catch(() => null);
    // Get display names
    const reporterDisplay = guild.members.cache.get(reporter.id)?.displayName || reporter.tag;
    const authorId = reportedMessage?.author?.id || reportInfo?.authorId;
    const authorTag = reportedMessage?.author?.tag || 'Unknown';
    const authorDisplay = guild.members.cache.get(authorId)?.displayName || authorTag;
    // Build fancy embed
    const embed = {
        color: 0xff0000,
        title: '🚨 Message Report',
        description: `A message has been reported by **${reporterDisplay}**!`,
        fields: [
            { name: 'Reported Message', value: channelId && messageId ? `[Jump to Message](https://discord.com/channels/${guild.id}/${channelId}/${messageId})` : 'Message link unavailable', inline: true },
            { name: 'Message Author', value: `${authorDisplay} (${authorTag})`, inline: true },
            { name: 'Message Content', value: reportedMessage?.content || 'No content (possibly deleted)', inline: false },
            { name: 'Reporter', value: `${reporterDisplay} (${reporter.tag})`, inline: true },
            { name: 'Reason', value: reason, inline: false }
        ],
        timestamp: new Date().toISOString(),
        footer: { text: 'Security Report', icon_url: reporter.displayAvatarURL?.() }
    };
    if (reportChannelId) {
        const channel = guild.channels.cache.get(reportChannelId);
        if (channel) {
            await channel.send({ embeds: [embed] });
        }
    } else {
        // No channel set, print to console
        console.log(`\n--- Message Report (Server: ${guild.name}) ---`);
        console.log(`Reporter: ${reporterDisplay} (${reporter.tag})`);
        console.log(`Message Author: ${authorDisplay} (${authorTag})`);
        console.log(`Message Content: ${reportedMessage?.content || 'No content (possibly deleted)'}`);
        console.log(`Reason: ${reason}`);
        console.log(`Message Link: ${channelId && messageId ? `https://discord.com/channels/${guild.id}/${channelId}/${messageId}` : 'Unavailable'}`);
        console.log('--------------------------------------------\n');
    }
    await interaction.reply({ content: 'Your message report has been submitted to the moderation team.', flags: MessageFlags.Ephemeral });
}
