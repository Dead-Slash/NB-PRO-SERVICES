// Même calcul que electron/services/totals.js, pour l'affichage en direct dans les formulaires
export function roundMillimes(n) {
  return Math.round((n + Number.EPSILON) * 1000) / 1000;
}

export function lineTotal(l) {
  return (Number(l.quantite) || 0) * (Number(l.prix_unitaire) || 0);
}

export function computeTotals(lignes, avecTva, timbreFiscal) {
  let sousTotal = 0;
  let totalTva = 0;
  for (const l of lignes) {
    const t = lineTotal(l);
    sousTotal += t;
    if (avecTva) totalTva += t * ((Number(l.taux_tva) || 0) / 100);
  }
  sousTotal = roundMillimes(sousTotal);
  totalTva = roundMillimes(totalTva);
  const timbre = roundMillimes(Number(timbreFiscal) || 0);
  return { sousTotal, totalTva, timbre, totalTtc: roundMillimes(sousTotal + totalTva + timbre) };
}
