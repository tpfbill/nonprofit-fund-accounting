# Documentation Update Summary – Version 8.8  
*(covers work performed July 2025)*

---

## 1. Documentation Files Updated to v8.8

| # | File | Output(s) Generated | Status |
|---|------|---------------------|--------|
| 1 | Administrator_Guide_v8.8.html → **Administrator_Guide_v8.8.pdf** | ✅ Complete |
| 2 | nonprofit-accounting-user-guide.html → **User_Guide_v8.8.pdf** | ✅ Complete |
| 3 | AccuFund_Migration_Guide_v8.8.html → **AccuFund_Migration_Guide_v8.8.pdf** | ✅ Complete |
| 4 | accufund-migration-steps.html → **AccuFund_Migration_Steps_v8.8.pdf** | ✅ Complete |
| 5 | accufund-verification-procedure.html → **AccuFund_Verification_Procedure_v8.8.pdf** | ✅ Complete |
| 6 | nonprofit-vs-zohobooks-comparison.html → **Zoho_Books_Comparison_v8.8.pdf** | ✅ Complete |

---

## 2. Key Changes by Document

### 2.1 Administrator Guide
* New “Bank Account Management” chapter (navigation, permissions, reconciliation workflow).
* Adjusted Entity, User and Fiscal-Year sections to reflect new DB columns (`status`, `last_sync`).
* Re-generated all code snippets and screenshots.

### 2.2 User Guide
* Global bump to v8.8, new cover and TOC.
* Integrated:
  * Section 12 – Bank Account Management (access, add/edit, reconciliation, linking).
  * Revised System Settings numbering.
* Minor terminology fixes (JE → Journal Entry).

### 2.3 AccuFund Migration Guide
* Renamed to v8.8; emphasised inter-entity & bank-account mapping.
* Added Section 2.6 “Bank Account Integration”.
* Clarified required “import_id” column for rollback support.

### 2.4 AccuFund Migration Steps
* Version update & date stamp.
* Added extraction/mapping/import steps for bank_accounts.csv.
* Expanded validation matrix; renumbered steps.
* Updated wizard checkout to reference v8.8 transfer engine.

### 2.5 AccuFund Verification Procedure
* Title, metadata and TOC bumped to v8.8.
* New Section 7 – Bank Account Verification.
* All inter-entity references updated from “v8.6” to “v8.8”.
* TOC & section numbers realigned.

### 2.6 Zoho Books Comparison
* Version/date update.
* Added sections:
  * 4 – Inter-Entity Transfers (v8.8)
  * 5 – Bank Account Management (v8.7+)
* Shifted subsequent headings; refreshed cost/pricing table.

---

## 3. New Features Documented

| Feature | First Appears | Coverage Highlights |
|---------|---------------|---------------------|
| **Bank Account Management module** | v8.7 | Usage, add/edit flow, Plaid/OFX options, automated reconciliation, audit trail. Integrated in Admin Guide, User Guide, Migration materials, Verification procedure, Comparison doc. |
| **Inter-Entity Transfer engine** | v8.8 | Wizard UI, paired JE creation, matching_transaction_id, due-to/due-from structure. Covered in User Guide, Migration Guide, Steps, Verification procedure, Comparison doc. |

---

## 4. Files Still Requiring Review / Update

1. **README.md** – still states latest release as 8.6.  
2. **DOCKER_SETUP_WINDOWS.md** – screenshots reference v8.6 container tag.  
3. **INTER_ENTITY_WIZARD_INTEGRATION.md** – needs screenshots refreshed for final UI.  
4. **documentation.js descriptions map** – description keys still point to `_v8.6.pdf` names.  
5. **AccuFund Migration Utilities HTML pages** (`accufund-import.html`, etc.) – add hints for bank account import.  
6. **Custom Reports Builder docs** – consider adding NLQ examples for bank tables.

---

## 5. Recommendations for Future Documentation Improvements

* **Central Changelog Page** – maintain a single `CHANGELOG.md` summarising features & schema deltas; link from each guide.
* **Version Variables** – move version strings and dates to Jinja/Handlebars variables to avoid manual edits across 7+ docs.
* **Screenshot Automation** – adopt a headless browser script to regenerate UI images on each tagged release.
* **Accessibility Audit** – run docs through WCAG checker; adjust colour contrast in tables and code blocks.
* **Searchable Doc Portal** – integrate mkdocs-material or Docusaurus site so PDFs & HTML share a common nav and full-text search.
* **Continuous PDF Build** – add GitHub Action to auto-convert every `.html` under `/docs` to PDF using Prince or wkhtmltopdf.
* **User Feedback Loop** – embed a “Was this helpful?” link in HTML versions to capture improvement requests.

---
