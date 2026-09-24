import { createContext, useCallback, useContext, useMemo, useState } from 'react';

// Notifications éphémères (en bas à droite) : remplacent les messages qui restaient affichés indéfiniment
const ToastContext = createContext(null);

let nextId = 1;

// Les erreurs venant d'Electron arrivent sous la forme
// "Error invoking remote method 'x': Error: message" : on ne garde que le message utile.
export function messageOf(err) {
  const raw = err instanceof Error ? err.message : String(err);
  return raw.replace(/^Error invoking remote method '[^']*': (\w*Error: )?/, '');
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback((type, message) => {
    const id = nextId++;
    setToasts((list) => [...list, { id, type, message }]);
    setTimeout(() => dismiss(id), type === 'error' ? 7000 : 3500);
  }, [dismiss]);

  const api = useMemo(() => ({
    success: (m) => push('success', m),
    error: (m) => push('error', messageOf(m)),
    messageOf,
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} onClick={() => dismiss(t.id)}>
            <span className="toast-icon">{t.type === 'error' ? '!' : '✓'}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
