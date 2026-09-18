const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel) => (...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld('api', {
  clients: {
    list: invoke('clients:list'),
    get: invoke('clients:get'),
    create: invoke('clients:create'),
    update: invoke('clients:update'),
    remove: invoke('clients:remove'),
  },
  fournisseurs: {
    list: invoke('fournisseurs:list'),
    get: invoke('fournisseurs:get'),
    create: invoke('fournisseurs:create'),
    update: invoke('fournisseurs:update'),
    remove: invoke('fournisseurs:remove'),
  },
  devis: {
    list: invoke('devis:list'),
    get: invoke('devis:get'),
    create: invoke('devis:create'),
    update: invoke('devis:update'),
    updateStatut: invoke('devis:updateStatut'),
    remove: invoke('devis:remove'),
    print: invoke('devis:print'),
  },
  factures: {
    list: invoke('factures:list'),
    get: invoke('factures:get'),
    create: invoke('factures:create'),
    update: invoke('factures:update'),
    addPaiement: invoke('factures:addPaiement'),
    remove: invoke('factures:remove'),
    print: invoke('factures:print'),
  },
  achats: {
    list: invoke('achats:list'),
    get: invoke('achats:get'),
    create: invoke('achats:create'),
    update: invoke('achats:update'),
    remove: invoke('achats:remove'),
    scan: invoke('achats:scan'),
    selectImage: invoke('achats:selectImage'),
  },
  dashboard: {
    summary: invoke('dashboard:summary'),
  },
  settings: {
    get: invoke('settings:get'),
    update: invoke('settings:update'),
    selectLogo: invoke('settings:selectLogo'),
    getGeminiKey: invoke('settings:getGeminiKey'),
    setGeminiKey: invoke('settings:setGeminiKey'),
  },
  files: {
    openPath: invoke('files:openPath'),
    readAsDataUrl: invoke('files:readAsDataUrl'),
  },
});
