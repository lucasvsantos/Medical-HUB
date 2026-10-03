# Visão geral do Medical HUB

Este arquivo reúne as principais informações do monorepo e serve como referência para manutenção,
operação e evolução do projeto. Atualize-o quando houver mudanças relevantes em arquitetura,
contratos, permissões, topologia ou fluxo de execução local.

## Visão atual

O projeto é um monorepo com quatro aplicações Spring Boot 4.1 em Java 21 e um painel web em React:

| Serviço | Responsabilidade | Interface principal | Persistência |
|---|---|---|---|
| `auth-service` | usuários, roles e emissão de JWT RSA | REST | PostgreSQL próprio |
| `appointment-service` | criação e evolução dos agendamentos | REST | PostgreSQL próprio |
| `history-service` | histórico append-only e consultas | GraphQL | PostgreSQL próprio |
| `notification-service` | consumo de eventos e notificações | REST + RabbitMQ | PostgreSQL próprio |
| `web-panel` | painel por role para operação e administração | React + TypeScript + Vite + Ant Design | — |

O `appointment-service` consulta o `auth-service` por HTTPS interno com mTLS, publica eventos na
exchange `appointment.exchange`, e o `history-service` consome `history.created` enquanto o
`notification-service` consome `notification.created`. Cada consumidor possui sua própria fila e
DLQ.

O `web-panel` usa o proxy do Vite para acessar os quatro serviços localmente. O JWT é guardado no
`sessionStorage`, validado pelo campo `exp` antes das chamadas e renovado enquanto as credenciais
permanecerem em memória na aba. A tela de ADMIN gerencia usuários e roles; os demais perfis veem
somente as operações permitidas pelas APIs.

## Contratos que precisam ser preservados

### Autenticação e autorização

- O `auth-service` emite JWT com `iss=auth-service`, `user_id` e `scope` contendo roles como
  `ROLE_PATIENT`.
- Os demais serviços validam o JWT com a chave pública RSA compartilhada.
- `/actuator/health` é público; as outras rotas exigem autenticação.
- PATIENT só pode consultar recursos cujo `patientId` seja igual ao `user_id` do token.
- DOCTOR e NURSE podem consultar dados de qualquer paciente conforme as regras de cada endpoint.
- ADMIN gerencia `/users` no `auth-service`.
- DOCTOR e NURSE podem consultar o diretório sem senha em `/users/directory?role=...` para selecionar
  pacientes e médicos ao criar ou editar agendamentos; esse endpoint não permite criar, alterar ou
  excluir usuários.

### Evento `AppointmentEvent`

O evento é compartilhado por history e notification. Mudanças nele precisam ser feitas de forma
compatível com os dois consumidores e com os testes de integração.

Campos principais:

- `eventId`: UUID único usado para idempotência.
- `eventStatus`: `SCHEDULED`, `RESCHEDULED`, `CANCELLED` ou `COMPLETED`.
- `occurredAt`: instante UTC do evento.
- `appointmentId`: identificador da consulta.
- `patient` e `doctor`: objetos com `id`, `email` e `name`; os IDs são mantidos para rastreabilidade
  e segurança, enquanto os dados de contato permitem notificação e consultas por e-mail.
- `appointmentDate`: data da consulta, inclusive em eventos de cancelamento.
- `description`: descrição atual da consulta.

O histórico é append-only e grava uma linha por `eventId`. As notificações também garantem uma
linha por `eventId`; uma falha no envio mantém o registro como `PENDING` para nova tentativa.

O `history-service` oferece busca do histórico por `patientId` e por `patientEmail`. O
`notification-service` lista notificações por `patientEmail`; PATIENT só pode consultar o próprio
e-mail, e o `user_id` continua no JWT para as regras baseadas em ID.

### mTLS entre serviços

O `auth-service` mantém a API pública em `8083` e uma porta HTTPS interna em `9443`. A rota
`/internal/users/{id}` exige o certificado cliente do `appointment-service`. Os certificados locais
ficam em `.mtls/`, são gerados pelos scripts da pasta `scripts/` e não são versionados.

## Pontos de atenção para as próximas evoluções

### P0 — consistência entre banco e RabbitMQ

Hoje o `appointment-service` salva a consulta e publica o evento no mesmo fluxo de serviço, sem
outbox. Isso deixa duas janelas de inconsistência: a publicação pode falhar depois do banco ser
alterado, ou o evento pode chegar ao consumidor antes de uma transação do banco ser confirmada.

Próximo passo recomendado: adotar uma tabela `outbox_events`, gravar o evento na mesma transação
da consulta e publicar a partir de um relay com confirmação do broker. A publicação deve continuar
idempotente por `eventId`.

### P1 — centralização de regras de segurança

As regras de acesso do paciente aparecem em `AppointmentAuthorization`,
`NotificationAuthorization` e `MedicalHistoryQueryService`. Ao alterar roles ou claims, atualizar
os três pontos e seus testes de autorização. Uma evolução natural é extrair uma biblioteca interna
ou padronizar um componente de autorização em cada serviço com o mesmo contrato.

### P1 — contrato versionado de eventos

O contrato atualmente é duplicado entre DTOs e documentação. Ao adicionar ou renomear campos,
avaliar compatibilidade de desserialização, DLQ, producers, consumers, Postman e testes de
integração. Para mudanças maiores, considerar um campo de versão ou um envelope de evento.

### P1 — configuração e dependências

- `auth-service` usa Spring Boot `4.1.1`, enquanto os outros serviços usam `4.1.0`.
- O nome, exchange, filas, routing keys e credenciais precisam permanecer alinhados nos
  `.env.example`, `docker-compose.yml` e `application.*`.
- Credenciais e usuários de exemplo são apenas para desenvolvimento.
- O par de chaves em `.jwt-keys/` é gerado localmente e não deve ser versionado.

### P2 — observabilidade e operação

Antes de adicionar integrações externas, padronizar correlação por `eventId` e `appointmentId`,
medir mensagens processadas e enviadas para DLQ e definir uma política para reprocessamento.
Também vale avaliar paginação nas consultas REST e GraphQL antes do crescimento do volume.

## Checklist para uma nova mudança

- [ ] Identifiquei quais serviços e contratos são afetados.
- [ ] Mantive ou atualizei as migrations Flyway; não dependo de alteração automática do Hibernate.
- [ ] Revisei permissões para ADMIN, DOCTOR, NURSE e PATIENT.
- [ ] Atualizei o DTO, o produtor, todos os consumidores e a documentação do evento quando aplicável.
- [ ] Considerei reentrega, duplicidade e mensagens inválidas na integração RabbitMQ.
- [ ] Atualizei `.env.example`, Compose, README ou Postman quando o fluxo local mudou.
- [ ] Adicionei ou ajustei testes proporcionais ao comportamento alterado.

## Ordem sugerida para melhorias

1. Escolher uma melhoria de negócio clara para o `appointment-service`.
2. Antes de ampliar o fluxo, resolver ou documentar a estratégia de outbox.
3. Padronizar autorização e contrato de eventos.
4. Evoluir notificações, observabilidade e paginação conforme a necessidade do produto.

