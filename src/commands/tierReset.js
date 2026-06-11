const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const roleService = require('../services/roleService');
const tierService = require('../services/tierService');

module.exports = {
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName('tier-reset')
    .setDescription('Reset a user to T I and clear XP/forced tier.')
    .addUserOption((option) => option.setName('user').setDescription('User').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  async execute(interaction) {
    if (!roleService.isAdmin(interaction.member)) {
      await interaction.editReply('Only admins can manage tiers.');
      return;
    }
    const target = interaction.options.getUser('user', true);
    await tierService.resetTier({ client: interaction.client, guild: interaction.guild, userId: target.id, actorId: interaction.user.id });
    await interaction.editReply(`Reset <@${target.id}> to T I.`);
  }
};
