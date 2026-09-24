import ContactsPage from '../components/ContactsPage.jsx';

const LABELS = {
  title: '🏢 Fournisseurs',
  add: '+ Nouveau fournisseur',
  unit: 'fournisseur',
  newTitle: 'Nouveau fournisseur',
  editTitle: 'Modifier le fournisseur',
  namePlaceholder: 'Ex: Distributeur XYZ',
  empty: 'Aucun fournisseur pour le moment. Cliquez sur « + Nouveau fournisseur » pour commencer.',
  created: 'ajouté aux fournisseurs',
  updated: 'modifié',
  removed: 'supprimé',
};

export default function FournisseursPage() {
  return <ContactsPage resource="fournisseurs" labels={LABELS} />;
}
