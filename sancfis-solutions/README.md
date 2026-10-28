# SANCFIS Solutions — pilote PME

Application interne autonome, préparée pour Guy à partir des besoins discutés et de la revue des archives ProgiCheck. Cette V1 remplace le mécanisme de clés consommables par des comptes et rôles. Elle ne réutilise ni la base, ni les secrets, ni les connexions de production ProgiCheck.

## Fonctions livrées

- Portefeuille avec recherche, taille du compte, criticité, besoin métier, infrastructure et source.
- Budget déclaré, période et source. Étape commerciale, prochaine action et échéance.
- Quatre rôles : commercial, avant-vente, direction et administration. Les commerciaux ne voient que leurs dossiers. L’avant-vente voit ses dossiers propres ou ceux qui lui sont affectés. La direction et l’administration disposent d’une vue globale.
- Onze questions originales organisées selon les fonctions du NIST CSF 2.0. État de mise en place et niveau de preuve séparés. Justification des non-applicables, preuve et date pour une vérification.
- Références NIST, CIS IG1 et ISO/IEC 27001. Aucun score de conformité ni certification automatique. Les onze questions ne couvrent pas tout CIS IG1 ou ISO27001.
- Registre de renouvellements. Horizons internes J-90/60/30/15 à l’ouverture de l’application, seulement si date et source sont vérifiées. Pas de mails automatiques. Une date dépassée ne prouve pas une interruption.
- Cinq familles de solutions avec questions, limites, licences, leçon, exercice et auto-explication. Marquer une fiche comme relue reste un indicateur local au navigateur, pas une certification.
- Synthèse imprimable et sauvegardable en PDF via le navigateur. Contenus utilisateur et IA affichés comme texte, sans insertion HTML.
- Brouillon IA optionnel, désactivé par défaut : résumé non nominatif et structuré, modèle imposé côté serveur et plafond quotidien persistant. Aucun paiement public ou facturation automatique.

## Démonstration locale

Node.js22 ou ultérieur, aucun paquet à installer :

```sh
npm run demo
```

Ouvrir `http://127.0.0.1:3080`. Le terminal affiche les identifiants de démonstration. Ils donnent uniquement accès au mode démo, volontairement limité à127.0.0.1. Ne saisir que des données fictives. Ce mode refuse `NODE_ENV=production`, désactive l’IA et enregistre dans `demo-data/`, exclu de Git.

## Installation pour un pilote interne

Le [guide d’hébergement privé](docs/HEBERGEMENT.md) contient les modèles Docker/Compose et HTTPS, la sauvegarde chiffrée, la restauration sans écrasement et le retrait des comptes. Ces modèles ne déclenchent aucune mise en ligne. La configuration Compose a été validée syntaxiquement ; l’image n’a pas encore été construite et testée sur un hébergeur.

1. Copier le dossier sur un environnement avec Node.js22+, créer un volume local persistant et sauvegardé.
2. Créer les comptes dans un terminal avec `npm run user`. Le mot de passe est masqué et stocké sous forme scrypt avec sel individuel. `config/users.json` est exclu de Git. Les rôles direction/admin peuvent affecter un avant-vente dans un dossier.
3. Configurer les variables de `.env.example` dans le shell ou l’hébergeur. Ce fichier n’est pas chargé automatiquement. Aucun secret ne doit être commité.
4. Placer derrière un reverse proxy TLS avec un `PUBLIC_ORIGIN` HTTPS exact, `NODE_ENV=production`, un hôte d’écoute approprié et un port interne. L’interface et l’API doivent partager la même origine. Ne pas exposer directement le port Node.
5. Lancer `npm start`. Un seul processus Node par volume `DATA_DIR`. Le fichier JSON est écrit atomiquement dans ce processus ; ce stockage ne convient pas au multi-instance.
6. Tester les rôles, les sauvegardes, une restauration et la procédure de retrait des comptes avant d’introduire des informations réelles. Arrêter le serveur pour sauvegarder ensemble données et configuration. Protéger et chiffrer le volume et ses sauvegardes au niveau de l’hébergement.

Sous PowerShell, par exemple, pour un lancement local avec comptes créés :

