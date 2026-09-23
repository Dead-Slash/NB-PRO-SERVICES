import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { formatMontant } from '../lib/format.js';
import { useToast } from '../lib/toast.jsx';

export default function SettingsPage() {
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [geminiKey, setGeminiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    api.settings.get().then(setForm).catch(toast.error);
    api.settings.getGeminiKey().then((k) => setGeminiKey(k || '')).catch(toast.error);
  }, []);

  useEffect(() => {
    if (form?.logo_path) {
      api.files.readAsDataUrl(form.logo_path).then(setLogoDataUrl);
    } else {
      setLogoDataUrl(null);
    }
  }, [form?.logo_path]);

  function set(field) {
    return (e) => {
      setForm({ ...form, [field]: e.target.value });
      setDirty(true);
    };
  }

  async function chooseLogo() {
    const p = await api.settings.selectLogo();
    if (p) {
      setForm({ ...form, logo_path: p });
      setDirty(true);
    }
  }

  function removeLogo() {
    setForm({ ...form, logo_path: null });
    setDirty(true);
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await api.settings.update(form);
      await api.settings.setGeminiKey(geminiKey);
      setForm(saved);
      setDirty(false);
      toast.success('Paramètres enregistrés');
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (!form) return <div className="page"><p className="muted">Chargement...</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>⚙️ Paramètres</h1>
      </div>

      <form className="settings-grid" onSubmit={save}>
        <section className="panel">
          <h2 className="panel-title">Société</h2>
          <p className="hint">Ces informations apparaissent sur tous les devis et factures (nom en en-tête, coordonnées en pied de page).</p>

          <div className="company-lock">
            <div>
              <span className="company-name">{form.nom}</span>
              <span className="hint">Le nom de la société est fixe et ne peut pas être modifié.</span>
            </div>
            <span className="lock" title="Non modifiable">🔒</span>
          </div>

          <div className="logo-row">
            {logoDataUrl ? <img src={logoDataUrl} alt="logo" className="logo-preview" /> : <div className="logo-placeholder">Aucun logo</div>}
            <div className="logo-actions">
              <button type="button" className="btn-secondary" onClick={chooseLogo}>{logoDataUrl ? 'Changer le logo' : 'Choisir un logo'}</button>
              {logoDataUrl && <button type="button" className="btn-link danger" onClick={removeLogo}>Retirer</button>}
            </div>
          </div>

          <label>Adresse<textarea className="input" rows={2} value={form.adresse || ''} onChange={set('adresse')} /></label>
          <div className="form-row">
            <label>Téléphone<input className="input" value={form.telephone || ''} onChange={set('telephone')} /></label>
            <label>Email<input type="email" className="input" value={form.email || ''} onChange={set('email')} /></label>
          </div>
          <div className="form-row">
            <label>Matricule fiscal (Code TVA)<input className="input" value={form.matricule_fiscal || ''} onChange={set('matricule_fiscal')} /></label>
            <label>Site web<input className="input" value={form.site_web || ''} onChange={set('site_web')} /></label>
          </div>
          <div className="form-row">
            <label>RIB bancaire<input className="input" value={form.rib || ''} onChange={set('rib')} /></label>
            <label>Banque<input className="input" value={form.banque || ''} onChange={set('banque')} /></label>
          </div>
        </section>

        <div className="settings-side">
          <section className="panel">
            <h2 className="panel-title">Facturation</h2>
            <label>
              Taux de TVA par défaut (%)
              <input type="number" min="0" max="100" step="any" required className="input" value={form.taux_tva_defaut} onChange={set('taux_tva_defaut')} />
              <span className="hint">Proposé sur chaque nouvelle ligne de devis ou de facture (modifiable ligne par ligne).</span>
            </label>
            <label>
              Timbre fiscal (DT)
              <input type="number" min="0" step="0.001" required className="input" value={form.timbre_fiscal} onChange={set('timbre_fiscal')} />
              <span className="hint">
                Ajouté au Total TTC des nouveaux documents ({formatMontant(form.timbre_fiscal)}). Les documents déjà enregistrés gardent leur montant.
              </span>
            </label>
          </section>

          <section className="panel">
            <h2 className="panel-title">Scan des factures d'achat (IA Gemini)</h2>
            <label>
              Clé API Gemini
              <div className="input-with-action">
                <input className="input" type={showKey ? 'text' : 'password'} value={geminiKey} onChange={(e) => { setGeminiKey(e.target.value); setDirty(true); }} placeholder="Obtenue sur aistudio.google.com" />
                <button type="button" className="btn-secondary" onClick={() => setShowKey(!showKey)}>{showKey ? 'Masquer' : 'Afficher'}</button>
              </div>
            </label>
          </section>

          <div className="save-bar">
            {dirty && <span className="hint">Modifications non enregistrées</span>}
            <button type="submit" className="btn" disabled={saving || !dirty}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
