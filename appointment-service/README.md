# Appointment Service

Microsserviço responsável pelo agendamento de consultas do Tech Challenge FIAP - Fase 3 - Grupo 65.

## Responsabilidades

- Criar consultas.
- Consultar uma ou todas as consultas.
- Consultar consultas de um paciente.
- Editar consultas.
- Alterar status da consulta.
- Persistir consultas no PostgreSQL.
- Publicar `AppointmentEvent` no RabbitMQ para o history-service e, quando habilitado, para o notification-service.
- Consultar no `auth-service` os dados de contato do paciente e do médico antes de publicar cada evento.

## Tecnologias

- Java 21
- Spring Boot 4.1.0
- Spring Web MVC
- Spring Data JPA
- PostgreSQL
- Flyway
- RabbitMQ
- Bean Validation
- Actuator
- Lombok

## Subir infraestrutura

```bash
cp .env.example .env                      # .env deste serviço
cp ../infra/.env.example ../infra/.env    # .env do RabbitMQ compartilhado — sem ele o compose falha
COMPOSE_PROFILES= docker compose up -d    # só Postgres + RabbitMQ, sem o container da app
```

Os dois `cp` sobrescrevem arquivos que já existam. Para criar só os que faltam, rode `make setup` na raiz do monorepo.

Não rode `docker compose up -d` sem `COMPOSE_PROFILES=`: o `.env` já traz
`COMPOSE_PROFILES=apps`, então o comando também sobe o container `appointment-app`, que
ocupa a 8080 — e o `./mvnw spring-boot:run` seguinte morre com `Port already in use`.
(Alternativa, de dentro da raiz do monorepo: `make infra`.)

**Cuidado:** como todos os serviços compartilham o mesmo projeto Compose (`name:
grupo65`), `docker compose down` de dentro desta pasta derruba o projeto **inteiro**,
não só o appointment-service. Para parar apenas este serviço, use
`docker compose stop appointment-app appointment-postgres`.

O serviço usa a porta `8080` por padrão — é o serviço principal do projeto. O history-service usa a `8081`.

## Certificados mTLS

O `appointment-service` consulta o `auth-service` por HTTPS na porta interna `9443`. A chamada usa
mTLS: este serviço apresenta `.mtls/appointment-client.p12` e confia na CA em
`.mtls/ca-truststore.p12`.

Gere os certificados antes de subir o Docker ou executar a aplicação pela IDE:

```bash
make mtls
```

Ou, diretamente:

```bash
sh ./scripts/generate-mtls-certs.sh
```

No PowerShell:

```powershell
.\scripts\generate-mtls-certs.ps1
```

No Docker, os arquivos são montados em `/mtls` e o endereço usado é `https://auth-app:9443`. Pela
IDE, o padrão é `https://localhost:9443`. Em um deploy, monte certificados fornecidos pela CA do
ambiente e configure `AUTH_SERVICE_URL`, `AUTH_MTLS_KEYSTORE`, `AUTH_MTLS_KEYSTORE_PASSWORD`,
`AUTH_MTLS_TRUSTSTORE` e `AUTH_MTLS_TRUSTSTORE_PASSWORD`. Não versione nem reutilize os certificados
gerados localmente.

## Executar

```bash
./mvnw spring-boot:run
```

Ou, se Maven estiver instalado:

```bash
mvn spring-boot:run
```

## Endpoints

| Método | Endpoint | Descrição |
|---|---|---|
| POST | `/appointments` | Cria consulta |
| GET | `/appointments/{id}` | Busca consulta |
| GET | `/appointments` | Lista consultas |
| GET | `/appointments/patient/{patientId}` | Lista consultas do paciente |
| PUT | `/appointments/{id}` | Edita consulta |
| PATCH | `/appointments/{id}/status` | Altera status |
| GET | `/actuator/health` | Health check |

## Exemplo de criação

```json
{
  "patientId": 10,
  "doctorId": 7,
  "appointmentDate": "2030-10-10T09:00:00",
  "description": "Consulta de rotina - cardiologia"
}
```

## Status

Persistidos na consulta:

- `SCHEDULED`
- `COMPLETED`
- `CANCELLED`

Eventos publicados:

- `SCHEDULED` ao criar.
- `RESCHEDULED` ao alterar data/hora.
- `COMPLETED` ao concluir.
- `CANCELLED` ao cancelar.

## Contrato do evento

O payload segue o contrato usado pelo history-service:

```json
{
  "eventId": "uuid",
  "eventStatus": "SCHEDULED",
  "occurredAt": "2026-09-07T16:00:00Z",
  "appointmentId": 42,
  "patient": {
    "id": 10,
    "email": "maria.souza@email.com",
    "name": "Maria Souza"
  },
  "doctor": {
    "id": 7,
    "email": "joao.lima@hospital.com",
    "name": "Dr. João Lima"
  },
  "appointmentDate": "2030-10-10T09:00:00",
  "description": "Consulta de rotina - cardiologia"
}
```

Os IDs continuam no evento para rastreabilidade. Os nomes e e-mails são obtidos pelo
`appointment-service` no `auth-service` por meio do endpoint interno `/internal/users/{id}` antes
da publicação.

## RabbitMQ

Cada evento é publicado duas vezes na mesma exchange, uma para cada consumidor:

| Exchange (topic) | Routing key | Consumidor | Variável da routing key |
|---|---|---|---|
| `appointment.exchange` | `history.created` | history-service | `RABBITMQ_HISTORY_ROUTING_KEY` |
| `appointment.exchange` | `notification.created` | notification-service | `RABBITMQ_NOTIFICATION_ROUTING_KEY` |

A exchange é configurada por `RABBITMQ_EXCHANGE` e precisa ter o mesmo valor nos três serviços.

## Regras de negócio implementadas

- Não permite criar/editar com data passada.
- Não permite editar consulta cancelada ou concluída.
- Não permite mudar status de consulta cancelada ou concluída.
- Não permite repetir o mesmo status.
- `SCHEDULED -> COMPLETED` é permitido.
- `SCHEDULED -> CANCELLED` é permitido.

## Testes

```bash
./mvnw test
```

Os testes unitários da camada de serviço cobrem criação, consulta, atualização, alteração de status, regras de negócio e publicação dos eventos.

## Integração com Security

Os endpoints de consulta exigem um JWT emitido pelo `auth-service` no header
`Authorization: Bearer <token>`. As roles são lidas do claim `scope` no formato
`ROLE_DOCTOR`, `ROLE_NURSE` ou `ROLE_PATIENT`.

- Enfermeiros podem criar, consultar e editar consultas.
- Médicos podem consultar e editar consultas.
- Pacientes podem consultar apenas consultas associadas ao `user_id` presente no próprio token.
- O health check continua público.

A chave pública que valida o token vem de `security.jwt.public-key`. No Docker ela é montada de
`.jwt-keys/app.sub` (gerada pelo serviço `jwt-keys` do compose). Pela IDE, rodando a partir desta
pasta, o padrão é `file:../.jwt-keys/app.sub`: suba o ambiente uma vez com `make infra` (ou
`docker compose up -d` na raiz) para a pasta existir, ou aponte `JWT_PUBLIC_KEY` para outro arquivo.
