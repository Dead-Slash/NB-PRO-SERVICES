const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { getDataDir } = require('../db/database');
const settingsRepo = require('../db/repositories/settings');
const devisRepo = require('../db/repositories/devis');
const facturesRepo = require('../db/repositories/factures');

const NAVY = '#0a0a8c';
const TINT = '#e9ecf8'; // bleu très clair (bandeaux, lignes alternées)
const GRID = '#b8bfd9';
const TEXT = '#111';
const MUTED = '#555';

const LEFT = 30;
const RIGHT = 565;
const WIDTH = RIGHT - LEFT;
const FOOTER_RULE = 766; // trait au-dessus du pied de page
const CONTENT_BOTTOM = 756; // rien ne doit dépasser cette limite

function getExportDir() {
  const dir = path.join(getDataDir(), 'documents');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Montant au format du modèle : 1.608.750 (milliers et millimes séparés par un point)
function fmt(n) {
  const [ent, dec] = (Number(n) || 0).toFixed(3).split('.');
  const neg = ent.startsWith('-');
  const digits = neg ? ent.slice(1) : ent;
  return (neg ? '-' : '') + digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '.' + dec;
}

function fmtQte(n) {
  const num = Number(n) || 0;
  return Number.isInteger(num) ? String(num) : String(num).replace('.', ',');
}

// Date ISO (AAAA-MM-JJ) -> JJ/MM/AAAA
function fmtDate(d) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d || '';
}

// --- Montant en toutes lettres (français) ---
const UNITES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
  'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize'];
const DIZAINES = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

function moinsDeCent(n) {
  if (n <= 16) return UNITES[n];
  if (n < 20) return 'dix-' + UNITES[n - 10];
  const d = Math.floor(n / 10);
  let u = n % 10;
  if (d === 7 || d === 9) u += 10; // soixante-dix, quatre-vingt-dix...
  if (u === 0) return d === 8 ? 'quatre-vingts' : DIZAINES[d];
  if ((u === 1 || u === 11) && d !== 8 && d !== 9) return `${DIZAINES[d]} et ${UNITES[u]}`;
  return `${DIZAINES[d]}-${moinsDeCent(u)}`;
}

function moinsDeMille(n) {
  const c = Math.floor(n / 100);
  const r = n % 100;
  if (c === 0) return moinsDeCent(r);
  const cent = c === 1 ? 'cent' : `${UNITES[c]} cent${r === 0 ? 's' : ''}`;
  return r === 0 ? cent : `${cent} ${moinsDeCent(r)}`;
}

function enLettres(n) {
  if (n === 0) return 'zéro';
  const parts = [];
  const milliards = Math.floor(n / 1e9);
  const millions = Math.floor((n % 1e9) / 1e6);
  const milliers = Math.floor((n % 1e6) / 1000);
  const reste = n % 1000;
  if (milliards) parts.push(`${moinsDeMille(milliards)} milliard${milliards > 1 ? 's' : ''}`);
  if (millions) parts.push(`${moinsDeMille(millions)} million${millions > 1 ? 's' : ''}`);
  if (milliers) parts.push(milliers === 1 ? 'mille' : `${moinsDeMille(milliers).replace(/cents$/, 'cent')} mille`);
  if (reste) parts.push(moinsDeMille(reste));
  return parts.join(' ');
}

function montantEnLettres(montant) {
  // même arrondi que fmt() pour que le texte corresponde au Total TTC affiché
  const [ent, dec] = (Number(montant) || 0).toFixed(3).split('.');
  const dinars = Math.abs(parseInt(ent, 10));
  const millimes = parseInt(dec, 10);
  const de = dinars >= 1e6 && dinars % 1e6 === 0 ? 'de ' : ''; // un million de dinars
  let txt = `${enLettres(dinars)} ${de}dinar${dinars > 1 ? 's' : ''}`;
  if (millimes) txt += ` et ${millimes} millime${millimes > 1 ? 's' : ''}`;
  return txt.toUpperCase();
}

