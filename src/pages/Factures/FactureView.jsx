import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { formatMontant, formatDate, STATUTS_PAIEMENT } from '../../lib/format.js';

export default function FactureViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [facture, setFacture] = useState(null);
  const [paiement, setPaiement] = useState({ montant: '', date: new Date().toISOString().slice(0, 10), mode_paiement: 'Espèces' });
  const [error, setError] = useState('');

  function load() {
    api.factures.get(Number(id)).then(setFacture).catch((e) => setError(e.message));
  }

  useEffect(() => { load(); }, [id]);

  async function addPaiement(e) {
    e.preventDefault();
    setError('');
    try {
      await api.factures.addPaiement(Number(id), paiement);
      setPaiement({ montant: '', date: new Date().toISOString().slice(0, 10), mode_paiement: 'Espèces' });
      load();
    } catch (err) { setError(err.message); }
  }

  async function print() {
    try { await api.factures.print(Number(id)); } catch (err) { setError(err.message); }
  }

  if (!facture) return <div className="page">{error || 'Chargement...'}</div>;

  const reste = facture.total_ttc - facture.montant_paye;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Facture {facture.numero}</h1>
        <div>
          <button className="btn-secondary" onClick={() => navigate('/factures')}>Retour</button>
          <button className="btn" onClick={print}>Imprimer</button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="grid-2">
        <div>
          <p><strong>Client :</strong> {facture.client?.nom}</p>
          <p><strong>Date :</strong> {formatDate(facture.date)}</p>
          <span className="badge" style={{ background: STATUTS_PAIEMENT[facture.statut_paiement].color }}>{STATUTS_PAIEMENT[facture.statut_paiement].label}</span>
        </div>
        <div className="totals-box">
          <div>Sous-total HT : {formatMontant(facture.sous_total)}</div>
          {!!facture.avec_tva && <div>Total TVA : {formatMontant(facture.total_tva)}</div>}
          <div className="bold">Total TTC : {formatMontant(facture.total_ttc)}</div>
          <div>Payé : {formatMontant(facture.montant_paye)}</div>
          <div className="bold">Reste à payer : {formatMontant(reste)}</div>
        </div>
      </div>

      <table className="table">
        <thead><tr><th>Description</th><th>Qté</th><th>P.U.</th>{!!facture.avec_tva && <th>TVA %</th>}<th>Total</th></tr></thead>
        <tbody>
          {facture.lignes.map((l) => (
            <tr key={l.id}>
              <td>{l.description}</td>
              <td>{l.quantite}</td>
              <td>{formatMontant(l.prix_unitaire)}</td>
              {!!facture.avec_tva && <td>{l.taux_tva}%</td>}
              <td>{formatMontant(l.total_ligne)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Paiements</h2>
      <table className="table">
        <thead><tr><th>Date</th><th>Montant</th><th>Mode</th><th>Notes</th></tr></thead>
        <tbody>
          {facture.paiements.map((p) => (
            <tr key={p.id}><td>{formatDate(p.date)}</td><td>{formatMontant(p.montant)}</td><td>{p.mode_paiement}</td><td>{p.notes}</td></tr>
          ))}
          {facture.paiements.length === 0 && <tr><td colSpan={4}>Aucun paiement enregistré.</td></tr>}
        </tbody>
      </table>

      {reste > 0 && (
        <form className="form-row" onSubmit={addPaiement}>
          <label>Montant<input type="number" step="0.001" className="input small" required value={paiement.montant} onChange={(e) => setPaiement({ ...paiement, montant: e.target.value })} /></label>
          <label>Date<input type="date" className="input" required value={paiement.date} onChange={(e) => setPaiement({ ...paiement, date: e.target.value })} /></label>
          <label>Mode
            <select className="input" value={paiement.mode_paiement} onChange={(e) => setPaiement({ ...paiement, mode_paiement: e.target.value })}>
              <option>Espèces</option><option>Chèque</option><option>Virement</option><option>Traite</option><option>Carte</option>
            </select>
          </label>
          <button className="btn" type="submit">Ajouter un paiement</button>
        </form>
      )}
    </div>
  );
}
