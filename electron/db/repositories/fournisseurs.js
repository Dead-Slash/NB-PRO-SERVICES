function normalize(data) {
  return {
    nom: data.nom || '',
    matricule_fiscal: data.matricule_fiscal || null,
    telephone: data.telephone || null,
    email: data.email || null,
    adresse: data.adresse || null,
    notes: data.notes || null,
  };
}

function list(db, search) {
  if (search) {
    return db
      .prepare('SELECT * FROM fournisseurs WHERE nom LIKE ? OR matricule_fiscal LIKE ? ORDER BY nom')
      .all(`%${search}%`, `%${search}%`);
  }
  return db.prepare('SELECT * FROM fournisseurs ORDER BY nom').all();
}

function get(db, id) {
  return db.prepare('SELECT * FROM fournisseurs WHERE id = ?').get(id);
}

function create(db, data) {
  const info = db
    .prepare(`
      INSERT INTO fournisseurs (nom, matricule_fiscal, telephone, email, adresse, notes)
      VALUES (@nom, @matricule_fiscal, @telephone, @email, @adresse, @notes)
    `)
    .run(normalize(data));
  return get(db, info.lastInsertRowid);
}

function update(db, id, data) {
  db.prepare(`
    UPDATE fournisseurs SET nom=@nom, matricule_fiscal=@matricule_fiscal, telephone=@telephone,
      email=@email, adresse=@adresse, notes=@notes WHERE id=@id
  `).run({ ...normalize(data), id });
  return get(db, id);
}

function remove(db, id) {
  db.prepare('DELETE FROM fournisseurs WHERE id = ?').run(id);
  return { success: true };
}

module.exports = { list, get, create, update, remove };