```powershell
$env:HOST='127.0.0.1'
$env:PORT='3080'
node server.cjs
```

Ne pas mettre `NODE_ENV=production` sans proxy HTTPS et `PUBLIC_ORIGIN`. Pour désactiver un compte, utiliser `npm run accounts -- disable adresse-professionnelle`, puis redémarrer. Le redémarrage invalide toutes les sessions. L’outil refuse de désactiver le dernier administrateur actif. Les comptes restent gérés depuis un terminal privé, pas depuis l’interface web.

## IA : option, pas dépendance du travail commercial

`AI_ENABLED=false` par défaut. Les fiches, questionnaires, renouvellements et synthèses fonctionnent sans IA. Pour l’activer ultérieurement : définir la clé serveur `MISTRAL_API_KEY`, le modèle autorisé `MISTRAL_MODEL` et `AI_DAILY_MAX_CALLS`, après validation des conditions du fournisseur et du traitement des données.

Un utilisateur connecté doit confirmer chaque appel. Seuls taille de compte, criticité et états des points sont transmis, sans nom, contact, budget, référence de contrat, preuve ni texte libre. Ce résumé reste une information métier : ses conditions de traitement doivent aussi être approuvées.

Le plafond compte les tentatives avant l’appel, y compris les échecs, pour éviter des reprises illimitées. Ce n’est pas un plafond monétaire exact. Chaque appel limite la sortie à700jetons et utilise un petit résumé fixe. Ajouter les limites financières du fournisseur/hébergeur avant usage payant. Aucun crédit payant n’est activé par l’application. L’intégration réelle Mistral n’a pas été appelée pendant les tests.

Le gratuit du fournisseur dépend du compte et des limites effectives, pas de la formule interne. Sources : [usage Mistral](https://docs.mistral.ai/admin/billing-usage/usage-limits), [limites API](https://help.mistral.ai/en/articles/698531-why-am-i-hitting-api-rate-limits-and-how-do-i-increase-them).

## Tests

```sh
npm test
```

Tests HTTP réels sur localhost : refus des anonymes et origines étrangères, isolation de deux commerciaux, affectation technique, faux propriétaires, validation réservée, preuves/dates, budgets, conflits de versions, persistance, audit, déconnexion et configuration production. Aucun appel aux bases clients ou à un fournisseur IA.

Les tests d’exploitation vérifient aussi le chiffrement, une restauration fidèle dans un nouveau dossier, le refus d’écrasement, une mauvaise phrase secrète, une archive altérée et le refus d’un compte désactivé. Ils ne remplacent pas un test de restauration sur l’hébergement choisi.

## Limites du pilote et suite

- Pas encore de SSO/MFA d’entreprise. Pour une exploitation large avec données sensibles, ajouter une identité d’entreprise et revoir l’architecture de stockage. La présence de rôles ne constitue pas un audit de sécurité complet.
- Pas de collecte Gmail/Trello, import automatique de portefeuille, base documentaire privée ni tâches en arrière-plan.
- La veille donne des liens et une méthode ; elle ne prétend pas récupérer des prix ou nouvelles en direct. Les sites référencés ne prouvent pas partenariat, stock ou habilitation SANCFIS.
- Pas de catalogue tarifaire ou de BOM automatisée, de dimensionnement garanti, ni de paiement. Ces capacités nécessitent des données fournisseur datées et une validation humaine.
- Pas d’envoi automatique de mail, de synchronisation calendrier ou de déconnexion des services historiques.
- Les archives originales et leurs données ne sont pas publiées avec cette V1. Les fonctionnalités financières et rapports avancés historiques ne sont pas tous portés. Voir `docs/MIGRATION.md`.
- Pilote proposé :2–3commerciaux,1référent avant-vente, données fictives puis périmètre réel validé. Mesurer dossiers complets, délai de prise en charge, reprises d’information, renouvellements prouvés et coût IA par tentative.

Cette version est une base de pilote à examiner et tester, pas une mise en production approuvée. Les conditions de propriété et d’usage entre Guy et SANCFIS restent à formaliser. Aucune licence open source n’est attribuée arbitrairement au projet.
