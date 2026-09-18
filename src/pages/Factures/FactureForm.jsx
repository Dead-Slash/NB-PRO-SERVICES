import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { formatMontant } from '../../lib/format.js';

const EMPTY_LIGNE = { description: '', quantite: 1, prix_unitaire: 0, taux_tva: 19 };

export default function FactureFormPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    client_id: '',
    avec_tva: true,
    notes: '',
    lignes: [{ ...EMPTY_LIGNE }],
  });
  const [error, setError] = useState('');

  useEffect(() => { api.clients.list().then(setClients); }, []);

  function updateLigne(idx, patch) {
    const lignes = form.lignes.map((l, i) => (i === idx ? { ...l, ...patch } : l));
    setForm({ ...form, lignes });
  }
  function addLigne() { setForm({ ...form, lignes: [...form.lignes, { ...EMPTY_LIGNE }] }); }
  function removeLigne(idx) { setForm({ ...form, lignes: form.lignes.filter((_, i) => i !== idx) }); }

  const sousTotal = form.lignes.reduce((s, l) => s + (Number(l.quantite) || 0) * (Number(l.prix_unitaire) || 0), 0);
  const totalTva = form.avec_tva
    ? form.lignes.reduce((s, l) => s + (Number(l.quantite) || 0) * (Number(l.prix_unitaire) || 0) * ((Number(l.taux_tva) || 0) / 100), 0)
    : 0;
  const totalTtc = sousTotal + totalTva;

  async function save(e) {
    e.preventDefault();
    setError('');
    if (!form.client_id) { setError('Veuillez choisir un client'); return; }
    try {
      const facture = await api.factures.create(form);
      navigate(`/factures/${facture.id}`);
    } catch (err) { setError(err.message); }
  }

  return (
    <div className="page">
      <h1>Nouvelle facture</h1>
      {error && <p className="error">{error}</p>}
      <form onSubmit={save} className="form-wide">
        <div className="form-row">
          <label>Date<input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></label>
          <label>Client
            <select className="input" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: Number(e.target.value) })} required>
              <option value="">-- Choisir --</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </label>
          <label className="checkbox"><input type="checkbox" checked={form.avec_tva} onChange={(e) => setForm({ ...form, avec_tva: e.target.checked })} /> Avec TVA</label>
        </div>

        <table className="table">
          <thead><tr><th>Description</th><th>Qté</th><th>P.U.</th>{form.avec_tva && <th>TVA %</th>}<th>Total</th><th></th></tr></thead>
          <tbody>
            {form.lignes.map((l, idx) => (
              <tr key={idx}>
                <td><input className="input" value={l.description} onChange={(e) => updateLigne(idx, { description: e.target.value })} required /></td>
                <td><input type="number" step="0.01" className="input small" value={l.quantite} onChange={(e) => updateLigne(idx, { quantite: e.target.value })} /></td>
                <td><input type="number" step="0.001" className="input small" value={l.prix_unitaire} onChange={(e) => updateLigne(idx, { prix_unitaire: e.target.value })} /></td>
                {form.avec_tva && <td><input type="number" step="0.01" className="input small" value={l.taux_tva} onChange={(e) => updateLigne(idx, { taux_tva: e.target.value })} /></td>}
                <td>{formatMontant((Number(l.quantite) || 0) * (Number(l.prix_unitaire) || 0))}</td>
                <td><button type="button" className="btn-link danger" onClick={() => removeLigne(idx)}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" className="btn-secondary" onClick={addLigne}>+ Ajouter une ligne</button>

        <div className="totals-box">
          <div>Sous-total HT : {formatMontant(sousTotal)}</div>
          {form.avec_tva && <div>Total TVA : {formatMontant(totalTva)}</div>}
          <div className="bold">Total TTC : {formatMontant(totalTtc)}</div>
        </div>

        <label>Notes<textarea className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate('/factures')}>Annuler</button>
          <button type="submit" className="btn">Enregistrer</button>
        </div>
      </form>
    </div>
  );
}
