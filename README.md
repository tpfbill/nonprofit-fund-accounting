# Non-Profit Fund Accounting System

A comprehensive web-based fund accounting system for non-profit organizations.

## Features
- Multi-entity support
- Chart of Accounts management
- Fund management
- Journal entries with complex line items
- Custom report builder
- Interactive dashboard with financial metrics
 - Consolidated sample data loader for **The Principle Foundation** hierarchy
 - Cross-platform automation scripts (macOS, Ubuntu, Windows)

## Technical Stack
- **Backend**: Node.js 18 / Express
- **Database**: PostgreSQL 15 (pg / pg-pool driver)
- **Frontend**: HTML5 / Vanilla JS (no build tools required)
- **Scripts & Utilities**: Plain Node.js + psql
- **Deployment**: Cross-platform shell / SQL scripts

---

## System Requirements

| Component      | Minimum Version | Notes                                      |
|----------------|-----------------|--------------------------------------------|
| Node.js        | **18.x**        | Install via [nvm](https://github.com/nvm-sh/nvm) or Homebrew |
| npm            | **10.x**        | Installed with Node.js                     |
| PostgreSQL     | **15.x**        | Local service or network instance          |
| Git            | **2.x**         | To clone the repository                    |

> macOS, Ubuntu 22 / 24 and Windows 11 have been validated.

---

## Quick Start (One-Line Setup)

After installing the requirements above and cloning the repo:

```bash
# 1. Install dependencies
npm ci

# 2. Run the complete setup (creates DB schema + loads TPF demo data)
node setup-complete.js
```

The script will:

1. Verify the database connection using the credentials in `.env`
2. Execute `db-init.sql` (creates full schema with all expected columns)
3. Run `load-principle-foundation-data.js` (seeds The Principle Foundation hierarchy, accounts & funds)

Start the servers:

```bash
# Backend API (http://localhost:3000)
node server.js

# Front-end (http://localhost:8080)
npx http-server . -p 8080
```

---

## Manual Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/tpfbill/nonprofit-fund-accounting.git
   cd nonprofit-fund-accounting
   ```
2. **Create `.env`**
   ```env
   PGHOST=localhost
   PGPORT=5432
   PGDATABASE=fund_accounting_db
   PGUSER=npfadmin
   PGPASSWORD=npfa123
   PORT=3000
   ```
3. **Set up PostgreSQL**
   ```bash
   psql postgres -f setup-database-cross-platform.sql
   ```
4. **Initialize schema**
   ```bash
   psql -U npfadmin -d fund_accounting_db -f db-init.sql
   ```
5. **(Optional) Load demo data**
   ```bash
   node load-principle-foundation-data.js
   ```

---

## Database Structure

The core tables created by `db-init.sql`:

| Table                | Purpose                                  |
|----------------------|------------------------------------------|
| `users`              | Application users / authentication      |
| `entities`           | Legal entities / departments            |
| `funds`              | Fund definitions                        |
| `accounts`           | Chart of accounts                       |
| `journal_entries`    | Journal entry headers                   |
| `journal_entry_items`| Journal entry line items                |

`db-init.sql` now includes every column required by the application and demo loaders (e.g. `entry_date`, `reference_number`, `total_amount`, etc.) — **no manual ALTERs should be necessary**.

---

## Sample Data – The Principle Foundation

`load-principle-foundation-data.js` is an idempotent, all-in-one loader that creates:

* Parent entity `TPF_PARENT`
* Subsidiary entities `TPF`, `TPF-ES`, `IFCSN`
* Standard chart of accounts (25 accounts)
* Standard funds with opening balances

Legacy loaders (`add-tpf-hierarchy.js`, `add-consolidated-test-data.js`, `test-data.sql`, etc.) have been **removed** to prevent confusion.

---

## Contributing

Pull requests are welcome! Please run `npm test` (coming soon) and ensure new features include documentation updates where appropriate.

---

© 2025 The Principle Foundation – MIT License