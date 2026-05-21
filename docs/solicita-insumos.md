# Solicita Insumos — README da feature

Sistema de solicitação de insumos por setor. MVP com backend Airtable.

## Setup

1. Replicar tabelas no Airtable conforme [`solicita-insumos-airtable.md`](./solicita-insumos-airtable.md).
2. Copiar `.env.example` para `.env.local` e preencher:
   ```
   AIRTABLE_API_KEY=
   AIRTABLE_BASE_ID=
   SI_SESSION_SECRET=  # gere com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. **Seed do primeiro gestor** (manual, no Airtable):
   - Tabela `Usuarios` → criar registro:
     - `usuario`: `gestor`
     - `senha_hash`: gere local com:
       ```
       node -e "console.log(require('bcryptjs').hashSync('SUA_SENHA', 10))"
       ```
     - `papel`: `gestor`
     - `setor`: (vazio)
     - `ativo`: marcado
4. **Seed setores** (manual): popular `Setores` com os setores reais (ex: `padaria`, `caixa`, `acougue`).
5. Subir o app (`npm run dev`) e acessar `/solicita-insumos/login`.
6. A partir do primeiro gestor, criar gestores e líderes adicionais em `/solicita-insumos/admin/usuarios`.

## Papéis

| papel | autenticação | acessa |
|---|---|---|
| funcionário | nome + setor | nova solicitação, minhas solicitações (próprio setor + próprio nome) |
| líder | usuário + senha | tudo do funcionário + listagem do setor com editar/cancelar |
| gestor | usuário + senha | tudo + admin (filtros, mudar status, exportar) + criar/editar usuários |

## Fluxo de status

```
pendente ─┬─► aprovada ─┬─► atendida
          │              └─► cancelada
          ├─► recusada (motivo obrigatório)
          └─► cancelada
```

Edição de campos só com `status = pendente`. Cancelar é a única transição permitida após aprovada.

## Logs

Toda mutação grava em `LogSolicitacoes` (criar/editar/cancelar). Toda decisão grava em `LogAprovacoes` com ator e — se recusa — motivo.
