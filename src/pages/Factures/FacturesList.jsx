import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useToast } from '../../lib/toast.jsx';
import { useDebounce } from '../../lib/hooks.js';
import { formatMontant, formatDate, STATUTS_PAIEMENT } from '../../lib/format.js';

export default function FacturesListPage() {
  const [items, setItems] = useState([]);
  const [searchParams] = useSearchParams();
  // le filtre de statut peut être pré-rempli depuis le tableau de bord (?statut=...)
  const [statut, setStatut] = useState(searchParams.get('statut') || '');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();

  function load() {
    setLoading(true);
    api.factures
      .list({ statut_paiement: statut || undefined, search: debouncedSearch.trim() || undefined })
      .then(setItems)
      .catch(toast.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [statut, debouncedSearch]);

  async function remove(id) {
    if (!confirm('Supprimer cette facture ? Cette action est irréversible.')) return;
    try {
      await api.factures.remove(id);
      toast.success('Facture supprimée');
      load();
    } catch (err) {
      toast.error(err);
    }
  }

  async function print(id) {
    setPrinting(id);
    try {
      await api.factures.print(id);
    } catch (err) {
      toast.error(err);
    } finally {
      setPrinting(null);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>💳 Factures</h1>
        <button className="btn" onClick={() => navigate('/factures/nouvelle')}>+ Nouvelle facture</button>
      </div>

      <div className="filters">
        <input
          type="search"
          className="input"
          placeholder="Rechercher par numéro ou client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input" value={statut} onChange={(e) => setStatut(e.target.value)}>
          <option value="">Tous les statuts</option>
          <option value="non_soldee">Non soldées (à recouvrer)</option>
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
            <th className="num">Total TTC</th>
            <th className="num">Payé</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((f) => (
            <tr key={f.id}>
              <td><button className="link-strong" onClick={() => navigate(`/factures/${f.id}`)}>{f.numero}</button></td>
              <td>{f.client_nom}</td>
              <td>{formatDate(f.date)}</td>
              <td className="num">{formatMontant(f.total_ttc)}</td>
              <td className="num">{formatMontant(f.montant_paye)}</td>
              <td>
                <span className="badge" style={{ background: STATUTS_PAIEMENT[f.statut_paiement].color }}>
                  {STATUTS_PAIEMENT[f.statut_paiement].label}
                </span>
              </td>
              <td className="actions">
                <button className="btn-link" onClick={() => navigate(`/factures/${f.id}`)}>Détails</button>
                <button className="btn-link" disabled={printing !== null} onClick={() => print(f.id)}>{printing === f.id ? 'PDF...' : 'Imprimer'}</button>
                {!f.devis_id && (
                  <button className="btn-link danger" onClick={() => remove(f.id)}>Supprimer</button>
                )}
              </td>
            </tr>
          ))}
          {items.length === 0 && !loading && (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-light)' }}>
                {search || statut ? 'Aucune facture ne correspond à la recherche.' : 'Aucune facture pour le moment. Cliquez sur « + Nouvelle facture » pour commencer.'}
              </td>
            </tr>
          )}
          {loading && items.length === 0 && (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-light)' }}>Chargement...</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
