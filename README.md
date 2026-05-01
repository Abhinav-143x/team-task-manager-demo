# Team Task Manager

A full-stack project and task management demo with authentication, project teams, Admin/Member access, task assignment, status tracking, and dashboard metrics.

## Demo Accounts

```text
Admin:  admin@example.com  / password123
Member: member@example.com / password123
```

## Tech Stack

- React + Vite
- Node.js + Express REST API
- PostgreSQL
- Prisma ORM
- JWT authentication
- bcrypt password hashing
- Zod validation
- Docker + Railway deployment config

## Features

- Signup and login
- JWT-protected REST APIs
- Project creation
- Project team membership
- Project-level Admin/Member roles
- Task creation and assignment
- Task status updates: Todo, In Progress, Done
- Overdue task tracking
- Dashboard summary
- Railway-ready Dockerfile and Prisma migration

## Local Setup

```bash
npm install
copy server\.env.example server\.env
docker compose up -d
npm --prefix server run prisma:migrate
npm --prefix server run seed
```

Run the app:

```bash
npm run dev:server
npm run dev:client
```

Open:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:4000/api/health
```

## Railway Deployment

This repo includes a `Dockerfile` and `railway.json`.

Required Railway variables:

```text
DATABASE_URL=<Railway PostgreSQL connection string>
JWT_SECRET=<strong random secret>
NODE_ENV=production
```

The Dockerfile command runs migrations, seeds demo users, and starts the server:

```bash
cd server && npx prisma migrate deploy && npx prisma db seed && npm start
```

The Express server serves the built React app from `client/dist`, so Railway can host the full app as one service.

## Developer Docs

See [DEVELOPER_README.md](./DEVELOPER_README.md) for API routes, schema notes, RBAC rules, environment variables, and deployment workflow.
