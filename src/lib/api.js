// Proxy léger qui appelle window.api (exposé par preload.js) de façon paresseuse
function getApi() {
  if (typeof window !== 'undefined' && window.api) return window.api;
  throw new Error("L'API Electron n'est pas disponible. Lancez l'application via Electron.");
}

export const api = new Proxy(
  {},
  {
    get(_, namespace) {
      return new Proxy(
        {},
        {
          get(__, method) {
            return (...args) => getApi()[namespace][method](...args);
          },
        }
      );
    },
  }
);
