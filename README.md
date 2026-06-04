# Leave-Management-System
This is a Backend application for an Employee Leave Management Portal. The system allows employees to apply for leaves, managers to approve/reject leave requests, and provides visibility into leave balances and history. Built with Node.js, PostgreSQL, RabbitMQ, Kong API Gateway, and Consul service discovery — with distributed tracing via OpenTelemetry & Jaeger and centralised logging via the ELK Stack — fully containerised with Docker Compose.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Setup & Running with Docker Compose](#setup--running-with-docker-compose)
3. [Environment Variables](#environment-variables)
4. [Pre-seeded Users](#pre-seeded-users)
5. [API Testing Instructions](#api-testing-instructions)
6. [Service URLs](#service-urls)
7. [Video Recording](#video-recording)

---

---

## Prerequisites

- Docker
- No Node.js installation required on the host

Verify Docker is running:
```bash
docker --version
docker compose version
```

---

## Setup & Running with Docker Compose

### 1. Clone the repository

```bash
git clone https://github.com/Shiva-003/Leave-Management-System.git
cd Leave-Management-System
```

### 2. Start all services

```bash
docker compose up --build
```

This single command will:
- Build Docker images for auth-service, leave-service, and notification-service
- Start PostgreSQL, RabbitMQ, Consul, Kong, and all three services
- Start Elasticsearch, Logstash, and Kibana for centralised logging
- Start Jaeger for distributed tracing
- Initialise the database schema (via `init-db/init.sql`)
- Seed pre-defined users and leave balances automatically on first run

### 3. Verify all services are healthy

```bash
docker compose ps
```

All services should show `healthy` or `running`.

### 4. Stop all services

```bash
docker compose down
```

To also remove volumes (wipe database):
```bash
docker compose down -v
```

### Rebuilding after code changes

```bash
docker compose up --build
```

---

## Environment Variables

All environment variables are pre-configured in `docker-compose.yml` for local development. 
Each service includes a `.env.example` file with all required variables and defaults. Copy it to `.env` and fill in your values before running.

For production, replace default secrets with a proper secrets manager (Docker Secrets, AWS Secrets Manager, or Vault).

---

## Pre-seeded Users

The database is automatically seeded on first startup with two users:

- **Shivam Jayara** (`shivam@company.com`, password: `password123`) — Manager
- **John Doe** (`john@company.com`, password: `password123`) — Employee, reports to Shivam

John starts with 12 casual, 10 sick, and 15 privilege leave days, all unused.

---


## API Testing Instructions

The base URL for all API requests is: `http://localhost:3000`

Plese use Postman to test the API's.

---

## API Testing

Import `Leave Manage System.postman_collection.json` into Postman to get all requests pre-configured.

1. Open Postman → **Import** → select the collection json file: `Leave Manage System.postman_collection.json`
2. Use `john@company.com` to test employee flows and `shivam@company.com` for manager flows (password: `password123` for both)
3. Set the `EMPLOYEE_TOKEN` collection variable to the token returned from `POST /auth/login` for `john@company.com`
4. Set the `MANAGER_TOKEN` collection variable to the token returned from `POST /auth/login` for  `shivam@company.com`

The collection covers the full flow — login, applying for leave, manager approval/rejection, cancellation, and error scenarios like invalid tokens and insufficient balance.


---

## Service URLs

| URL | Description |
|-----|-------------|
| `http://localhost:3000` | All API traffic (via Kong) |
| `http://localhost:8001` | Kong Admin API |
| `http://localhost:8002` | Kong Manager UI |
| `http://localhost:8500` | Consul UI — view registered services and health |
| `http://localhost:15672` | RabbitMQ Management UI (user: `user`, pass: `password`) |
| `http://localhost:16686` | Jaeger UI — distributed traces |
| `http://localhost:5601` | Kibana UI — centralised logs |
| `http://localhost:9200` | Elasticsearch REST API |

---

## Video Recording

Please find the video recording link in the zip folder:-
 **[Zip folder link](https://drive.google.com/file/d/1mFEwyw0NzM2FugnHUu4laaZn7P6YZmOB/view?usp=drive_link)**