// --- En-tête (1re page) : logo + nom de la société, puis bloc document / client ---
function drawTitle(doc, societe) {
  if (societe.logo_path && fs.existsSync(societe.logo_path)) {
    try {
      doc.image(societe.logo_path, LEFT, 26, { fit: [60, 60] });
    } catch (e) {
      // logo illisible, on continue sans bloquer la génération
    }
  }
  doc.font('Helvetica-Bold').fontSize(30).fillColor(NAVY)
    .text(societe.nom, LEFT, 40, { width: WIDTH, align: 'center', lineBreak: false });
  doc.lineWidth(2).strokeColor(NAVY).moveTo(LEFT, 82).lineTo(RIGHT, 82).stroke();
  doc.lineWidth(0.5).moveTo(LEFT, 85).lineTo(RIGHT, 85).stroke();
}

function drawDocInfo(doc, typeLabel, numero, date) {
  const x = LEFT, y = 102, w = 240;
  doc.rect(x, y, w, 24).fill(NAVY);
  doc.font('Helvetica-Bold').fontSize(14).fillColor('#fff')
    .text(typeLabel, x, y + 6, { width: w, align: 'center', characterSpacing: 2 });

  const rows = [['N°', numero], ['Date', fmtDate(date)]];
  let ry = y + 24;
  for (const [label, value] of rows) {
    doc.lineWidth(0.8).strokeColor(NAVY).rect(x, ry, w, 22).stroke();
    doc.moveTo(x + 70, ry).lineTo(x + 70, ry + 22).stroke();
    doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY).text(label, x + 8, ry + 7, { width: 60 });
    doc.font('Helvetica-Bold').fontSize(11).fillColor(TEXT).text(value, x + 78, ry + 6, { width: w - 86, lineBreak: false });
    ry += 22;
  }
  return ry;
}

function drawClientBox(doc, client) {
  const x = 305, y = 102, w = RIGHT - 305;
  const details = [];
  if (client?.adresse) details.push(`Adresse : ${client.adresse}`);
  if (client?.matricule_fiscal) details.push(`MF : ${client.matricule_fiscal}`);
  if (client?.telephone) details.push(`Tél : ${client.telephone}`);

  doc.rect(x, y, w, 20).fill(TINT);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(NAVY).text('CLIENT', x + 10, y + 6, { characterSpacing: 1.5 });

  let ty = y + 28;
  doc.font('Helvetica-Bold').fontSize(13).fillColor(TEXT).text(client?.nom || '—', x + 10, ty, { width: w - 20 });
  ty = doc.y + 3;
  doc.font('Helvetica').fontSize(10).fillColor(MUTED);
  for (const l of details) {
    doc.text(l, x + 10, ty, { width: w - 20 });
    ty = doc.y + 2;
  }
  const bottom = Math.max(ty + 6, y + 68);
  doc.lineWidth(0.8).strokeColor(NAVY).rect(x, y, w, bottom - y).stroke();
  return bottom;
}

// En-tête réduit des pages suivantes
function drawContinuationHeader(doc, societe, typeLabel, numero) {
  doc.font('Helvetica-Bold').fontSize(13).fillColor(NAVY).text(societe.nom, LEFT, 32, { lineBreak: false });
  doc.font('Helvetica').fontSize(10).fillColor(MUTED)
    .text(`${typeLabel} N° ${numero} (suite)`, LEFT, 35, { width: WIDTH, align: 'right', lineBreak: false });
  doc.lineWidth(1).strokeColor(NAVY).moveTo(LEFT, 52).lineTo(RIGHT, 52).stroke();
  return 64;
}

