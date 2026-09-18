function normalize(data) {
  return {
    fournisseur_id: data.fournisseur_id || null,
    fournisseur_nom_libre: data.fournisseur_nom_libre || null,
    numero_facture: data.numero_facture || null,
    date: data.date,
    montant_ht: data.montant_ht !== '' && data.montant_ht != null ? Number(data.montant_ht) : null,
    montant_tva: data.montant_tva !== '' && data.montant_tva != null ? Number(data.montant_tva) : null,
    montant_ttc: Number(data.montant_ttc) || 0,
    description: data.description || null,
    image_path: data.image_path || null,
    scan_brut: data.scan_brut || null,
  };
}

function list(db, filters = {}) {
  let sql = `SELECT achats.*, fournisseurs.nom AS fournisseur_nom FROM achats LEFT JOIN fournisseurs ON fournisseurs.id = achats.fournisseur_id WHERE 1=1`;
  const params = [];
  if (filters.search) {
    sql += ' AND (achats.numero_facture LIKE ? OR fournisseurs.nom LIKE ? OR achats.fournisseur_nom_libre LIKE ?)';
    params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
  }
  if (filters.date_debut) {
    sql += ' AND achats.date >= ?';
    params.push(filters.date_debut);
  }
  if (filters.date_fin) {
    sql += ' AND achats.date <= ?';
    params.push(filters.date_fin);
  }
  sql += ' ORDER BY achats.date DESC, achats.id DESC';
  return db.prepare(sql).all(...params);
}

function get(db, id) {
  return db.prepare('SELECT * FROM achats WHERE id = ?').get(id);
}

function create(db, data) {
  const info = db
    .prepare(`
      INSERT INTO achats (fournisseur_id, fournisseur_nom_libre, numero_facture, date, montant_ht, montant_tva, montant_ttc, description, image_path, scan_brut)
      VALUES (@fournisseur_id, @fournisseur_nom_libre, @numero_facture, @date, @montant_ht, @montant_tva, @montant_ttc, @description, @image_path, @scan_brut)
    `)
    .run(normalize(data));
  return get(db, info.lastInsertRowid);
}

function update(db, id, data) {
  db.prepare(`
    UPDATE achats SET fournisseur_id=@fournisseur_id, fournisseur_nom_libre=@fournisseur_nom_libre,
      numero_facture=@numero_facture, date=@date, montant_ht=@montant_ht, montant_tva=@montant_tva,
      montant_ttc=@montant_ttc, description=@description, image_path=@image_path, scan_brut=@scan_brut
    WHERE id=@id
  `).run({ ...normalize(data), id });
  return get(db, id);
}

function remove(db, id) {
  db.prepare('DELETE FROM achats WHERE id = ?').run(id);
  return { success: true };
}

module.exports = { list, get, create, update, remove };
