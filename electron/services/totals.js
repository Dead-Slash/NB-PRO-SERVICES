function computeTotals(lignes, avecTva) {
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
  return { computedLignes, sousTotal, totalTva, totalTtc: sousTotal + totalTva };
}

module.exports = { computeTotals };
