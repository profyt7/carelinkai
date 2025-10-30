# CareLinkAI

Connecting families, assisted-living operators, and caregivers through AI-powered placement, staffing, and billing — all in one HIPAA-ready Progressive Web App.

> “The smarter way to place loved ones & staff your care home.”

---

## 🌟 Key Capabilities

| Module | Highlights |
| ------ | ---------- |
| 🏡 **Home Discovery** | Geo-search, availability filters, AI placement likelihood, booking flow |
| 🤖 **AI Matching Engine** | Predict best-fit homes & caregivers, surge detection, risk flags |
| 👩‍⚕️ **Caregiver Marketplace** | Profile builder, credential uploads, Uber-style shift booking |
| 🏛️ **Operator Dashboard** | Occupancy analytics, staffing ratios, compliance tracker |
| 💳 **Payments & Wallet** | Stripe integration, deposits, incidentals, payouts |
| 📁 **Family Portal** | Secure messaging, resident timeline, document vault |
| 📊 **Admin Panel** | User management, content moderation, payout oversight, audit logs |
| 📈 **Marketing Site** | Landing page, comparison table, SEO content, early-access signup |

Screenshots follow the clean card-based layout shown in `quickbooksux.PNG`.

---

## 🛠️ Technology Stack

Frontend:

* Next.js 14 (React) & TypeScript  
* Tailwind CSS + Headless UI  
* React-ChartJS 2 for analytics  
* next-pwa for offline / installable experience

Backend / Infra:

* Node.js 18 + Express API routes (inside Next.js app directory)  
* PostgreSQL 15 (Prisma ORM)  
* Redis 7 for caching & queues  
* Socket.io for real-time messaging  
* Stripe SDK for payments  
* MinIO (S3-compatible) for document storage  
* Docker & Docker Compose for local orchestration

Security / Compliance:

* NextAuth.js with JWT & optional 2FA  
* Row-level ACL via Prisma middleware  
* AES-256 application-level encryption for PHI fields  
* Audit log model (`AuditLog`) for every CRUD / auth event  
* CSP, HSTS, Secure/SameSite cookies enabled by default

---

## 🚀 Quick Start (Local)

Prerequisites:  
* Docker 20+ & Docker Compose  
* Node 18+ (only if running outside containers)

```bash
# 1. Clone the repo
git clone https://github.com/<your-org>/carelinkai.git
cd carelinkai

# 2. Copy environment skeleton & adjust secrets
cp .env.example .env

# 3. Launch full stack (DB, Redis, MinIO, Mailhog, Web)
docker compose up --build
```

App will be available on **http://localhost:5000**.

### First-time DB setup

The container automatically runs `prisma migrate deploy`, but if running outside Docker:

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
```

---

## 🧑‍💻 Development Workflow

| Task | Command |
| ---- | ------- |
| Dev server with hot reload | `npm run dev` |
| Type checking | `npm run lint` |
| Run unit tests (Jest) | `npm test` |
| Prisma Studio (DB UI) | `npm run prisma:studio` |
| Apply new migration | `npm run prisma:migrate` |

See docs/DEVELOPMENT.md for a fuller local setup and testing guide.
For production deployment guidance, see docs/DEPLOYMENT.md.

Pull requests must pass ESLint, type-check, and Jest suites (CI pipeline provided in `.github/workflows`).

---

## 🏗️ Deployment

Option A – **Docker / Kubernetes**

1. Build the production image:

   ```bash
   docker build -t carelinkai:latest .
   ```

2. Push to your registry & deploy behind an HTTPS load balancer (TLS 1.2+).

Option B – **Vercel**

* Set the same env vars shown in `.env.example`.
* Vercel auto-detects Next.js; disable its build cache (`NEXT_PRIVATE_TARGET=standalone`).
* Use a managed Postgres (Neon/Fly) and Redis (Upstash).

Option C – **AWS ECS / Fargate**

* Use the provided `docker-compose.yml` as a reference for task definitions.  
* Store secrets in AWS Secrets Manager.  
* Attach IAM role allowing S3 access to the MinIO-replacement (S3).

---

## 🔐 HIPAA Compliance Notes

This repository is **not** a substitute for a signed Business Associate Agreement (BAA). You are responsible for:

1. Hosting on infrastructure that offers a HIPAA BAA (AWS, GCP, Azure).  
2. Enabling full-disk encryption & backups for PostgreSQL volumes.  
3. Rotating `DATABASE_ENCRYPTION_KEY` & JWT secrets regularly.  
4. Reviewing audit logs (`AuditLog` table) for PHI access.  
5. Configuring SSL/TLS termination (HSTS enforced in `next.config.js`).  
6. Signing a BAA with Stripe if processing PHI-adjacent payments.

---

## 🤝 Contributing

1. Fork the repo & create a feature branch.  
2. Follow existing code style (`Prettier + Tailwind plugin`).  
3. Write unit tests for new business logic.  
4. Open a PR describing the change; include screenshots for UI updates.

---

## 📄 License

Proprietary – © 2025 CareLinkAI.  
All rights reserved. For evaluation or demo purposes only.

Contact `opensource@carelinkai.com` for commercial licensing.
