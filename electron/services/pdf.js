const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { getDataDir } = require('../db/database');
const settingsRepo = require('../db/repositories/settings');
const devisRepo = require('../db/repositories/devis');
const facturesRepo = require('../db/repositories/factures');
const { formatMontant } = require('./format');

function getExportDir() {
  const dir = path.join(getDataDir(), 'documents');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function labelStatutDevis(statut) {
  return { attente: 'En attente', validee: 'Validé', annulee: 'Annulé' }[statut] || statut;
}

// --- Mise en page façon "modèle tunisien" : logo + nom en haut à gauche, ---
// --- titre/numéro/date en haut à droite, infos société en pied de page. ---
function drawHeader(doc, societe, typeLabel, numero, date) {
  const startY = 40;
  if (societe.logo_path && fs.existsSync(societe.logo_path)) {
    try {
      doc.image(societe.logo_path, 40, startY, { fit: [70, 70] });
    } catch (e) {
      // logo illisible, on continue sans bloquer la génération
    }
  }
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#000').text(societe.nom || '', 120, startY + 5, { width: 280 });
  doc.fontSize(9).font('Helvetica');
  let infoY = startY + 26;
  if (societe.adresse) {
    doc.text(societe.adresse, 120, infoY, { width: 280 });
    infoY += 12;
  }
  if (societe.matricule_fiscal) {
    doc.text(`MF : ${societe.matricule_fiscal}`, 120, infoY, { width: 280 });
  }

  doc.fontSize(16).font('Helvetica-Bold').text(typeLabel, 350, startY, { width: 205, align: 'right' });
  doc.fontSize(10).font('Helvetica');
  doc.text(`N° : ${numero}`, 350, startY + 22, { width: 205, align: 'right' });
  doc.text(`Date : ${date}`, 350, startY + 36, { width: 205, align: 'right' });

  doc.moveTo(40, 120).lineTo(555, 120).lineWidth(1).strokeColor('#999').stroke();
}

function drawClient(doc, client) {
  let y = 135;
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#000').text('Client :', 40, y);
  y += 14;
  doc.font('Helvetica').fontSize(10);
  doc.text(client?.nom || '—', 40, y);
  y += 13;
  if (client?.matricule_fiscal) {
    doc.text(`MF : ${client.matricule_fiscal}`, 40, y);
    y += 13;
  }
  if (client?.telephone) {
    doc.text(`Tél : ${client.telephone}`, 40, y);
    y += 13;
  }
  if (client?.adresse) {
    doc.text(client.adresse, 40, y, { width: 260 });
    y += 13;
  }
  return Math.max(y, 200);
}

function drawTable(doc, startY, lignes, avecTva) {
  let y = startY + 15;
  const col = avecTva
    ? { desc: 40, qte: 300, pu: 350, tva: 420, total: 470 }
    : { desc: 40, qte: 340, pu: 400, total: 470 };

  doc.font('Helvetica-Bold').fontSize(9);
  doc.text('Description', col.desc, y);
  doc.text('Qté', col.qte, y);
  doc.text('P.U.', col.pu, y);
  if (avecTva) doc.text('TVA %', col.tva, y);
  doc.text('Total', col.total, y);
  y += 14;
  doc.moveTo(40, y).lineTo(555, y).strokeColor('#ccc').stroke();
  y += 6;

  doc.font('Helvetica').fontSize(9);
  for (const l of lignes) {
    if (y > 700) {
      doc.addPage();
      y = 40;
    }
    doc.text(l.description, col.desc, y, { width: avecTva ? 250 : 290 });
    doc.text(String(l.quantite), col.qte, y);
    doc.text(formatMontant(l.prix_unitaire), col.pu, y);
    if (avecTva) doc.text(`${l.taux_tva}%`, col.tva, y);
    doc.text(formatMontant(l.total_ligne), col.total, y);
    y += 18;
  }
  return y;
}

function drawTotals(doc, startY, { sousTotal, totalTva, totalTtc, avecTva }) {
  let y = startY + 10;
  doc.moveTo(330, y).lineTo(555, y).strokeColor('#999').stroke();
  y += 8;
  doc.font('Helvetica').fontSize(10).fillColor('#000');
  doc.text('Sous-total HT :', 330, y, { width: 130 });
  doc.text(formatMontant(sousTotal), 460, y, { width: 95, align: 'right' });
  y += 16;
  if (avecTva) {
    doc.text('Total TVA :', 330, y, { width: 130 });
    doc.text(formatMontant(totalTva), 460, y, { width: 95, align: 'right' });
    y += 16;
  }
  doc.font('Helvetica-Bold').fontSize(11);
  doc.text('Total TTC :', 330, y, { width: 130 });
  doc.text(formatMontant(totalTtc), 460, y, { width: 95, align: 'right' });
  return y + 20;
}

function drawFooter(doc, societe) {
  const y = doc.page.height - 70;
  doc.moveTo(40, y).lineTo(555, y).strokeColor('#999').stroke();
  const parts = [];
  if (societe.telephone) parts.push(`Tél : ${societe.telephone}`);
  if (societe.email) parts.push(`Email : ${societe.email}`);
  if (societe.matricule_fiscal) parts.push(`MF : ${societe.matricule_fiscal}`);
  if (societe.rib) parts.push(`RIB : ${societe.rib}${societe.banque ? ' (' + societe.banque + ')' : ''}`);
  doc.fontSize(8).font('Helvetica').fillColor('#333').text(parts.join('   |   '), 40, y + 8, { width: 515, align: 'center' });
  if (societe.adresse) {
    doc.text(societe.adresse, 40, y + 20, { width: 515, align: 'center' });
  }
}

function renderDocument({ typeLabel, numero, date, societe, client, lignes, avecTva, sousTotal, totalTva, totalTtc, notes, extraLines }) {
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));

  drawHeader(doc, societe, typeLabel, numero, date);
  const clientBottom = drawClient(doc, client);
  const tableBottom = drawTable(doc, clientBottom, lignes, avecTva);
  let y = drawTotals(doc, tableBottom, { sousTotal, totalTva, totalTtc, avecTva });

  if (extraLines?.length) {
    doc.font('Helvetica').fontSize(9);
    for (const line of extraLines) {
      y += 14;
      doc.text(line, 330, y, { width: 225, align: 'right' });
    }
  }

  if (notes) {
    doc.font('Helvetica-Oblique').fontSize(9).text(`Notes : ${notes}`, 40, y + 20, { width: 350 });
  }

  const pageRange = doc.bufferedPageRange();
  for (let i = 0; i < pageRange.count; i++) {
    doc.switchToPage(pageRange.start + i);
    drawFooter(doc, societe);
  }

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

