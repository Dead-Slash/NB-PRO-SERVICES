import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function SettingsPage() {
  const [form, setForm] = useState(null);
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [geminiKey, setGeminiKey] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.settings.get().then(setForm);
    api.settings.getGeminiKey().then((k) => setGeminiKey(k || ''));
  }, []);

  useEffect(() => {
    if (form?.logo_path) {
      api.files.readAsDataUrl(form.logo_path).then(setLogoDataUrl);
    } else {
      setLogoDataUrl(null);
    }
  }, [form?.logo_path]);

  async function chooseLogo() {
    const p = await api.settings.selectLogo();
    if (p) setForm({ ...form, logo_path: p });
  }

  async function save(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.settings.update(form);
      await api.settings.setGeminiKey(geminiKey);
      setMessage('Paramètres enregistrés.');
    } catch (err) { setError(err.message); }
  }

  if (!form) return <div className="page">Chargement...</div>;

  return (
    <div className="page">
      <h1>Paramètres de la société</h1>
      <p style={{ color: '#6b7280', fontSize: 13 }}>
        Ces informations apparaissent sur tous les devis et factures imprimés (logo et nom en haut, coordonnées en pied de page).
      </p>
      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}
      <form className="form-wide" onSubmit={save}>
        <div className="form-row">
          <button type="button" className="btn-secondary" onClick={chooseLogo}>Choisir un logo</button>
          {logoDataUrl && <img src={logoDataUrl} alt="logo" className="logo-preview" />}
        </div>
        <label>Nom de la société *<input required className="input" value={form.nom || ''} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></label>
        <label>Adresse<textarea className="input" value={form.adresse || ''} onChange={(e) => setForm({ ...form, adresse: e.target.value })} /></label>
        <label>Téléphone<input className="input" value={form.telephone || ''} onChange={(e) => setForm({ ...form, telephone: e.target.value })} /></label>
        <label>Email<input className="input" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>Matricule fiscal<input className="input" value={form.matricule_fiscal || ''} onChange={(e) => setForm({ ...form, matricule_fiscal: e.target.value })} /></label>
        <label>RIB bancaire<input className="input" value={form.rib || ''} onChange={(e) => setForm({ ...form, rib: e.target.value })} /></label>
        <label>Banque<input className="input" value={form.banque || ''} onChange={(e) => setForm({ ...form, banque: e.target.value })} /></label>
        <label>Site web<input className="input" value={form.site_web || ''} onChange={(e) => setForm({ ...form, site_web: e.target.value })} /></label>

        <h2>Scan de factures d'achat (IA Gemini)</h2>
        <label>
          Clé API Gemini
          <input className="input" type="password" value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} placeholder="Obtenue sur aistudio.google.com" />
        </label>

        <div className="modal-actions">
          <button type="submit" className="btn">Enregistrer</button>
        </div>
      </form>
    </div>
  );
}
