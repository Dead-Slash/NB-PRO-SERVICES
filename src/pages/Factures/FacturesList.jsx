import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { formatMontant, formatDate, STATUTS_PAIEMENT } from '../../lib/format.js';

export default function FacturesListPage() {
  const [items, setItems] = useState([]);
  const [statut, setStatut] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function load() {
    setLoading(true);
    api.factures
      .list({ statut_paiement: statut || undefined, search: search || undefined })
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [statut, search]);

  async function remove(id) {
    if (!confirm('Supprimer cette facture ? Cette action est irréversible.')) return;
    setError('');
    try {
      await api.factures.remove(id);
      setSuccess('Facture supprimée ✓');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function print(id) {
    try {
      await api.factures.print(id);
      setSuccess('Facture imprimée et ouverte.');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>💳 Factures</h1>
        <button className="btn" onClick={() => navigate('/factures/nouvelle')}>+ Nouvelle facture</button>
      </div>

      {error && <p className="error">❌ {error}</p>}
      {success && <p className="success">✓ {success}</p>}

      <div className="filters">
        <input
          className="input"
          placeholder="Rechercher par numéro ou client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input" value={statut} onChange={(e) => setStatut(e.target.value)}>
          <option value="">Tous les statuts</option>
          <option value="impayee">Impayée</option>
          <option value="partiellement_payee">Partiellement payée</option>
          <option value="payee">Payée</option>
        </select>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>N°</th>
            <th>Client</th>
            <th>Date</th>
            <th>TTC</th>
            <th>Payé</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((f) => (
            <tr key={f.id}>
              <td><strong>{f.numero}</strong></td>
              <td>{f.client_nom}</td>
              <td>{formatDate(f.date)}</td>
              <td>{formatMontant(f.total_ttc)}</td>
              <td>{formatMontant(f.montant_paye)}</td>
              <td>
                <span className="badge" style={{ background: STATUTS_PAIEMENT[f.statut_paiement].color }}>
                  {STATUTS_PAIEMENT[f.statut_paiement].label}
                </span>
              </td>
              <td className="actions">
                <button className="btn-link" onClick={() => navigate(`/factures/${f.id}`)}>Détails</button>
                <button className="btn-link" onClick={() => print(f.id)}>Imprimer</button>
                {!f.devis_id && (
                  <button className="btn-link danger" onClick={() => remove(f.id)}>Supprimer</button>
                )}
              </td>
            </tr>
          ))}
          {items.length === 0 && !loading && (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-light)' }}>
                Aucune facture {search || statut ? 'ne correspond.' : 'Commencez par créer une facture.'}
              </td>
            </tr>
          )}
          {loading && (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-light)' }}>Chargement...</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
