import ContactsPage from '../components/ContactsPage.jsx';

const LABELS = {
  title: '👥 Clients',
  add: '+ Nouveau client',
  unit: 'client',
  newTitle: 'Nouveau client',
  editTitle: 'Modifier le client',
  namePlaceholder: 'Ex: ABC Services SARL',
  empty: 'Aucun client pour le moment. Cliquez sur « + Nouveau client » pour commencer.',
  created: 'ajouté aux clients',
  updated: 'modifié',
  removed: 'supprimé',
};

export default function ClientsPage() {
  return <ContactsPage resource="clients" labels={LABELS} />;
}
