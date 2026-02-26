# AlmaDesk-Edu

Akademicki system helpdesk ITSM.

---

## Architektura

```
app/
  backend/     - Node.js + Express + Prisma (REST API)
  frontend/    - React + Vite (SPA)
infra/
  docker/      - Docker Compose (lokalne dev)
  helm/        - Helm chart (Kubernetes / VPS)
  CI/          - Skrypty CI
platform/      - Keycloak realm, Postgres init, MinIO, Redis
.github/
  workflows/   - GitHub Actions (build + push images do ghcr.io)
```

### Stack technologiczny

| Warstwa | Technologia |
|---------|-------------|
| Frontend | React 19, Vite 7, React Router 7 |
| Backend | Node.js 22, Express 5, Prisma ORM |
| Baza danych | PostgreSQL 17 (dane + logi) |
| Cache | Redis 8 |
| Wyszukiwanie | Elasticsearch 8.11 |
| Pliki | MinIO |
| SSO / Auth | Keycloak 23 |
| Monitoring | Prometheus + Grafana |
| CI/CD | GitHub Actions -> ghcr.io |
| Orkiestracja | Kubernetes + Helm |

---

## Szybki start (lokalne dev)

### 1. Infrastruktura Docker

```powershell
cd infra\docker
docker-compose up -d
```

### 2. Backend

```powershell
cd app\backend
npm install
npx prisma migrate dev
npx prisma generate
npm run seed
npm run dev
```

### 3. Frontend

```powershell
cd app\frontend
npm install
npm run dev
```

---

## Deploy na Kubernetes (Helm)

### Wymagania na klastrze

- Kubernetes >= 1.27
- Helm >= 3.12
- Ingress Controller (nginx-ingress)
- Opcjonalnie: cert-manager (TLS)

### 1. Sklonuj repozytorium

```bash
git clone https://github.com/tomshons-code/AlmaDesk-Edu.git
cd AlmaDesk-Edu
```

### 2. Dostosuj values

Skopiuj plik produkcyjny i zmien hasla:

```bash
cp infra/helm/almadesk/values-production.yaml infra/helm/almadesk/my-values.yaml
nano infra/helm/almadesk/my-values.yaml
```

Zmien w my-values.yaml:
- global.domain - Twoja domena
- Wszystkie hasla (ZMIEN_HASLO_*)
- Sekcja ingress.tls jesli masz cert-manager

### 3. Zainstaluj caly stack jednym poleceniem

```bash
helm install almadesk infra/helm/almadesk -f infra/helm/almadesk/my-values.yaml
```

### 4. Sprawdz status

```bash
kubectl get pods -n almadesk
kubectl get ingress -n almadesk
```

### 5. Aktualizacja po zmianach

```bash
git pull origin main
helm upgrade almadesk infra/helm/almadesk -f infra/helm/almadesk/my-values.yaml
```

---

## Docker images (ghcr.io)

Obrazy budowane automatycznie przez GitHub Actions przy push na main:

| Obraz | URL |
|-------|-----|
| Backend | ghcr.io/tomshons-code/almadesk-backend:latest |
| Frontend | ghcr.io/tomshons-code/almadesk-frontend:latest |

Pull reczny:

```bash
docker pull ghcr.io/tomshons-code/almadesk-backend:latest
docker pull ghcr.io/tomshons-code/almadesk-frontend:latest
```

---

## Wymagania

- Node.js >= 22.x
- Docker >= 24.x
- Docker Compose >= 2.x

---

## Dostep do serwisow (lokalne dev)

| Serwis | URL | Credentials |
|--------|-----|-------------|
| Frontend | http://localhost:5173 | - |
| Backend API | http://localhost:3001 | - |
| Keycloak | http://localhost:8080 | admin / admin |
| MinIO Console | http://localhost:9001 | almadesk / almadesk_minio_2026 |
| Grafana | http://localhost:3000 | admin / admin |
| Prometheus | http://localhost:9090 | - |
| pgAdmin | http://localhost:5050 | admin@almadesk.com / admin |
| Elasticsearch | http://localhost:9200 | - |

---

## Docker Compose (lokalne dev)

```powershell
cd infra\docker
docker-compose up -d
docker-compose ps
docker-compose logs -f
docker-compose down
```

---

## Azure Active Directory (SSO)

AlmaDesk-Edu obsluguje logowanie jednokrotne (SSO) przez Azure AD.

### Szybka konfiguracja:

```powershell
AZURE_AD_ENABLED=true
AZURE_AD_TENANT_ID=your-tenant-id
AZURE_AD_CLIENT_ID=your-client-id
AZURE_AD_CLIENT_SECRET=your-secret

cd app\backend
node setup-azure-ad.js
npm run dev
```

### Dokumentacja:

- Quick Start: docs/AZURE_AD_QUICKSTART.md
- Pelna dokumentacja: docs/AZURE_AD_INTEGRATION.md

### Wspierane protokoly:
- Azure AD OIDC/OAuth 2.0
- SAML 2.0
- Mapowanie rol i grup
- Single Logout (SLO)
