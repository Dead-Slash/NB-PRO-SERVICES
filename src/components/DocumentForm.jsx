import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { formatMontant } from '../lib/format.js';
import { computeTotals, lineTotal } from '../lib/totals.js';
import { useToast } from '../lib/toast.jsx';

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY_CLIENT = { nom: '', adresse: '', matricule_fiscal: '', telephone: '' };

// Formulaire commun aux devis et aux factures
// kind : 'devis' | 'factures'
export default function DocumentForm({ kind, id, title, backPath, readOnlyReason, initial, onSaved }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [clients, setClients] = useState([]);
  const [facturation, setFacturation] = useState({ taux_tva_defaut: 19, timbre_fiscal: 0 });
  const [form, setForm] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newClient, setNewClient] = useState(null);
  const lastDescRef = useRef(null);
  const focusNewLine = useRef(false);

  const readOnly = !!readOnlyReason;

  useEffect(() => {
    api.clients.list().then(setClients).catch(toast.error);
    api.settings.get().then((s) => {
      setFacturation({ taux_tva_defaut: s.taux_tva_defaut, timbre_fiscal: s.timbre_fiscal });
      if (!initial) {
        setForm({
          date: today(),
          client_id: '',
          avec_tva: true,
          notes: '',
          lignes: [{ description: '', quantite: 1, prix_unitaire: '', taux_tva: s.taux_tva_defaut }],
        });
      }
    }).catch(toast.error);
  }, []);

  useEffect(() => {
    if (initial) setForm(initial);
  }, [initial]);

  useEffect(() => {
    if (focusNewLine.current && lastDescRef.current) {
      lastDescRef.current.focus();
      focusNewLine.current = false;
    }
  }, [form?.lignes.length]);

  if (!form) return <div className="page"><p className="muted">Chargement...</p></div>;

  function patch(p) {
    setForm((f) => ({ ...f, ...p }));
    setDirty(true);
  }
  function updateLigne(idx, p) {
    patch({ lignes: form.lignes.map((l, i) => (i === idx ? { ...l, ...p } : l)) });
  }
  function addLigne() {
    focusNewLine.current = true;
    patch({ lignes: [...form.lignes, { description: '', quantite: 1, prix_unitaire: '', taux_tva: facturation.taux_tva_defaut }] });
  }
  function duplicateLigne(idx) {
    const lignes = [...form.lignes];
    lignes.splice(idx + 1, 0, { ...form.lignes[idx] });
    patch({ lignes });
  }
  function moveLigne(idx, dir) {
    const j = idx + dir;
    if (j < 0 || j >= form.lignes.length) return;
    const lignes = [...form.lignes];
    [lignes[idx], lignes[j]] = [lignes[j], lignes[idx]];
    patch({ lignes });
  }
  function removeLigne(idx) {
    if (form.lignes.length === 1) return;
    patch({ lignes: form.lignes.filter((_, i) => i !== idx) });
  }

  const totals = computeTotals(form.lignes, form.avec_tva, facturation.timbre_fiscal);
  const selectedClient = clients.find((c) => c.id === Number(form.client_id));

  function cancel() {
    if (dirty && !readOnly && !confirm('Quitter sans enregistrer les modifications ?')) return;
    navigate(backPath);
  }

  async function save(print) {
    if (!form.client_id) { toast.error('Veuillez choisir un client'); return; }
    const lignes = form.lignes.filter((l) => l.description.trim());
    if (lignes.length === 0) { toast.error('Ajoutez au moins une ligne avec une désignation'); return; }
    setSaving(true);
    try {
      const data = { ...form, lignes };
      const saved = id ? await api[kind].update(Number(id), data) : await api[kind].create(data);
      setDirty(false);
      if (print) await api[kind].print(saved.id);
      toast.success(`${kind === 'devis' ? 'Devis' : 'Facture'} ${saved.numero} enregistré${kind === 'devis' ? '' : 'e'}${print ? ' et ouvert en PDF' : ''}`);
      onSaved(saved);
    } catch (err) {
      toast.error(err);
      setSaving(false);
    }
  }

  async function createClient(e) {
    e.preventDefault();
    if (!newClient.nom.trim()) return;
    try {
      const c = await api.clients.create(newClient);
      setClients((list) => [...list, c].sort((a, b) => a.nom.localeCompare(b.nom)));
      patch({ client_id: c.id });
      setNewClient(null);
      toast.success(`Client ${c.nom} ajouté`);
    } catch (err) { toast.error(err); }
  }

  function onDescKeyDown(e, idx) {
    // Ctrl+Entrée sur la dernière ligne : nouvelle ligne
    if (e.key === 'Enter' && e.ctrlKey && idx === form.lignes.length - 1) {
      e.preventDefault();
      addLigne();
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button type="button" className="btn-back" onClick={cancel}>← Retour</button>
          <h1>{title}</h1>
        </div>
      </div>
      {readOnly && <p className="notice">{readOnlyReason}</p>}

      {/* Entrée dans un champ ne doit pas enregistrer le document par accident */}
      <form
        className="doc-form"
        onSubmit={(e) => { e.preventDefault(); save(false); }}
        onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.preventDefault(); }}
      >
        <fieldset disabled={readOnly || saving} className="doc-main">
          <section className="panel">
            <h2 className="panel-title">Informations</h2>
            <div className="info-row">
              <label>Client *
                <div className="input-with-action">
                  <select className="input" value={form.client_id} onChange={(e) => patch({ client_id: Number(e.target.value) || '' })} autoFocus={!id}>
                    <option value="">— Choisir un client —</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                  <button type="button" className="btn-secondary" onClick={() => setNewClient({ ...EMPTY_CLIENT })} title="Créer un nouveau client">+ Nouveau</button>
                </div>
                {selectedClient && (
                  <span className="hint">
                    {[selectedClient.adresse, selectedClient.matricule_fiscal && `MF ${selectedClient.matricule_fiscal}`, selectedClient.telephone].filter(Boolean).join(' · ') || 'Aucune coordonnée enregistrée'}
                  </span>
                )}
              </label>
              <label>Date *<input type="date" className="input" value={form.date} onChange={(e) => patch({ date: e.target.value })} required /></label>
              <label className="checkbox switch">
                <input type="checkbox" checked={form.avec_tva} onChange={(e) => patch({ avec_tva: e.target.checked })} />
                <span>Appliquer la TVA</span>
              </label>
            </div>
          </section>

          <section className="panel">
            <h2 className="panel-title">Désignations</h2>
            <table className="table lines-table">
              <thead>
                <tr>
                  <th className="col-num">#</th>
                  <th>Désignation</th>
                  <th className="col-qte">Qté</th>
                  <th className="col-pu">P.U. HT</th>
                  {form.avec_tva && <th className="col-tva">TVA %</th>}
                  <th className="col-total">Total HT</th>
                  <th className="col-actions"></th>
                </tr>
              </thead>
              <tbody>
                {form.lignes.map((l, idx) => (
                  <tr key={idx}>
                    <td className="col-num muted">{idx + 1}</td>
                    <td>
                      <textarea
                        ref={idx === form.lignes.length - 1 ? lastDescRef : null}
                        className="input line-desc"
                        rows={Math.min(Math.max(l.description.split('\n').length, 1), 6)}
                        placeholder="Ex. : Réparation onduleur"
                        value={l.description}
                        onChange={(e) => updateLigne(idx, { description: e.target.value })}
                        onKeyDown={(e) => onDescKeyDown(e, idx)}
                      />
                    </td>
                    <td><input type="number" min="0" step="any" className="input num" value={l.quantite} onChange={(e) => updateLigne(idx, { quantite: e.target.value })} /></td>
                    <td><input type="number" min="0" step="0.001" className="input num" placeholder="0.000" value={l.prix_unitaire} onChange={(e) => updateLigne(idx, { prix_unitaire: e.target.value })} /></td>
                    {form.avec_tva && <td><input type="number" min="0" max="100" step="any" className="input num" value={l.taux_tva} onChange={(e) => updateLigne(idx, { taux_tva: e.target.value })} /></td>}
                    <td className="col-total num strong">{formatMontant(lineTotal(l))}</td>
                    <td className="col-actions">
                      <div className="row-actions">
                        <button type="button" className="icon-btn" title="Monter" onClick={() => moveLigne(idx, -1)} disabled={idx === 0}>↑</button>
                        <button type="button" className="icon-btn" title="Descendre" onClick={() => moveLigne(idx, 1)} disabled={idx === form.lignes.length - 1}>↓</button>
                        <button type="button" className="icon-btn" title="Dupliquer" onClick={() => duplicateLigne(idx)}>⧉</button>
                        <button type="button" className="icon-btn danger" title="Supprimer la ligne" onClick={() => removeLigne(idx)} disabled={form.lignes.length === 1}>×</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!readOnly && (
              <div className="lines-footer">
                <button type="button" className="btn-secondary" onClick={addLigne}>+ Ajouter une ligne</button>
                <span className="hint">Astuce : Ctrl+Entrée dans la dernière désignation ajoute une ligne.</span>
              </div>
            )}
          </section>

          <section className="panel">
            <h2 className="panel-title">Notes</h2>
            <textarea className="input" placeholder="Conditions de paiement, délai de livraison... (imprimé sur le document)" value={form.notes} onChange={(e) => patch({ notes: e.target.value })} />
          </section>
        </fieldset>

        <aside className="doc-side">
          <div className="panel summary">
            <h2 className="panel-title">Récapitulatif</h2>
            <dl>
              <dt>Total HT</dt><dd>{formatMontant(totals.sousTotal)}</dd>
              {form.avec_tva && <><dt>Total TVA</dt><dd>{formatMontant(totals.totalTva)}</dd></>}
              <dt>Timbre fiscal</dt><dd>{formatMontant(totals.timbre)}</dd>
            </dl>
            <div className="summary-total">
              <span>Total TTC</span>
              <strong>{formatMontant(totals.totalTtc)}</strong>
            </div>
            {!readOnly && (
              <div className="summary-actions">
                <button type="submit" className="btn" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
                <button type="button" className="btn-outline" disabled={saving} onClick={() => save(true)}>Enregistrer et imprimer</button>
                <button type="button" className="btn-secondary" onClick={cancel}>Annuler</button>
              </div>
            )}
            <p className="hint">Taux de TVA par défaut et timbre fiscal : modifiables dans Paramètres.</p>
          </div>
        </aside>
      </form>

      {newClient && (
        <div className="modal-backdrop" onClick={() => setNewClient(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={createClient}>
            <h2>Nouveau client</h2>
            <label>Nom *<input className="input" required autoFocus value={newClient.nom} onChange={(e) => setNewClient({ ...newClient, nom: e.target.value })} /></label>
            <label>Adresse<input className="input" value={newClient.adresse} onChange={(e) => setNewClient({ ...newClient, adresse: e.target.value })} /></label>
            <div className="form-row">
              <label>Matricule fiscal<input className="input" value={newClient.matricule_fiscal} onChange={(e) => setNewClient({ ...newClient, matricule_fiscal: e.target.value })} /></label>
              <label>Téléphone<input className="input" value={newClient.telephone} onChange={(e) => setNewClient({ ...newClient, telephone: e.target.value })} /></label>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setNewClient(null)}>Annuler</button>
              <button type="submit" className="btn">Créer le client</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
