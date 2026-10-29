# Passage des archives à la V1

## Ce qui a changé

Les archives mêlent diagnostic public payant, administration de clés et données accessibles sur des services Progress Things. La V1 fournit un parcours interne indépendant qui conserve les intentions utiles (qualification, restitution, accompagnement commercial, IA optionnelle) sans recopier les connexions et secrets historiques.

- Diagnostic : la collecte courte initiale est conservée comme historique ; depuis le 29 octobre, les 53 questions des archives sont réintégrées avec conditions, preuves et états distincts. Voir REPRISE-20261029.md.
- Clés/formules : remplacées par comptes et rôles. Les anciennes clés ProgiCheck ne sont pas migrées ni garanties utilisables.
- Base : stockage local isolé pour le pilote. Aucun export Firebase complet n’était fourni, donc aucun client réel n’a été importé.
- Assistant : route authentifiée liée à un dossier autorisé, résumé limité, confirmation utilisateur, plafond persistant. L’IA est inactive à l’installation.
- Rapports : synthèse imprimable via navigateur, avec statut et limites. Pas de promesse d’expertise automatique ni de fausse confirmation de sauvegarde PDF.
- Catalogues : cinq familles et sources, aucune tarification historique présentée comme actuelle.
- Compétences : fiches, leçons et exercices. Ni badge officiel ni certification inventée.

## Non porté à ce stade

P&L, facturation, génération avancée Word/PPT/BOM et PDF ancien, campagnes, scanner documentaire, comparaison automatique de dizaines de modèles et analyses financières historiques. Cela évite de présenter comme réels des prix fixes, des conversions erronées, un CA calculé sur des formules ou des hypothèses de budget non confirmées. Ces fonctions demandent chacune un périmètre et des tests métier.

## Déconnexion et import

Ne pas arrêter ProgiCheck pour installer ce dossier. Tester d’abord la V1 séparément. Pour importer : choisir les comptes autorisés, obtenir un export réel, définir les champs et sources, distinguer demande/devis/commande/livré/installé, réconcilier volumes et doublons. Les dates de renouvellement doivent venir de preuves. Ne pas importer de clés d’activation, mots de passe, données personnelles inutiles ou prospects privés sans périmètre approuvé.

Le code V1 n’appelle aucun domaine Progress Things, ancien Firebase, ancien proxy ou service de QR externe. Les archives d’audit restent hors du dépôt de livraison. La clé de recherche visible dans l’archive historique doit être renouvelée côté fournisseur par son titulaire ; cette V1 ne l’utilise pas et ne la révoque pas.

## Référentiels

Les questions sont rédigées pour ce pilote. Leur association aux fonctions NIST est thématique. Il n’y a pas de couverture complète des mesures CIS IG1 ni des exigences ISO27001. Vérifier les obligations sectorielles, contractuelles et réglementaires par dossier avant toute déclaration de conformité.

## Points d’exploitation

Un seul processus par fichier de données, volume persistant protégé, TLS via proxy, utilisateurs explicitement créés et pas de mode démo en production. Une version multi-agence doit passer sur une base transactionnelle et une identité centralisée. Les sauvegardes et restaurations doivent être testées sur l’hébergement retenu. Les journaux enregistrent acteur, action, identifiant et date, sans mots de passe ou clés.
