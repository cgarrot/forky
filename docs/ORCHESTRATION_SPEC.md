## Forky v1 — Spécification Produit (Explore ⇄ Build, Plans, Artifacts, Focus Mode)

- **Statut**: draft (vision verrouillée, prête à être découpée en backlog)
- **Langue**: FR
- **Portée**: UX + produit + orchestration LLM (pas de détails d’implémentation)
- **Dernière mise à jour**: 2026-01-13

---

## Objectif

Construire une app non-linéaire (canvas + graph) où :

- **Le canvas reste lisible** même avec beaucoup de nodes (anti-surcharge).
- **Chaque node peut mener à n’importe quoi** (explore/build/source/plan/artifact/challenger), sans figer des rails.
- **Les LLM guident** via détection d’intention + recommandations, sans enlever la liberté utilisateur.
- **Build** permet de converger vers un **Plan** puis des **Artifacts**, avec une trajectoire endgame vers **todos/actions/agents/exécution**.

---

## Règle d’or UX: Canvas condensé, Focus riche (vérité)

- **Canvas (condensé)**: chaque node est une carte “1 coup d’œil”.
  - **But**: l’utilisateur comprend la structure globale sans être submergé.
  - **Contenu** (recommandé): titre/summary, badges, status (loading/error/stale), indicateurs légers (pinned/importance).

- **Focus Mode (riche)**: chaque node a une vue fullscreen “vérité complète”.
  - **But**: lire/éditer le contenu réel généré par le LLM (markdown riche, sections, sources, versions…).
  - **Règle**: **tous les nodes** doivent pouvoir entrer en focus.

---

## Concepts clés (définitions)

### Node (universel)

Un node est l’unité unique du graphe. Visuellement, on évite de multiplier les types.

- **Contenu**: prompt + réponse (ou contenu riche)
- **Relations**: parents/enfants (arêtes orientées)
- **Statut**: `idle/loading/error/stale`
- **Meta** (extensible): rôle logique, intention, sources, pins, score, etc.

Chaque node a **deux représentations UX**:

- **Vue condensée (canvas)**: carte minimaliste “1 coup d’œil”
- **Vue riche (focus)**: contenu réel/structuré (markdown riche, sources, versions, etc.)

### Mode (Explore vs Build)

- **Explore**: comprendre/apprendre/explorer (divergent).
- **Build**: produire un résultat concret (convergent) → Plan → Artifact.

**Détection**:
- Le LLM déduit Explore/Build via le prompt.
- Si ambigu, l’UI propose et l’utilisateur peut forcer.

**Override**:
- **Bouton “Build” sur le node** (override explicite).

### Rôles logiques (sans explosion de types UI)

Rôles minimaux (logiques) qui influencent le focus, les recommandations, le scoring:

- **Conversation**: prompt/réponse standard.
- **Source**: web/fichier/image/codebase, avec provenance + extraits.
- **Challenger**: clarifications / red-team / questions.
- **Plan**: structure convergente vers un livrable.
- **Artifact**: livrable (MVP = markdown dans un node).

> Un même node UI peut représenter ces rôles via badges + focus rendering.

### Recommandations vs Actions (UX)

On distingue deux familles de “next steps”:

- **Recommandations cognitives (Explore)**: suggestions non contraignantes pour améliorer la compréhension
  - Exemples: clarifier, challenger, comparer branches, résumer, demander une source, reformuler.
  - **Règle**: elles ne “forcent” pas une trajectoire; l’utilisateur reste libre.

- **Actions build (convergentes)**: étapes orientées livrable, issues du mode build/plan
  - Exemples: “définir livrable”, “sélectionner scope”, “générer plan”, “refresh plan”, “générer artifact”.

Affichage recommandé:

- **Canvas**: 0–2 micro-indications (badges/icônes) pour éviter la surcharge.
- **Focus**: liste complète (catégories + explications), avec CTAs qui créent des nodes enfants quand “ça compte”.

### Définition: branche, section, scope

Termes utilisés dans la spec:

- **Branche**: sous-graphe orienté à partir d’un node (descendants) ou vers un node (ancêtres).
- **Section (UI)**: regroupement de nodes présenté à l’utilisateur dans le scope picker (souvent une branche, un cluster, ou un groupe par parent).
- **Scope (build)**: ensemble de nodes considérés comme “inputs” pour le Plan/Artifact d’un build.

Ces définitions servent notamment pour le “recompute local” (section Recompute).

### Artifact (MVP vs endgame)

