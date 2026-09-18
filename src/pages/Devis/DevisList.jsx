import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { formatMontant, formatDate, STATUTS_DEVIS } from '../../lib/format.js';

export default function DevisListPage() {
  const [items, setItems] = useState([]);
  const [statut, setStatut] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function load() {
    setLoading(true);
    api.devis
      .list({ statut: statut || undefined, search: search || undefined })
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [statut, search]);

  async function updateStatut(id, s) {
    setError('');
    try {
      await api.devis.updateStatut(id, s);
      setSuccess(s === 'validee' ? 'Devis validé ✓ Facture créée automatiquement.' : `Devis ${s === 'annulee' ? 'annulé' : s}.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    if (!confirm('Supprimer ce devis ? Cette action est irréversible.')) return;
    try {
      await api.devis.remove(id);
      setSuccess('Devis supprimé ✓');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function print(id) {
    try {
      await api.devis.print(id);
      setSuccess('Devis imprimé et ouvert.');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>📋 Devis</h1>
        <button className="btn" onClick={() => navigate('/devis/nouveau')}>+ Nouveau devis</button>
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
            <th>TTC</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((d) => (
            <tr key={d.id}>
              <td><strong>{d.numero}</strong></td>
              <td>{d.client_nom}</td>
              <td>{formatDate(d.date)}</td>
              <td>{formatMontant(d.total_ttc)}</td>
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
                  </>
                )}
                <button className="btn-link" onClick={() => print(d.id)}>Imprimer</button>
                {d.statut !== 'validee' && (
                  <button className="btn-link danger" onClick={() => remove(d.id)}>Supprimer</button>
                )}
              </td>
            </tr>
          ))}
          {items.length === 0 && !loading && (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-light)' }}>
                Aucun devis {search || statut ? 'ne correspond.' : 'Commencez par créer un devis.'}
              </td>
            </tr>
          )}
          {loading && (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-light)' }}>Chargement...</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
