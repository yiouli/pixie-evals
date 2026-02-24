.PHONY: dev dev-sdk dev-frontend install install-sdk install-frontend test test-sdk lint codegen

# ============================================================================
# Development
# ============================================================================

dev: dev-sdk dev-frontend  ## Start both SDK server and frontend dev server

dev-sdk:  ## Start SDK server
	cd sdk && uv run python -m pixie_sdk.server

dev-frontend:  ## Start frontend dev server
	cd frontend && pnpm dev

# ============================================================================
# Installation
# ============================================================================

install: install-sdk install-frontend  ## Install all dependencies

install-sdk:  ## Install SDK dependencies
	cd sdk && uv sync

install-frontend:  ## Install frontend dependencies
	cd frontend && pnpm install

# ============================================================================
# Testing
# ============================================================================

test: test-sdk  ## Run all tests

test-sdk:  ## Run SDK tests
	cd sdk && uv run pytest -v

# ============================================================================
# Linting & Type Checking
# ============================================================================

lint:  ## Run linters
	cd sdk && uv run mypy pixie_sdk/ --ignore-missing-imports

# ============================================================================
# Code Generation
# ============================================================================

codegen: codegen-sdk codegen-frontend  ## Run all code generation

codegen-sdk:  ## Generate SDK remote client from pixie-server schema
	cd sdk && uv run ariadne-codegen

codegen-frontend:  ## Generate frontend GraphQL types
	cd frontend && pnpm codegen
