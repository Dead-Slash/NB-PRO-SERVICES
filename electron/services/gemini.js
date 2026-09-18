const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const MIME_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
};

const PROMPT = `Tu es un assistant qui extrait les informations d'une facture d'achat (photo ou scan) pour une entreprise tunisienne.
Analyse l'image et renvoie UNIQUEMENT un objet JSON valide (sans texte autour, sans balises markdown) avec exactement ces champs :
{
  "fournisseur_nom": string ou null,
  "numero_facture": string ou null,
  "date": string au format YYYY-MM-DD ou null,
  "montant_ht": number ou null,
  "montant_tva": number ou null,
  "montant_ttc": number ou null,
  "description": string courte résumant les articles/services achetés ou null
}
Si une valeur est illisible ou absente, mets null. Les montants doivent être des nombres (pas de texte, pas de symbole monétaire).`;

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1) return text.slice(start, end + 1);
  return text.trim();
}

async function scanFacture(imagePath, apiKey) {
  if (!fs.existsSync(imagePath)) throw new Error('Image introuvable');
  const ext = path.extname(imagePath).toLowerCase();
  const mimeType = MIME_TYPES[ext] || 'image/jpeg';
  const data = fs.readFileSync(imagePath).toString('base64');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

  const result = await model.generateContent([PROMPT, { inlineData: { data, mimeType } }]);
  const text = result.response.text();
  const jsonText = extractJson(text);

  try {
    return JSON.parse(jsonText);
  } catch (err) {
    throw new Error("Impossible d'analyser la réponse de Gemini : " + text.slice(0, 200));
  }
}

module.exports = { scanFacture };
