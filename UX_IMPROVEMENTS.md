# NB PRO SERVICES - Guide des Améliorations UX

## Améliorations Implémentées ✅

### 1. **Données de Société Pré-remplies**
- Nom: NB PRO SERVICES
- Téléphone: +216 22417780  
- Adresse: 43 rue de l'énergie, 2035 Charguia 1, Tunis
- Code TVA (Matricule Fiscal): 000CA19957888L
- RIB: 25149000000165954869

Ces informations apparaissent automatiquement dans:
- Les en-têtes des PDF (devis et factures)
- Les pieds de page des PDF
- La page Paramètres (le nom de la société est fixe : l'application est dédiée à NB PRO SERVICES)

### 2. **Design Moderne & Cohérent**
- Palette de couleurs professionnelle
- Icônes emojis visuels pour chaque section
- Spacing et padding uniformes
- Ombres subtiles pour la profondeur
- Animations fluides (fade-in, slide-up)

### 3. **Meilleur Feedback Utilisateur**
Chaque action affiche maintenant un message:
- ✅ **Succès**: "Client créé ✓", "Achat enregistré ✓"
- ❌ **Erreur**: Messages clairs en cas de problème
- 🔄 **Chargement**: Indication visuelle pendant les requêtes
- 📄 **Actions**: Boutons intuitifs avec icônes

### 4. **Navigation Intuitive**
Chaque section de la barre latérale a une icône emoji:
- 📊 Tableau de bord
- 📋 Devis
- 💳 Factures
- 👥 Clients
- 🏢 Fournisseurs
- 🛒 Achats
- ⚙️ Paramètres

### 5. **Formulaires Améliorés**
- Auto-focus sur le premier champ
- Validations claires (champs requis marqués avec *)
- Labels descriptifs
- Modales avec animations smooth
- Boutons d'action contextuels

### 6. **Listes & Tableaux**
- Recherche en temps réel
- Filtres par statut
- Messages "Aucun résultat" contextuels
- Nombre d'éléments affiché
- Hover effects sur les lignes

### 7. **Confirmations de Suppression**
Avant toute suppression, l'utilisateur est invité à confirmer:
```
"Supprimer cet achat ? Cette action est irréversible."
```

### 8. **Dashboard Amélioré**
- KPI avec emojis visuels
- Boutons d'action rapide ("+ Devis", "+ Facture")
- Tables des dernières transactions
- Liens rapides vers les détails

### 9. **Fenêtres et listes plus confortables**
- Modales : `Échap` ou clic à l'extérieur pour fermer, avec confirmation s'il reste des modifications non enregistrées
- Les erreurs de saisie s'affichent dans la modale (et non plus derrière elle)
- Bouton « Enregistrement... » désactivé pendant la sauvegarde (plus de double clic)
- Clients, fournisseurs et achats utilisent les notifications éphémères
- Recherche sans requête à chaque frappe ; la liste ne clignote plus pendant le rechargement
- Suppression d'un client/fournisseur encore utilisé : message clair au lieu d'une erreur SQLite
- Tableau de bord : cartes et compteurs cliquables, qui ouvrent la liste déjà filtrée
- Factures : filtre « Non soldées (à recouvrer) »

### 10. **Achats**
- Recherche par fournisseur / n° de facture, filtre par période, total TTC en pied de tableau
- TTC calculé automatiquement à partir du HT et de la TVA (modifiable)
- Après le scan Gemini, le fournisseur est sélectionné automatiquement s'il existe déjà
- Nom du fichier joint affiché

## Comment Utiliser

### Démarrer l'App
```bash
npm run dev
```
L'app se lance sur `http://localhost:5173/`

### Créer un Build
```bash
npm run build
```
Crée un bundle optimisé dans `dist/`

### Créer un Installer
```bash
npm run dist
```
Génère un installateur Windows .exe dans `release/`

## Fonctionnalités Clés

### 📋 Devis
1. Créer un nouveau devis ("+ Nouveau devis")
2. Sélectionner un client et ajouter des lignes
3. Valider le devis → Crée une facture automatiquement
4. Imprimer en PDF

### 💳 Factures
1. Créer une facture (manuelle ou depuis un devis validé)
2. Enregistrer les paiements reçus
3. Statut de paiement automatique (impayée → partiellement payée → payée)
4. Imprimer en PDF

### 🛒 Achats
1. Enregistrer une facture fournisseur
2. Scanner l'image avec Gemini AI (champs auto-remplissage)
   - Détecte: fournisseur, numéro, date, montants
3. Valider et enregistrer

### 🤖 Scan Gemini
- Télécharger une image de facture
- Cliquer "Scanner avec Gemini"
- Les champs se remplissent automatiquement:
  - Nom du fournisseur
  - Numéro de facture
  - Date
  - Montants HT, TVA, TTC

### 👥 Clients & 🏢 Fournisseurs
- Gestion CRUD complète
- Recherche en temps réel
- Champs: Nom, Matricule Fiscal, Téléphone, Email, Adresse, Notes

### ⚙️ Paramètres
- Modifier les coordonnées de l'entreprise (logo, adresse, téléphone, RIB...) ; le nom est fixe
- Définir le taux de TVA par défaut et le montant du timbre fiscal
- Indiquer la clé API Gemini pour le scanning
- Les infos apparaissent dans tous les PDF

## Amélioration Futures Possibles

### Productivité
- [ ] Raccourcis clavier (Ctrl+N pour nouveau, Ctrl+P pour imprimer)
- [ ] Recherche globale (Ctrl+K)
- [ ] Modèles de devis réutilisables
- [ ] Duplication de devis/factures
- [ ] Export CSV/Excel

### Avancé
- [ ] Multi-utilisateurs avec permissions
- [ ] Historique d'activité (qui a modifié quoi)
- [ ] Notifications par email
- [ ] Synchronisation cloud
- [ ] Code QR sur les PDF
- [ ] Paiements en ligne intégrés

### Analytics
- [ ] Graphiques de chiffre d'affaires
- [ ] Comparaison année sur année
- [ ] Prévisions basées sur historique
- [ ] Analyse des clients top
- [ ] Temps de paiement moyen

### UI/UX
- [ ] Mode sombre
- [ ] Responsif mobile (webapp)
- [ ] Drag-drop pour réorganiser les lignes
- [ ] Auto-save des formulaires
- [ ] Undo/Redo

## Dépannage

**L'app ne démarre pas?**
```bash
rm -r node_modules dist data
npm install
npm run dev
```

**Erreur "Gemini API key not found"?**
→ Allez à Paramètres et ajoutez votre clé API Gemini

**Les PDF ne s'impriment pas?**
→ Vérifiez que vous avez sélectionné un client et ajouté des lignes au devis/facture

**La DB est corrompue?**
→ Supprimez `data/nbpro.db` et relancez l'app (elle sera recréée vierge)

## Support
Pour modifier les coordonnées de la société, le taux de TVA par défaut ou le timbre fiscal, allez à **⚙️ Paramètres**. Les modifications apparaîtront immédiatement dans les PDF générés.
