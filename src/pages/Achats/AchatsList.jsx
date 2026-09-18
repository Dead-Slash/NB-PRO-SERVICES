import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { formatMontant, formatDate } from '../../lib/format.js';

const EMPTY = {
  fournisseur_id: '',
  fournisseur_nom_libre: '',
  numero_facture: '',
  date: new Date().toISOString().slice(0, 10),
  montant_ht: '',
  montant_tva: '',
  montant_ttc: '',
  description: '',
  image_path: '',
};

export default function AchatsPage() {
  const [items, setItems] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [form, setForm] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([
      api.achats.list({}),
      api.fournisseurs.list()
    ]).then(([achats, fourn]) => {
      setItems(achats);
      setFournisseurs(fourn);
    }).catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function chooseImage() {
    setError('');
    setSuccess('');
    try {
      const imagePath = await api.achats.selectImage();
      if (!imagePath) return;
      setForm({ ...(form || EMPTY), image_path: imagePath });
      setSuccess('Image sélectionnée ✓');
    } catch (err) { setError(err.message); }
  }

  async function scanImage() {
    if (!form?.image_path) return;
    setScanning(true);
    setError('');
    setSuccess('');
    try {
      const result = await api.achats.scan(form.image_path);
      setForm({
        ...form,
        fournisseur_nom_libre: result.fournisseur_nom || form.fournisseur_nom_libre,
        numero_facture: result.numero_facture || form.numero_facture,
        date: result.date || form.date,
        montant_ht: result.montant_ht ?? form.montant_ht,
        montant_tva: result.montant_tva ?? form.montant_tva,
        montant_ttc: result.montant_ttc ?? form.montant_ttc,
        description: result.description || form.description,
      });
      setSuccess('Facture scannée et champs remplis automatiquement ✓');
    } catch (err) { setError('Erreur lors du scan Gemini: ' + err.message); }
    setScanning(false);
  }

  async function save(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.montant_ttc || parseFloat(form.montant_ttc) <= 0) { setError('Le montant TTC est requis'); return; }
    if (!form.fournisseur_id && !form.fournisseur_nom_libre.trim()) { setError('Veuillez sélectionner ou saisir un fournisseur'); return; }
    setLoading(true);
    try {
      if (form.id) await api.achats.update(form.id, form);
      else await api.achats.create(form);
      setSuccess(form.id ? 'Achat modifié ✓' : 'Achat enregistré ✓');
      setForm(null);
      load();
    } catch (err) { setError(err.message); }
  }

  async function remove(id) {
    if (!confirm('Supprimer cet achat ? Cette action est irréversible.')) return;
    setError('');
    try {
      await api.achats.remove(id);
      setSuccess('Achat supprimé ✓');
      load();
    } catch (err) { setError(err.message); }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>🛒 Factures d'achat</h1>
        <button className="btn" onClick={() => setForm({ ...EMPTY })}>+ Nouvel achat</button>
      </div>
      {error && <p className="error">❌ {error}</p>}
      {success && <p className="success">✓ {success}</p>}

      <table className="table">
        <thead><tr><th>Date</th><th>Fournisseur</th><th>N° facture</th><th>Montant TTC</th><th>Image</th><th>Actions</th></tr></thead>
        <tbody>
          {items.map((a) => (
            <tr key={a.id}>
              <td>{formatDate(a.date)}</td>
              <td>{a.fournisseur_nom || a.fournisseur_nom_libre || '—'}</td>
              <td>{a.numero_facture || '—'}</td>
              <td>{formatMontant(a.montant_ttc)}</td>
              <td>{a.image_path && <button className="btn-link" onClick={() => api.files.openPath(a.image_path).catch((e) => setError(e.message))}>📄 Voir</button>}</td>
              <td className="actions">
                <button className="btn-link" onClick={() => setForm(a)}>Modifier</button>
                <button className="btn-link danger" onClick={() => remove(a.id)}>Supprimer</button>
              </td>
            </tr>
          ))}
          {items.length === 0 && !loading && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-light)' }}>Aucun achat enregistré.</td></tr>}
          {loading && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-light)' }}>Chargement...</td></tr>}
        </tbody>
      </table>

      {form && (
        <div className="modal-backdrop" onClick={() => setForm(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h2>{form.id ? "Modifier l'achat" : "Nouvel achat"}</h2>

            <div className="form-row">
              <button type="button" className="btn-secondary" onClick={chooseImage}>📁 Choisir une image</button>
              {form.image_path && <span className="file-badge">✓ Image sélectionnée</span>}
            </div>
            <button type="button" className={form.image_path ? 'btn' : 'btn-secondary'} disabled={!form.image_path || scanning} onClick={scanImage}>
              {scanning ? '🔄 Scan en cours...' : '🤖 Scanner avec Gemini'}
            </button>

            <label>
              Fournisseur (sélectionner ou saisir)
              <select className="input" value={form.fournisseur_id || ''} onChange={(e) => setForm({ ...form, fournisseur_id: e.target.value ? Number(e.target.value) : '' })}>
                <option value="">— Nouveau fournisseur (saisie libre) —</option>
                {fournisseurs.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
              </select>
            </label>
            {!form.fournisseur_id && (
              <label>
                Nom du fournisseur
                <input className="input" value={form.fournisseur_nom_libre || ''} onChange={(e) => setForm({ ...form, fournisseur_nom_libre: e.target.value })} placeholder="Ex: Distributeur XYZ" />
              </label>
            )}
            <label>
              N° facture fournisseur
              <input className="input" value={form.numero_facture || ''} onChange={(e) => setForm({ ...form, numero_facture: e.target.value })} placeholder="Numéro de la facture" />
            </label>
            <label>
              Date *
              <input type="date" className="input" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </label>
            <label>
              Montant HT
              <input type="number" step="0.001" className="input" value={form.montant_ht || ''} onChange={(e) => setForm({ ...form, montant_ht: e.target.value })} />
            </label>
            <label>
              Montant TVA
              <input type="number" step="0.001" className="input" value={form.montant_tva || ''} onChange={(e) => setForm({ ...form, montant_tva: e.target.value })} />
            </label>
            <label>
              Montant TTC *
              <input type="number" step="0.001" required className="input" value={form.montant_ttc || ''} onChange={(e) => setForm({ ...form, montant_ttc: e.target.value })} />
            </label>
            <label>
              Description
              <textarea className="input" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Détails de l'achat..." />
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
