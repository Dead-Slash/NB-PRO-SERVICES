import { useEffect } from 'react';

// Fenêtre modale de formulaire : Échap ou clic à l'extérieur pour fermer (avec confirmation
// si des modifications ne sont pas enregistrées), erreur affichée dans la modale elle-même.
export default function Modal({ title, onClose, onSubmit, dirty, error, saving, submitLabel = 'Enregistrer', children }) {
  function requestClose() {
    if (saving) return;
    if (dirty && !confirm('Fermer sans enregistrer les modifications ?')) return;
    onClose();
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') requestClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && requestClose()}>
      <form className="modal" onSubmit={onSubmit} role="dialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        {error && <p className="error" role="alert">{error}</p>}
        {children}
        <div className="modal-actions">
          <span className="hint modal-hint">Échap pour fermer</span>
          <button type="button" className="btn-secondary" onClick={requestClose} disabled={saving}>Annuler</button>
          <button type="submit" className="btn" disabled={saving}>{saving ? 'Enregistrement...' : submitLabel}</button>
        </div>
      </form>
    </div>
  );
}
