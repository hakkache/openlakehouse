.PHONY: up down core full logs ps health backend-shell frontend-shell migrate test-backend

up: core

core:
	docker compose --profile core up -d --build

full:
	docker compose --profile full up -d --build

down:
	docker compose down

logs:
	docker compose logs -f --tail=200

ps:
	docker compose ps

health:
	curl -s http://localhost/api/v1/health | python -m json.tool

backend-shell:
	docker compose exec backend sh

frontend-shell:
	docker compose exec frontend sh

migrate:
	docker compose exec backend alembic upgrade head

test-backend:
	docker compose exec backend pytest -q
