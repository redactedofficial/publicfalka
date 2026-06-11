const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { db, ensureUser } = require('../database');
const { nowIso } = require('../utils/time');
const roleService = require('../services/roleService');
const logService = require('../services/logService');
const tierService = require('../services/tierService');
const voteService = require('../services/voteService');

module.exports = {
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName('tier-xp')
    .setDescription('Admin-only: add or remove XP with an audit reason.')
    .addUserOption((option) => option.setName('user').setDescription('User').setRequired(true))
    .addIntegerOption((option) => option.setName('amount').setDescription('Positive adds XP, negative removes XP').setRequired(true).setMinValue(-100000).setMaxValue(100000))
    .addStringOption((option) => option.setName('reason').setDescription('Audit reason').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  async execute(interaction) {
    if (!roleService.isAdmin(interaction.member)) {
      await interaction.editReply('Only admins can adjust XP.');
      return;
    }

    const target = interaction.options.getUser('user', true);
    const amount = interaction.options.getInteger('amount', true);
    const reason = interaction.options.getString('reason', true);
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (member && roleService.isAdmin(member)) {
      await interaction.editReply('Admins are ignored by automatic tiering. XP was not changed.');
      return;
    }

    const before = ensureUser(target.id);
    const newXp = Math.max(0, Number(before.xp || 0) + amount);
    db.prepare('UPDATE users SET xp = ?, updated_at = ? WHERE user_id = ?').run(newXp, nowIso(), target.id);
    logService.saveTierLog({
      userId: target.id,
      action: 'xp_adjust',
      oldTier: before.current_tier,
      newTier: before.current_tier,
      reason: `${amount >= 0 ? '+' : ''}${amount} XP: ${reason}`,
      actorId: interaction.user.id
    });

    const updated = db.prepare('SELECT * FROM users WHERE user_id = ?').get(target.id);
    const next = tierService.nextTierForUser(updated);
    let suffix = '';
    if (next && updated.verified) {
      await voteService.createTierVote(interaction.client, interaction.guild, {
        userId: target.id,
        voteType: 'promotion',
        fromTier: updated.current_tier,
        toTier: next,
        reason: `XP adjustment qualified user for promotion: ${reason}`
      });
      suffix = ` Promotion vote created for <@${target.id}>.`;
    }

    await interaction.editReply(`XP updated for <@${target.id}>: ${before.xp} -> ${newXp}.${suffix}`);
  }
};
