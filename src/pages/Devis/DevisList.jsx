import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useToast } from '../../lib/toast.jsx';
import { useDebounce } from '../../lib/hooks.js';
import { formatMontant, formatDate, STATUTS_DEVIS } from '../../lib/format.js';

export default function DevisListPage() {
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
    api.devis
      .list({ statut: statut || undefined, search: debouncedSearch.trim() || undefined })
      .then(setItems)
      .catch(toast.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [statut, debouncedSearch]);

  async function updateStatut(id, s) {
    if (s === 'validee' && !confirm('Valider ce devis ? Une facture sera créée automatiquement et le devis ne sera plus modifiable.')) return;
    if (s === 'annulee' && !confirm('Annuler ce devis ? Il ne pourra plus être modifié ni validé.')) return;
    try {
      await api.devis.updateStatut(id, s);
      toast.success(s === 'validee' ? 'Devis validé : la facture a été créée automatiquement' : 'Devis annulé');
      load();
    } catch (err) {
      toast.error(err);
    }
  }

  async function remove(id) {
    if (!confirm('Supprimer ce devis ? Cette action est irréversible.')) return;
    try {
      await api.devis.remove(id);
      toast.success('Devis supprimé');
      load();
    } catch (err) {
      toast.error(err);
    }
  }

  async function print(id) {
    setPrinting(id);
    try {
      await api.devis.print(id);
    } catch (err) {
      toast.error(err);
    } finally {
      setPrinting(null);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>📋 Devis</h1>
        <button className="btn" onClick={() => navigate('/devis/nouveau')}>+ Nouveau devis</button>
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
          <option value="attente">En attente</option>
          <option value="validee">Validé</option>
          <option value="annulee">Annulé</option>
        </select>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>N°</th>
            <th>Client</th>
            <th>Date</th>
            <th className="num">Total TTC</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((d) => (
            <tr key={d.id}>
              <td><button className="link-strong" onClick={() => navigate(`/devis/${d.id}`)}>{d.numero}</button></td>
              <td>{d.client_nom}</td>
              <td>{formatDate(d.date)}</td>
              <td className="num">{formatMontant(d.total_ttc)}</td>
              <td>
                <span className="badge" style={{ background: STATUTS_DEVIS[d.statut].color }}>
                  {STATUTS_DEVIS[d.statut].label}
                </span>
              </td>
              <td className="actions">
                {d.statut === 'attente' && (
                  <>
                    <button className="btn-link" onClick={() => navigate(`/devis/${d.id}`)}>Modifier</button>
                    <button className="btn-link" onClick={() => updateStatut(d.id, 'validee')}>Valider</button>
                    <button className="btn-link danger" onClick={() => updateStatut(d.id, 'annulee')}>Annuler</button>
                  </>
                )}
                {d.statut !== 'attente' && (
                  <>
                    <button className="btn-link" onClick={() => navigate(`/devis/${d.id}`)}>Voir</button>
                    {d.facture_id && <button className="btn-link" onClick={() => navigate(`/factures/${d.facture_id}`)}>Voir la facture</button>}
                  </>
                )}
                <button className="btn-link" disabled={printing !== null} onClick={() => print(d.id)}>{printing === d.id ? 'PDF...' : 'Imprimer'}</button>
                {d.statut !== 'validee' && (
                  <button className="btn-link danger" onClick={() => remove(d.id)}>Supprimer</button>
                )}
              </td>
            </tr>
          ))}
          {items.length === 0 && !loading && (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-light)' }}>
                {search || statut ? 'Aucun devis ne correspond à la recherche.' : 'Aucun devis pour le moment. Cliquez sur « + Nouveau devis » pour commencer.'}
              </td>
            </tr>
          )}
          {loading && items.length === 0 && (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-light)' }}>Chargement...</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
