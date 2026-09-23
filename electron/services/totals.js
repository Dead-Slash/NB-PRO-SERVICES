function computeTotals(lignes, avecTva, timbreFiscal = 0) {
  let sousTotal = 0;
  let totalTva = 0;
  const computedLignes = (lignes || []).map((l, idx) => {
    const quantite = Number(l.quantite) || 0;
    const prixUnitaire = Number(l.prix_unitaire) || 0;
    const tauxTva = avecTva ? (Number(l.taux_tva) || 0) : 0;
    const totalLigne = quantite * prixUnitaire;
    sousTotal += totalLigne;
    totalTva += totalLigne * (tauxTva / 100);
    return {
      description: l.description,
      quantite,
      prix_unitaire: prixUnitaire,
      taux_tva: tauxTva,
      total_ligne: totalLigne,
      ordre: idx,
    };
  });
  // arrondi au millime pour que Total HT + TVA + timbre = Total TTC sur le document imprimé
  sousTotal = roundMillimes(sousTotal);
  totalTva = roundMillimes(totalTva);
  const timbre = roundMillimes(Number(timbreFiscal) || 0);
  return { computedLignes, sousTotal, totalTva, timbre, totalTtc: roundMillimes(sousTotal + totalTva + timbre) };
}

function roundMillimes(n) {
  return Math.round((n + Number.EPSILON) * 1000) / 1000;
}

module.exports = { computeTotals };
