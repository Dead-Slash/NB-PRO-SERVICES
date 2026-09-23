// Le logiciel est dédié à cette société : le nom n'est pas modifiable.
const COMPANY_NAME = 'NB PRO SERVICES';

const FACTURATION_DEFAULTS = { taux_tva_defaut: 19, timbre_fiscal: 1 };

function getParam(db, cle) {
  const row = db.prepare('SELECT valeur FROM parametres WHERE cle = ?').get(cle);
  return row ? row.valeur : null;
}

function setParam(db, cle, valeur) {
  db.prepare(`
    INSERT INTO parametres (cle, valeur) VALUES (?, ?)
    ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur
  `).run(cle, valeur);
}

function getNumberParam(db, cle) {
  const v = getParam(db, cle);
  const n = v === null || v === '' ? NaN : Number(v);
  return Number.isFinite(n) ? n : FACTURATION_DEFAULTS[cle];
}

// Taux de TVA proposé par défaut sur les nouvelles lignes + montant du timbre fiscal
function getFacturation(db) {
  return {
    taux_tva_defaut: getNumberParam(db, 'taux_tva_defaut'),
    timbre_fiscal: getNumberParam(db, 'timbre_fiscal'),
  };
}

function get(db) {
  const societe = db.prepare('SELECT * FROM societe WHERE id = 1').get();
  return { ...societe, nom: COMPANY_NAME, ...getFacturation(db) };
}

function update(db, data) {
  const tva = Number(data.taux_tva_defaut);
  const timbre = Number(data.timbre_fiscal);
  if (!Number.isFinite(tva) || tva < 0 || tva > 100) throw new Error('Le taux de TVA doit être compris entre 0 et 100');
  if (!Number.isFinite(timbre) || timbre < 0) throw new Error('Le timbre fiscal doit être un montant positif');

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE societe SET nom=@nom, logo_path=@logo_path, adresse=@adresse, telephone=@telephone,
        email=@email, matricule_fiscal=@matricule_fiscal, rib=@rib, banque=@banque, site_web=@site_web
      WHERE id = 1
    `).run({
      nom: COMPANY_NAME,
      logo_path: data.logo_path || null,
      adresse: data.adresse || null,
      telephone: data.telephone || null,
      email: data.email || null,
      matricule_fiscal: data.matricule_fiscal || null,
      rib: data.rib || null,
      banque: data.banque || null,
      site_web: data.site_web || null,
    });
    setParam(db, 'taux_tva_defaut', String(tva));
    setParam(db, 'timbre_fiscal', String(timbre));
  });
  tx();
  return get(db);
}

function getGeminiKey(db) {
  return getParam(db, 'gemini_api_key');
}

function setGeminiKey(db, key) {
  setParam(db, 'gemini_api_key', key || '');
  return { success: true };
}

module.exports = { COMPANY_NAME, get, update, getFacturation, getGeminiKey, setGeminiKey };
