import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useToast } from '../../lib/toast.jsx';
import { useDebounce } from '../../lib/hooks.js';
import { formatMontant, formatDate } from '../../lib/format.js';
import Modal from '../../components/Modal.jsx';

const today = () => new Date().toISOString().slice(0, 10);

const EMPTY = {
  fournisseur_id: '',
  fournisseur_nom_libre: '',
  numero_facture: '',
  date: '',
  montant_ht: '',
  montant_tva: '',
  montant_ttc: '',
  description: '',
  image_path: '',
};

const round3 = (n) => Math.round(n * 1000) / 1000;
const fileName = (p) => (p ? p.split(/[\\/]/).pop().replace(/^\d+_/, '') : '');
const sameName = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

export default function AchatsPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [formError, setFormError] = useState('');
  // Le TTC est calculé automatiquement (HT + TVA) tant que l'utilisateur ne l'a pas saisi lui-même
  const [ttcManuel, setTtcManuel] = useState(false);

  const filtered = !!(search || dateDebut || dateFin);

  function load() {
    setLoading(true);
    api.achats
      .list({ search: debouncedSearch.trim() || undefined, date_debut: dateDebut || undefined, date_fin: dateFin || undefined })
      .then(setItems)
      .catch(toast.error)
      .finally(() => setLoading(false));
  }

  useEffect(load, [debouncedSearch, dateDebut, dateFin]);
  useEffect(() => {
    api.fournisseurs.list().then(setFournisseurs).catch(toast.error);
  }, []);

  function open(achat) {
    setForm(achat ? { ...EMPTY, ...achat } : { ...EMPTY, date: today() });
    setTtcManuel(!!achat);
    setDirty(false);
    setFormError('');
  }

  function patch(p) {
    setForm((f) => {
      const next = { ...f, ...p };
      if (!ttcManuel && !('montant_ttc' in p) && ('montant_ht' in p || 'montant_tva' in p) && (next.montant_ht !== '' || next.montant_tva !== '')) {
        next.montant_ttc = String(round3((Number(next.montant_ht) || 0) + (Number(next.montant_tva) || 0)));
      }
      return next;
    });
    setDirty(true);
  }

  async function chooseImage() {
    try {
      const imagePath = await api.achats.selectImage();
      if (imagePath) patch({ image_path: imagePath });
    } catch (err) {
      setFormError(toast.messageOf(err));
    }
  }

  async function scanImage() {
    if (!form?.image_path) return;
    setScanning(true);
    setFormError('');
    try {
      const r = await api.achats.scan(form.image_path);
      // si le fournisseur détecté existe déjà, on le sélectionne directement
      const existant = r.fournisseur_nom && fournisseurs.find((f) => sameName(f.nom, r.fournisseur_nom));
      patch({
        fournisseur_id: existant ? existant.id : form.fournisseur_id,
        fournisseur_nom_libre: existant ? '' : r.fournisseur_nom || form.fournisseur_nom_libre,
        numero_facture: r.numero_facture || form.numero_facture,
        date: r.date || form.date,
        montant_ht: r.montant_ht ?? form.montant_ht,
        montant_tva: r.montant_tva ?? form.montant_tva,
        description: r.description || form.description,
        // sans TTC détecté, on le laisse se calculer à partir du HT et de la TVA
        ...(r.montant_ttc != null && { montant_ttc: r.montant_ttc }),
      });
      if (r.montant_ttc != null) setTtcManuel(true);
      toast.success('Facture scannée : vérifiez les champs remplis avant d\'enregistrer');
    } catch (err) {
      setFormError('Scan Gemini impossible : ' + toast.messageOf(err));
    } finally {
      setScanning(false);
    }
  }

  async function save(e) {
    e.preventDefault();
    if (!form.fournisseur_id && !form.fournisseur_nom_libre?.trim()) { setFormError('Sélectionnez ou saisissez un fournisseur'); return; }
    if (!(parseFloat(form.montant_ttc) > 0)) { setFormError('Le montant TTC doit être supérieur à 0'); return; }
    setSaving(true);
    setFormError('');
    try {
      if (form.id) await api.achats.update(form.id, form);
      else await api.achats.create(form);
      toast.success(form.id ? 'Achat modifié' : 'Achat enregistré');
      setForm(null);
      load();
    } catch (err) {
      setFormError(toast.messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(a) {
    if (!confirm('Supprimer cet achat ? Cette action est irréversible.')) return;
    try {
      await api.achats.remove(a.id);
      toast.success('Achat supprimé');
      load();
    } catch (err) {
      toast.error(err);
    }
  }

  function resetFilters() {
    setSearch('');
    setDateDebut('');
    setDateFin('');
  }

  const total = items.reduce((s, a) => s + (Number(a.montant_ttc) || 0), 0);

  return (
    <div className="page">
      <div className="page-header">
        <h1>🛒 Factures d'achat</h1>
        <button className="btn" onClick={() => open(null)}>+ Nouvel achat</button>
      </div>

      <div className="filters">
        <input
          type="search"
          className="input"
          placeholder="Rechercher par fournisseur ou n° de facture..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="inline-label">Du <input type="date" className="input" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} /></label>
        <label className="inline-label">au <input type="date" className="input" value={dateFin} onChange={(e) => setDateFin(e.target.value)} /></label>
        {filtered && <button className="btn-link" onClick={resetFilters}>Réinitialiser</button>}
      </div>

      <table className="table">
        <thead>
          <tr><th>Date</th><th>Fournisseur</th><th>N° facture</th><th className="num">Montant TTC</th><th>Pièce</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {items.map((a) => (
            <tr key={a.id}>
              <td>{formatDate(a.date)}</td>
              <td><button className="link-strong" onClick={() => open(a)}>{a.fournisseur_nom || a.fournisseur_nom_libre || '—'}</button></td>
              <td>{a.numero_facture || '—'}</td>
              <td className="num">{formatMontant(a.montant_ttc)}</td>
              <td>{a.image_path ? <button className="btn-link" onClick={() => api.files.openPath(a.image_path).catch(toast.error)}>📄 Ouvrir</button> : <span className="muted">—</span>}</td>
              <td className="actions">
                <button className="btn-link" onClick={() => open(a)}>Modifier</button>
                <button className="btn-link danger" onClick={() => remove(a)}>Supprimer</button>
              </td>
            </tr>
          ))}
          {items.length === 0 && !loading && (
            <tr>
              <td colSpan={6} className="empty-cell">
                {filtered ? 'Aucun achat ne correspond aux filtres.' : 'Aucun achat enregistré. Cliquez sur « + Nouvel achat » pour commencer.'}
              </td>
            </tr>
          )}
          {loading && items.length === 0 && <tr><td colSpan={6} className="empty-cell">Chargement...</td></tr>}
        </tbody>
        {items.length > 0 && (
          <tfoot>
            <tr>
              <td colSpan={3}>{items.length} achat{items.length > 1 ? 's' : ''}{filtered ? ' (filtrés)' : ''}</td>
              <td className="num">{formatMontant(total)}</td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        )}
      </table>

      {form && (
        <Modal
          title={form.id ? "Modifier l'achat" : 'Nouvel achat'}
          onClose={() => setForm(null)}
          onSubmit={save}
          dirty={dirty}
          saving={saving || scanning}
          error={formError}
        >
          <div className="scan-box">
            <div className="scan-file">
              <button type="button" className="btn-secondary" onClick={chooseImage} disabled={scanning}>
                📁 {form.image_path ? 'Changer la pièce' : 'Joindre la facture (image ou PDF)'}
              </button>
              {form.image_path && <span className="file-badge" title={form.image_path}>✓ {fileName(form.image_path)}</span>}
            </div>
            <button type="button" className="btn" disabled={!form.image_path || scanning} onClick={scanImage}>
              {scanning ? '🔄 Analyse en cours...' : '🤖 Remplir automatiquement avec Gemini'}
            </button>
            {!form.image_path && <span className="hint">Joignez une image de la facture pour remplir les champs automatiquement.</span>}
          </div>

          <label>
            Fournisseur *
            <select className="input" value={form.fournisseur_id || ''} onChange={(e) => patch({ fournisseur_id: e.target.value ? Number(e.target.value) : '' })}>
              <option value="">— Autre fournisseur (saisie libre) —</option>
              {fournisseurs.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
            </select>
          </label>
          {!form.fournisseur_id && (
            <label>
              Nom du fournisseur
              <input className="input" value={form.fournisseur_nom_libre || ''} onChange={(e) => patch({ fournisseur_nom_libre: e.target.value })} placeholder="Ex: Distributeur XYZ" />
            </label>
          )}
          <div className="form-row">
            <label>
              N° facture fournisseur
              <input className="input" value={form.numero_facture || ''} onChange={(e) => patch({ numero_facture: e.target.value })} />
            </label>
            <label>
              Date *
              <input type="date" className="input" required value={form.date || ''} onChange={(e) => patch({ date: e.target.value })} />
            </label>
          </div>
          <div className="form-row form-row-3">
            <label>
              Montant HT
              <input type="number" step="0.001" min="0" className="input num" value={form.montant_ht ?? ''} onChange={(e) => patch({ montant_ht: e.target.value })} />
            </label>
            <label>
              Montant TVA
              <input type="number" step="0.001" min="0" className="input num" value={form.montant_tva ?? ''} onChange={(e) => patch({ montant_tva: e.target.value })} />
            </label>
            <label>
              Montant TTC *
              <input
                type="number"
                step="0.001"
                min="0"
                required
                className="input num"
                value={form.montant_ttc ?? ''}
                onChange={(e) => { setTtcManuel(e.target.value !== ''); patch({ montant_ttc: e.target.value }); }}
              />
            </label>
          </div>
          {!ttcManuel && <span className="hint">Le TTC est calculé automatiquement (HT + TVA) ; vous pouvez le corriger.</span>}
          <label>
            Description
            <textarea className="input" value={form.description || ''} onChange={(e) => patch({ description: e.target.value })} placeholder="Détails de l'achat..." />
          </label>
        </Modal>
      )}
    </div>
  );
}
