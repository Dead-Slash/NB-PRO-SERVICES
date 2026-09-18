import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const EMPTY = { nom: '', matricule_fiscal: '', telephone: '', email: '', adresse: '', notes: '' };

export default function FournisseursPage() {
  const [fournisseurs, setFournisseurs] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  function load() {
    setLoading(true);
    api.fournisseurs
      .list(search || undefined)
      .then(setFournisseurs)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [search]);

  async function save(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.nom.trim()) { setError('Le nom est requis'); return; }
    setLoading(true);
    try {
      if (form.id) await api.fournisseurs.update(form.id, form);
      else await api.fournisseurs.create(form);
      setSuccess(form.id ? 'Fournisseur modifié ✓' : 'Fournisseur créé ✓');
      setForm(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    if (!confirm('Supprimer ce fournisseur ? Cette action est irréversible.')) return;
    setError('');
    try {
      await api.fournisseurs.remove(id);
      setSuccess('Fournisseur supprimé ✓');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>🏢 Fournisseurs</h1>
        <button className="btn" onClick={() => setForm({ ...EMPTY })}>+ Nouveau fournisseur</button>
      </div>

      {error && <p className="error">❌ {error}</p>}
      {success && <p className="success">✓ {success}</p>}

      <div className="filters">
        <input
          className="input"
          placeholder="Rechercher par nom ou matricule..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Matricule fiscal</th>
            <th>Téléphone</th>
            <th>Email</th>
            <th>Adresse</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {fournisseurs.map((f) => (
            <tr key={f.id}>
              <td><strong>{f.nom}</strong></td>
              <td>{f.matricule_fiscal || '—'}</td>
              <td>{f.telephone || '—'}</td>
              <td>{f.email || '—'}</td>
              <td>{f.adresse || '—'}</td>
              <td className="actions">
                <button className="btn-link" onClick={() => setForm(f)}>Modifier</button>
                <button className="btn-link danger" onClick={() => remove(f.id)}>Supprimer</button>
              </td>
            </tr>
          ))}
          {fournisseurs.length === 0 && !loading && (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-light)' }}>
                Aucun fournisseur {search ? 'ne correspond.' : 'Commencez par ajouter un fournisseur.'}
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

      {form && (
        <div className="modal-backdrop" onClick={() => setForm(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h2>{form.id ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}</h2>
            <label>
              Nom de l'entreprise *
              <input
                required
                autoFocus
                className="input"
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                placeholder="Ex: XYZ Distributor"
              />
            </label>
            <label>
              Matricule fiscal
              <input
                className="input"
                value={form.matricule_fiscal || ''}
                onChange={(e) => setForm({ ...form, matricule_fiscal: e.target.value })}
              />
            </label>
            <label>
              Téléphone
              <input
                className="input"
                type="tel"
                value={form.telephone || ''}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
              />
            </label>
            <label>
              Email
              <input
                className="input"
                type="email"
                value={form.email || ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label>
              Adresse
              <textarea
                className="input"
                value={form.adresse || ''}
                onChange={(e) => setForm({ ...form, adresse: e.target.value })}
              />
            </label>
            <label>
              Notes
              <textarea
                className="input"
                value={form.notes || ''}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setForm(null)}>Annuler</button>
              <button type="submit" className="btn">Enregistrer</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
