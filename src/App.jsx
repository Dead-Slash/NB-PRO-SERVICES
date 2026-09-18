import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ClientsPage from './pages/Clients.jsx';
import FournisseursPage from './pages/Fournisseurs.jsx';
import DevisListPage from './pages/Devis/DevisList.jsx';
import DevisFormPage from './pages/Devis/DevisForm.jsx';
import FacturesListPage from './pages/Factures/FacturesList.jsx';
import FactureFormPage from './pages/Factures/FactureForm.jsx';
import FactureViewPage from './pages/Factures/FactureView.jsx';
import AchatsPage from './pages/Achats/AchatsList.jsx';
import SettingsPage from './pages/Settings.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/devis" element={<DevisListPage />} />
        <Route path="/devis/nouveau" element={<DevisFormPage />} />
        <Route path="/devis/:id" element={<DevisFormPage />} />
        <Route path="/factures" element={<FacturesListPage />} />
        <Route path="/factures/nouvelle" element={<FactureFormPage />} />
        <Route path="/factures/:id" element={<FactureViewPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/fournisseurs" element={<FournisseursPage />} />
        <Route path="/achats" element={<AchatsPage />} />
        <Route path="/parametres" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
