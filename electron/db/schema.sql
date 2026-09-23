-- Informations de la société (entête / pied de page des documents imprimés)
CREATE TABLE IF NOT EXISTS societe (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  nom TEXT NOT NULL DEFAULT 'NB PRO SERVICES',
  logo_path TEXT,
  adresse TEXT,
  telephone TEXT,
  email TEXT,
  matricule_fiscal TEXT,
  rib TEXT,
  banque TEXT,
  site_web TEXT
);

-- Paramètres divers (clé Gemini, etc.)
CREATE TABLE IF NOT EXISTS parametres (
  cle TEXT PRIMARY KEY,
  valeur TEXT
);

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  matricule_fiscal TEXT,
  telephone TEXT,
  email TEXT,
  adresse TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fournisseurs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  matricule_fiscal TEXT,
  telephone TEXT,
  email TEXT,
  adresse TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS factures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero TEXT NOT NULL UNIQUE,
  date TEXT NOT NULL,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  devis_id INTEGER,
  avec_tva INTEGER NOT NULL DEFAULT 1,
  sous_total REAL NOT NULL DEFAULT 0,
  total_tva REAL NOT NULL DEFAULT 0,
  timbre_fiscal REAL NOT NULL DEFAULT 0,
  total_ttc REAL NOT NULL DEFAULT 0,
  statut_paiement TEXT NOT NULL DEFAULT 'impayee' CHECK (statut_paiement IN ('impayee','partiellement_payee','payee')),
  montant_paye REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS facture_lignes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  facture_id INTEGER NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantite REAL NOT NULL DEFAULT 1,
  prix_unitaire REAL NOT NULL DEFAULT 0,
  taux_tva REAL NOT NULL DEFAULT 19,
  total_ligne REAL NOT NULL DEFAULT 0,
  ordre INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS devis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero TEXT NOT NULL UNIQUE,
  date TEXT NOT NULL,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  avec_tva INTEGER NOT NULL DEFAULT 1,
  statut TEXT NOT NULL DEFAULT 'attente' CHECK (statut IN ('attente','validee','annulee')),
  sous_total REAL NOT NULL DEFAULT 0,
  total_tva REAL NOT NULL DEFAULT 0,
  timbre_fiscal REAL NOT NULL DEFAULT 0,
  total_ttc REAL NOT NULL DEFAULT 0,
  notes TEXT,
  facture_id INTEGER REFERENCES factures(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS devis_lignes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  devis_id INTEGER NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantite REAL NOT NULL DEFAULT 1,
  prix_unitaire REAL NOT NULL DEFAULT 0,
  taux_tva REAL NOT NULL DEFAULT 19,
  total_ligne REAL NOT NULL DEFAULT 0,
  ordre INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS paiements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  facture_id INTEGER NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
  montant REAL NOT NULL,
  date TEXT NOT NULL,
  mode_paiement TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS achats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fournisseur_id INTEGER REFERENCES fournisseurs(id),
  fournisseur_nom_libre TEXT,
  numero_facture TEXT,
  date TEXT NOT NULL,
  montant_ht REAL,
  montant_tva REAL,
  montant_ttc REAL NOT NULL DEFAULT 0,
  description TEXT,
  image_path TEXT,
  scan_brut TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
