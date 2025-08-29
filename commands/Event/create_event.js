import { ActionRowBuilder, Events, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

export const data = {
    name: "create_event",
    description: "Create a test event (demo command)",
    options: []
};

export async function execute(interaction){

		// Create the modal
		const modal = new ModalBuilder()
			.setCustomId('createEventModal')
			.setTitle('Create Event');

		// Setup some demo text input components
        const eventNameInput = new TextInputBuilder()
			.setCustomId('eventNameInput')
			.setLabel("What's the name of the event?")
			.setStyle(TextInputStyle.Short);

		const eventDateInput = new TextInputBuilder()
			.setCustomId('eventDateInput')
			.setLabel("What's the date of the event?")
			.setStyle(TextInputStyle.Short);
        //date input
        const eventTimeInput = new TextInputBuilder()
            .setCustomId('eventTimeInput') 
            .setLabel("What's the time of the event?")
            .setStyle(TextInputStyle.Short);
        //time input
		// An action row only holds one text input,
		// so you need one action row per text input.
		const firstActionRow = new ActionRowBuilder().addComponents(eventNameInput);
		const secondActionRow = new ActionRowBuilder().addComponents(eventDateInput);
		const thirdActionRow = new ActionRowBuilder().addComponents(eventTimeInput);

		// Add inputs to the modal
		modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

		// Show the modal to the user
		await interaction.showModal(modal);
};
