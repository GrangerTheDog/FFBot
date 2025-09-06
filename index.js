import { Client, GatewayIntentBits, Partials, Events, Collection, REST , Routes} from 'discord.js';
import { QuickDB } from 'quick.db';
import { AltDetector } from 'discord-alt-detector';
import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import path from 'path';
const db = new QuickDB();
const token = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences
    ],
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

client.commands = new Collection();

const moderationRoles = ['1297505274759872592', '1212504401541996604', '1410757216000151643'];

// Dynamically load all command modules from commands folder and subfolders
async function getCommandHandlers() {
    const handlers = {};
    const slashCommands = [];
    async function walk(dir) {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        for (const file of files) {
            if (file.isDirectory()) {
                await walk(path.join(dir, file.name));
            } else if (file.name.endsWith('.js')) {
                const baseCommandsPath = path.resolve('./commands');
                const filePath = path.resolve(dir, file.name);
                const relPath = path.relative(baseCommandsPath, filePath);
                const commandName = relPath.replace(/\\|\//g, '_').replace(/\.js$/, '');
                const modulePath = `./commands/${relPath.replace(/\\/g, '/').replace(/\.js$/, '')}.js`;
                const module = await import(modulePath);
                if (module.data && module.execute) {
                    client.commands.set(module.data.name, module);
                    slashCommands.push(module.data);
                    handlers[commandName] = () => import(modulePath);
                    console.log(`Loaded command: ${module.data.name} from ${relPath}`);
                } else {
                    console.warn(`Invalid command module structure in ${relPath}`);
                }
            }
        }
    }
    await walk(path.resolve('./commands'));
    return { handlers, slashCommands };
}

(async () => {
    const rest = new REST({ version: '10' }).setToken(token);
    const { handlers: commandHandlers, slashCommands } = await getCommandHandlers();
    try {
        console.log('Started refreshing application (/) commands.');
        console.log(JSON.stringify(slashCommands, null, 2));
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: slashCommands });
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isUserContextMenuCommand && interaction.isUserContextMenuCommand()) {
        // Context menu: Report User
        const reportUserModule = client.commands.get('Report User');
        if (reportUserModule) {
            await reportUserModule.execute(interaction);
        }
        return;
    }
    if (interaction.isMessageContextMenuCommand && interaction.isMessageContextMenuCommand()) {
        // Context menu: Report Message
        const reportMessageModule = client.commands.get('Report Message');
        if (reportMessageModule) {
            await reportMessageModule.execute(interaction);
        }
        return;
    }
    if (interaction.isModalSubmit && interaction.isModalSubmit()) {
        // Modal submit for user report
        const reportUserModule = client.commands.get('Report User');
        if (reportUserModule && reportUserModule.handleModalSubmit) {
            await reportUserModule.handleModalSubmit(interaction);
        }
        // Modal submit for message report
        const reportMessageModule = client.commands.get('Report Message');
        if (reportMessageModule && reportMessageModule.handleModalSubmit) {
            await reportMessageModule.handleModalSubmit(interaction);
        }
        return;
    }
    if (!interaction.isChatInputCommand()) return;
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.roles.cache.some(role => moderationRoles.includes(role.id))) {
        await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        return;
    }
    const fullCommand = interaction.commandName;
    if (client.commands.has(fullCommand)) {
        const handlerModule = client.commands.get(fullCommand);
        await handlerModule.execute(interaction);
    }
});

const detector = new AltDetector({
    // You can customize weights here if needed
}, (member, user) => {
    // Custom function for extra score
    return 1;
});

client.on(Events.GuildMemberAdd, async member => {
    const result = detector.check(member);
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
    const createdAt = member.user.createdAt;
    const now = new Date();
    const ageMs = now - createdAt;
    const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
    const embed = {
        color: catInfo.color,
        title: `Alt Detector Result`,
        description: `Result for **${member.user.tag}**`,
        fields: [
            { name: 'Score', value: `${result.total}`, inline: true },
            { name: 'Category', value: `${catInfo.emoji} ${category}`, inline: true },
            { name: 'Account Age', value: `${ageDays} days`, inline: true },
            { name: 'Notes', value: catInfo.notes }
        ],
        timestamp: new Date().toISOString(),
        footer: { text: 'Alt Detector' }
    };
    const channelId = await db.get(`altChannel_${member.guild.id}`);
    if (channelId) {
        const channel = member.guild.channels.cache.get(channelId);
        if (channel) {
            channel.send({
                content: `Alt Detector result for ${member.user.tag}:`,
                embeds: [embed]
            });
        }
    } else {
        // No channel set, print to console
        console.log(`\n--- Alt Detector Join (Server: ${member.guild.name}) ---`);
        console.log(`User: ${member.user.tag} (${member.user.id})`);
        console.log(`Score: ${result.total}`);
        console.log(`Category: ${catInfo.emoji} ${category}`);
        console.log(`Account Age: ${ageDays} days`);
        console.log(`Notes: ${catInfo.notes}`);
        console.log('--------------------------------------------\n');
    }
});
client.on(Events.ClientReady, readyClient => {
  console.log(`Logged in as ${readyClient.user.tag}!`);
});
client.login(token);