async function generateDevisPdf(db, id) {
  const devisData = devisRepo.get(db, id);
  if (!devisData) throw new Error('Devis introuvable');
  const societe = settingsRepo.get(db);
  const buffer = await renderDocument({
    typeLabel: 'DEVIS',
    numero: devisData.numero,
    date: devisData.date,
    societe,
    client: devisData.client,
    lignes: devisData.lignes,
    avecTva: !!devisData.avec_tva,
    sousTotal: devisData.sous_total,
    totalTva: devisData.total_tva,
    totalTtc: devisData.total_ttc,
    notes: devisData.notes,
    extraLines: [`Statut : ${labelStatutDevis(devisData.statut)}`],
  });
  const filePath = path.join(getExportDir(), `devis_${devisData.numero.replace(/[^\w-]/g, '_')}.pdf`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

async function generateFacturePdf(db, id) {
  const factureData = facturesRepo.get(db, id);
  if (!factureData) throw new Error('Facture introuvable');
  const societe = settingsRepo.get(db);
  const reste = factureData.total_ttc - factureData.montant_paye;
  const buffer = await renderDocument({
    typeLabel: 'FACTURE',
    numero: factureData.numero,
    date: factureData.date,
    societe,
    client: factureData.client,
    lignes: factureData.lignes,
    avecTva: !!factureData.avec_tva,
    sousTotal: factureData.sous_total,
    totalTva: factureData.total_tva,
    totalTtc: factureData.total_ttc,
    notes: factureData.notes,
    extraLines: [`Montant payé : ${formatMontant(factureData.montant_paye)}`, `Reste à payer : ${formatMontant(reste)}`],
  });
  const filePath = path.join(getExportDir(), `facture_${factureData.numero.replace(/[^\w-]/g, '_')}.pdf`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

module.exports = { generateDevisPdf, generateFacturePdf };
