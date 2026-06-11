const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const roleService = require('../services/roleService');
const decayService = require('../services/decayService');

module.exports = {
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName('tier-decay-run')
    .setDescription('Manually run the tier decay check.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  async execute(interaction) {
    if (!roleService.isAdmin(interaction.member)) {
      await interaction.editReply('Only admins can run decay.');
      return;
    }
    const result = await decayService.runDecay(interaction.client, interaction.guild);
    await interaction.editReply(`Decay complete. Decayed: ${result.decayed}, demotions: ${result.demotions}, votes: ${result.votes}.`);
  }
};
