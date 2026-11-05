# Using Docker Desktop for this project

Docker runs PostgreSQL locally in a container. Keep Docker Desktop running whenever you synchronize data or use the dashboard with PostgreSQL.

## Find the database

1. Open Docker Desktop and click **Containers** in the left sidebar.
2. Expand **automatedbireportingsystem**.
3. The **postgres-1** container should show **Running**. Its health check should become healthy.
4. Click the container and select **Logs** to inspect database startup messages.

The Gordon chat and its Select folder button are not needed for this setup. The repository already has docker-compose.yml describing the database.

## Commands in the VS Code terminal

Run from the project folder:

```powershell
docker compose up -d --wait
docker compose ps
```

The first command starts the database in the background. On its first run it also downloads PostgreSQL and creates the schema. The second shows its status.

Check the initialized tables:

```powershell
docker compose exec postgres psql -U superstore -d superstore -c '\dt'
```

Stop it when finished:

```powershell
docker compose stop
```

Start it again with `docker compose up -d --wait`. These commands preserve its stored database records. A named Docker volume stores those records separately from the container. Deleting that volume removes the database data.

## Connection details

| Setting | Value |
| --- | --- |
| Host | localhost |
| Port | 5432 |
| Database | superstore |
| User | superstore |
| Password | POSTGRES_PASSWORD in the private .env file |

The generated .env contains a matching DATABASE_URL for Python. Do not publish this file or include it in screenshots.

At first the database contains tables and views but no retail transactions. Your existing Google Sheets records are not copied automatically by starting Docker. Follow the Google Sheets extraction section in deployment.md to configure the read-only service account and run the ETL. Leave the CSV demo separate from that live operational source.
