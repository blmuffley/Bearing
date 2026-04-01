.PHONY: install dev test lint typecheck fmt run clean

install:
	pip install -e .

dev:
	pip install -e ".[dev]"

run:
	uvicorn bearing.main:app --reload --port 8080

test:
	pytest --cov=bearing --cov-report=term-missing

lint:
	ruff check src/

typecheck:
	mypy src/bearing/

fmt:
	ruff format src/
	ruff check --fix src/

clean:
	rm -rf dist/ build/ *.egg-info .pytest_cache .mypy_cache .coverage htmlcov/
	find . -type d -name __pycache__ -exec rm -rf {} +

proto-install:
	cd prototype && npm install

proto-dev:
	cd prototype && npm run dev

proto-build:
	cd prototype && npm run build
