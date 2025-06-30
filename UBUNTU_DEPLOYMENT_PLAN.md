# Ubuntu 22.04 LTS Deployment Plan (v8.5)

## 1. Introduction

This document provides a comprehensive, step-by-step deployment plan for the Non-Profit Fund Accounting System on an Ubuntu 22.04 LTS server. This guide covers server provisioning, security hardening, application deployment, and ongoing maintenance, ensuring a secure, stable, and performant production environment.

**Target Audience**: System Administrators, DevOps Engineers, or technical staff responsible for server management.
**Goal**: A production-ready, secure, and automated deployment of the application.

---

## 2. Prerequisites

Before starting, ensure you have the following:
*   **A clean Ubuntu 22.04 LTS server instance**: Either a cloud VM (AWS, DigitalOcean, Linode) or a dedicated on-premise machine.
*   **SSH access** to the server with `sudo` privileges.
*   A **domain name** pointing to your server's IP address (required for SSL).
*   **Git** installed on your local machine to access the repository.

---

## 3. Deployment Timeline & Milestones

| Phase | Day | Key Activities | Milestone |
| :--- | :--- | :--- | :--- |
| **1. Server Setup** | Day 1 | Provision VM, initial updates, create app user, configure SSH. | Server is secure and accessible. |
| **2. Software Install** | Day 1 | Install Node.js, PostgreSQL, Nginx. Configure PostgreSQL. | All required software is installed. |
| **3. App Deployment** | Day 2 | Clone repo, install dependencies, configure environment. | Application code is on the server. |
| **4. Database Init** | Day 2 | Run SQL scripts to create schema and load initial data. | Database is ready for the app. |
| **5. Service Config** | Day 3 | Create systemd service, configure Nginx reverse proxy. | App runs as a managed service. |
| **6. Security & SSL** | Day 3 | Set up firewall, install Let's Encrypt SSL certificate. | Server is hardened and uses HTTPS. |
| **7. Backups & Logs** | Day 4 | Configure automated database backups and log rotation. | System is ready for long-term use. |
| **8. Go-Live** | Day 5 | Final testing, user acceptance, and official launch. | Application is live in production. |

---

## 4. Phase 1: Server Provisioning & Initial Setup (Day 1)

### 4.1. Provision Server
Choose your hosting environment:
*   **Cloud (Recommended)**: Create a new droplet/instance on DigitalOcean, Linode, or AWS EC2 with Ubuntu 22.04 LTS. A basic plan (2 vCPU, 4GB RAM) is a good starting point.
*   **On-Premise**: Install a fresh copy of Ubuntu 22.04 LTS on your physical server or a VM.

### 4.2. Initial Server Connection & Update
```bash
# Connect to your new server via SSH
ssh root@your_server_ip

# Update all system packages to the latest version
sudo apt update && sudo apt upgrade -y
```

### 4.3. Create a Dedicated Application User
Never run web applications as the `root` user.
```bash
# Create a new user for the application (e.g., 'npfa')
sudo adduser npfa

# Add the new user to the 'sudo' group to allow administrative privileges
sudo usermod -aG sudo npfa

# Log out of root and log back in as the new user
exit
ssh npfa@your_server_ip
```

### 4.4. Basic Security: SSH Hardening
Disable password authentication and use SSH keys for better security.
```bash
# On your LOCAL machine, copy your SSH key to the server
# (If you don't have one, run `ssh-keygen` first)
ssh-copy-id npfa@your_server_ip

# On the SERVER, disable password authentication
sudo nano /etc/ssh/sshd_config

# Find and change the following line:
# PasswordAuthentication no

# Restart the SSH service to apply changes
sudo systemctl restart ssh
```
**From now on, you will only be able to log in with your SSH key.**

---

## 5. Phase 2: Software Installation (Day 1)

### 5.1. Install Node.js (v18.x)
```bash
# Add the NodeSource repository for Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js and build tools
sudo apt install -y nodejs build-essential

# Verify installation
node -v  # Should show v18.x.x
npm -v   # Should show a recent version
```

### 5.2. Install & Configure PostgreSQL
```bash
# Install PostgreSQL and its client tools
sudo apt install -y postgresql postgresql-contrib

# Start and enable the PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Set a secure password for the default 'postgres' user
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'your_very_secure_password';"

# Create the application database
sudo -u postgres createdb fund_accounting_db
```

### 5.3. Install Nginx (Web Server)
```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable the Nginx service
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## 6. Phase 3: Application Deployment (Day 2)

### 6.1. Clone the Repository
```bash
# Navigate to the user's home directory
cd ~

# Clone the v8.5 branch of the application
git clone -b v8.5 https://github.com/tpfbill/nonprofit-fund-accounting.git

# Enter the application directory
cd nonprofit-fund-accounting
```

### 6.2. Install Application Dependencies
```bash
# Install the Node.js packages defined in package.json
npm install
```

### 6.3. Configure Production Environment
Create a `.env` file to store your production secrets. **This file should never be committed to Git.**
```bash
# Create and open the .env file for editing
nano .env
```
Add the following content, replacing the password with the one you set in Step 5.2:
```ini
NODE_ENV=production
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your_very_secure_password
PGDATABASE=fund_accounting_db
PORT=3000
```
Save and close the file (`Ctrl+X`, then `Y`, then `Enter`).

---

## 7. Phase 4: Database Initialization (Day 2)

### 7.1. Run SQL Scripts
These commands will create the tables and load the initial hierarchy and test data.
```bash
# From within the nonprofit-fund-accounting directory

