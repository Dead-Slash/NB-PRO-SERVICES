import { useEffect, useState } from 'react';

// Retarde la mise à jour d'une valeur (évite une requête à chaque frappe dans les recherches)
export function useDebounce(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
