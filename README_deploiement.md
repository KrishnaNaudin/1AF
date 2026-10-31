# Site d'évaluation en ligne — RWANDA / One Acre Fund (CRESI AgroecologIA)

45 évaluateurs, tous au même statut · **3 questions chacun** · **2 systèmes comparés en aveugle
par question (A / B)** parmi 3 : mistral-fast + corpus · openai sans corpus · agrillm + corpus.
Plan contrebalancé (graine 2026, `Plan_experimental/Rwanda_plan_randomise.R`).

Tout est en anglais (interface, invite, réponses, nuggets).

## Aveugle : rien d'identifiant dans les fichiers publics
`content.js` et `plan.js` sont lisibles par n'importe qui (code source de la page). Depuis le
31/10/2026, les réponses y sont désignées par des **codes opaques** (`r8ae783`…), dérivés d'un sel
secret. Les correspondances restent **hors dépôt**, dans `Plan_experimental/` :
`cle_devoilement.csv` (évaluateur × question × A/B → système), `cle_codes_reponses.csv`
(code → système) et `sel_codes_reponses.txt` (le sel : ne jamais le publier ni le supprimer,
sinon les codes changent).

## ⚠ Garde-fous ajoutés après l'incident Oléiculture (réponses d'une évaluatrice perdues)
À l'Oléiculture, les réponses ne partaient vers le Google Sheet **qu'au clic final « Envoyer »** ;
entre-temps elles ne vivaient que dans le navigateur. Une évaluatrice n'a pas cliqué (ou son
navigateur a été vidé) : tout était perdu.

1. **Sauvegarde serveur continue** : l'état complet de l'évaluateur part au Sheet 3 s après une
   modification (au plus un envoi toutes les 20 s, jamais deux envois simultanés), à chaque
   « Save this question ✓ », toutes les 45 s s'il reste quelque chose à envoyer, et à la
   fermeture de l'onglet. Onglet `etat` : 1 ligne fixe par évaluateur (ligne = n° + 1) ;
   onglet `journal` : TOUS les envois, jamais écrasés.
2. **Restauration depuis le serveur** à l'ouverture de `?ev=07` si l'état serveur est plus récent
   → survit à un navigateur vidé, un plantage, un changement d'appareil.
3. **Envois arrivés dans le désordre refusés** : un ancien état ne peut pas écraser un état plus
   récent (il reste tracé dans `journal`, colonne `accepte = 0`).
4. **Suivi animateur en direct** : onglet `suivi` (profil rempli, Q1/Q2/Q3, dernier contact, submit).
5. **Submit non critique** : `reponses` / `nuggets` / `ajouts` sont reconstruits depuis `etat`
   pour tous les évaluateurs, submit ou pas.

### Test de charge (31/10/2026)
La v1 du collecteur mettait **29 à 53 s par envoi** (une écriture de ligne par nugget sous verrou
global) : à 45 évaluateurs, la file d'attente aurait débordé et le site aurait affiché
« NOT saved » à tort. Collecteur réécrit (v3) puis testé avec **45 évaluateurs simultanés pendant
4 min** (`Plan_experimental/test_charge_collecteur/`) : **423 envois / 423 acceptés, 0 perte**,
latence médiane 3,1 s (p90 6,4 s, max 37 s < délai du site 60 s) ; 5 envois volontairement
périmés tous refusés ; 5 coupures de 60 s puis réouverture : état restauré exact ; à la fin,
l'état serveur des 45 évaluateurs = leur dernier envoi confirmé.

## Contenu du dossier (= racine du dépôt GitHub `1AF`)
- `index.html` — l'application (accueil → profil → 3 questions → submit) + mode saisie papier
- `config.js` — **seul fichier à éditer** : `ENDPOINT` (URL /exec), `TEST_MODE: false` le jour J
- `content.js`, `plan.js` — générés par `build_site.py` (ne pas éditer à la main)
- `apps_script_Code.gs` — copie du collecteur (le vrai est dans le projet Apps Script)
- `QR_evaluateurs.html` — planche des 45 QR codes
- `build_site.py` — régénère `content.js` / `plan.js` et les clés confidentielles :
  `python build_site.py ..` depuis ce dossier

État (31/10/2026) : **VERSION DE TEST** — `TEST_MODE: true` ; nuggets = grilles provisoires
(17 par question, atomisées sur les 84 réponses sans corpus) ; réponses « + corpus » remplacées par
les réponses sans corpus du même modèle, marquées [PROVISIONAL].

## Collecteur (Google Sheet + Apps Script)
- Sheet : `AgroecologIA_Rwanda_1AF_evaluations`
  https://docs.google.com/spreadsheets/d/1qWj4uZ7u8mK6gmo4Fci9qL8FcE0fpCBR6c-oSK755uQ/edit
- Projet Apps Script : « Collecteur AgroecologIA Rwanda 1AF » (script.google.com), version 3.
- Mise à jour du code : coller → Enregistrer → Déployer → **Gérer les déploiements → crayon →
  Version : Nouvelle version** → Déployer. (Un « Nouveau déploiement » changerait l'URL.)
- `…/exec?action=rebuild` : reconstruit `reponses` / `nuggets` / `ajouts` (à ouvrir dans le
  navigateur pendant ou après l'atelier).
- `reinitialiser_etat_suivi()` (à lancer depuis l'éditeur, **jamais pendant l'atelier**) : vide
  `etat` / `suivi` / onglets plats et renomme `journal` en `journal_tests_<date>`. À lancer une
  dernière fois juste avant l'atelier pour effacer les tests.

## Publication (GitHub Pages)
Dépôt `KrishnaNaudin/1AF` (compte **KrishnaNaudin**, PAS le compte perso), poussé par K. Naudin
via GitHub Desktop. URL : https://krishnanaudin.github.io/1AF/

## Version papier
- Livrets : `Livrets_papier/build_livrets_rwanda.py` lit **les mêmes** `content.js` et `plan.js`
  que le site (même ordre des questions, même A/B, mêmes nuggets) :
  `python Livrets_papier/build_livrets_rwanda.py . [07 12 …]` depuis `12_Rwanda_OneAcreFund`
  → `Livrets_papier/pdf/Booklet_evaluator_NN.pdf` (≈ 20 pages A4 chacun).
  Tant qu'une réponse est provisoire, chaque page porte « PROVISIONAL — DO NOT PRINT ».
- Saisie : **le même site**, même Sheet.
  - 1re saisie : `https://krishnanaudin.github.io/1AF/?ev=07&saisie=1` → ligne de l'évaluateur 07.
  - 2e saisie indépendante (contrôle, recommandée) : `?ev=07&saisie=2` → stockée en 507,
    exclue de `reponses` ; comparer 07 et 507 avant analyse.
  - L'opérateur saisit ses initiales ; colonnes `mode` et `operateur_saisie` dans `reponses`.

## Jour J
- Dernier `reinitialiser_etat_suivi()`, `TEST_MODE: false`, régénérer le contenu, pousser.
- Distribuer les QR ; garder l'onglet `suivi` ouvert pendant la notation.
- À la fin : `…/exec?action=rebuild`, puis télécharger le Sheet (xlsx) dans
  `12_Rwanda_OneAcreFund/Evaluations/` — c'est le classeur maître.
