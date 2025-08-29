import { AltDetector } from 'discord-alt-detector';
import { MessageFlags } from 'discord.js';
const detector = new AltDetector({}, (member, user) => 1);

export const data = {
    name: "security_check",
    description: "Check a user with the alt detector",
    options: [
        {
            name: "user",
            type: 6,
            description: "The user to check",
            required: true
        }
    ]
};

export async function execute(interaction) {
    const user = interaction.options.getUser('user');
    const targetMember = await interaction.guild.members.fetch(user.id);
    const result = detector.check(targetMember);
    const category = detector.getCategory(result);
    const categoryMap = {
        "highly-trusted": { emoji: "✅", notes: "You can trust this person in all cases! (they could even apply for staff)", color: 0x2ecc40 },
        "trusted": { emoji: "✅", notes: "You can trust this person very good!", color: 0x2ecc40 },
        "normal": { emoji: "✅", notes: "A normal user, nothing to worry about!", color: 0x2ecc40 },
        "newbie": { emoji: "🟠", notes: "A new user on discord, you might inspect him/her a little more!", color: 0xffa500 },
        "suspicious": { emoji: "🟠", notes: "Be careful with this user, this might be an alt/spy account!", color: 0xffa500 },
        "highly-suspicious": { emoji: "❌", notes: "Be really careful with this user, it's almost certainly an alt/scammer!", color: 0xff0000 },
        "mega-suspicious": { emoji: "❌", notes: "This account meets all the requirements to be an alt/scam account!", color: 0xff0000 }
    };
    const catInfo = categoryMap[category] || { emoji: "", notes: "", color: 0x0099ff };
    // Calculate account age
    const createdAt = user.createdAt;
    const now = new Date();
    const ageMs = now - createdAt;
    const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
    const embed = {
        color: catInfo.color,
        title: `Security Check Result`,
        description: `Result for **${user.tag}**`,
        fields: [
            { name: 'Score', value: `${result.total}`, inline: true },
            { name: 'Category', value: `${catInfo.emoji} ${category}`, inline: true },
            { name: 'Account Age', value: `${ageDays} days`, inline: true },
            { name: 'Notes', value: catInfo.notes }
        ],
        timestamp: new Date().toISOString(),
        footer: { text: 'Security Check' }
    };
    await interaction.reply({
        content: `Security Check result for ${user.tag}:`,
        embeds: [embed],
        flags: MessageFlags.Ephemeral 
    });
    
}
