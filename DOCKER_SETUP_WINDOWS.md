# Docker Setup Guide for Windows

This guide provides step-by-step instructions for setting up and running the Non-Profit Fund Accounting application using Docker on a Windows machine.

## 1. Prerequisites

Before you begin, ensure you have the following software installed on your Windows system:

*   **Docker Desktop for Windows**: This is the core requirement. It manages containers and the Docker Engine.
    *   **Important**: Make sure you enable the **WSL 2 (Windows Subsystem for Linux) backend** during installation, as it offers the best performance and compatibility.
    *   [Download Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)

*   **Git**: For cloning the application repository from GitHub.
    *   [Download Git](https://git-scm.com/download/win)

*   **A Code Editor**: A modern code editor like [Visual Studio Code](https://code.visualstudio.com/) is recommended for viewing and editing files.

## 2. Step-by-Step Setup

Follow these steps to get the application running.

### Step 1: Clone the Repository

Open a terminal (like PowerShell or Git Bash) and clone the application repository to your local machine.

```bash
git clone https://github.com/tpfbill/nonprofit-fund-accounting.git
cd nonprofit-fund-accounting
```

### Step 2: Configure the Environment

The repository includes a Docker-specific environment file. You need to rename it so Docker Compose can use it automatically.

In your terminal, run:

```bash
# In PowerShell:
ren .env.docker .env

# Or in Git Bash:
mv .env.docker .env
```

This `.env` file tells the application how to connect to the database inside the Docker environment. You can open it to see the configuration, but the default values are designed to work with our `docker-compose.yml` file.

## 3. Building and Running the Containers

Now we will use Docker Compose to build the application image and start the required containers (the Node.js app and the PostgreSQL database).

### Step 1: Run Docker Compose

In your terminal, from the root of the `nonprofit-fund-accounting` directory, run the following command:

```bash
docker-compose up -d --build
```

*   `up`: Creates and starts the containers.
*   `--build`: Builds the application image from the `Dockerfile` before starting. This is only necessary the first time or when you change the application code.
*   `-d`: Runs the containers in "detached" mode, meaning they run in the background.

The first time you run this, Docker will download the `postgres:15-alpine` and `node:18-alpine` base images, which may take a few minutes.

### Step 2: Verify Containers are Running

To check if the containers started successfully, run:

```bash
docker-compose ps
```

You should see two services running, `npfa_db` and `npfa_app`, with a "running" or "healthy" status.

## 4. Accessing the Application

Once the containers are running, you can access the application in your web browser.

**Open your browser and navigate to:**

[http://localhost:3000](http://localhost:3000)

You should see the application's main dashboard.

## 5. Database Initialization

The first time you start the containers, the database will be empty. You need to run the initialization scripts to create the tables and load the initial data.

### Step 1: Open a Shell Inside the App Container

To run commands inside the application container, use the `docker-compose exec` command:

```bash
docker-compose exec app sh
```

This will give you a command prompt (`/usr/src/app#`) inside the running `app` container.

### Step 2: Install PostgreSQL Client

The application container is very lightweight and doesn't include the `psql` tool by default. Install it with this command:

```bash
# Inside the container's shell
apk add --no-cache postgresql-client
```

### Step 3: Run the SQL Scripts

Now, run the initialization scripts. The database service is named `db` on the internal Docker network.

```bash
# Inside the container's shell

# 1. Initialize the main schema
psql -h db -U postgres -d fund_accounting_db -f src/db/db-init.sql

# 2. Add the top-level organization and hierarchy
psql -h db -U postgres -d fund_accounting_db -f add_top_level_organization.sql

# 3. Load test data
psql -h db -U postgres -d fund_accounting_db -f test-data.sql
```

After running these commands, refresh your browser at `http://localhost:3000`. The application should now be fully populated with data.

### Step 4: Exit the Container Shell

Once you are done, you can exit the container's shell by typing:

```bash
exit
```

## 6. Troubleshooting Common Issues

*   **Error: "Port 3000 is already in use"**
    *   **Cause**: Another application on your computer is using port 3000.
    *   **Solution**: Stop the other application, or change the port mapping in `docker-compose.yml`. For example, change ` "3000:3000" ` to ` "3001:3000" ` and access the app at `http://localhost:3001`.

*   **Application shows "DB Offline"**
    *   **Cause**: The app container cannot connect to the database container.
    *   **Solution**:
        1.  Check the logs for both services: `docker-compose logs -f app` and `docker-compose logs -f db`.
        2.  Ensure the `PGHOST` in your `.env` file is set to `db`.
        3.  Ensure the database password matches in both `.env` and `docker-compose.yml`.

*   **Changes to code are not reflected**
    *   **Cause**: Docker builds an image of your application. If you change the code, you need to rebuild the image.
    *   **Solution**: Run `docker-compose up -d --build` again to rebuild the `app` image with your latest changes.

## 7. Useful Docker Commands

Here are some commands you will use frequently:

*   `docker-compose up -d`: Start the application in the background.
*   `docker-compose down`: Stop and remove the containers.
*   `docker-compose stop`: Stop the containers without removing them.
*   `docker-compose start`: Restart stopped containers.
*   `docker-compose ps`: View the status of your running services.
*   `docker-compose logs -f app`: View the live logs for the application service.
*   `docker-compose exec app sh`: Get a command-line shell inside the running app container.
*   `docker-compose build`: Force a rebuild of the application image.

## 8. Production Considerations

While this setup is great for development, for a live production environment, consider the following:

*   **Secure Passwords**: Change the default `PGPASSWORD` in your `.env` file to a strong, randomly generated password.
*   **Data Volumes**: The `db-data` volume in `docker-compose.yml` ensures your database data persists even if you remove the container. **Never delete this volume in production unless you have a backup.**
*   **Reverse Proxy**: In production, it's best practice to run a web server like Nginx in front of your Node.js application to handle SSL (HTTPS), caching, and load balancing.
*   **Backups**: Implement a robust, automated backup strategy for your PostgreSQL database (see below).

## 9. Backup and Restore Procedures

You can easily back up and restore your database using Docker commands.

### To Create a Backup:

This command executes `pg_dump` inside the `db` container and saves the output to a `backup.sql` file on your local machine.

```bash
docker-compose exec -T db pg_dump -U postgres -d fund_accounting_db > backup.sql
```

### To Restore from a Backup:

This command pipes a `backup.sql` file from your local machine into the `psql` command inside the `db` container.

```bash
cat backup.sql | docker-compose exec -T db psql -U postgres -d fund_accounting_db
```

It is highly recommended to schedule the backup command to run automatically (e.g., daily) using Windows Task Scheduler.
