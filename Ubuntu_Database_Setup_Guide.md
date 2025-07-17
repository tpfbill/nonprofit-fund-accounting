# Ubuntu Database Setup Guide  
Non-Profit Fund Accounting System (v8.8+)

> Covers PostgreSQL 15+, `npfadmin` user, full data load (with journal entries), and permission repair.

---

## 1 · Overview
The repository now ships **two one-click scripts** for Ubuntu:

| Script | When to Use | What It Does |
| ------ | ----------- | ------------ |
| `setup-ubuntu-database.sh` | Fresh installs **or** when you want to rebuild everything | • Installs schema<br>• Creates/updates `npfadmin` user & db<br>• Grants all privileges & default privileges<br>• Runs `db-init.sql` tables<br>• Loads Principle Foundation test data (23 journal entries)<br>• Generates/updates `.env` |
| `fix-ubuntu-permissions.sh` | Existing systems where “permission denied” errors appear **or** journal entries are missing | • Grants correct privileges to `npfadmin`<br>• Re-runs test-data loader (safe & idempotent)<br>• Leaves existing data intact |

Both scripts are **idempotent** – safe to run multiple times.

---

## 2 · Prerequisites
1. Ubuntu 20.04/22.04/24.04 with sudo access  
2. PostgreSQL 15+ installed (`psql --version`)  
3. Repository cloned to e.g. `/opt/nonprofit-fund-accounting`  
4. Node 18+ installed (`node -v`)  

---

## 3 · Fresh Installation (Recommended)

```bash
cd /opt/nonprofit-fund-accounting
chmod +x setup-ubuntu-database.sh
sudo ./setup-ubuntu-database.sh
```

What happens:
1. Ensures PostgreSQL service is running.
2. Creates/updates user **npfadmin / npfa123**.
3. Creates or recreates database **fund_accounting_db** (asks before dropping).
4. Executes **db-init.sql**.
5. Grants FULL + DEFAULT privileges.
6. Runs **load-principle-foundation-data.js** – populates entities, funds, **23 journal entries**.
7. Writes/updates `.env` with correct credentials.
8. Verifies counts (entities, funds, journal entries).

---

## 4 · Fixing an Existing Install

Symptoms:  
* `permission denied for table …`  
* iOS shows “DB Offline” despite backend running  
* Journal entries missing on Ubuntu

Run:

```bash
cd /opt/nonprofit-fund-accounting
chmod +x fix-ubuntu-permissions.sh
sudo ./fix-ubuntu-permissions.sh
```

Actions:
* Grants schema/table/sequence/function rights to `npfadmin`
* Sets default privileges for future tables
* Executes test-data loader (adds missing journal entries)
* Verifies counts

---

## 5 · Step-by-Step (Advanced / Manual)

1. **Create user & db**

```bash
sudo -u postgres psql -c "CREATE USER npfadmin WITH PASSWORD 'npfa123' CREATEDB;"
sudo -u postgres psql -c "CREATE DATABASE fund_accounting_db OWNER npfadmin;"
```

2. **Grant privileges**

```sql
GRANT ALL PRIVILEGES ON DATABASE fund_accounting_db TO npfadmin;
\c fund_accounting_db
GRANT USAGE ON SCHEMA public TO npfadmin;
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO npfadmin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO npfadmin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES, SEQUENCES TO npfadmin;
```

3. **Run schema & data**

```bash
psql -U npfadmin -d fund_accounting_db -f db-init.sql
PGUSER=npfadmin PGPASSWORD=npfa123 PGDATABASE=fund_accounting_db node load-principle-foundation-data.js
```

---

## 6 · Verification Checklist

| Test | Command | Expected |
| ---- | ------- | -------- |
| DB connect | `psql -U npfadmin -d fund_accounting_db -c "SELECT 1;"` | `1` |
| Entity count | `psql -c "SELECT COUNT(*) FROM entities;"` | `> 0` |
| Journal entries | `psql -c "SELECT COUNT(*) FROM journal_entries;"` | `23` |
| API health | `curl http://localhost:3000/api/health` | `{ status:"OK" }` |
| Tailscale health | `curl http://$(tailscale ip -4):3000/api/health` | Same JSON |

---

## 7 · Troubleshooting

| Symptom | Fix |
| ------- | --- |
| `psql: could not connect` | `sudo systemctl start postgresql` |
| `permission denied for table …` | Run **fix-ubuntu-permissions.sh** |
| `relation "journal_entries" does not exist` | Run **setup-ubuntu-database.sh** to rebuild schema |
| Tailscale IP works for `/api/health` but UI says DB Offline | Ensure frontend pulled latest code (`git pull`) and restart `python3 -m http.server 8080` |
| Script fails with “db-init.sql not found” | Verify you are in repo root and file path correct |

---

## 8 · Next Steps

```bash
# Start backend & frontend
PGUSER=npfadmin PGPASSWORD=npfa123 PGDATABASE=fund_accounting_db node server.js &
python3 -m http.server 8080 &

# Access from desktop
http://localhost:8080

# Access from mobile via Tailscale
http://<tailscale-ip>:8080
```

Enjoy a fully-configured Ubuntu instance with complete test data and mobile-ready networking! 🎉