- **MVP**: artifact = **markdown dans un node**.
- **Endgame** (trajectoire): scripts, arborescences markdown (papier), outputs, actions exécutables, etc.

**Règle**: un artifact “fini” devient une **source** pour la suite (context).

### Plan (séparé, versionné, actif)

- **Plan est un node séparé**.
- Un plan est **versionné**: v1, v2, v3…
- Une version est **Active** (source de vérité à un instant T).
- Les versions non actives restent consultables (archives).

---

## Boucles produit

### Explore (divergent)

**But**: apprendre/comprendre, ouvrir des branches, comparer des hypothèses.

- **Inputs**: questions, pistes, explorations
- **Outputs**: branches, synthèses, questions challenger, sources
- **Recommandations typiques**:
  - clarifier (questions manquantes)
  - challenger soft/medium/hard
  - comparer branches
  - résumer
  - chercher une source
  - reformuler / varier le niveau

**Structuration pendant Explore (optionnelle)**:
- Par défaut, Explore reste “cognitif”.
- Si l’utilisateur demande explicitement (ou si l’IA le propose et l’utilisateur confirme), on peut générer une structure légère (mini-plan) sans basculer pleinement en Build.

### Build (convergent)

**But**: produire un **livrable concret**, avec un Plan excellent en premier livrable.

Pipeline recommandé:

- **1) Clarifier le livrable** (si ambigu)
  - Exemple: “Quel output concret veux-tu ? (Plan de projet / doc / papier / script…)”

- **2) Définir le scope**
  - Scope = **arborescence parents + enfants** (ancêtres + descendants) du node déclencheur.

- **3) Réduction / scoring**
  - Si gros graphe: l’IA propose un sous-scope pertinent + explication + contrôle utilisateur.

- **4) Scope picker (avant génération)**
  - L’utilisateur ajuste Included/Excluded, pin, filtres.

- **5) Générer Plan v1**
  - Plan node relié au node build.

- **6) Stale / refresh**
  - Si inputs changent: plan devient stale → “Refresh” → Plan v2.

- **7) Choisir “Active plan version”**
  - Une seule active à la fois.

---

## Scope & Scope Picker (puissant)

### Définition du scope

- **Base**: ancêtres + descendants du node build.
- **Problème**: le scope peut être énorme → on doit le rendre contrôlable.

### Cas multi-parents (fusion) et scope

Le graphe autorise les nodes multi-parents (fusion). Implications:

- Un node peut appartenir à plusieurs branches.
- Le scope “ancêtres + descendants” peut traverser plusieurs zones du graphe.
- Le scope picker doit pouvoir:
  - visualiser un node “partagé”
  - inclure/exclure un node indépendamment de la branche où il apparaît
  - appliquer des actions bulk par branche (même si chevauchement)

### UX: Scope picker (présent avant ET après)

- **Avant plan (Build Setup focus)**:
  - L’IA propose une sélection initiale.
  - L’utilisateur modifie, puis clique **Generate Plan v1**.

- **Après plan (Plan focus)**:
  - Le scope reste ajustable.
  - Toute modification rend le plan stale, et propose “Refresh as v(n+1)”.

### UI “Included / Excluded” (contrôle fort)

- **Lists**:
  - Onglets **Included** | **Excluded**
  - Recherche (titre/summary)
  - Actions par node: include/exclude, pin/unpin, open focus.

- **Bulk actions**:
  - include branch / exclude branch
  - pin branch / unpin branch
  - reset to suggested

### Filtres (puissants mais compréhensibles)

- **Direction**: parents only / children only / both (default both)
- **Distance (depth)**: slider 0 → N (default 3)
- **Type logique**: conversation/source/challenger/plan/artifact
- **Pinned only** (toggle)
- **Status**: stale only (toggle)

**Advanced**:
- recency (X minutes/heures/jours)
- importance threshold (0–100)
- regroupement par branche

---

## Exemples concrets (Scope picker, scoring, tiers, recompute)

### Exemple 1 — Build “Plan de projet” sur un graphe simple

#### Mini-graphe (ancêtres + descendants)

```
N0 (Explore)  "Comprendre le domaine X"
  |
  v
N1 (Explore)  "Synthèse des concepts clés"                 [summary]
  |
  v
N2 (Build)    "Je veux un plan de projet pour construire Y" [node déclencheur]
 / \
v   v
N3 (Source)   "Doc officielle / référence"                 [provenance]
N4 (Explore)  "Contraintes + non-goals"
     |
     v
   N5 (Challenger) "Risques / ambiguïtés"
```

