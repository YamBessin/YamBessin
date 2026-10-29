# Analyse et statistiques — 29 octobre 2026

L’accueil du portail affiche les statistiques des dossiers auxquels le compte connecté a accès. Le commercial reste limité à ses dossiers ; les rôles affectés, direction et administration conservent leurs règles existantes. L’API `GET /api/statistics` applique la même restriction.

## Graphiques et sélection

- Radar des onze domaines et détail de chaque domaine. Le polygone n’est tracé que si les onze indices sont évaluables ; les autres profils affichent les points disponibles.
- Axes disponibilité, intégrité et confidentialité à partir des associations déclarées dans le questionnaire.
- Complétude moyenne, réponses vérifiées avec preuve, répartition des états et avancement des dossiers.
- Étapes commerciales, validation documentaire, échéances de renouvellement confirmées et activité réelle de création des dossiers sur six mois UTC.
- Filtres dossier et taille du compte. Export CSV UTF-8 avec méthode, périmètre et date ; neutralisation des cellules pouvant être interprétées comme formules. Impression/PDF de la sélection et profil par domaine dans la synthèse de dossier.

## Méthode 2026-10-29.2

Les questions de base portant `scorePolicy=declarative_only` sont seules éligibles aux indices. La valeur explicite de l’option choisie est divisée par la valeur maximale des options de cette question, puis normalisée sur100. Les questions ont le même poids. Les questions conditionnelles, intentions et contextes métiers sont exclus. Une position d’option n’est jamais utilisée comme score.

Un indice n’est publié que lorsque toutes les questions de base applicables du groupe sont renseignées. Les non-applicables justifiés sont exclus de ce groupe. Un groupe incomplet ou entièrement non applicable garde un indice inconnu ; un vrai zéro reste zéro. La moyenne portefeuille porte uniquement sur les diagnostics évaluables, dont le nombre est affiché. Il n’existe pas de score global de maturité ni de score de conformité.

La complétude est la moyenne, par dossier, de (réponses renseignées + non-applicables justifiés) / questions actives. Les branches masquées ne comptent pas. Inconnu, à confirmer et non communiqué restent distincts. La vérification exige une réponse, une source et une date valide ; elle n’est pas déduite d’une note élevée.

Les renouvellements ne sont classés par date que si la date est valide, vérifiée et sourcée. Les autres restent à confirmer. Les horizons sont calculés en UTC ; une date passée ne prouve pas une interruption de service. Les noms d’entreprise normalisés donnent un effectif indicatif et ne constituent pas un dédoublonnage CRM complet.

Les indices restent des déclarations de questionnaire, sans mesure technique ni certification. Aucun benchmark, progression historique de maturité, revenu, ROI ou tendance de marché n’est fabriqué. Les historiques ProgiCheck, mails et documents locaux ne sont pas importés automatiquement.

## Vérification

35 tests Node couvrent les règles métier, la persistance, les droits et les statistiques : vrai zéro, réponses manquantes, non-applicables, contexte exclu, branches inactives, niveaux de preuve, limites de dates et isolation entre commerciaux. L’instance hébergée vérifie en plus l’adaptateur HTTP/D1 et la parité des moteurs navigateur/serveur. Le parcours Edge local valide radar, filtres, CSV, PDF et mobile à390px sur données fictives, sans chargement externe.