// --- Tableau des lignes ---
function tableColumns(avecTva) {
  const cols = avecTva
    ? [
      { key: 'desc', label: 'Désignations', w: 215, align: 'left' },
      { key: 'qte', label: 'Qte', w: 40, align: 'center' },
      { key: 'pu', label: 'P.U.HT', w: 95, align: 'right' },
      { key: 'tva', label: 'TVA', w: 55, align: 'center' },
      { key: 'total', label: 'Total HT', w: 130, align: 'right' },
    ]
    : [
      { key: 'desc', label: 'Désignations', w: 270, align: 'left' },
      { key: 'qte', label: 'Qte', w: 40, align: 'center' },
      { key: 'pu', label: 'P.U.HT', w: 95, align: 'right' },
      { key: 'total', label: 'Total HT', w: 130, align: 'right' },
    ];
  let x = LEFT;
  for (const c of cols) {
    c.x = x;
    x += c.w;
  }
  return cols;
}

const HEADER_H = 24;
const PAD_X = 8;
const PAD_Y = 5;

function drawTableHeader(doc, cols, y) {
  doc.rect(LEFT, y, WIDTH, HEADER_H).fill(NAVY);
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#fff');
  for (const c of cols) doc.text(c.label, c.x + PAD_X, y + 8, { width: c.w - 2 * PAD_X, align: c.align === 'left' ? 'left' : 'center' });
  return y + HEADER_H;
}

function drawTableFrame(doc, cols, top, bottom) {
  doc.lineWidth(0.6).strokeColor(GRID);
  for (const c of cols.slice(1)) doc.moveTo(c.x, top).lineTo(c.x, bottom).stroke();
  doc.lineWidth(0.8).strokeColor(NAVY).rect(LEFT, top - HEADER_H, WIDTH, bottom - top + HEADER_H).stroke();
}

function rowHeight(doc, cols, l) {
  doc.font('Helvetica').fontSize(10);
  const descH = doc.heightOfString(l.description || ' ', { width: cols[0].w - 2 * PAD_X });
  return Math.max(descH, 12) + 2 * PAD_Y;
}

function drawRow(doc, cols, l, y, h, shaded, avecTva) {
  if (shaded) doc.rect(LEFT, y, WIDTH, h).fill(TINT);
  const values = {
    desc: l.description || '',
    qte: fmtQte(l.quantite),
    pu: fmt(l.prix_unitaire),
    tva: avecTva ? `${fmtQte(l.taux_tva)}%` : '',
    total: fmt(l.total_ligne),
  };
  doc.font('Helvetica').fontSize(10).fillColor(TEXT);
  for (const c of cols) {
    doc.text(values[c.key], c.x + PAD_X, y + PAD_Y, { width: c.w - 2 * PAD_X, align: c.align });
  }
}

// --- Totaux, montant en lettres, signature ---
function totalsRows({ sousTotal, totalTva, timbre, avecTva }) {
  const rows = [['Total HT', sousTotal]];
  if (avecTva) rows.push(['Total TVA', totalTva]);
  rows.push(['Timbre Fiscal', timbre]);
  return rows;
}

const TOTAL_ROW_H = 20;
const SIGN_H = 62;
const TOTALS_W = 230; // largeur du bloc des totaux (aligné à droite)
const TOTALS_LABEL_W = 105;

function bottomBlockHeight(nbRows) {
  return 10 + (nbRows + 1) * TOTAL_ROW_H + 14 + SIGN_H;
}

