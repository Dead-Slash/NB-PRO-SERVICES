import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { formatMontant, formatDate, STATUTS_PAIEMENT } from '../../lib/format.js';
import { useToast } from '../../lib/toast.jsx';

const today = () => new Date().toISOString().slice(0, 10);

export default function FactureViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [facture, setFacture] = useState(null);
  const [paiement, setPaiement] = useState({ montant: '', date: today(), mode_paiement: 'Espèces', notes: '' });
  const [printing, setPrinting] = useState(false);
  const [saving, setSaving] = useState(false);

  function load() {
    api.factures.get(Number(id)).then(setFacture).catch(toast.error);
  }

  useEffect(() => { load(); }, [id]);

  async function addPaiement(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.factures.addPaiement(Number(id), paiement);
      setPaiement({ montant: '', date: today(), mode_paiement: 'Espèces', notes: '' });
      toast.success('Paiement enregistré');
      load();
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function print() {
    setPrinting(true);
    try { await api.factures.print(Number(id)); } catch (err) { toast.error(err); } finally { setPrinting(false); }
  }

  if (!facture) return <div className="page"><p className="muted">Chargement...</p></div>;

  const reste = Math.max(facture.total_ttc - facture.montant_paye, 0);
  const statut = STATUTS_PAIEMENT[facture.statut_paiement];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button type="button" className="btn-back" onClick={() => navigate('/factures')}>← Factures</button>
          <h1>Facture {facture.numero} <span className="badge" style={{ background: statut.color }}>{statut.label}</span></h1>
        </div>
        <button className="btn" onClick={print} disabled={printing}>{printing ? 'Génération du PDF...' : '🖨 Imprimer / PDF'}</button>
      </div>

      <div className="doc-form">
        <div className="doc-main">
          <section className="panel">
            <div className="info-grid">
              <div><span className="hint">Client</span><strong>{facture.client?.nom}</strong>{facture.client?.adresse && <span className="muted">{facture.client.adresse}</span>}</div>
              <div><span className="hint">Date</span><strong>{formatDate(facture.date)}</strong></div>
              {facture.devis_id && <div><span className="hint">Origine</span><button className="link-strong" onClick={() => navigate(`/devis/${facture.devis_id}`)}>Devis validé</button></div>}
            </div>
          </section>

          <section className="panel">
            <h2 className="panel-title">Désignations</h2>
            <table className="table">
              <thead><tr><th>Désignation</th><th className="num">Qté</th><th className="num">P.U. HT</th>{!!facture.avec_tva && <th className="num">TVA</th>}<th className="num">Total HT</th></tr></thead>
              <tbody>
                {facture.lignes.map((l) => (
                  <tr key={l.id}>
                    <td className="pre-line">{l.description}</td>
                    <td className="num">{l.quantite}</td>
                    <td className="num">{formatMontant(l.prix_unitaire)}</td>
                    {!!facture.avec_tva && <td className="num">{l.taux_tva}%</td>}
                    <td className="num">{formatMontant(l.total_ligne)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="panel">
            <h2 className="panel-title">Paiements</h2>
            <table className="table">
              <thead><tr><th>Date</th><th className="num">Montant</th><th>Mode</th><th>Notes</th></tr></thead>
              <tbody>
                {facture.paiements.map((p) => (
                  <tr key={p.id}><td>{formatDate(p.date)}</td><td className="num">{formatMontant(p.montant)}</td><td>{p.mode_paiement}</td><td>{p.notes}</td></tr>
                ))}
                {facture.paiements.length === 0 && <tr><td colSpan={4} className="muted">Aucun paiement enregistré.</td></tr>}
              </tbody>
            </table>

            {reste > 0 && (
              <form className="payment-form" onSubmit={addPaiement}>
                <label>Montant (DT)
                  <div className="input-with-action">
                    <input type="number" min="0.001" max={reste.toFixed(3)} step="0.001" className="input" required value={paiement.montant} onChange={(e) => setPaiement({ ...paiement, montant: e.target.value })} />
                    <button type="button" className="btn-secondary" onClick={() => setPaiement({ ...paiement, montant: reste.toFixed(3) })}>Tout</button>
                  </div>
                </label>
                <label>Date<input type="date" className="input" required value={paiement.date} onChange={(e) => setPaiement({ ...paiement, date: e.target.value })} /></label>
                <label>Mode
                  <select className="input" value={paiement.mode_paiement} onChange={(e) => setPaiement({ ...paiement, mode_paiement: e.target.value })}>
                    <option>Espèces</option><option>Chèque</option><option>Virement</option><option>Traite</option><option>Carte</option>
                  </select>
                </label>
                <label>Notes<input className="input" placeholder="N° de chèque..." value={paiement.notes} onChange={(e) => setPaiement({ ...paiement, notes: e.target.value })} /></label>
                <button className="btn" type="submit" disabled={saving}>Ajouter le paiement</button>
              </form>
            )}
          </section>
        </div>

        <aside className="doc-side">
          <div className="panel summary">
            <h2 className="panel-title">Montants</h2>
            <dl>
              <dt>Total HT</dt><dd>{formatMontant(facture.sous_total)}</dd>
              {!!facture.avec_tva && <><dt>Total TVA</dt><dd>{formatMontant(facture.total_tva)}</dd></>}
              <dt>Timbre fiscal</dt><dd>{formatMontant(facture.timbre_fiscal)}</dd>
            </dl>
            <div className="summary-total"><span>Total TTC</span><strong>{formatMontant(facture.total_ttc)}</strong></div>
            <dl>
              <dt>Payé</dt><dd>{formatMontant(facture.montant_paye)}</dd>
              <dt className="strong">Reste à payer</dt><dd className={reste > 0 ? 'strong danger-text' : 'strong success-text'}>{formatMontant(reste)}</dd>
            </dl>
            {facture.total_ttc > 0 && (
              <div className="progress" title={`${Math.round((facture.montant_paye / facture.total_ttc) * 100)} % payé`}>
                <div style={{ width: `${Math.min((facture.montant_paye / facture.total_ttc) * 100, 100)}%` }} />
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
