# Three-Level Hierarchy Guide

Welcome to the **Entity & Fund Hierarchy** for the Non-Profit Fund Accounting System.  
The platform supports a full **three-tier** structure:

1. **Organization** – the top-level umbrella (e.g. *The Principle Foundation*).  
2. **Entities** – legal or operational units under the organization (e.g. *TPF*, *TPF-ES*, *IFCSN*).  
3. **Funds** – restricted or unrestricted buckets that live **inside an entity** (e.g. *General Fund*, *Building Fund*).

The design lets you see activity at any layer and automatically roll-up results for consolidated reporting.

---

## 1. Data Model at a Glance

| Level | Table | Key Columns | Notes |
|-------|-------|-------------|-------|
| Organization / Entity | `entities` | `id` (UUID PK) • `parent_entity_id` (FK → entities.id) • `code` • `name` • `is_consolidated` | A root entity has `parent_entity_id = NULL`. Any entity may own children and/or funds. |
| Fund | `funds` | `id` (UUID PK) • `entity_id` (FK → entities.id) • `code` • `name` | Each fund belongs to one entity only. |

*Self-referencing foreign key* on `entities.parent_entity_id` enables unlimited depths; we use **three** levels.

---

## 2. Setting-Up & Configuring Entities

### 2.1. Create the Top-Level Organization

If you have not already run the helper script, execute:

```sql
-- psql -U postgres -d fund_accounting_db -f add_top_level_organization.sql
```

The script:

* Inserts **The Principle Foundation** with `code = 'TPF_PARENT'`.
* Updates existing child entities to reference it.

### 2.2. Add or Edit Entities in the UI

1. Open **Settings → Entities**.  
2. Click **“Add Entity”** (or the ➕ icon on a parent).  
3. In the modal:
   * **Entity Name / Code** – required, codes should be short (“TPF-ES”).
   * **Parent Entity** – choose *The Principle Foundation* for 2nd-level entities, or another entity for deeper trees.
   * **Consolidate Children** – tick if this entity should roll-up balances from its descendants.
   * Fiscal & currency fields are optional overrides.
4. Save.  The hierarchy tree refreshes instantly.

**Tip:** you can also drag the node header in future releases to re-parent an entity.

### 2.3. Manage Funds

Navigate to **Funds** while an entity is chosen in the selector, then **Add Fund**.  
Funds inherit their parent entity and participate automatically in consolidation.

---

## 3. Consolidation Logic

| Flag | Where | Meaning |
|------|-------|---------|
| `is_consolidated` (boolean) | `entities` | If **true**, reports for this entity include *all* children (entity & fund data). |

Calculation steps:

1. Start with the entity’s own fund balances.
2. Recursively add balances from every fund in child entities.
3. Repeat up the chain until the root.

The **Consolidated View** toggle (header-right) lets a user switch between:

* **Entity-only** – see just the currently selected entity.
* **Consolidated** – include children if `is_consolidated` is enabled.

---

## 4. Navigating the Hierarchy

### 4.1. Entity Selector

*Located in the header.*  
Shows root + immediate children.  
Choosing a node filters dashboards, CoA, funds and journal data.

### 4.2. Hierarchy Tree (Settings → Entities)

Visual 3-level tree with expand / collapse:

* 🔄 badge marks entities consolidating children.
* ✏️ edits a node, ➕ adds a child.

### 4.3. Breadcrumb Path

When you pick an entity the dashboard displays  
`Dashboard – The Principle Foundation › TPF-ES` so you never lose context.

### 4.4. Consolidated Toggle

Right of the DB status light.  
Green = consolidated, Grey = entity-only.

---

## 5. Best Practices

1. **Stable Codes** – pick short immutable codes; reports use them as anchors.  
2. **Consolidation** – enable only where necessary (root, regional hubs). Avoid double-counting by *not* enabling it on every level.  
3. **Fiscal Calendars** – keep children aligned with the parent’s fiscal year to simplify roll-ups.  
4. **Permissions** – future ACL can restrict users to branches; design the tree with that in mind.  
5. **Testing** – after structural changes run trial reports:  
   * *Entity-only* vs *Consolidated* totals  
   * Cross-entity inter-company journals  
6. **Archiving** – mark obsolete entities **Inactive** instead of deleting to preserve history.

---

## 6. Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Entity not shown in selector | `status` ≠ 'Active' or missing parent link | Edit entity, set Active & correct parent |
| Fund balance missing from roll-up | Fund’s entity not in the selected path | Check entity hierarchy & consolidation flag |
| Duplicate amounts in consolidated statements | Multiple ancestors have `is_consolidated = true` | Leave consolidation only on desired level |

---

## 7. Further Reading

* **SETUP.md** – deployment & database prerequisites  
* **docs/REPORTS.md** – financial statement configuration  
* **src/js/entity-hierarchy.js** – client-side implementation

Happy accounting!  
If you have questions or feature requests, open an issue on GitHub.