function drawBottomBlock(doc, y, data, arreteLabel, notes) {
  const tx = RIGHT - TOTALS_W;
  const tw = TOTALS_W;
  const vx = tx + TOTALS_LABEL_W;
  const vw = tw - TOTALS_LABEL_W - PAD_X;
  const rows = totalsRows(data);
  let ty = y + 10;

  doc.lineWidth(0.6).strokeColor(GRID);
  for (const [label, value] of rows) {
    doc.rect(tx, ty, tw, TOTAL_ROW_H).stroke();
    doc.font('Helvetica-Bold').fontSize(10).fillColor(TEXT).text(label, tx + PAD_X, ty + 6, { width: TOTALS_LABEL_W - PAD_X, lineBreak: false });
    doc.font('Helvetica').fontSize(10).text(fmt(value), vx, ty + 6, { width: vw, align: 'right', lineBreak: false });
    ty += TOTAL_ROW_H;
  }
  doc.rect(tx, ty, tw, TOTAL_ROW_H + 2).fill(NAVY);
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#fff').text('Total TTC', tx + PAD_X, ty + 6, { width: TOTALS_LABEL_W - PAD_X, lineBreak: false });
  doc.text(`${fmt(data.totalTtc)} DT`, vx - 10, ty + 6, { width: vw + 10, align: 'right', lineBreak: false });
  const totalsBottom = ty + TOTAL_ROW_H + 2;

  // Montant en lettres, à gauche des totaux
  const wx = LEFT, ww = tx - LEFT - 14;
  doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(`${arreteLabel} à la somme de :`, wx + 10, y + 18, { width: ww - 20 });
  doc.font('Helvetica-Bold').fontSize(10).fillColor(TEXT).text(montantEnLettres(data.totalTtc), wx + 10, doc.y + 4, { width: ww - 20 });
  const wordsBottom = Math.max(doc.y + 8, totalsBottom);
  doc.lineWidth(0.8).strokeColor(NAVY).rect(wx, y + 10, ww, wordsBottom - y - 10).stroke();

  // Cachet & signature à droite, notes à gauche
  const sy = Math.max(wordsBottom, totalsBottom) + 14;
  doc.font('Helvetica-Bold').fontSize(9).fillColor(NAVY).text('Cachet et signature', tx, sy, { width: tw, align: 'center' });
  doc.lineWidth(0.6).strokeColor(GRID).dash(3, { space: 3 }).rect(tx, sy + 13, tw, SIGN_H - 18).stroke().undash();

  if (notes) {
    doc.font('Helvetica-Bold').fontSize(9).fillColor(NAVY).text('Notes', wx, sy, { width: ww });
    doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(notes, wx, sy + 13, {
      width: ww,
      height: Math.max(CONTENT_BOTTOM - sy - 13, 10),
      ellipsis: true,
    });
  }
}

// --- Pied de page (toutes les pages) ---
function drawFooter(doc, societe, pageIndex, pageCount) {
  const lignes = [];
  const l1 = [];
  if (societe.matricule_fiscal) l1.push(`Code TVA : ${societe.matricule_fiscal}`);
  if (societe.rib) l1.push(`RIB : ${societe.rib}${societe.banque ? ' (' + societe.banque + ')' : ''}`);
  if (l1.length) lignes.push(l1.join('   /   '));
  if (societe.adresse) lignes.push(`Adresse : ${societe.adresse.replace(/\s*\n\s*/g, ', ')}`);
  const l3 = [];
  if (societe.telephone) l3.push(`Tél/Fax : ${societe.telephone}`);
  if (societe.email) l3.push(`E-mail : ${societe.email}`);
  if (societe.site_web) l3.push(societe.site_web);
  if (l3.length) lignes.push(l3.join('   –   '));

  // on dessine sous la marge basse : on la neutralise pour éviter qu'un texte
  // proche du bord ne déclenche une page blanche supplémentaire
  const savedMargin = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;

  doc.lineWidth(1).strokeColor(NAVY).moveTo(LEFT, FOOTER_RULE).lineTo(RIGHT, FOOTER_RULE).stroke();
  doc.font('Helvetica-Bold').fontSize(9).fillColor(NAVY);
  let y = FOOTER_RULE + 7;
  for (const l of lignes.slice(0, 3)) {
    doc.text(l, LEFT, y, { width: WIDTH, align: 'center', lineBreak: false, ellipsis: true, height: 12 });
    y += 13;
  }
  if (pageCount > 1) {
    doc.font('Helvetica').fontSize(8).fillColor(MUTED)
      .text(`Page ${pageIndex + 1} / ${pageCount}`, LEFT, 822, { width: WIDTH, align: 'right', lineBreak: false });
  }

  doc.page.margins.bottom = savedMargin;
  doc.fillColor(TEXT);
}

