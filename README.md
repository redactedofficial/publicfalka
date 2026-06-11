# Falkabot Tiering Bot

Discord.js v14 bot for verification, XP-backed tiers, admin approval votes, inactivity downtiering, and manual tier management.

## Features

- Verification by reacting with `✅` on message `1469447118388203590`.
- Verified members automatically receive `T I`, access roles, and database records.
- Tier-up requires an admin vote with Discord buttons.
- Inactivity decay can automatically demote or create demotion votes.
- Admins can force-set tiers with `/tier-set`; forced tiers expire after `forcedTierGraceDays`.
- Admin role `1469421167898263572` is ignored by automatic tiering.
- SQLite persistence for users, votes, vote entries, logs, and cooldowns.

## Setup

1. Install Node.js 18.17 or newer.
2. Install dependencies:

```bash
npm install
```

3. Copy `.env.example` to `.env` and fill in token, client ID, channel IDs, and role IDs.
4. Copy `config.example.json` to `config.json` and adjust thresholds, XP, decay, and access roles.
5. Start the bot:

```bash
npm start
```

If `GUILD_ID` is set, slash commands register to that guild for fast iteration. Without it, commands register globally and can take longer to appear.

## Required Intents

Enable these in the Discord Developer Portal and bot code:

- Guilds
- Guild Members
- Guild Messages
- Guild Message Reactions
- Message Content
- Guild Voice States

## Commands

- `/help`
- `/tier user`
- `/verify-status user`
- `/tier-set user tier reason`
- `/tier-reset user`
- `/tier-xp user amount reason`
- `/tier-recheck user`
- `/tier-sync user`
- `/tier-logs user limit`
- `/tier-vote-cancel vote-id reason`
- `/tier-decay-run`
- `/tier-leaderboard`
- `/tier-config`
- `/tier-votes`

## Notes

- Configure tier roles with `T_I_ROLE_ID` through `T_V_ROLE_ID`.
- The bot removes conflicting tier roles before assigning the new one.
- Missing roles, channels, and permissions are logged instead of crashing the process.
- Speaking in voice cannot be reliably detected through Discord.js gateway events alone; this bot tracks voice channel time from joins/leaves/moves.
