const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { app } = require('electron');

let db;

function getDataDir() {
  const dir = app.isPackaged
    ? app.getPath('userData')
    : path.join(__dirname, '..', '..', 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getUploadsDir() {
  const dir = path.join(getDataDir(), 'uploads');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getDb() {
  if (db) return db;
  const dbPath = path.join(getDataDir(), 'nbpro.db');
  db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);

  const existing = db.prepare('SELECT COUNT(*) AS n FROM societe').get();
  if (existing.n === 0) {
    db.prepare(`
      INSERT INTO societe (id, nom, telephone, email, adresse, matricule_fiscal, rib)
      VALUES (1, ?, ?, ?, ?, ?, ?)
    `).run(
      'NB PRO SERVICES',
      '+216 22417780',
      null,
      '43 rue de l\'énergie, 2035 Charguia 1, Tunis',
      '000CA19957888L',
      '25149000000165954869'
    );
  }
  return db;
}

module.exports = { getDb, getDataDir, getUploadsDir };
