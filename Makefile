.PHONY: setup mtls up build infra down clean logs ps smoke

ENVS := $(patsubst %.example,%,$(wildcard .env.example */.env.example))

setup: ## Cria os .env que ainda nao existem, a partir dos .env.example
	@for f in $(ENVS); do \
		if [ ! -f $$f ]; then cp $$f.example $$f; echo "criado $$f"; \
		else echo "mantido $$f"; fi; \
	done

mtls: ## Gera os certificados mTLS locais em .mtls/
	sh ./scripts/generate-mtls-certs.sh

up: setup mtls ## Sobe tudo (bancos, broker e aplicacoes)
	docker compose up -d

build: setup mtls ## Sobe tudo reconstruindo as imagens
	docker compose up -d --build

infra: setup mtls ## Sobe apenas os bancos e o RabbitMQ (para rodar as apps pela IDE)
	COMPOSE_PROFILES= docker compose up -d

down: ## Derruba tudo, preservando os volumes
	docker compose down

clean: ## Derruba tudo e apaga os volumes (perde os dados)
	docker compose down -v

logs: ## Segue os logs de todos os servicos
	docker compose logs -f

ps: ## Estado dos containers
	docker compose ps

smoke: ## Teste ponta a ponta: login -> appointment -> RabbitMQ -> history e notification
	./scripts/smoke-test.sh
