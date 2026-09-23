import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { STATUTS_DEVIS } from '../../lib/format.js';
import { useToast } from '../../lib/toast.jsx';
import DocumentForm from '../../components/DocumentForm.jsx';

export default function DevisFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [devis, setDevis] = useState(null);

  useEffect(() => {
    if (!id) return;
    api.devis.get(Number(id)).then(setDevis).catch(toast.error);
  }, [id]);

  const initial = useMemo(() => devis && {
    date: devis.date,
    client_id: devis.client_id,
    avec_tva: !!devis.avec_tva,
    notes: devis.notes || '',
    lignes: devis.lignes.map((l) => ({ description: l.description, quantite: l.quantite, prix_unitaire: l.prix_unitaire, taux_tva: l.taux_tva })),
  }, [devis]);

  if (id && !devis) return <div className="page"><p className="muted">Chargement...</p></div>;

  return (
    <DocumentForm
      kind="devis"
      id={id}
      title={devis ? `Devis ${devis.numero}` : 'Nouveau devis'}
      backPath="/devis"
      initial={initial}
      readOnlyReason={devis && devis.statut !== 'attente'
        ? `Ce devis est « ${STATUTS_DEVIS[devis.statut].label} » : il n'est plus modifiable. Vous pouvez toujours l'imprimer depuis la liste.`
        : null}
      onSaved={() => navigate('/devis')}
    />
  );
}
