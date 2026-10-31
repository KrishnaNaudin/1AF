# Site d'évaluation en ligne — RWANDA / One Acre Fund (CRESI AgroecologIA)

40 évaluateurs (+ 5 de réserve, n° 41-45) · **3 questions chacun** · **2 systèmes comparés en aveugle
par question (A / B)** parmi 3 : mistral-fast + corpus · openai sans corpus · agrillm + corpus.
Plan contrebalancé (graine 2026, `Plan_experimental/Rwanda_plan_randomise.R`) ; la correspondance
A/B ↔ système est **confidentielle** (`Plan_experimental/cle_devoilement.csv`, hors dépôt).

Tout est en anglais (interface, invite, réponses).

## ⚠ Garde-fous ajoutés après l'incident Oléiculture (réponses d'une évaluatrice perdues)
À l'Oléiculture, les réponses ne partaient vers le Google Sheet **qu'au clic final « Envoyer »** ;
entre-temps elles ne vivaient que dans le `localStorage` du navigateur. Une évaluatrice n'a pas
cliqué (ou son navigateur a été vidé) : tout était perdu, récupération impossible.

Ce site corrige cela à quatre niveaux :

1. **Sauvegarde serveur continue** : chaque modification est envoyée au Google Sheet 2,5 s plus tard
   (autosave), plus à chaque « Save this question ✓ », plus toutes les 45 s si quelque chose a changé,
   plus à la fermeture de l'onglet. L'onglet `etat` garde le dernier état complet de chaque
   évaluateur ; l'onglet `journal` garde TOUS les envois (rien n'est jamais écrasé là).
2. **Restauration depuis le serveur** : à l'ouverture de `?ev=07`, le site demande au serveur le
   dernier état et le reprend s'il est plus récent que la copie locale → survit à un navigateur
   vidé, un plantage, un changement de téléphone ou d'ordinateur.
3. **Suivi animateur en direct** : l'onglet `suivi` montre, pour chaque évaluateur, profil rempli,
   statut Q1/Q2/Q3 (complete / partial / empty), dernier contact, submit. Pendant l'atelier (3 h en
   ligne), l'animateur voit qui décroche et relance avant la fin.
4. **Le bouton « Submit » n'est plus critique** : il ne fait que marquer l'évaluation terminée.
   `rebuild()` (dans l'Apps Script) reconstruit les onglets plats `reponses` / `nuggets` / `ajouts`
   pour TOUS les évaluateurs, submit ou pas. Sauvegarde JSON téléchargeable à tout moment ;
   consigne d'e-mail de secours affichée sur toute erreur.

Témoin à l'écran : la pastille en haut (« saved 10:42 » vert / « NOT saved on server » rouge).

## Contenu du dossier (= racine du dépôt GitHub `1AF`)
- `index.html` — l'application (accueil → profil → 3 questions → submit)
- `config.js` — **seul fichier à éditer** : `ENDPOINT` (URL /exec), `TEST_MODE: false` le jour J
- `content.js` — 12 questions, nuggets, réponses des 3 systèmes (généré par `build_site.py`)
- `plan.js` — ordre des questions et A/B par évaluateur (généré)
- `apps_script_Code.gs` — collecteur à coller dans le Google Sheet
- `QR_evaluateurs.html` — planche des 45 QR codes
- `build_site.py` — régénère `content.js` / `plan.js` / `cle_devoilement.csv` depuis `Plan_experimental/`

État actuel (31/10/2026) : **VERSION DE TEST** — `TEST_MODE: true`, nuggets factices, réponses
« + corpus » remplacées par les réponses sans corpus (marquées [PROVISIONAL]), Q05-Q12 sans
réponse. À régénérer avec `build_site.py` quand le pool et les grilles de nuggets seront complets.

## Étape A — collecteur Google Sheet (Apps Script)
1. Ouvrir le Google Sheet `AgroecologIA_Rwanda_1AF_evaluations` (créé le 31/10/2026 dans Mon Drive) :
   https://docs.google.com/spreadsheets/d/1qWj4uZ7u8mK6gmo4Fci9qL8FcE0fpCBR6c-oSK755uQ/edit
2. **Extensions → Apps Script** → coller tout `apps_script_Code.gs` → Enregistrer.
3. **Déployer → Nouveau déploiement → Application web** : exécuter en tant que **Moi**,
   accès **Tout le monde** → Déployer → autoriser → copier l'**URL /exec**.
4. Coller l'URL dans `config.js` → `ENDPOINT`.
5. Test : ouvrir `https://script.google.com/macros/s/…/exec?action=state&ev=01` dans le
   navigateur → doit répondre `{"ok":true,"state":null}`.
   (Le script crée les onglets au premier envoi : `journal`, `etat`, `reponses`, `nuggets`, `ajouts`, `suivi`.)

## Étape B — publier (GitHub Pages)
Le dépôt `1AF` est créé et poussé par K. Naudin (commandes PowerShell dans la
conversation du 31/10/2026 ou via GitHub Desktop). `index.html` à la **racine**.
Settings → Pages → branche `main`, dossier `/ (root)`. URL : `https://krishnanaudin.github.io/1AF/` (compte GitHub **KrishnaNaudin**, PAS le compte perso).

## Étape C — test à blanc (obligatoire avant l'atelier)
1. `?ev=01` : remplir le profil, UNE question complète, « Save this question » → vérifier dans le
   Sheet : 1 ligne `etat`, lignes `journal`, `reponses`, `nuggets`, `suivi` = Q1 complete.
2. Vider le stockage du navigateur (ou ouvrir en navigation privée) → rouvrir `?ev=01` → les
   réponses doivent réapparaître (« restored from server »).
3. Submit → `suivi.submit = yes`.
4. Supprimer les lignes de test (ou `rebuild()` après avoir vidé `etat`).

## Jour J
- `TEST_MODE: false` dans `config.js`, régénérer le contenu, pousser.
- Distribuer les QR (1 par évaluateur ; 41-45 en réserve, donnés par l'animateur seulement).
- Garder l'onglet `suivi` ouvert pendant les 120 min de notation.
- À la fin : lancer `rebuild()` dans Apps Script, puis télécharger le Sheet (xlsx) dans
  `12_Rwanda_OneAcreFund/Evaluations/` — c'est le classeur maître.

## Version papier
Même contenu que le site, un livret PDF par évaluateur (`Kit_Atelier_RWANDA/01_Formulaires_evaluateurs/`),
généré depuis `plan.js` + `content.js` par `build_pdf` (skill nuggets-methodo) quand le contenu sera
définitif. La saisie des livrets papier se fait ensuite dans le même Sheet (onglet `reponses`,
mêmes colonnes) — ne pas créer un second classeur.
