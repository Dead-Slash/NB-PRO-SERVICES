export function formatMontant(n) {
  const num = Number(n) || 0;
  return num.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' DT';
}

export function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('fr-FR');
}

export const STATUTS_DEVIS = {
  attente: { label: 'En attente', color: '#e6a817' },
  validee: { label: 'Validé', color: '#2e9e4f' },
  annulee: { label: 'Annulé', color: '#c1443c' },
};

export const STATUTS_PAIEMENT = {
  impayee: { label: 'Impayée', color: '#c1443c' },
  partiellement_payee: { label: 'Partiellement payée', color: '#e6a817' },
  payee: { label: 'Payée', color: '#2e9e4f' },
};
