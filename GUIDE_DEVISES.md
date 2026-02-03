# 💰 Guide : Gestion Multi-Devises

## 🔍 Problème : Le sélecteur de devise n'apparaît pas

Si vous ne voyez pas le sélecteur de devise dans le formulaire de création de facture, voici comment résoudre le problème :

## ✅ Solution Étape par Étape

### Étape 1 : Vérifier que la migration a été appliquée

La migration doit créer les devises par défaut (XOF, EUR, USD) dans la base de données.

```bash
cd backend
npx prisma migrate deploy
```

Vous devriez voir :
```
Applying migration `20260204000003_add_multi_devises`
```

### Étape 2 : Vérifier que les devises existent en base

Connectez-vous à votre base PostgreSQL et vérifiez :

```sql
SELECT * FROM "Devise";
```

Vous devriez voir 3 lignes :
- XOF (Franc CFA) - estParDefaut = true
- EUR (Euro) - estParDefaut = false
- USD (Dollar US) - estParDefaut = false

Si les devises n'existent pas, exécutez manuellement :

```sql
INSERT INTO "Devise" ("id", "code", "nom", "symbole", "estParDefaut", "actif", "createdAt", "updatedAt")
VALUES 
  ('dev_xof', 'XOF', 'Franc CFA', 'FCFA', true, true, NOW(), NOW()),
  ('dev_eur', 'EUR', 'Euro', '€', false, true, NOW(), NOW()),
  ('dev_usd', 'USD', 'Dollar US', '$', false, true, NOW(), NOW())
ON CONFLICT ("code") DO NOTHING;
```

### Étape 3 : Vérifier que le backend est démarré

```bash
cd backend
npm run start:dev
```

### Étape 4 : Tester l'endpoint API

Ouvrez votre navigateur et allez sur :
```
http://localhost:3001/devises
```

Vous devriez voir un JSON avec les 3 devises :
```json
[
  {
    "id": "dev_xof",
    "code": "XOF",
    "nom": "Franc CFA",
    "symbole": "FCFA",
    "estParDefaut": true,
    "actif": true
  },
  {
    "id": "dev_eur",
    "code": "EUR",
    "nom": "Euro",
    "symbole": "€",
    "estParDefaut": false,
    "actif": true
  },
  {
    "id": "dev_usd",
    "code": "USD",
    "nom": "Dollar US",
    "symbole": "$",
    "estParDefaut": false,
    "actif": true
  }
]
```

### Étape 5 : Vérifier la console du navigateur

1. Ouvrez la page Factures dans votre application
2. Appuyez sur `F12` pour ouvrir les outils de développement
3. Allez dans l'onglet **Console**
4. Regardez s'il y a des erreurs lors du chargement des devises

### Étape 6 : Recharger la page

Après avoir vérifié que tout est en place, **rechargez complètement la page** (Ctrl+F5 ou Cmd+Shift+R).

## 🎯 Où trouver le sélecteur de devise

Le sélecteur de devise devrait apparaître dans le formulaire "Nouvelle facture (simple)" :

```
┌─────────────────────────────────────┐
│ Nouvelle facture (simple)           │
├─────────────────────────────────────┤
│ Client: [Sélecteur]                 │
│ Date: [Date picker]                 │
│ Devise: [XOF (FCFA) ▼]  ← ICI      │
│ Désignation: [Input]                │
│ ...                                 │
└─────────────────────────────────────┘
```

**Position** : Juste après le champ "Date", avant "Désignation"

## 🔧 Si le sélecteur n'apparaît toujours pas

### Solution temporaire : Fallback côté frontend

J'ai ajouté un fallback dans le code qui affiche les devises par défaut même si l'API ne répond pas. Le sélecteur devrait apparaître avec :
- XOF (FCFA)
- EUR (€)
- USD ($)

### Vérifications supplémentaires

1. **Vérifiez que le module DevisesModule est bien enregistré** :
   - Ouvrez `backend/src/app.module.ts`
   - Vérifiez que `DevisesModule` est dans la liste des imports

2. **Vérifiez les logs du backend** :
   - Regardez le terminal où tourne le backend
   - Cherchez des erreurs liées à `/devises`

3. **Testez l'endpoint directement** :
   ```bash
   curl http://localhost:3001/devises
   ```

## 📝 Test Complet

Une fois que le sélecteur apparaît :

1. **Créer une facture en EUR** :
   - Sélectionnez un client
   - Mettez une date
   - **Choisissez "EUR (€)" dans le sélecteur Devise**
   - Remplissez : Désignation = "Test", Quantité = 1, PU = 100, TVA = 18%
   - Cliquez sur "Créer la facture"

2. **Vérifier dans la liste** :
   - La colonne **"Devise"** devrait afficher : `118,00 EUR`
   - Les colonnes **"Total HT"** et **"Total TTC"** devraient afficher les montants convertis en **FCFA** (environ 77 400 FCFA si taux = 656 XOF/EUR)

3. **Vérifier dans la base de données** :
   ```sql
   SELECT "numero", "deviseId", "tauxChange", "montantDeviseEtrangere", "totalTTC"
   FROM "Facture"
   ORDER BY "createdAt" DESC
   LIMIT 1;
   ```

   Vous devriez voir :
   - `deviseId` = "EUR"
   - `tauxChange` = environ 656
   - `montantDeviseEtrangere` = 118
   - `totalTTC` = environ 77 400 (118 * 656)

## 🆘 Besoin d'aide ?

Si le problème persiste après avoir suivi ces étapes, vérifiez :
- Les logs du backend pour les erreurs
- La console du navigateur (F12) pour les erreurs JavaScript
- Que la migration a bien été appliquée (`npx prisma migrate status`)
