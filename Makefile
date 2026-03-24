.PHONY: dev dev-backend dev-frontend test migrate migrate-create lint format up down logs setup demo

# Docker
dev:
	docker compose up --build

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

# Initial setup: run migrations and create default admin user
setup:
	cd backend && alembic -c migrations/alembic.ini upgrade head
	cd backend && python -m scripts.create_default_user

# Demo: full setup with sample data
demo:
	docker compose up -d --build
	@echo "Waiting for services..."
	@sleep 8
	docker compose run --rm minio-init
	docker compose exec backend alembic -c migrations/alembic.ini upgrade head
	docker compose exec backend python -m scripts.seed_demo_data
	@echo ""
	@echo "=== LicenseDesk Demo ==="
	@echo "Frontend: http://localhost:5173"
	@echo "API Docs: http://localhost:8000/docs"
	@echo "MinIO:    http://localhost:9001 (minioadmin/minioadmin)"
	@echo ""
	@echo "Login:"
	@echo "  Admin:   admin@demo.example.com / admin"
	@echo "  Manager: petrov@demo.example.com / demo"
	@echo "  Viewer:  kozlov@demo.example.com / demo"

# Local development
dev-backend:
	cd backend && uvicorn app.main:app --reload --port 8000

dev-frontend:
	cd frontend && npm run dev

# Database
migrate:
	cd backend && alembic -c migrations/alembic.ini upgrade head

migrate-create:
	cd backend && alembic -c migrations/alembic.ini revision --autogenerate -m "$(msg)"

# Quality
test:
	cd backend && pytest

lint:
	cd backend && ruff check . && ruff format --check .

format:
	cd backend && ruff check --fix . && ruff format .