#### Build Setup focus (scope picker)

- **Scope brut** (par règle): ancêtres {N0, N1} + node {N2} + descendants {N3, N4, N5}
- L’IA propose une sélection initiale, mais l’utilisateur peut ajuster avant **Generate Plan v1**.

Exemple de tableau (vue “Included” / “Excluded”):

| Node | Rôle | Distance (depuis N2) | Score (heuristique → ajusté) | Tier | Décision (par défaut) | Raison courte |
|------|------|------------------------|------------------------------|------|------------------------|-------------|
| N4 | Conversation (Explore) | +1 enfant | 68 → 82 | Tier 1 | Included | Contient contraintes/non-goals utiles au plan |
| N3 | Source | +1 enfant | 74 → 88 | Tier 1 | Included | Source fiable pour cadrer le plan |
| N1 | Conversation (Explore) | -1 parent | 55 → 60 | Tier 2 | Included | Contexte utile mais moins critique |
| N5 | Challenger | +2 enfants | 40 → 52 | Tier 2 | Excluded | Utile après v1 si besoin, pas bloquant |
| N0 | Conversation (Explore) | -2 parent | 28 → 20 | Tier 3 | Excluded | Trop éloigné / trop général |

Notes:
- **Pinned**: l’utilisateur peut “pin” N3 pour forcer inclusion complète dans le contexte.
- **Tiers**: Tier 1 inclus en “full content”, Tier 2 en “summary + pointeurs”, Tier 3 en “titre ou exclu”.
- **Transparence**: l’IA montre 3–5 bullets “Top reasons” expliquant la sélection.

#### Génération

- L’utilisateur clique **Generate Plan v1**.
- Un node **Plan v1** est créé (stack sur canvas) et consultable en focus.

---

### Exemple 2 — Multi-parents + recompute local vs alerte recompute global

#### Mini-graphe (fusion multi-parents)

```
      A (Explore)   "Approche 1"
       \ 
        v
         M (Merge)  "Synthèse des approches"
        ^
       /
      B (Explore)   "Approche 2"
        |
        v
      C (Build)     "Plan de projet pour implémenter la synthèse"  [node déclencheur]
```

Ici, `M` a **2 parents** (`A` et `B`) et sert de pivot vers `C`.

#### Scoring & déduplication

- `M` apparaît dans plusieurs “branches” (A et B).
- Le score de `M` doit être **unique** (pas un score par branche).
- La UI peut afficher “partagé: 2 branches”.

#### Recompute: nouvel enfant créé

Cas:
- L’utilisateur, pendant le Build Setup focus de `C`, crée un nouvel enfant `D` sous `B`:

```
B (Explore) -> D (Source) "Nouvelle doc critique"
```

Comportement attendu:

1) **Recompute local (par défaut)**:
   - l’app recompute uniquement la **section/branche** concernée (ici la branche “B” dans le scope picker).

2) **Détection d’impact global (triggers)**:
   - si `D` est une **Source** et que l’IA la classe “critical” pour le livrable,
   - ou si `D` affecte le pivot (ex: modifie une contrainte majeure),
   - alors l’app affiche une alerte: **“Impact global détecté”**.

3) **Jamais auto global**:
   - l’app ne recalcule pas tout automatiquement,
   - elle propose un bouton **Recompute global** (confirmation user).

Ce cas illustre la règle: stabilité par défaut + intelligence “assistée” (alerte) + contrôle utilisateur.

---

## Scoring d’importance & dégradation (tiers)

### Score: heuristique d’abord, LLM ajuste (avec explication)

#### Heuristique (stable, rapide)
Score \(0–100\) basé sur (pondérations ajustables):

- **Proximité**: distance graphe au node build
- **Direction**: parents souvent plus “context”, enfants plus “variantes”
- **Pinned**: score élevé forcé
- **Recency**: bonus léger
- **Rôle**: Source > Plan/Artifact > Conversation > Challenger (par défaut)

#### Ajustement LLM (intelligent, justifiable)
Le LLM:
- propose un delta score (+/-)
- donne une raison courte (1 phrase)
- peut suggérer des pins (“critique pour l’objectif”)

**Transparence (confiance utilisateur)**:
- L’UI doit afficher:
  - une explication “Top reasons” globales (3–5 bullets)
  - un tooltip par node (raison courte) quand le score a été ajusté

### Déduplication & robustesse du scoring (multi-parents)

Quand un node apparaît dans plusieurs branches:

