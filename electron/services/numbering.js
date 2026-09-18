// Génère un numéro séquentiel du type PREFIX-ANNEE-0001 (remis à zéro chaque année)
function nextNumero(db, prefix) {
  const year = new Date().getFullYear();
  const table = prefix === 'DEV' ? 'devis' : 'factures';
  const like = `${prefix}-${year}-%`;
  const row = db.prepare(`SELECT numero FROM ${table} WHERE numero LIKE ? ORDER BY id DESC LIMIT 1`).get(like);
  let next = 1;
  if (row) {
    const parts = row.numero.split('-');
    const n = parseInt(parts[2], 10);
    if (!Number.isNaN(n)) next = n + 1;
  }
  return `${prefix}-${year}-${String(next).padStart(4, '0')}`;
}

module.exports = { nextNumero };
