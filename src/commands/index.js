const tier = require('./tier');
const tierSet = require('./tierSet');
const tierReset = require('./tierReset');
const tierDecayRun = require('./tierDecayRun');
const tierLeaderboard = require('./tierLeaderboard');
const tierConfig = require('./tierConfig');
const tierVotes = require('./tierVotes');
const help = require('./help');
const verifyStatus = require('./verifyStatus');
const tierXp = require('./tierXp');
const tierRecheck = require('./tierRecheck');
const tierLogs = require('./tierLogs');
const tierVoteCancel = require('./tierVoteCancel');
const tierSync = require('./tierSync');

const all = [
  help,
  tier,
  verifyStatus,
  tierLeaderboard,
  tierConfig,
  tierVotes,
  tierSet,
  tierReset,
  tierXp,
  tierRecheck,
  tierLogs,
  tierVoteCancel,
  tierSync,
  tierDecayRun
];
const handlers = new Map(all.map((command) => [command.data.name, command]));

module.exports = { all, handlers };
