function get(db) {
  return db.prepare('SELECT * FROM societe WHERE id = 1').get();
}

function update(db, data) {
  db.prepare(`
    UPDATE societe SET nom=@nom, logo_path=@logo_path, adresse=@adresse, telephone=@telephone,
      email=@email, matricule_fiscal=@matricule_fiscal, rib=@rib, banque=@banque, site_web=@site_web
    WHERE id = 1
  `).run({
    nom: data.nom || 'Ma Société',
    logo_path: data.logo_path || null,
    adresse: data.adresse || null,
    telephone: data.telephone || null,
    email: data.email || null,
    matricule_fiscal: data.matricule_fiscal || null,
    rib: data.rib || null,
    banque: data.banque || null,
    site_web: data.site_web || null,
  });
  return get(db);
}

function getGeminiKey(db) {
  const row = db.prepare("SELECT valeur FROM parametres WHERE cle = 'gemini_api_key'").get();
  return row ? row.valeur : null;
}

function setGeminiKey(db, key) {
  db.prepare(`
    INSERT INTO parametres (cle, valeur) VALUES ('gemini_api_key', ?)
    ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur
  `).run(key || '');
  return { success: true };
}

module.exports = { get, update, getGeminiKey, setGeminiKey };
