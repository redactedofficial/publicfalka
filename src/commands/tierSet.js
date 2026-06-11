const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { normalizeTier, tierName } = require('../utils/romanTier');
const roleService = require('../services/roleService');
const tierService = require('../services/tierService');

module.exports = {
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName('tier-set')
    .setDescription('Force-set a user tier.')
    .addUserOption((option) => option.setName('user').setDescription('User').setRequired(true))
    .addStringOption((option) => option.setName('tier').setDescription('Tier: T I through T V').setRequired(true))
    .addStringOption((option) => option.setName('reason').setDescription('Reason').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  async execute(interaction) {
    if (!roleService.isAdmin(interaction.member)) {
      await interaction.editReply('Only admins can manage tiers.');
      return;
    }
    const target = interaction.options.getUser('user', true);
    const tier = normalizeTier(interaction.options.getString('tier', true));
    const reason = interaction.options.getString('reason', true);
    if (!tier) {
      await interaction.editReply('Invalid tier. Use T I, T II, T III, T IV, or T V.');
      return;
    }
    await tierService.setTier({
      client: interaction.client,
      guild: interaction.guild,
      userId: target.id,
      tier,
      actorId: interaction.user.id,
      reason,
      forced: true,
      action: 'force_set'
    });
    await interaction.editReply(`Set <@${target.id}> to ${tierName(tier)}.`);
  }
};
