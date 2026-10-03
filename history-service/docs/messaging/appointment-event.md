# Contrato do AppointmentEvent

Mensagem publicada pelo `appointment-service` e consumida pelo `history-service` e pelo
`notification-service`.

## Topologia

| Item | Valor padrão | Variável de ambiente |
|---|---|---|
| Exchange (topic, durável) | `appointment.exchange` | `RABBITMQ_EXCHANGE` |
| Queue (durável) | `history.queue` | `RABBITMQ_QUEUE` |
| Routing key | `history.created` | `RABBITMQ_ROUTING_KEY` |
| Dead letter exchange | `appointment.exchange.dlx` | derivada |
| Dead letter queue | `history.queue.dlq` | derivada |

A topologia é declarada pelo `history-service` em `config/RabbitMQConfig.java` e é toda
configurável por `.env` — alinhar os nomes com a Pessoa 4 não exige mudança de código.

O `notification-service` consome a mesma exchange, com a fila `notification.queue` e a routing key
`notification.created`. O `appointment-service` publica cada evento uma vez para cada routing key.

## Payload

`content-type: application/json`

```json
{
  "eventId": "8f14e45f-ceea-467a-9f4b-1d2c3e4f5a6b",
  "eventStatus": "SCHEDULED",
  "occurredAt": "2026-08-30T14:32:10Z",
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
  "appointmentDate": "2026-09-05T09:00:00",
  "description": "Consulta de rotina - cardiologia"
}
```

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| `eventId` | UUID | sim | **Novo a cada publicação**, inclusive em republicação do mesmo appointment. É a chave de deduplicação. |
| `eventStatus` | enum (abaixo) | sim | A transição que a consulta sofreu. |
| `occurredAt` | ISO-8601 com `Z` | sim | Instante do fato no produtor. Ordena a trilha. |
| `appointmentId` | int64 | sim | Agrupa a trilha. |
| `patient.id` | int64 | sim | ID do paciente mantido para rastreabilidade e autorização. |
| `patient.email` | string | sim | E-mail obtido do `auth-service`; usado pelo notification-service. |
| `patient.name` | string | sim | Nome obtido do `auth-service`; usado no conteúdo da notificação. |
| `doctor.id` | int64 | sim | ID do médico mantido para rastreabilidade. |
| `doctor.email` | string | sim | E-mail obtido do `auth-service`. |
| `doctor.name` | string | sim | Nome obtido do `auth-service`. |
| `appointmentDate` | ISO-8601 **sem** timezone | sim | Data e hora de início da consulta **no momento deste evento**. Nunca nula. |
| `description` | string | não | |

### Valores de `eventStatus`

| Valor | Quando emitir | O que vai em `appointmentDate` |
|---|---|---|
| `SCHEDULED` | consulta agendada (primeiro evento) | a data agendada |
| `RESCHEDULED` | data ou hora alterada | a **nova** data (a anterior fica na linha anterior da trilha) |
| `CANCELLED` | consulta cancelada | a data que a consulta tinha quando foi cancelada |
| `COMPLETED` | atendimento realizado | a data em que ocorreu |

`eventStatus` é o ponto de verdade sobre a alteração: o `history-service` não deduz a transição,
ele grava a que o produtor declarou.

## Regras para o produtor

1. **Nunca reutilize um `eventId`.** O `history-service` descarta silenciosamente eventos com
   `eventId` já visto. Reutilizar significa perder o evento.
2. **`appointmentDate` nunca é nula, nem em `CANCELLED`.** Uma consulta cancelada tinha uma data, e
   é ela que dá sentido ao registro. Evento sem esse campo vai para a DLQ.
3. **Não envie campos fora desta lista.** Campo desconhecido faz a desserialização falhar e a
   mensagem vai para a DLQ.

O `appointment-service` consulta `GET /internal/users/{id}` no `auth-service` usando mTLS antes de
publicar o evento. Os consumidores gravam os dados de contato como snapshot do momento do evento.

## Comportamento em falha

| Situação | Destino |
|---|---|
| JSON inválido ou campo desconhecido | DLQ (`history.queue.dlq`) |
| Campo obrigatório ausente (inclusive `appointmentDate`) / enum inválido | DLQ |
| `eventId` repetido | descartada com sucesso (log `WARN`) |
| Banco indisponível | DLQ |

Nada é reenfileirado (`default-requeue-rejected=false`), então uma mensagem ruim nunca trava a fila.