- Le score final doit être **unique** (pas un score par branche) pour éviter les incohérences.
- La UI peut afficher “apparaît dans X branches”.
- Les bulk actions par branche ne doivent pas “doubler” le node; elles modifient le même élément de scope.

### Dégradation: Tier 1/2/3

But: ne pas exploser le contexte LLM, tout en gardant la traçabilité.

- **Tier 1** (top score / proche / pinned): contenu complet en contexte
- **Tier 2**: summary + pointeurs
- **Tier 3**: titre uniquement (ou exclu), récupérable via “include more”

---

## Recompute: stable par défaut, intelligent par exceptions

### Règle générale

- Les suggestions/score sont **frozen** tant que l’utilisateur ne clique pas **Recompute suggestions**.
- **But**: stabilité + confiance (éviter que “ça bouge tout le temps”).

**Boutons recommandés**:
- **Recompute suggestions** (global)
- (optionnel) **Recompute this branch/section** (sur une section du scope picker)
- **Reset to suggested**

### Exception: création d’un nouvel enfant

Quand un nouvel enfant est créé:

- **Par défaut**: recompute **local** (branche/section concernée).
- Si “impact global” détecté:
  - afficher une alerte: “Impact global détecté”
  - proposer un bouton **Recompute global** (confirmation utilisateur)

**Règle UX (verrouillée)**:
- Même si l’impact global est détecté, **on ne recompute pas global automatiquement**.
- On montre une alerte + CTA **Recompute global** (user confirme).

### Triggers “impact global”

Un impact global est suspecté si au moins un des points suivants est vrai:

- node classé **critical**: requirement/constraint/goal/decision/risk majeur
- node multi-branch / multi-parent (affecte plusieurs branches)
- node proche du pivot (depth faible)
- plan stale / phase convergence

---

## Plan: versioning, active version, stack/carousel

### Versioning

- Generate Plan v1.
- Refresh ⇒ Plan v2 (nouvelle version, l’ancienne reste).

### Active plan version

- Une seule version active à la fois.
- L’active guide les recommandations “build”.

### UI: même emplacement (stack) + carousel en focus

- **Canvas**: un “Plan stack” unique (évite pollution visuelle).
- **Focus Plan**: carousel v1/v2/v3…
  - bouton **Set Active**
  - diff léger (“ce qui a changé”)

---

## Challenger: toujours disponible, jamais imposé

### Intensité

- Soft / Medium / Hard

### Déclenchement

- **Auto-proposé** si risques détectés (ambiguïté, contradictions, manque d’inputs, scope trop large).
- **Toujours déclenchable** manuellement.

### Sortie

- Les questions peuvent devenir des **nodes enfants** (exploration ciblée).

---

## Artifacts comme sources

Règle:

- Un artifact (même final) est traité comme **source** de contexte:
  - résumé + pointeurs par défaut
  - contenu complet en focus, et inclusion complète seulement si “pinned”/petit

---

## Todo / Actions / Agents / Exécution (endgame)

Cette section formalise l’ambition “crescendo” (pas forcément MVP), pour garantir que les choix MVP restent compatibles.

### Todo (structure)

But: transformer un plan en tâches actionnables, sans enlever la liberté utilisateur.

- Un **Todo** est une liste d’items (MVP+).
- Chaque item peut évoluer vers:
  - **sub-todos** (décomposition)
  - **mini-plan** local (si besoin d’affiner une tâche complexe)

Principes:
- L’IA propose des todos dérivés du plan.
- L’utilisateur peut modifier: ajouter/supprimer/éditer/réordonner.
- Les todos peuvent être alimentés par:
  - des nodes explore
  - des sources externes
  - des artifacts

### Actions (actionnables)

Définition:
- Une **Action** est un todo “rendu exécutable” (ou qui déclenche une transformation).

Règle:
- Les actions importantes créent des **nodes enfants** (traçabilité).
- Les micro-ops (ex: cocher done) peuvent rester non-traçables sur le canvas (mais visibles dans l’historique du focus).

### Agents (local / outillé)

Endgame:
- Une action/todo peut être **assignée** à un agent (ex: Claude Code local).
- L’agent peut accéder à des sources (docs, fichiers, codebase indexée) selon permissions.

### Exécution: jamais automatique

Règle verrouillée:
- **Jamais d’exécution auto**.
- Toute exécution nécessite un bouton explicite **Run** (et idéalement un résumé “ce qui va être fait”).

### Résultats d’exécution

Quand une action est exécutée:
- le résultat devient un **node** (source/artifact selon nature)
- il nourrit ensuite le contexte (artifact = source)

