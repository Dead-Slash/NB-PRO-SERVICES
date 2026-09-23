const { nextNumero } = require('../../services/numbering');
const { computeTotals } = require('../../services/totals');
const { getFacturation } = require('./settings');

function withLignes(db, d) {
  if (!d) return d;
  d.lignes = db.prepare('SELECT * FROM devis_lignes WHERE devis_id = ? ORDER BY ordre').all(d.id);
  d.client = db.prepare('SELECT * FROM clients WHERE id = ?').get(d.client_id);
  return d;
}

function list(db, filters = {}) {
  let sql = `SELECT devis.*, clients.nom AS client_nom FROM devis JOIN clients ON clients.id = devis.client_id WHERE 1=1`;
  const params = [];
  if (filters.statut) {
    sql += ' AND devis.statut = ?';
    params.push(filters.statut);
  }
  if (filters.search) {
    sql += ' AND (devis.numero LIKE ? OR clients.nom LIKE ?)';
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }
  sql += ' ORDER BY devis.id DESC';
  return db.prepare(sql).all(...params);
}

function get(db, id) {
  const d = db.prepare('SELECT * FROM devis WHERE id = ?').get(id);
  return withLignes(db, d);
}

function insertLignes(db, devisId, computedLignes) {
  const insertLigne = db.prepare(`
    INSERT INTO devis_lignes (devis_id, description, quantite, prix_unitaire, taux_tva, total_ligne, ordre)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const l of computedLignes) {
    insertLigne.run(devisId, l.description, l.quantite, l.prix_unitaire, l.taux_tva, l.total_ligne, l.ordre);
  }
}

function create(db, data) {
  const avecTva = data.avec_tva ? 1 : 0;
  const { computedLignes, sousTotal, totalTva, timbre, totalTtc } = computeTotals(data.lignes, avecTva, getFacturation(db).timbre_fiscal);
  const numero = nextNumero(db, 'DEV');
  const tx = db.transaction(() => {
    const info = db
      .prepare(`
        INSERT INTO devis (numero, date, client_id, avec_tva, statut, sous_total, total_tva, timbre_fiscal, total_ttc, notes)
        VALUES (?, ?, ?, ?, 'attente', ?, ?, ?, ?, ?)
      `)
      .run(numero, data.date, data.client_id, avecTva, sousTotal, totalTva, timbre, totalTtc, data.notes || null);
    insertLignes(db, info.lastInsertRowid, computedLignes);
    return info.lastInsertRowid;
  });
  return get(db, tx());
}

function update(db, id, data) {
  const existing = db.prepare('SELECT statut FROM devis WHERE id = ?').get(id);
  if (!existing) throw new Error('Devis introuvable');
  if (existing.statut !== 'attente') throw new Error('Seul un devis en attente peut être modifié');

  const avecTva = data.avec_tva ? 1 : 0;
  const { computedLignes, sousTotal, totalTva, timbre, totalTtc } = computeTotals(data.lignes, avecTva, getFacturation(db).timbre_fiscal);
  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE devis SET date=?, client_id=?, avec_tva=?, sous_total=?, total_tva=?, timbre_fiscal=?, total_ttc=?, notes=?, updated_at=datetime('now')
      WHERE id=?
    `).run(data.date, data.client_id, avecTva, sousTotal, totalTva, timbre, totalTtc, data.notes || null, id);
    db.prepare('DELETE FROM devis_lignes WHERE devis_id = ?').run(id);
    insertLignes(db, id, computedLignes);
  });
  tx();
  return get(db, id);
}

function updateStatut(db, id, statut) {
  if (!['attente', 'validee', 'annulee'].includes(statut)) throw new Error('Statut invalide');
  const d = get(db, id);
  if (!d) throw new Error('Devis introuvable');
  if (d.statut !== 'attente') throw new Error('Ce devis a déjà été traité');

  if (statut === 'annulee') {
    db.prepare(`UPDATE devis SET statut='annulee', updated_at=datetime('now') WHERE id=?`).run(id);
    return get(db, id);
  }

  // validation -> crée automatiquement la facture correspondante
  const facturesRepo = require('./factures');
  const tx = db.transaction(() => {
    const facture = facturesRepo.create(db, {
      date: new Date().toISOString().slice(0, 10),
      client_id: d.client_id,
      devis_id: d.id,
      avec_tva: d.avec_tva,
      timbre_fiscal: d.timbre_fiscal,
      notes: d.notes,
      lignes: d.lignes.map((l) => ({
        description: l.description,
        quantite: l.quantite,
        prix_unitaire: l.prix_unitaire,
        taux_tva: l.taux_tva,
      })),
    });
    db.prepare(`UPDATE devis SET statut='validee', facture_id=?, updated_at=datetime('now') WHERE id=?`).run(facture.id, id);
  });
  tx();
  return get(db, id);
}

function remove(db, id) {
  const d = get(db, id);
  if (d && d.statut === 'validee') throw new Error('Impossible de supprimer un devis validé (une facture y est liée)');
  db.prepare('DELETE FROM devis WHERE id = ?').run(id);
  return { success: true };
}

module.exports = { list, get, create, update, updateStatut, remove };
