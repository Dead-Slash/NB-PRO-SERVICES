# NB PRO SERVICES — Logiciel de facturation

Application Windows (Electron + React) pour la gestion des devis, factures, clients, fournisseurs et factures d'achat, avec tableau de bord financier et scan IA (Gemini) des factures d'achat.

## Fonctionnalités

- **Devis** : création avec ou sans TVA, statut *en attente* / *validé* / *annulé*. La validation d'un devis génère automatiquement la facture correspondante (le devis validé n'est plus modifiable).
- **Factures** : création manuelle (avec/sans TVA) ou automatique depuis un devis validé. Suivi des paiements (partiels/total) avec statut *impayée* / *partiellement payée* / *payée*.
- **Clients** et **Fournisseurs** : fiches avec matricule fiscal, coordonnées, adresse.
- **Factures d'achat** : enregistrement manuel ou par scan d'image avec extraction automatique des champs via l'API Gemini (fournisseur, date, montants, n° facture).
- **Tableau de bord** : argent encaissé, argent dépensé, bénéfice, factures impayées, derniers documents.
- **Impression** : devis et factures sont générés en PDF selon une mise en page à la tunisienne (logo + nom de la société en haut à gauche, n°/date en haut à droite, infos client, tableau des lignes, totaux, coordonnées de la société — tél, email, matricule fiscal, RIB — en pied de page).

## Installation

```powershell
npm install
```

`better-sqlite3` est un module natif : la commande `postinstall` (`electron-builder install-app-deps`) le recompile automatiquement pour la version d'Electron utilisée.

## Lancer en développement

```powershell
npm run dev
```

Cela démarre le serveur Vite (front React) et Electron en parallèle.

## Configurer le scan IA (Gemini)

1. Créez une clé API sur [aistudio.google.com](https://aistudio.google.com/).
2. Dans l'application, ouvrez **Paramètres** et collez la clé dans le champ « Clé API Gemini ».
3. Renseignez aussi les informations de la société (nom, logo, adresse, téléphone, email, matricule fiscal, RIB) : elles apparaissent sur tous les documents imprimés.

## Générer l'exécutable Windows (.exe)

```powershell
npm run dist
```

L'installeur est généré dans le dossier `release/`.

## Emplacement des données

- En développement : dossier `data/` à la racine du projet (base SQLite `nbpro.db`, `uploads/` pour les images et logos, `documents/` pour les PDF générés).
- Une fois installée (.exe) : dossier utilisateur Windows (`%APPDATA%/NB PRO Services - Facturation`).

Toutes les données restent locales sur le poste ; aucune donnée n'est envoyée à un serveur externe, à l'exception de l'image envoyée à l'API Gemini lors d'un scan explicite.
