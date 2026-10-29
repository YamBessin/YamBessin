# Préparer l’hébergement privé

Ce guide prépare un pilote. Aucun serveur, domaine, certificat ou abonnement n’a été acheté ou activé. Le dépôt GitHub est public ; les comptes, données et sauvegardes restent privés et exclus du code. GitHub Pages seul ne peut pas exécuter le backend Node de cette application.

## Architecture proposée

Navigateur du collaborateur → HTTPS sur le domaine retenu → reverse proxy de l’hôte → port3080 lié à127.0.0.1 → un conteneur Node non privilégié → volume persistant privé. La base reste monoprocessus. Les accès externes exigent un compte ; il n’existe pas d’inscription publique.

Le Caddyfile est un exemple pour Caddy sur l’hôte, pas dans un conteneur. Le domaine `.invalid` doit être remplacé. Pour un certificat public, il faudra DNS et accès réseau appropriés. Ne pas attribuer un sous-domaine sancfis.net sans décision de son administrateur.

## Préparation

1. Retenir un hébergeur, une région et un responsable d’exploitation. Valider localisation des données, coût, accès administrateurs et traitement par les prestataires. Cette décision reste ouverte.
2. Installer une version maintenue de Docker/Compose et, si retenu, Caddy. Le Dockerfile utilise la branche Node22 Alpine ; vérifier les mises à jour et figer un digest d’image après validation de l’hébergement.
3. Dans `sancfis-solutions`, créer les comptes avec `npm run user` avant lancement. Créer au moins un administrateur et les comptes commerciaux/avant-vente nécessaires. Ne pas commiter `config/users.json`.
4. Protéger ce fichier sur l’hôte. Le conteneur s’exécute avec l’utilisateur node de l’image : vérifier qu’il peut lire le fichier monté sans rendre ce dernier lisible à tous. Ne pas utiliser chmod777.
5. Définir `PUBLIC_ORIGIN` avec l’origine exacte, par exemple `https://portail.domaine-retenu` sans chemin final. Compose charge les variables du shell ou de son fichier `.env` ; le serveur lancé directement ne charge pas `.env` automatiquement.
6. Exécuter `docker compose config --quiet`, puis `docker compose build` et `docker compose up -d` lorsque le déploiement aura été autorisé. `config/` doit exister, l’origine est obligatoire. Le lancement n’est pas effectué par ce travail.
7. Adapter le reverse proxy au domaine et à la stratégie d’accès réseau. Ne publier que les ports du proxy ; le port applicatif reste lié à localhost. Un VPN ou une passerelle d’accès d’entreprise peut restreindre davantage le portail.

Dans le Compose livré, IA désactivée, système de fichiers du conteneur en lecture seule sauf volume de données, configuration montée en lecture seule, capacités Linux retirées et privilèges supplémentaires interdits. La sonde `/healthz` n’indique que la disponibilité du processus HTTP, pas une restauration réussie ni une validation de tous les composants.

## Sauvegarder

Le script inclut données et comptes dans une archive chiffrée AES-256-GCM, avec clé dérivée par scrypt et sel aléatoire. La phrase secrète n’est jamais enregistrée dans l’archive. Maximum32Mo pour le fichier d’archive de ce pilote. La perte de la phrase empêche la restauration.

Arrêter le serveur avant une sauvegarde pour capturer un état cohérent avec la configuration des comptes. Le script exige une confirmation `BACKUP_SERVER_STOPPED=yes`, mais ne peut pas prouver lui-même l’arrêt. Ne pas modifier les comptes pendant l’opération.

Exécution sans Docker, dans un shell privé avec `BACKUP_PASSPHRASE` et `BACKUP_SERVER_STOPPED` déjà définies (ne pas taper la phrase dans une commande conservée dans l’historique) :

```sh
node scripts/backup.cjs create /chemin-prive/sauvegarde.sancfis-backup
node scripts/backup.cjs verify /chemin-prive/sauvegarde.sancfis-backup
```

Le fichier cible doit être nouveau et son répertoire doit exister. Avec le volume Compose, arrêter `app` puis utiliser un conteneur ponctuel portant le même volume et un répertoire de sauvegarde privé monté en écriture :

```sh
docker compose stop app
docker compose run --rm --no-deps --entrypoint node -e BACKUP_SERVER_STOPPED=yes -e BACKUP_PASSPHRASE -v /chemin-prive/backups:/backups app scripts/backup.cjs create /backups/sauvegarde.sancfis-backup
docker compose up -d app
```

La phrase doit déjà être dans l’environnement du shell appelant. Vérifier les permissions du répertoire monté pour l’utilisateur du conteneur. Conserver les archives hors du serveur et la phrase dans un coffre séparé, selon la politique de l’entreprise. Aucun envoi vers un stockage externe n’est configuré.

## Restaurer et vérifier

Restaurer sur un environnement séparé, pas directement sur le volume actif :

```sh
node scripts/backup.cjs restore /chemin-prive/sauvegarde.sancfis-backup /chemin-prive/restauration-nouvelle
```

Le parent doit exister et la destination ne doit pas exister. Le script refuse l’écrasement, vérifie le déchiffrement et le format, puis crée `data/store.json` et `config/users.json`. Il ne restaure pas les variables d’environnement, les clés API ni le serveur lui-même : conserver aussi la version exacte du code et la configuration d’exploitation dans un coffre adapté.

Pour une restauration Compose, transférer les fichiers restaurés vers un nouveau volume de test et une configuration de test avec des droits corrects. Ne pas écraser le volume actif. Contrôler les nombres de dossiers, une preuve et un renouvellement, puis se connecter avec chaque rôle. Noter date, durée, résultat et responsable du test avant de décider une bascule. Le script n’effectue aucune bascule réseau automatique.

## Comptes et départ d’un collaborateur

```sh
node scripts/manage-user.cjs list
node scripts/manage-user.cjs disable adresse-professionnelle
node scripts/manage-user.cjs enable adresse-professionnelle
```

Exécuter ces commandes sur la configuration privée hors conteneur, puis redémarrer le serveur pour recharger les comptes et invalider les sessions. Le dernier administrateur actif ne peut pas être désactivé par cet outil. Pas encore de récupération de mot de passe ou de SSO/MFA intégré : ces besoins demandent une évolution avant une exploitation large.

## Recette avant données réelles

- HTTPS valide, origine exacte et absence d’exposition directe du backend.
- Aucun identifiant de démonstration dans la configuration réelle.
- Deux commerciaux ne voient pas les dossiers l’un de l’autre.
- Affectation et validation technique contrôlées ; départ d’un utilisateur testé après redémarrage.
- Une création et une modification survivent au redémarrage et au remplacement du conteneur avec le même volume.
- Sauvegarde hors site et restauration dans un environnement séparé réellement testées.
- IA inactive, ou fournisseur et budget explicitement validés ; aucun dépassement payant automatique.
- Responsables des données, accès, maintenance, incidents et coûts désignés.

Cette liste ne constitue pas une certification de sécurité. SSO/MFA d’entreprise, stockage transactionnel multi-instance, surveillance d’exploitation et automatisation de la veille restent à traiter pour un déploiement plus large.

Sources de configuration : [Docker Compose — services](https://docs.docker.com/reference/compose-file/services/), [Caddy — reverse proxy](https://caddyserver.com/docs/quick-starts/reverse-proxy), [Caddy — HTTPS](https://caddyserver.com/docs/automatic-https).
