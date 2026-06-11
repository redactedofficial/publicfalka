const names = {
  1: 'T I',
  2: 'T II',
  3: 'T III',
  4: 'T IV',
  5: 'T V'
};

function normalizeTier(value) {
  const raw = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  if (/^[1-5]$/.test(raw)) return Number(raw);
  if (raw === 'TI' || raw === 'TIERI' || raw === 'I') return 1;
  if (raw === 'TII' || raw === 'TIERII' || raw === 'II') return 2;
  if (raw === 'TIII' || raw === 'TIERIII' || raw === 'III') return 3;
  if (raw === 'TIV' || raw === 'TIERIV' || raw === 'IV') return 4;
  if (raw === 'TV' || raw === 'TIERV' || raw === 'V') return 5;
  return null;
}

function tierName(tier) {
  return names[Number(tier)] || 'Unranked';
}

module.exports = { names, normalizeTier, tierName };
