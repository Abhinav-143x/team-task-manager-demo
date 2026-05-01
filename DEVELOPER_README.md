# Developer README

## Architecture

```text
client/          React + Vite UI
server/          Express REST API
server/prisma/   Prisma schema, seed, migrations
Dockerfile       Production build for Railway
railway.json     Railway deploy settings
docker-compose.yml Local PostgreSQL
```

The production server is a single Express app. It exposes `/api/*` routes and serves the compiled React app from `client/dist`.

## Data Model

```text
User
- id
- name
- email
- passwordHash
- role: ADMIN | MEMBER

Project
- id
- name
- description
- ownerId

ProjectMember
- projectId
- userId
- role: ADMIN | MEMBER

Task
- id
- title
- description
- status: TODO | IN_PROGRESS | DONE
- dueDate
- projectId
- assigneeId
- createdById
```

Important relationship rules:

- A project has many members.
- A project has many tasks.
- A task belongs to one project.
- A task can be assigned to one project member.
- `ProjectMember` enforces one membership per user per project.

## RBAC Rules

Global `ADMIN` users and project `ADMIN` members can:

- Create projects
- Add or remove project members
- Change member roles
- Create tasks
- Assign tasks
- Delete tasks
- Update all task fields

Project `MEMBER` users can:

- View projects they belong to
- View team and tasks
- Update status on tasks assigned to them

## REST API

Auth:

```text
POST /api/auth/signup
POST /api/auth/login
GET  /api/me
```

Dashboard:

```text
GET /api/dashboard
```

Projects:

```text
GET   /api/projects
POST  /api/projects
GET   /api/projects/:id
PATCH /api/projects/:id
```

Members:

```text
POST   /api/projects/:projectId/members
PATCH  /api/projects/:projectId/members/:userId
DELETE /api/projects/:projectId/members/:userId
```

Tasks:

```text
POST   /api/projects/:projectId/tasks
PATCH  /api/tasks/:taskId
DELETE /api/tasks/:taskId
```

## Environment Variables

Server:

```text
DATABASE_URL=postgresql://...
JWT_SECRET=replace-with-secure-secret
CLIENT_URL=http://localhost:5173
PORT=4000
NODE_ENV=development
```

Client:

```text
VITE_API_URL=
```

Leave `VITE_API_URL` empty for local Vite proxy usage. In production, the frontend is served by Express and uses same-origin `/api` calls.

## Local Development

Install dependencies:

```bash
npm install
```

Create env file:

```bash
copy server\.env.example server\.env
```

Start PostgreSQL:

```bash
docker compose up -d
```

Apply migration and seed demo data:

```bash
npm --prefix server run prisma:migrate
npm --prefix server run seed
```

Start backend:

```bash
npm run dev:server
```

Start frontend:

```bash
npm run dev:client
```

## Validation

Frontend build:

```bash
npm --prefix client run build
```

Prisma validation:

```bash
npm --prefix server run prisma:generate
npx --prefix server prisma validate
```

API smoke test:

```bash
curl http://localhost:4000/api/health
```

## Railway Deployment

1. Create a Railway project.
2. Add PostgreSQL.
3. Set `DATABASE_URL`, `JWT_SECRET`, and `NODE_ENV=production`.
4. Deploy the GitHub repository.

The Docker build and start flow:

```text
1. Installs server dependencies
2. Installs client dependencies
3. Generates Prisma client
4. Builds React
5. Runs Prisma migrations
6. Seeds demo users and sample tasks
7. Starts Express
```

## Demo Notes

Seed users:

```text
admin@example.com / password123
member@example.com / password123
```

Seed project:

```text
Launch Website
```

Seed tasks include one overdue task so the dashboard has visible overdue state.
