// Format monétaire tunisien : 3 décimales (millimes) + DT
function formatMontant(n) {
  const num = Number(n) || 0;
  return num.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' DT';
}

module.exports = { formatMontant };
