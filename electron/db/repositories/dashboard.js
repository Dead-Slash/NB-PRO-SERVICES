function summary(db, filters = {}) {
  const dateDebut = filters.date_debut || '0000-01-01';
  const dateFin = filters.date_fin || '9999-12-31';

  const revenuEncaisse = db
    .prepare('SELECT COALESCE(SUM(montant),0) AS total FROM paiements WHERE date BETWEEN ? AND ?')
    .get(dateDebut, dateFin).total;

  const totalFacture = db
    .prepare('SELECT COALESCE(SUM(total_ttc),0) AS total FROM factures WHERE date BETWEEN ? AND ?')
    .get(dateDebut, dateFin).total;

  const totalImpaye = db
    .prepare(`
      SELECT COALESCE(SUM(total_ttc - montant_paye),0) AS total FROM factures
      WHERE date BETWEEN ? AND ? AND statut_paiement != 'payee'
    `)
    .get(dateDebut, dateFin).total;

  const depenses = db
    .prepare('SELECT COALESCE(SUM(montant_ttc),0) AS total FROM achats WHERE date BETWEEN ? AND ?')
    .get(dateDebut, dateFin).total;

  const nbDevisAttente = db.prepare("SELECT COUNT(*) AS n FROM devis WHERE statut = 'attente'").get().n;
  const nbFacturesImpayees = db.prepare("SELECT COUNT(*) AS n FROM factures WHERE statut_paiement != 'payee'").get().n;
  const nbClients = db.prepare('SELECT COUNT(*) AS n FROM clients').get().n;
  const nbFournisseurs = db.prepare('SELECT COUNT(*) AS n FROM fournisseurs').get().n;

  const dernieresFactures = db
    .prepare(`
      SELECT factures.*, clients.nom AS client_nom FROM factures
      JOIN clients ON clients.id = factures.client_id
      ORDER BY factures.id DESC LIMIT 5
    `)
    .all();

  const derniersAchats = db
    .prepare(`
      SELECT achats.*, fournisseurs.nom AS fournisseur_nom FROM achats
      LEFT JOIN fournisseurs ON fournisseurs.id = achats.fournisseur_id
      ORDER BY achats.id DESC LIMIT 5
    `)
    .all();

  return {
    revenuEncaisse,
    totalFacture,
    totalImpaye,
    depenses,
    benefice: revenuEncaisse - depenses,
    nbDevisAttente,
    nbFacturesImpayees,
    nbClients,
    nbFournisseurs,
    dernieresFactures,
    derniersAchats,
  };
}

module.exports = { summary };
