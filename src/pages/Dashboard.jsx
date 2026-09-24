import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { formatMontant, formatDate, STATUTS_PAIEMENT } from '../lib/format.js';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.dashboard.summary({}).then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="page"><p className="error">{error}</p></div>;
  if (!data) return <div className="page"><p className="loading">Chargement du tableau de bord...</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Tableau de bord</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn" onClick={() => navigate('/devis/nouveau')}>+ Devis</button>
          <button className="btn" onClick={() => navigate('/factures/nouvelle')}>+ Facture</button>
        </div>
      </div>

      <div className="cards">
        <button className="card card-green card-link" onClick={() => navigate('/factures')} title="Voir les factures">
          <div className="card-label">💰 Argent encaissé</div>
          <div className="card-value">{formatMontant(data.revenuEncaisse)}</div>
        </button>
        <button className="card card-red card-link" onClick={() => navigate('/achats')} title="Voir les factures d'achat">
          <div className="card-label">📉 Argent dépensé</div>
          <div className="card-value">{formatMontant(data.depenses)}</div>
        </button>
        <div className="card card-blue">
          <div className="card-label">📈 Bénéfice</div>
          <div className="card-value">{formatMontant(data.benefice)}</div>
        </div>
        <button className="card card-link" onClick={() => navigate('/factures?statut=non_soldee')} title="Voir les factures à recouvrer">
          <div className="card-label">⚠️ À recouvrer</div>
          <div className="card-value">{formatMontant(data.totalImpaye)}</div>
        </button>
      </div>

      <div className="cards secondary">
        <button className="stat stat-link" onClick={() => navigate('/devis?statut=attente')}>
          <span>📋</span>
          <div><strong>{data.nbDevisAttente}</strong> devis en attente</div>
        </button>
        <button className="stat stat-link" onClick={() => navigate('/factures?statut=non_soldee')}>
          <span>💳</span>
          <div><strong>{data.nbFacturesImpayees}</strong> factures impayées</div>
        </button>
        <button className="stat stat-link" onClick={() => navigate('/clients')}>
          <span>👥</span>
          <div><strong>{data.nbClients}</strong> clients</div>
        </button>
        <button className="stat stat-link" onClick={() => navigate('/fournisseurs')}>
          <span>🏢</span>
          <div><strong>{data.nbFournisseurs}</strong> fournisseurs</div>
        </button>
      </div>

      <div className="grid-2">
        <div className="page-section">
          <h2>Dernières factures</h2>
          <table className="table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Client</th>
                <th>Date</th>
                <th className="num">TTC</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.dernieresFactures.map((f) => (
                <tr key={f.id}>
                  <td><button className="link-strong" onClick={() => navigate(`/factures/${f.id}`)}>{f.numero}</button></td>
                  <td>{f.client_nom}</td>
                  <td>{formatDate(f.date)}</td>
                  <td className="num">{formatMontant(f.total_ttc)}</td>
                  <td>
                    <span className="badge" style={{ background: STATUTS_PAIEMENT[f.statut_paiement].color }}>
                      {STATUTS_PAIEMENT[f.statut_paiement].label}
                    </span>
                  </td>
                  <td>
                    <button className="btn-link" onClick={() => navigate(`/factures/${f.id}`)}>Détails</button>
                  </td>
                </tr>
              ))}
              {data.dernieresFactures.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-light)' }}>Aucune facture pour le moment.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="page-section">
          <h2>Derniers achats</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Fournisseur</th>
                <th>Date</th>
                <th className="num">Montant TTC</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.derniersAchats.map((a) => (
                <tr key={a.id}>
                  <td>{a.fournisseur_nom || a.fournisseur_nom_libre || '—'}</td>
                  <td>{formatDate(a.date)}</td>
                  <td className="num">{formatMontant(a.montant_ttc)}</td>
                  <td>
                    <button className="btn-link" onClick={() => navigate('/achats')}>Voir</button>
                  </td>
                </tr>
              ))}
              {data.derniersAchats.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-light)' }}>Aucun achat pour le moment.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
