# Medical HUB Web Panel

Painel web em React, TypeScript, Vite e Ant Design para os quatro perfis atuais do Medical HUB.

## Executar localmente

Na raiz de `web-panel`:

```bash
npm install
npm run dev
```

O Vite usa proxy para os serviços locais:

- Auth: `http://localhost:8083`
- Appointments: `http://localhost:8080`
- History: `http://localhost:8081`
- Notifications: `http://localhost:8082`

O proxy encaminha `/api/appointments` para `/appointments` no `appointment-service` e `/api/auth`
para as rotas equivalentes do `auth-service`.

O token JWT fica no `sessionStorage`. A validade do campo `exp` é verificada antes de cada chamada. Enquanto a página estiver aberta, as credenciais ficam somente em memória para renovar o token automaticamente. Após recarregar a página, se o token estiver expirado, o painel solicitará novo login.

As permissões da interface seguem as APIs atuais: ADMIN gerencia usuários e roles; NURSE cria e gerencia agendamentos; DOCTOR gerencia agendamentos; PATIENT consulta seus próprios dados. Histórico e notificações podem ser pesquisados pelos profissionais conforme os endpoints atuais, enquanto o paciente acessa somente seus próprios registros.
