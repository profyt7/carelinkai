# CareLinkAI – Local Development Guide

Welcome to the CareLinkAI codebase!  
This guide walks you through setting up the full **mobile-first PWA** on your laptop, understanding the modules already built, and how to contribute new features.

---

## ⚡ Quick Start

### 1. Prerequisites
| Tool | Version | Notes |
| ---- | ------- | ----- |
| **Node.js** | ≥ 18 | LTS recommended |
| **npm** | ≥ 9   | comes with Node |
| **Docker** | ≥ 20 | for Postgres, Redis, MinIO |
| **Git** | any   | clone & commit |

### 2. Clone & Install
```bash
git clone https://github.com/your-org/carelinkai.git
cd carelinkai
cp .env.example .env        # fill secrets later
npm install                 # installs JS deps
```

### 3. Spin up Infrastructure
```bash
docker compose up -d        # Postgres, Redis, MinIO, Mailhog
```

### 4. Generate DB & Seed
```bash
npx prisma generate
npx prisma migrate dev --name init
npm run seed                # creates admin admin@carelinkai.com / Admin123!
```

### 5. Start Dev Server
```bash
npm run dev                 # http://localhost:5000
```
Open the URL on **desktop or mobile**; install prompt will appear (PWA ready).

---

## 🎯 Features Completed (Milestone 1)

| Module | Status | Notes |
| ------ | ------ | ----- |
| **Dashboard Shell** | ✅ | QuickBooks-style sidebar, card widgets |
| **Search / Discovery** | ✅ | `/search` page with list & map view, mobile filters |
| **Home Details** | ✅ | `/homes/[id]` with gallery, pricing table, AI match badge, tour booking flow |
| **AI Match Engine (v0)** | ✅ | Rule-based scoring, ready for ML upgrade |
| **Auth & RBAC** | ✅ | NextAuth, roles, two-factor scaffolding |
| **Audit Logs** | ✅ | HIPAA-compliant trail, Prisma model + helpers |
| **PWA Setup** | ✅ | manifest, service-worker (disabled in dev) |
| **Dockerized Stack** | ✅ | Postgres 15, Redis 7, MinIO S3, Mailhog |

---

## 🛠️ Development Workflow

| Task | Command |
| ---- | ------- |
| Dev server w/ hot-reload | `npm run dev` |
| Type check & ESLint | `npm run lint` |
| Jest unit tests | `npm test` |
| Generate Prisma client | `npm run prisma:generate` |
| New DB migration | `npm run prisma:migrate` |
| Prisma Studio GUI | `npm run prisma:studio` |
| Stop containers | `docker compose down` |
| Reset DB | `docker compose down -v && docker compose up -d && npx prisma migrate dev` |

Changes in `next.config.js`, `tailwind.config.js`, or `prisma/schema.prisma` trigger automatic reloads.

---

## 🗂️ Project Structure (TL;DR)

```
├─ src/
│  ├─ app/               # Next.js (app router)
│  │  ├─ api/            # API routes (REST style)
│  │  ├─ search/         # Search UI
│  │  └─ homes/[id]/     # Detail UI
│  ├─ lib/               # Auth, AI, audit, utils
│  └─ components/        # Shared UI pieces
├─ prisma/               # DB schema & seed
├─ docker/               # Dockerfile & healthchecks
└─ public/               # Icons, manifest, images
```

---

## 🚧 Next Steps / Open Tickets

1. **Caregiver Marketplace** – profile builder, per-diem shifts  
2. **Operator Dashboard** – occupancy analytics, compliance uploads  
3. **Family Portal** – secure messaging, document vault  
4. **Marketing Landing Page** – hero, comparison table, Mailchimp form  
5. **Messaging (Socket.io)** – real-time chat, notifications  
6. **Stripe Billing** – deposits, wallet, payouts  
7. **Admin Panel** – user moderation, payouts oversight  

> Create a branch per feature (`feat/<ticket>`) and open a PR with screenshots + unit tests.

---

## 🤝 Support

Having issues running the stack?

* **Docker logs**: `docker compose logs -f`
* **Web logs**: console output of `npm run dev`
* **Database GUI**: `npx prisma studio`
* **Email testing**: http://localhost:8025

Feel free to ping the #carelinkai-dev channel or open a GitHub Discussion.

Happy coding! 💙
