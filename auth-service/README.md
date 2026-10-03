# Auth Service

Serviço de usuários, autenticação e emissão de tokens JWT do Tech Challenge FIAP — Fase 3 — Grupo 65.

## Responsabilidades

- Autenticar usuários por e-mail e senha (HTTP Basic).
- Emitir tokens JWT assinados com RSA, válidos por 15 minutos.
- Gerenciar usuários e suas roles (somente ADMIN).

A autorização das rotas de agendamento, histórico e notificações é aplicada por cada serviço, que
valida o token com a chave pública.

## Tecnologias

Java 21, Spring Boot 4.1, Spring Security (HTTP Basic + OAuth2 Resource Server), Spring Data JPA,
PostgreSQL, Flyway, Bean Validation e Lombok.

## Subindo

O caminho normal é pela raiz do monorepo, junto com os demais serviços — veja o
[Início rápido](../README.md#início-rápido). O compose ativa o profile `dev` (usuários de exemplo)
e monta as chaves geradas pelo serviço `jwt-keys` em `.jwt-keys/`.

| Endereço | O quê |
|---|---|
| <http://localhost:8083/auth/login> | login |
| `https://auth-app:9443/internal/users/{id}` | consulta interna de usuário, protegida por mTLS |
| `GET /users/directory?role=PATIENT` | diretório sem senha para montagem de agendamentos, acessível a ADMIN, DOCTOR e NURSE |
| <http://localhost:8083/actuator/health> | health check público |
| `localhost:5435` | PostgreSQL `auth_db` |

## Rodando pela IDE

1. Na raiz: `make infra` (ou `COMPOSE_PROFILES= docker compose up -d`) — sobe o banco e gera `.jwt-keys/`.
2. Nesta pasta, com o profile `dev`:

```bash
SPRING_PROFILES_ACTIVE=dev ./mvnw spring-boot:run
```

```powershell
$env:SPRING_PROFILES_ACTIVE="dev"; .\mvnw.cmd spring-boot:run
```

As chaves padrão são `file:../.jwt-keys/app.key` e `file:../.jwt-keys/app.sub`, relativas a esta
pasta. Em outro diretório de trabalho, defina `JWT_PRIVATE_KEY` e `JWT_PUBLIC_KEY` com caminhos absolutos.

Antes de iniciar o serviço pela IDE, gere os certificados mTLS na raiz do monorepo:

```bash
sh ./scripts/generate-mtls-certs.sh
```

No PowerShell:

```powershell
.\scripts\generate-mtls-certs.ps1
```

O `auth-service` usa `.mtls/auth-server.p12` como certificado do servidor e
`.mtls/ca-truststore.p12` para validar o certificado cliente do `appointment-service`. A porta
`8083` continua sendo a porta pública do login; a porta `9443` é a porta HTTPS interna com mTLS.
Ao usar Docker, os arquivos são montados em `/mtls`. Ao usar a IDE, os caminhos padrão são
relativos à raiz e podem ser substituídos por `MTLS_KEYSTORE` e `MTLS_TRUSTSTORE`.

## Configuração

| Variável | Padrão | Descrição |
|---|---|---|
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | `auth_db` / `postgres` / `postgres` | banco |
| `DB_HOST` / `DB_PORT` | `localhost` / `5435` | conexão pela IDE (no Docker: `auth-postgres:5432`) |
| `SERVER_PORT` | `8083` | porta HTTP |
| `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` | `file:../.jwt-keys/app.key` / `file:../.jwt-keys/app.sub` | par RSA (no Docker: `file:/keys/...`) |
| `SPRING_PROFILES_ACTIVE` | vazio (no Docker: `dev`) | `dev` insere os usuários de exemplo |
| `MTLS_SERVER_PORT` | `9443` | porta HTTPS interna |
| `MTLS_KEYSTORE` / `MTLS_TRUSTSTORE` | `file:../.mtls/auth-server.p12` / `file:../.mtls/ca-truststore.p12` | certificado do servidor e CA confiável |
| `MTLS_KEYSTORE_PASSWORD` / `MTLS_TRUSTSTORE_PASSWORD` | `changeit` | senhas dos arquivos locais |
| `MTLS_CLIENT_COMMON_NAME` | `appointment-service` | identidade cliente aceita na rota interna |

## Usuários de exemplo

Inseridos pela migration `db/dev-seed/V4__seed_users.sql`, só com o profile `dev`. Sem ele, o banco
fica apenas com as roles.

| Role | E-mail | Senha | `user_id` |
|---|---|---|---|
| `ADMIN` | `admin@hospital.com` | `Admin@123` | 1 |
| `DOCTOR` | `joao.silva@hospital.com` | `Doutor@123` | 2 |
| `NURSE` | `maria.santos@hospital.com` | `Enfermeira@123` | 3 |
| `PATIENT` | `lucas.oliveira@hospital.com` | `Paciente@123` | 4 |

São credenciais de desenvolvimento: não use em nenhum ambiente real.

## Autenticação

```bash
curl -s -X POST http://localhost:8083/auth/login -u maria.santos@hospital.com:Enfermeira@123
```

```json
{ "access_token": "eyJ..." }
```

Use o token em `Authorization: Bearer <access_token>` nos outros serviços. Claims:

| Claim | Conteúdo |
|---|---|
| `sub` | e-mail do usuário |
| `user_id` | id do usuário — é o `patientId` de um PATIENT |
| `scope` | `ROLE_ADMIN`, `ROLE_DOCTOR`, `ROLE_NURSE` ou `ROLE_PATIENT` |
| `iss` | `auth-service` |
| `exp` | expiração (15 minutos) |

## Endpoints

| Método | Endpoint | Permissão | Descrição |
|---|---|---|---|
| `POST` | `/auth/login` | Basic Auth | gera um JWT |
| `GET` | `/users` | `ADMIN` | lista usuários |
| `GET` | `/users/{id}` | `ADMIN` | busca usuário |
| `POST` | `/users` | `ADMIN` | cria usuário |
| `PUT` | `/users/{id}` | `ADMIN` | atualiza usuário |
| `DELETE` | `/users/{id}` | `ADMIN` | remove usuário |
| `GET` | `/internal/users/{id}` | mTLS do `appointment-service` | dados resumidos para eventos internos |
| `GET` | `/actuator/health` | pública | health check |

A rota `GET /internal/users/{id}` não usa JWT de usuário. Ela só deve ser acessada pela porta
HTTPS interna `9443`, com um certificado cliente mTLS emitido para `appointment-service`. O filtro
também confere o Common Name do certificado.

Os arquivos gerados pelo script usam a senha `changeit` apenas para desenvolvimento local. No
deploy, substitua os arquivos e as senhas pelos secrets do ambiente.

Para regenerar o conjunto local, remova `.mtls/`, execute o script novamente e reinicie o
`auth-service` e o `appointment-service`. A CA nova invalida os certificados anteriores.

```bash
curl -s -X POST http://localhost:8083/users \
  -H "Authorization: Bearer <token-admin>" -H "Content-Type: application/json" \
  -d '{"name":"Novo Paciente","email":"novo.paciente@hospital.com","password":"Paciente@123","role":"PATIENT"}'
```

O e-mail precisa ser válido e único; se já existir, a resposta é `409 CONFLICT`.

## Testes

```bash
./mvnw test
```

Não precisam de banco nem de `.jwt-keys/`: usam o par só de teste em `src/test/resources/jwt-test/`.

## Solução de problemas

| Problema | Solução |
|---|---|
| login devolve `401` com a senha certa | o profile `dev` não está ativo, então não há usuários |
| `FileNotFoundException ... .jwt-keys/app.key` pela IDE | rode `make infra` na raiz antes, ou defina `JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY` |
| token recusado nos outros serviços com `401` | token expirado, ou chaves regeneradas depois do login: faça login de novo |
| porta `8083` ou `5435` ocupada | altere `SERVER_PORT` ou `DB_PORT` no `.env` |

## Segurança

- O par fica em `.jwt-keys/` (ignorada pelo git). No compose, a pasta é montada só leitura em `/keys` nos quatro serviços, mas só o auth-service usa a chave privada; num ambiente real, entregue aos consumidores apenas a chave pública.
- Os certificados mTLS ficam em `.mtls/` (ignorada pelo git). No compose, o `auth-service` recebe o
  certificado servidor e a CA em `/mtls`, enquanto o `appointment-service` recebe o certificado
  cliente. Gere certificados próprios para cada ambiente; não reutilize o conjunto local em produção.
- Não reutilize as credenciais de exemplo fora do desenvolvimento.
- Não registre tokens em logs.