# 1. Create tables and indexes
psql -h localhost -U postgres -d fund_accounting_db -f src/db/db-init.sql

# 2. Add the top-level organization
psql -h localhost -U postgres -d fund_accounting_db -f add_top_level_organization.sql

# 3. Add the TPF hierarchy and test data
node add-tpf-hierarchy.js
psql -h localhost -U postgres -d fund_accounting_db -f test-data.sql
```

### 7.2. Verify Database
```bash
# Connect to the database and list tables
psql -h localhost -U postgres -d fund_accounting_db -c "\dt"

# You should see tables like entities, funds, accounts, etc.
```

---

## 8. Phase 5: Production Service Configuration (Day 3)

### 8.1. Create a `systemd` Service
This ensures the application runs as a background service and restarts automatically if it crashes or the server reboots.
```bash
# Create the service file
sudo nano /etc/systemd/system/npfa.service
```
Paste the following configuration into the file:
```ini
[Unit]
Description=Nonprofit Fund Accounting Application
After=network.target postgresql.service

[Service]
Type=simple
User=npfa
Group=npfa
WorkingDirectory=/home/npfa/nonprofit-fund-accounting
EnvironmentFile=/home/npfa/nonprofit-fund-accounting/.env
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```
Save and close the file.

### 8.2. Enable and Start the Service
```bash
# Reload systemd to recognize the new service
sudo systemctl daemon-reload

# Enable the service to start on boot
sudo systemctl enable npfa.service

# Start the service now
sudo systemctl start npfa.service

# Check its status
sudo systemctl status npfa.service
# Look for "active (running)" in green text.
```

---

## 9. Phase 6: Security Hardening & SSL (Day 3)

### 9.1. Configure Firewall (UFW)
```bash
# Allow SSH, HTTP, and HTTPS traffic
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'

# Enable the firewall
sudo ufw enable
# Press 'y' to confirm
```

### 9.2. Configure Nginx as a Reverse Proxy
This routes traffic from the public web (port 80/443) to your Node.js app (port 3000).
```bash
# Create a new Nginx configuration file
sudo nano /etc/nginx/sites-available/npfa
```
Paste the following, replacing `your-domain.com` with your actual domain name:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Save and close the file.

### 9.3. Enable the Nginx Site
```bash
# Create a symbolic link to enable the site
sudo ln -s /etc/nginx/sites-available/npfa /etc/nginx/sites-enabled/

# Remove the default Nginx site
sudo rm /etc/nginx/sites-enabled/default

# Test the Nginx configuration for syntax errors
sudo nginx -t
# Should return "syntax is ok" and "test is successful"

# Reload Nginx to apply the changes
sudo systemctl reload nginx
```

### 9.4. Install SSL Certificate with Certbot
```bash
# Install Certbot and the Nginx plugin
sudo apt install -y certbot python3-certbot-nginx

# Obtain and install the SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
# Follow the prompts. Choose to redirect HTTP traffic to HTTPS.

# Test automatic renewal
sudo certbot renew --dry-run
```
Your application should now be accessible via `https://your-domain.com`.

---

## 10. Phase 7: Monitoring & Backups (Day 4)

### 10.1. Log Monitoring
The application logs are managed by `systemd`'s journal.
```bash
# View live logs
sudo journalctl -u npfa.service -f

# View the last 100 log entries
sudo journalctl -u npfa.service -n 100
```

### 10.2. Automated Backups
Use the script provided in the repository.
```bash
# Create a backup directory owned by the app user
sudo mkdir -p /var/backups/npfa
sudo chown npfa:npfa /var/backups/npfa

# Edit the backup script to use the new directory
nano /home/npfa/nonprofit-fund-accounting/scripts/update-linux.sh
# Change BACKUP_DIR to "/var/backups/npfa"

# Set up a cron job to run the backup daily at 2 AM
crontab -e
# Add the following line to the end of the file:
0 2 * * * /home/npfa/nonprofit-fund-accounting/scripts/update-linux.sh
```

---

## 11. Phase 8: Final Testing & Go-Live (Day 5)

### 11.1. Go-Live Checklist
*   [ ] **Final Backup**: Perform a final manual backup before going live.
*   [ ] **DNS**: Confirm your domain name points to the server's IP address.
*   [ ] **Application Access**: Verify the application is accessible via `https://your-domain.com`.
*   [ ] **Functionality Test**:
    *   [ ] Log in (if auth is enabled).
    *   [ ] Navigate to all pages (Dashboard, Funds, Journal Entries, Reports, Settings).
    *   [ ] Run a Natural Language Query.
    *   [ ] Build and preview a Custom Report.
    *   [ ] Test the AccuFund Import utility with a small sample file.
*   **User Acceptance Testing (UAT)**:
    *   [ ] Have key finance staff perform their daily tasks in the new system.
    *   [ ] Ask them to generate and verify a key financial report.
*   **Announce Go-Live**: Inform all users that the new system is live and provide them with the URL and login instructions.
*   **Decommission Old System**: Once the parallel run period is over and everyone has signed off, you can safely decommission AccuFund.

Congratulations! Your Non-Profit Fund Accounting System is now deployed and ready for production use.