import { useNavigate } from 'react-router-dom';
import DocumentForm from '../../components/DocumentForm.jsx';

export default function FactureFormPage() {
  const navigate = useNavigate();
  return (
    <DocumentForm
      kind="factures"
      title="Nouvelle facture"
      backPath="/factures"
      onSaved={(facture) => navigate(`/factures/${facture.id}`)}
    />
  );
}