---

## Sources externes (présent & endgame)

### MVP

- Les sources peuvent être représentées comme nodes “Source” (même si limitées au début).
- Le focus affiche provenance + extraits + résumé.

### Endgame: codebase locale “type OpenCode”

Vision:
- L’utilisateur “branche” une codebase locale.
- Un agent réalise indexing + retrieval.
- Les réponses citent des extraits/sources.

Règles produit:
- Les infos issues de sources externes doivent garder une **provenance** (traçabilité).
- Le scope picker doit pouvoir filtrer/pondérer “Source” vs “Conversation”.

---

## User flows (scénarios)

### Flow 1 — Explore pur

1. L’utilisateur crée un node et pose une question (Explore).
2. L’IA répond + propose recommandations cognitives (clarifier, comparer, source, challenger).
3. L’utilisateur clique une recommandation → création d’un node enfant (branche).
4. L’utilisateur ouvre n’importe quel node en **Focus** pour la version riche.

### Flow 2 — Build (override) → Plan v1

1. L’utilisateur est sur un node et clique **Build**.
2. Si besoin: l’app demande “Quel livrable ?” (ex: Plan de projet).
3. L’app calcule scope ancêtres+descendants.
4. **Build Setup focus**: l’IA propose Included/Excluded + explications; l’utilisateur ajuste (pin/exclut/filtre).
5. L’utilisateur clique **Generate Plan v1**.
6. Un node Plan apparaît (stack) et est consultable en focus.

### Flow 3 — Inputs changent → Plan stale → v2 + active version

1. L’utilisateur modifie un node du scope (ou ajoute une source).
2. Le plan devient **stale**.
3. L’utilisateur ouvre Plan focus et clique **Refresh**.
4. L’app crée **Plan v2** (carousel).
5. L’utilisateur clique **Set Active** sur v2.

### Flow 4 — Nouvel enfant pendant Build Setup

1. L’utilisateur ajoute un node enfant dans une branche incluse.
2. L’app fait un **recompute local** sur la section concernée.
3. Si “impact global” détecté: alerte + bouton **Recompute global** (user choisit).

---

## Sécurité / Exécution (endgame)

- **Jamais d’exécution automatique**.
- Toute action exécutable future (agents/outils) doit être déclenchée explicitement via **Run**.

---

## Roadmap (crescendo)

### Milestone 1 — Focus universel + cartes condensées

- Focus fullscreen pour tous les nodes.
- Canvas ultra-condensé.

### Milestone 2 — Explore assisté (recommandations cognitives)

- Suggestions: clarifier, comparer, résumer, sources, challenger.
- Traçabilité via nodes enfants quand ça “compte”.

### Milestone 3 — Build intent + Build Setup focus

- Détection explore/build + override “Build”.
- Clarification livrable.
- Scope ancêtres+descendants.

### Milestone 4 — Scope picker puissant + scoring/tiers

- Included/Excluded + filtres + pin.
- Score heuristique + ajustement LLM.
- Dégradation Tier 1/2/3.
- Recompute manuel + recompute local sur nouvel enfant + alerte global.

### Milestone 5 — Plan versionné + active version + stack/carousel

- Plan v1/v2…
- Active plan version.
- Stale/refresh.

---

## MVP boundaries (ce qu’on fait / ce qu’on ne fait pas)

### MVP (must-have)

- Focus mode universel (tous les nodes)
- Canvas condensé
- Explore assisté (recommandations cognitives)
- Détection explore/build + override Build
- Build Setup focus + scope picker (Included/Excluded + filtres)
- Scoring heuristique + ajustement LLM + tiers (Tier 1/2/3)
- Recompute manuel + recompute local + alerte “impact global” + CTA recompute global
- Plan versionné + active version + stack/carousel

### Non-goals (MVP)

- Exécution outillée (agents, actions qui modifient le filesystem, etc.)
- Todo structuré complet (sub-todos, dépendances, assignation agents)
- Arborescences de fichiers markdown (papier complet matérialisé en fichiers)
- Indexing codebase locale type OpenCode
- Automatisation non supervisée (pas de “run” automatique)

---

## Glossaire (rapide)

- **Condensé**: représentation minimaliste sur canvas.
- **Focus**: vue riche fullscreen d’un node.
- **Scope**: ensemble des nodes considérés comme “inputs” pour un build/plan.
- **Pinned**: node forcé dans scope/context.
- **Stale**: obsolète car inputs ont changé.
- **Active plan**: version du plan actuellement “source de vérité”.

