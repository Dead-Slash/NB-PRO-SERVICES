const { nextNumero } = require('../../services/numbering');
const { computeTotals } = require('../../services/totals');
const { getFacturation } = require('./settings');

function withDetails(db, f) {
  if (!f) return f;
  f.lignes = db.prepare('SELECT * FROM facture_lignes WHERE facture_id = ? ORDER BY ordre').all(f.id);
  f.client = db.prepare('SELECT * FROM clients WHERE id = ?').get(f.client_id);
  f.paiements = db.prepare('SELECT * FROM paiements WHERE facture_id = ? ORDER BY date').all(f.id);
  return f;
}

function list(db, filters = {}) {
  let sql = `SELECT factures.*, clients.nom AS client_nom FROM factures JOIN clients ON clients.id = factures.client_id WHERE 1=1`;
  const params = [];
  if (filters.statut_paiement) {
    sql += ' AND factures.statut_paiement = ?';
    params.push(filters.statut_paiement);
  }
  if (filters.search) {
    sql += ' AND (factures.numero LIKE ? OR clients.nom LIKE ?)';
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }
  sql += ' ORDER BY factures.id DESC';
  return db.prepare(sql).all(...params);
}

function get(db, id) {
  const f = db.prepare('SELECT * FROM factures WHERE id = ?').get(id);
  return withDetails(db, f);
}

function insertLignes(db, factureId, computedLignes) {
  const insertLigne = db.prepare(`
    INSERT INTO facture_lignes (facture_id, description, quantite, prix_unitaire, taux_tva, total_ligne, ordre)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const l of computedLignes) {
    insertLigne.run(factureId, l.description, l.quantite, l.prix_unitaire, l.taux_tva, l.total_ligne, l.ordre);
  }
}

function create(db, data) {
  const avecTva = data.avec_tva ? 1 : 0;
  // une facture issue d'un devis reprend le timbre du devis, sinon celui des paramètres
  const timbreFiscal = data.timbre_fiscal ?? getFacturation(db).timbre_fiscal;
  const { computedLignes, sousTotal, totalTva, timbre, totalTtc } = computeTotals(data.lignes, avecTva, timbreFiscal);
  const numero = nextNumero(db, 'FACT');
  const tx = db.transaction(() => {
    const info = db
      .prepare(`
        INSERT INTO factures (numero, date, client_id, devis_id, avec_tva, sous_total, total_tva, timbre_fiscal, total_ttc, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(numero, data.date, data.client_id, data.devis_id || null, avecTva, sousTotal, totalTva, timbre, totalTtc, data.notes || null);
    insertLignes(db, info.lastInsertRowid, computedLignes);
    return info.lastInsertRowid;
  });
  return get(db, tx());
}

function update(db, id, data) {
  const existing = db.prepare('SELECT devis_id FROM factures WHERE id = ?').get(id);
  if (!existing) throw new Error('Facture introuvable');
  if (existing.devis_id) throw new Error('Une facture générée depuis un devis ne peut pas être modifiée');

  const avecTva = data.avec_tva ? 1 : 0;
  const { computedLignes, sousTotal, totalTva, timbre, totalTtc } = computeTotals(data.lignes, avecTva, getFacturation(db).timbre_fiscal);
  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE factures SET date=?, client_id=?, avec_tva=?, sous_total=?, total_tva=?, timbre_fiscal=?, total_ttc=?, notes=?, updated_at=datetime('now')
      WHERE id=?
    `).run(data.date, data.client_id, avecTva, sousTotal, totalTva, timbre, totalTtc, data.notes || null, id);
    db.prepare('DELETE FROM facture_lignes WHERE facture_id = ?').run(id);
    insertLignes(db, id, computedLignes);
    refreshStatutPaiement(db, id);
  });
  tx();
  return get(db, id);
}

function refreshStatutPaiement(db, id) {
  const f = db.prepare('SELECT total_ttc FROM factures WHERE id = ?').get(id);
  const { total } = db.prepare('SELECT COALESCE(SUM(montant),0) AS total FROM paiements WHERE facture_id = ?').get(id);
  let statut = 'impayee';
  if (total > 0 && total < f.total_ttc) statut = 'partiellement_payee';
  if (f.total_ttc > 0 && total >= f.total_ttc) statut = 'payee';
  db.prepare('UPDATE factures SET montant_paye=?, statut_paiement=? WHERE id=?').run(total, statut, id);
}

function addPaiement(db, id, paiement) {
  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO paiements (facture_id, montant, date, mode_paiement, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, Number(paiement.montant) || 0, paiement.date, paiement.mode_paiement || null, paiement.notes || null);
    refreshStatutPaiement(db, id);
  });
  tx();
  return get(db, id);
}

function remove(db, id) {
  const f = db.prepare('SELECT devis_id FROM factures WHERE id = ?').get(id);
  if (f && f.devis_id) throw new Error('Impossible de supprimer une facture liée à un devis validé');
  db.prepare('DELETE FROM factures WHERE id = ?').run(id);
  return { success: true };
}

module.exports = { list, get, create, update, addPaiement, remove };