function renderDocument({ typeLabel, arreteLabel, numero, date, societe, client, lignes, avecTva, sousTotal, totalTva, timbre, totalTtc, notes }) {
  const doc = new PDFDocument({ size: 'A4', margin: 30, bufferPages: true, info: { Title: `${typeLabel} ${numero}`, Author: societe.nom } });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));

  const data = { sousTotal, totalTva, timbre: timbre || 0, totalTtc, avecTva };
  const cols = tableColumns(avecTva);
  const blockH = bottomBlockHeight(totalsRows(data).length);

  drawTitle(doc, societe);
  const infoBottom = drawDocInfo(doc, typeLabel, numero, date);
  const clientBottom = drawClientBox(doc, client);

  let bodyTop = drawTableHeader(doc, cols, Math.max(infoBottom, clientBottom) + 16);
  let y = bodyTop;
  const items = lignes.length ? lignes : [{ description: '', quantite: '', prix_unitaire: 0, total_ligne: 0 }];

  items.forEach((l, i) => {
    const h = rowHeight(doc, cols, l);
    // la dernière ligne doit tenir avec le bloc des totaux ; on ne change de page
    // que si c'est réellement nécessaire
    const limit = i === items.length - 1 ? CONTENT_BOTTOM - blockH : CONTENT_BOTTOM;
    if (y + h > limit && y > bodyTop) {
      drawTableFrame(doc, cols, bodyTop, y);
      doc.addPage();
      bodyTop = drawTableHeader(doc, cols, drawContinuationHeader(doc, societe, typeLabel, numero));
      y = bodyTop;
    }
    drawRow(doc, cols, l, y, h, i % 2 === 1, avecTva);
    y += h;
  });

  // le tableau s'étire jusqu'au bloc des totaux, comme sur le modèle
  const tableBottom = Math.max(y, CONTENT_BOTTOM - blockH);
  drawTableFrame(doc, cols, bodyTop, tableBottom);
  drawBottomBlock(doc, tableBottom, data, arreteLabel, notes);

  const pageRange = doc.bufferedPageRange();
  for (let i = 0; i < pageRange.count; i++) {
    doc.switchToPage(pageRange.start + i);
    drawFooter(doc, societe, i, pageRange.count);
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
    arreteLabel: 'Arrêté le présent devis',
    numero: devisData.numero,
    date: devisData.date,
    societe,
    client: devisData.client,
    lignes: devisData.lignes,
    avecTva: !!devisData.avec_tva,
    sousTotal: devisData.sous_total,
    totalTva: devisData.total_tva,
    timbre: devisData.timbre_fiscal,
    totalTtc: devisData.total_ttc,
    notes: devisData.notes,
  });
  const filePath = path.join(getExportDir(), `devis_${devisData.numero.replace(/[^\w-]/g, '_')}.pdf`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

async function generateFacturePdf(db, id) {
  const factureData = facturesRepo.get(db, id);
  if (!factureData) throw new Error('Facture introuvable');
  const societe = settingsRepo.get(db);
  const buffer = await renderDocument({
    typeLabel: 'FACTURE',
    arreteLabel: 'Arrêtée la présente facture',
    numero: factureData.numero,
    date: factureData.date,
    societe,
    client: factureData.client,
    lignes: factureData.lignes,
    avecTva: !!factureData.avec_tva,
    sousTotal: factureData.sous_total,
    totalTva: factureData.total_tva,
    timbre: factureData.timbre_fiscal,
    totalTtc: factureData.total_ttc,
    notes: factureData.notes,
  });
  const filePath = path.join(getExportDir(), `facture_${factureData.numero.replace(/[^\w-]/g, '_')}.pdf`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

module.exports = { generateDevisPdf, generateFacturePdf, renderDocument, montantEnLettres };
