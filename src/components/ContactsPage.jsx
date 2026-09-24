import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useToast } from '../lib/toast.jsx';
import { useDebounce } from '../lib/hooks.js';
import Modal from './Modal.jsx';

const EMPTY = { nom: '', matricule_fiscal: '', telephone: '', email: '', adresse: '', notes: '' };

// Page commune aux clients et aux fournisseurs (mêmes champs, mêmes actions)
// resource : 'clients' | 'fournisseurs' ; labels : textes propres à chaque page
export default function ContactsPage({ resource, labels }) {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  function load() {
    setLoading(true);
    api[resource]
      .list(debouncedSearch.trim() || undefined)
      .then(setItems)
      .catch(toast.error)
      .finally(() => setLoading(false));
  }

  useEffect(load, [debouncedSearch]);

  function open(item) {
    setForm({ ...EMPTY, ...item });
    setDirty(false);
    setFormError('');
  }

  function patch(p) {
    setForm((f) => ({ ...f, ...p }));
    setDirty(true);
  }

  async function save(e) {
    e.preventDefault();
    if (!form.nom.trim()) { setFormError('Le nom est requis'); return; }
    setSaving(true);
    setFormError('');
    try {
      if (form.id) await api[resource].update(form.id, form);
      else await api[resource].create(form);
      toast.success(`${form.nom} ${form.id ? labels.updated : labels.created}`);
      setForm(null);
      load();
    } catch (err) {
      setFormError(toast.messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(item) {
    if (!confirm(`Supprimer « ${item.nom} » ? Cette action est irréversible.`)) return;
    try {
      await api[resource].remove(item.id);
      toast.success(`${item.nom} ${labels.removed}`);
      load();
    } catch (err) {
      toast.error(err);
    }
  }

  const field = (key) => ({ value: form[key] || '', onChange: (e) => patch({ [key]: e.target.value }) });

  return (
    <div className="page">
      <div className="page-header">
        <h1>{labels.title}</h1>
        <button className="btn" onClick={() => open(EMPTY)}>{labels.add}</button>
      </div>

      <div className="filters">
        <input
          type="search"
          className="input"
          placeholder="Rechercher par nom ou matricule..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        {!loading && <span className="muted">{items.length} {labels.unit}{items.length > 1 ? 's' : ''}</span>}
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
          {items.map((c) => (
            <tr key={c.id}>
              <td><button className="link-strong" onClick={() => open(c)}>{c.nom}</button></td>
              <td>{c.matricule_fiscal || '—'}</td>
              <td>{c.telephone || '—'}</td>
              <td>{c.email || '—'}</td>
              <td className="cell-ellipsis" title={c.adresse || ''}>{c.adresse || '—'}</td>
              <td className="actions">
                <button className="btn-link" onClick={() => open(c)}>Modifier</button>
                <button className="btn-link danger" onClick={() => remove(c)}>Supprimer</button>
              </td>
            </tr>
          ))}
          {items.length === 0 && !loading && (
            <tr>
              <td colSpan={6} className="empty-cell">
                {search ? `Aucun résultat pour « ${search} ».` : labels.empty}
              </td>
            </tr>
          )}
          {loading && items.length === 0 && (
            <tr><td colSpan={6} className="empty-cell">Chargement...</td></tr>
          )}
        </tbody>
      </table>

      {form && (
        <Modal
          title={form.id ? labels.editTitle : labels.newTitle}
          onClose={() => setForm(null)}
          onSubmit={save}
          dirty={dirty}
          saving={saving}
          error={formError}
        >
          <label>
            Nom de l'entreprise *
            <input required autoFocus className="input" {...field('nom')} placeholder={labels.namePlaceholder} />
          </label>
          <div className="form-row">
            <label>
              Matricule fiscal
              <input className="input" {...field('matricule_fiscal')} placeholder="Ex: 000CA19957888L" />
            </label>
            <label>
              Téléphone
              <input className="input" type="tel" {...field('telephone')} placeholder="Ex: +216 22 123 456" />
            </label>
          </div>
          <label>
            Email
            <input className="input" type="email" {...field('email')} placeholder="contact@exemple.tn" />
          </label>
          <label>
            Adresse
            <textarea className="input" {...field('adresse')} placeholder="Rue, code postal, ville" />
          </label>
          <label>
            Notes
            <textarea className="input" {...field('notes')} placeholder="Informations complémentaires..." />
          </label>
        </Modal>
      )}
    </div>
  );
}
