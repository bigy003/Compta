# 🔍 Guide de Débogage : Affichage Devise dans le Tableau

## Problème : La devise EUR n'apparaît pas dans le tableau

### ✅ Vérifications à faire

#### 1. Vérifier que la facture a bien été créée avec EUR

**Dans la console du navigateur (F12 → Console)**, après avoir créé une facture en EUR, vérifiez :

1. Ouvrez l'onglet **Network**
2. Trouvez la requête `POST /societes/.../factures`
3. Cliquez dessus → onglet **Payload**
4. Vérifiez que `deviseCode: "EUR"` est bien présent

#### 2. Vérifier la réponse de création

Dans l'onglet **Response** de la requête POST, vous devriez voir :

```json
{
  "id": "...",
  "numero": "FACT-...",
  "deviseId": "EUR",
  "tauxChange": 656.0,
  "montantDeviseEtrangere": 118.0,
  "totalTTC": 77408.0,
  ...
}
```

#### 3. Vérifier la liste des factures

1. Trouvez la requête `GET /societes/.../factures`
2. Cliquez dessus → onglet **Response**
3. Vérifiez que la facture créée contient :

```json
{
  "id": "...",
  "deviseId": "EUR",
  "montantDeviseEtrangere": 118.0,
  "totalTTC": 77408.0,
  ...
}
```

**Si `deviseId` est `null` ou absent**, le problème vient de la création.

**Si `deviseId` est `"EUR"` mais que `montantDeviseEtrangere` est `null`**, le problème vient du calcul backend.

#### 4. Vérifier dans la base de données

Connectez-vous à PostgreSQL et exécutez :

```sql
SELECT 
  "numero", 
  "deviseId", 
  "tauxChange", 
  "montantDeviseEtrangere", 
  "totalTTC",
  "createdAt"
FROM "Facture"
ORDER BY "createdAt" DESC
LIMIT 5;
```

Vous devriez voir pour une facture en EUR :
- `deviseId` = `"EUR"`
- `tauxChange` = `656.0` (environ)
- `montantDeviseEtrangere` = `118.0` (si vous avez créé une facture de 100 EUR + 18% TVA)
- `totalTTC` = `77408.0` (118 * 656)

### 🔧 Solutions selon le problème

#### Problème 1 : `deviseId` est `null` dans la base

**Cause** : La facture a été créée avant l'ajout du code multi-devises, ou le champ `deviseCode` n'a pas été envoyé.

**Solution** : Créez une nouvelle facture en sélectionnant EUR dans le sélecteur.

#### Problème 2 : `montantDeviseEtrangere` est `null`

**Cause** : Le calcul backend n'a pas fonctionné correctement.

**Solution** : Vérifiez les logs du backend pour voir s'il y a des erreurs lors de la création.

#### Problème 3 : Les données sont correctes mais n'apparaissent pas dans le tableau

**Cause** : Problème d'affichage frontend.

**Solution** : 
1. Rechargez complètement la page (Ctrl+F5)
2. Vérifiez la console pour des erreurs JavaScript
3. Vérifiez que vous êtes sur la bonne page (PME ou Expert)

### 🧪 Test Complet

1. **Créez une nouvelle facture en EUR** :
   - Client : n'importe lequel
   - Date : aujourd'hui
   - **Devise : EUR (€)**
   - Désignation : "Test EUR"
   - Quantité : 1
   - PU : 100
   - TVA : 18%
   - Cliquez sur "Créer la facture"

2. **Vérifiez dans le tableau** :
   - La colonne **"Devise"** devrait afficher : `118,00 EUR`
   - Les colonnes **"Total HT"** et **"Total TTC"** devraient afficher des montants en FCFA (environ 77 400 FCFA)

3. **Si ça ne fonctionne toujours pas** :
   - Ouvrez la console (F12)
   - Regardez les requêtes réseau
   - Vérifiez les données retournées par l'API
   - Partagez-moi ce que vous voyez

### 📝 Format Attendu dans le Tableau

Pour une facture créée en EUR avec :
- PU : 100 EUR
- TVA : 18%
- Total TTC : 118 EUR

Le tableau devrait afficher :

| Devise | Total HT | Total TTC |
|--------|----------|-----------|
| **118,00 EUR** | 65 600 FCFA | 77 408 FCFA |

(En supposant un taux de 656 XOF/EUR)
