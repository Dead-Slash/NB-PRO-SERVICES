const { ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { getDb, getUploadsDir } = require('./db/database');
const clients = require('./db/repositories/clients');
const fournisseurs = require('./db/repositories/fournisseurs');
const devis = require('./db/repositories/devis');
const factures = require('./db/repositories/factures');
const achats = require('./db/repositories/achats');
const settingsRepo = require('./db/repositories/settings');
const dashboard = require('./db/repositories/dashboard');
const { scanFacture } = require('./services/gemini');
const { generateDevisPdf, generateFacturePdf } = require('./services/pdf');

const MIME_TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

function registerIpcHandlers() {
  const db = getDb();

  // Clients
  ipcMain.handle('clients:list', (e, search) => clients.list(db, search));
  ipcMain.handle('clients:get', (e, id) => clients.get(db, id));
  ipcMain.handle('clients:create', (e, data) => clients.create(db, data));
  ipcMain.handle('clients:update', (e, id, data) => clients.update(db, id, data));
  ipcMain.handle('clients:remove', (e, id) => clients.remove(db, id));

  // Fournisseurs
  ipcMain.handle('fournisseurs:list', (e, search) => fournisseurs.list(db, search));
  ipcMain.handle('fournisseurs:get', (e, id) => fournisseurs.get(db, id));
  ipcMain.handle('fournisseurs:create', (e, data) => fournisseurs.create(db, data));
  ipcMain.handle('fournisseurs:update', (e, id, data) => fournisseurs.update(db, id, data));
  ipcMain.handle('fournisseurs:remove', (e, id) => fournisseurs.remove(db, id));

  // Devis
  ipcMain.handle('devis:list', (e, filters) => devis.list(db, filters));
  ipcMain.handle('devis:get', (e, id) => devis.get(db, id));
  ipcMain.handle('devis:create', (e, data) => devis.create(db, data));
  ipcMain.handle('devis:update', (e, id, data) => devis.update(db, id, data));
  ipcMain.handle('devis:updateStatut', (e, id, statut) => devis.updateStatut(db, id, statut));
  ipcMain.handle('devis:remove', (e, id) => devis.remove(db, id));
  ipcMain.handle('devis:print', async (e, id) => {
    const filePath = await generateDevisPdf(db, id);
    shell.openPath(filePath);
    return filePath;
  });

  // Factures
  ipcMain.handle('factures:list', (e, filters) => factures.list(db, filters));
  ipcMain.handle('factures:get', (e, id) => factures.get(db, id));
  ipcMain.handle('factures:create', (e, data) => factures.create(db, data));
  ipcMain.handle('factures:update', (e, id, data) => factures.update(db, id, data));
  ipcMain.handle('factures:addPaiement', (e, id, paiement) => factures.addPaiement(db, id, paiement));
  ipcMain.handle('factures:remove', (e, id) => factures.remove(db, id));
  ipcMain.handle('factures:print', async (e, id) => {
    const filePath = await generateFacturePdf(db, id);
    shell.openPath(filePath);
    return filePath;
  });

  // Achats
  ipcMain.handle('achats:list', (e, filters) => achats.list(db, filters));
  ipcMain.handle('achats:get', (e, id) => achats.get(db, id));
  ipcMain.handle('achats:create', (e, data) => achats.create(db, data));
  ipcMain.handle('achats:update', (e, id, data) => achats.update(db, id, data));
  ipcMain.handle('achats:remove', (e, id) => achats.remove(db, id));
  ipcMain.handle('achats:selectImage', async () => {
    const res = await dialog.showOpenDialog({
      title: "Choisir une image de facture d'achat",
      properties: ['openFile'],
      filters: [{ name: 'Images / PDF', extensions: ['png', 'jpg', 'jpeg', 'webp', 'pdf'] }],
    });
    if (res.canceled || !res.filePaths.length) return null;
    const src = res.filePaths[0];
    const destName = `${Date.now()}_${path.basename(src)}`;
    const dest = path.join(getUploadsDir(), destName);
    fs.copyFileSync(src, dest);
    return dest;
  });
  ipcMain.handle('achats:scan', async (e, imagePath) => {
    const apiKey = settingsRepo.getGeminiKey(db);
    if (!apiKey) throw new Error('Clé API Gemini non configurée. Ajoutez-la dans Paramètres.');
    return scanFacture(imagePath, apiKey);
  });

  // Dashboard
  ipcMain.handle('dashboard:summary', (e, filters) => dashboard.summary(db, filters));

  // Settings
  ipcMain.handle('settings:get', () => settingsRepo.get(db));
  ipcMain.handle('settings:update', (e, data) => settingsRepo.update(db, data));
  ipcMain.handle('settings:getGeminiKey', () => settingsRepo.getGeminiKey(db));
  ipcMain.handle('settings:setGeminiKey', (e, key) => settingsRepo.setGeminiKey(db, key));
  ipcMain.handle('settings:selectLogo', async () => {
    const res = await dialog.showOpenDialog({
      title: 'Choisir un logo',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'svg'] }],
    });
    if (res.canceled || !res.filePaths.length) return null;
    const src = res.filePaths[0];
    const dest = path.join(getUploadsDir(), `logo_${Date.now()}${path.extname(src)}`);
    fs.copyFileSync(src, dest);
    return dest;
  });

  // Fichiers
  ipcMain.handle('files:openPath', (e, p) => shell.openPath(p));
  ipcMain.handle('files:readAsDataUrl', (e, filePath) => {
    if (!filePath || !fs.existsSync(filePath)) return null;
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    const data = fs.readFileSync(filePath).toString('base64');
    return `data:${mime};base64,${data}`;
  });
}

module.exports = { registerIpcHandlers };
