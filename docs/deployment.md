# Развёртывание LicenseDesk

## Содержание

- [Docker Compose (разработка)](#docker-compose-разработка)
- [Docker Compose (продакшен)](#docker-compose-продакшен)
- [Локальная разработка](#локальная-разработка)
- [Kubernetes](#kubernetes)
- [Переменные окружения](#переменные-окружения)

---

## Docker Compose (разработка)

Самый быстрый способ запустить проект.

### Требования

- Docker 24+
- Docker Compose v2

### Запуск

```bash
git clone https://github.com/your-username/license-desk.git
cd license-desk

# Запуск всех сервисов
docker compose up -d

# Подождать, пока PostgreSQL и MinIO инициализируются
sleep 10

# Создать бакет MinIO (если minio-init не отработал)
docker compose run --rm minio-init

# Применить миграции
docker compose exec backend alembic -c migrations/alembic.ini upgrade head

# Создать администратора
docker compose exec backend python -m scripts.create_default_user
```

### Доступ

| Сервис | URL | Логин |
|--------|-----|-------|
| Фронтенд | http://localhost:5173 | admin@licensedesk.com / admin |
| API (Swagger) | http://localhost:8000/docs | — |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin |
| PostgreSQL | localhost:5432 | postgres / postgres |
| Redis | localhost:6379 | — |

### Остановка

```bash
docker compose down          # Остановить контейнеры
docker compose down -v       # Остановить и удалить данные
```

---

## Docker Compose (продакшен)

Для продакшена рекомендуется:

1. **Создать `docker-compose.prod.yml`** с переопределениями:

```yaml
services:
  backend:
    environment:
      - LICENSEDESK_DEBUG=false
      - LICENSEDESK_SECRET_KEY=your-strong-secret-key-here
      - LICENSEDESK_DATABASE_URL=postgresql+asyncpg://user:password@postgres:5432/license_desk
      - LICENSEDESK_S3_ENDPOINT_URL=https://s3.your-domain.com
      - LICENSEDESK_S3_ACCESS_KEY=your-access-key
      - LICENSEDESK_S3_SECRET_KEY=your-secret-key
      - LICENSEDESK_S3_PUBLIC_URL=https://cdn.your-domain.com/licensedesk
      - LICENSEDESK_SMTP_ENABLED=true
      - LICENSEDESK_SMTP_HOST=smtp.your-domain.com
      - LICENSEDESK_SMTP_USER=noreply@your-domain.com
      - LICENSEDESK_SMTP_PASSWORD=your-smtp-password
      - LICENSEDESK_SMTP_FROM_EMAIL=noreply@your-domain.com
    volumes: []  # Не монтировать код в продакшене

  frontend:
    ports:
      - "80:80"

  postgres:
    environment:
      POSTGRES_PASSWORD: strong-db-password-here

  minio:
    environment:
      MINIO_ROOT_USER: your-minio-user
      MINIO_ROOT_PASSWORD: your-strong-minio-password
```

2. **Запуск**:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

3. **Обратный прокси** (рекомендуется Nginx или Traefik перед приложением для HTTPS).

---

## Локальная разработка

### Требования

- Python 3.12+
- Node.js 22+
- Docker (для PostgreSQL, Redis, MinIO)

### 1. Инфраструктура

```bash
# Запустить только БД, кэш и хранилище
docker compose up -d postgres redis minio
docker compose run --rm minio-init
```

### 2. Backend

```bash
cd backend

# Виртуальное окружение
python3.12 -m venv .venv
source .venv/bin/activate  # Linux/macOS
# .venv\Scripts\activate   # Windows

# Зависимости
pip install -e ".[dev]" python-multipart boto3

# Конфигурация
cp ../.env.example .env
# Отредактировать .env при необходимости

# Миграции
alembic -c migrations/alembic.ini upgrade head

# Дефолтный администратор
python -m scripts.create_default_user

# Запуск
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend

# Зависимости
npm install

# Запуск (с прокси на бэкенд)
npm run dev
```

### 4. Celery (опционально, для уведомлений)

```bash
cd backend
source .venv/bin/activate

# Worker
celery -A app.tasks.celery_app worker --loglevel=info

# Beat (планировщик, в отдельном терминале)
celery -A app.tasks.celery_app beat --loglevel=info
```

---

## Kubernetes

Пример манифестов для деплоя в Kubernetes.

### Namespace

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: licensedesk
```

### ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: licensedesk-config
  namespace: licensedesk
data:
  LICENSEDESK_DEBUG: "false"
  LICENSEDESK_DATABASE_URL: "postgresql+asyncpg://postgres:postgres@postgres-svc:5432/license_desk"
  LICENSEDESK_REDIS_URL: "redis://redis-svc:6379/0"
  LICENSEDESK_S3_ENABLED: "true"
  LICENSEDESK_S3_ENDPOINT_URL: "http://minio-svc:9000"
  LICENSEDESK_S3_BUCKET: "licensedesk"
```

### Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: licensedesk-secret
  namespace: licensedesk
type: Opaque
stringData:
  LICENSEDESK_SECRET_KEY: "your-strong-secret-key"
  LICENSEDESK_S3_ACCESS_KEY: "minioadmin"
  LICENSEDESK_S3_SECRET_KEY: "minioadmin"
```

### Backend Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: licensedesk
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: your-registry/licensedesk-backend:latest
        ports:
        - containerPort: 8000
        envFrom:
        - configMapRef:
            name: licensedesk-config
        - secretRef:
            name: licensedesk-secret
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /docs
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 30
---
apiVersion: v1
kind: Service
metadata:
  name: backend-svc
  namespace: licensedesk
spec:
  selector:
    app: backend
  ports:
  - port: 8000
    targetPort: 8000
```

### Frontend Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: licensedesk
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: your-registry/licensedesk-frontend:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
---
apiVersion: v1
kind: Service
metadata:
  name: frontend-svc
  namespace: licensedesk
spec:
  selector:
    app: frontend
  ports:
  - port: 80
    targetPort: 80
```

### Celery Worker

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: celery-worker
  namespace: licensedesk
spec:
  replicas: 1
  selector:
    matchLabels:
      app: celery-worker
  template:
    metadata:
      labels:
        app: celery-worker
    spec:
      containers:
      - name: worker
        image: your-registry/licensedesk-backend:latest
        command: ["celery", "-A", "app.tasks.celery_app", "worker", "--loglevel=info"]
        envFrom:
        - configMapRef:
            name: licensedesk-config
        - secretRef:
            name: licensedesk-secret
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
```

### Celery Beat

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: celery-beat
  namespace: licensedesk
spec:
  replicas: 1
  selector:
    matchLabels:
      app: celery-beat
  template:
    metadata:
      labels:
        app: celery-beat
    spec:
      containers:
      - name: beat
        image: your-registry/licensedesk-backend:latest
        command: ["celery", "-A", "app.tasks.celery_app", "beat", "--loglevel=info"]
        envFrom:
        - configMapRef:
            name: licensedesk-config
        - secretRef:
            name: licensedesk-secret
```

### Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: licensedesk-ingress
  namespace: licensedesk
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
spec:
  rules:
  - host: licensedesk.your-domain.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: backend-svc
            port:
              number: 8000
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-svc
            port:
              number: 80
  tls:
  - hosts:
    - licensedesk.your-domain.com
    secretName: licensedesk-tls
```

### Миграции (Job)

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: migrate
  namespace: licensedesk
spec:
  template:
    spec:
      containers:
      - name: migrate
        image: your-registry/licensedesk-backend:latest
        command: ["alembic", "-c", "migrations/alembic.ini", "upgrade", "head"]
        envFrom:
        - configMapRef:
            name: licensedesk-config
        - secretRef:
            name: licensedesk-secret
      restartPolicy: Never
  backoffLimit: 3
```

> **Примечание**: PostgreSQL, Redis и MinIO в Kubernetes рекомендуется разворачивать через операторы (CloudNativePG, Redis Operator, MinIO Operator) или использовать управляемые сервисы облачного провайдера.

---

## Переменные окружения

Полный список переменных с префиксом `LICENSEDESK_`:

### Приложение

| Переменная | По умолчанию | Описание |
|---|---|---|
| `DEBUG` | `false` | Режим отладки |
| `SECRET_KEY` | — | Секретный ключ для JWT (обязательно сменить!) |
| `ALLOWED_ORIGINS` | `["http://localhost:5173"]` | CORS origins |

### База данных и кэш

| Переменная | По умолчанию | Описание |
|---|---|---|
| `DATABASE_URL` | — | PostgreSQL connection string (asyncpg) |
| `REDIS_URL` | — | Redis connection string |

### JWT

| Переменная | По умолчанию | Описание |
|---|---|---|
| `JWT_ALGORITHM` | `HS256` | Алгоритм JWT |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Время жизни токена |

### S3 хранилище

| Переменная | По умолчанию | Описание |
|---|---|---|
| `S3_ENABLED` | `false` | Включить S3 (MinIO/AWS) |
| `S3_ENDPOINT_URL` | — | URL эндпоинта |
| `S3_ACCESS_KEY` | — | Access Key |
| `S3_SECRET_KEY` | — | Secret Key |
| `S3_BUCKET` | `licensedesk` | Имя бакета |
| `S3_REGION` | — | Регион (для AWS) |
| `S3_PUBLIC_URL` | — | Публичный URL для файлов |

### SMTP

| Переменная | По умолчанию | Описание |
|---|---|---|
| `SMTP_ENABLED` | `false` | Включить email-уведомления |
| `SMTP_HOST` | — | SMTP сервер |
| `SMTP_PORT` | `587` | Порт |
| `SMTP_USER` | — | Логин |
| `SMTP_PASSWORD` | — | Пароль |
| `SMTP_FROM_EMAIL` | — | Адрес отправителя |
| `SMTP_FROM_NAME` | `LicenseDesk` | Имя отправителя |
| `SMTP_USE_TLS` | `true` | Использовать TLS |

### Keycloak (SSO)

| Переменная | По умолчанию | Описание |
|---|---|---|
| `KEYCLOAK_ENABLED` | `false` | Включить Keycloak SSO |
| `KEYCLOAK_BASE_URL` | — | URL сервера Keycloak |
| `KEYCLOAK_REALM` | — | Realm |
| `KEYCLOAK_CLIENT_ID` | — | Client ID |
| `KEYCLOAK_CLIENT_SECRET` | — | Client Secret |
| `KEYCLOAK_REDIRECT_URI` | — | Redirect URI для callback |
| `KEYCLOAK_FRONTEND_URL` | — | URL фронтенда для редиректа |
