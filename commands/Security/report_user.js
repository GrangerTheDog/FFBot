import { ContextMenuCommandBuilder, ApplicationCommandType, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } from 'discord.js';
import { QuickDB } from 'quick.db';
const db = new QuickDB();

export const data = {
    name: 'Report User',
    type: ApplicationCommandType.User,
};

export async function execute(interaction) {
    // Save the report context in QuickDB with a short expiry (e.g., 5 minutes)
    const dbKey = `pendingReport_user_${interaction.user.id}`;
    await db.set(dbKey, {
        userId: interaction.targetUser.id,
        guildId: interaction.guild.id,
        timestamp: Date.now()
    });

    // Show modal for report reason
    const modal = new ModalBuilder()
        .setCustomId('reportUserModal')
        .setTitle('Report User: ' + interaction.targetUser.tag);

    const reasonInput = new TextInputBuilder()
        .setCustomId('reportReasonInput')
        .setLabel('Reason for report')
        .setStyle(TextInputStyle.Paragraph)
        .setMinLength(10)
        .setMaxLength(1000)
        .setPlaceholder('Describe the reason for reporting this user...')
        .setRequired(true);

    const reasonRow = new ActionRowBuilder().addComponents(reasonInput);
    modal.addComponents(reasonRow);
    await interaction.showModal(modal);
}

// Modal submit handler (to be used in index.js)
export async function handleModalSubmit(interaction) {
    if (interaction.customId !== 'reportUserModal') return;
    const reason = interaction.fields.getTextInputValue('reportReasonInput');
    const reporter = interaction.user;
    const guild = interaction.guild;

    // Retrieve the report context from QuickDB
    const dbKey = `pendingReport_user_${reporter.id}`;
    const reportInfo = await db.get(dbKey);

    // Clean up after handling
    await db.delete(dbKey);

    const reportedUserId = reportInfo?.userId;
    const reportedUser = guild.members.cache.get(reportedUserId)?.user || { tag: 'Unknown', id: reportedUserId };

    // Get display names
    const reporterDisplay = guild.members.cache.get(reporter.id)?.displayName || reporter.tag;
    const reportedUserDisplay = guild.members.cache.get(reportedUserId)?.displayName || reportedUser.tag;

    const reportChannelId = await db.get(`reportChannel_${guild.id}`);
    // Fancy embed
    const embed = {
        color: 0xff0000,
        title: '🚨 User Report',
        description: `A user has been reported by **${reporterDisplay}**!`,
        fields: [
            { name: 'Reported User', value: `${reportedUserDisplay} (${reportedUser.tag} / ${reportedUser.id})`, inline: true },
            { name: 'Reporter', value: `${reporterDisplay} (${reporter.tag} / ${reporter.id})`, inline: true },
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
    }
    await interaction.reply({ content: 'Your report has been submitted to the moderation team.', flags: MessageFlags.Ephemeral });
}
