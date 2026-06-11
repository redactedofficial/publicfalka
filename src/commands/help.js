const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const roleService = require('../services/roleService');

module.exports = {
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Shows safe bot commands and what they do.'),
  async execute(interaction) {
    const admin = roleService.isAdmin(interaction.member);
    const userCommands = [
      '`/tier [user]` - View tier, XP, activity, and decay details.',
      '`/verify-status [user]` - Check verification and role status.',
      '`/tier-leaderboard` - Show most active verified users.',
      '`/tier-config` - Show thresholds and decay settings.',
      '`/tier-votes` - Show pending tier votes.'
    ];
    const adminCommands = [
      '`/tier-set user tier reason` - Force-set a tier with an audit reason.',
      '`/tier-reset user` - Reset a user to T I and clear XP/forced tier data.',
      '`/tier-xp user amount reason` - Add or remove XP without directly changing tier.',
      '`/tier-recheck user` - Recheck XP and create a promotion vote if qualified.',
      '`/tier-sync user` - Reapply database tier roles and access roles.',
      '`/tier-logs user [limit]` - View recent tier audit logs.',
      '`/tier-vote-cancel vote-id reason` - Cancel a pending tier vote.',
      '`/tier-decay-run` - Manually run inactivity decay.'
    ];

    const embed = new EmbedBuilder()
      .setTitle('Falkabot help')
      .setColor(0x5865f2)
      .addFields({ name: 'Member commands', value: userCommands.join('\n') })
      .setFooter({ text: 'Tier-ups happen through admin votes. Admins are ignored by automatic tiering.' });

    if (admin) embed.addFields({ name: 'Admin commands', value: adminCommands.join('\n') });
    await interaction.editReply({ embeds: [embed] });
  }
};
