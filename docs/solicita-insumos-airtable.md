# Solicita Insumos — Schema Airtable (MVP)

Criar uma base no Airtable e replicar exatamente as tabelas abaixo. Os nomes (table e fields) devem bater **caractere por caractere** com o que o app espera.

## Envs

`.env.local`:

```
AIRTABLE_API_KEY=patXXXXXXXXXXXXXX
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
SI_SESSION_SECRET=<random 32+ chars>
```

Personal Access Token (PAT) precisa de scopes `data.records:read` e `data.records:write` na base.

## Tabelas

### `Setores`

| field | tipo | notas |
|---|---|---|
| nome | Single line text | PK lógica. Ex: `padaria`, `caixa`, `acougue` |

### `Produtos`

| field | tipo | notas |
|---|---|---|
| nome | Single line text | |
| setor | Single line text | bate com `Setores.nome` |
| unidade_default | Single line text | ex: `kg`, `un`, `cx` |
| criado_por | Single line text | nome do funcionário (V16) |

### `Usuarios`

| field | tipo | notas |
|---|---|---|
| usuario | Single line text | login único |
| senha_hash | Long text | bcrypt (V12) |
| papel | Single select | `gestor`, `lider` |
| setor | Single line text | obrigatório se `papel=lider` |
| ativo | Checkbox | default `true` |

### `Solicitacoes`

| field | tipo | notas |
|---|---|---|
| setor | Single line text | |
| solicitante | Single line text | nome (funcionário) ou `usuario` (gestor/líder) |
| produto | Single line text | |
| qtd | Number | precision 2 |
| unidade | Single line text | |
| prioridade | Single select | `baixa`, `media`, `alta`, `urgente` (V17) |
| obs | Long text | |
| status | Single select | `pendente`, `aprovada`, `recusada`, `cancelada`, `atendida` (V8). default `pendente` |
| criado_em | Created time | auto |
| atualizado_em | Last modified time | auto |

### `LogSolicitacoes`

| field | tipo | notas |
|---|---|---|
| solicitacao_id | Single line text | record id da `Solicitacoes` |
| ator | Single line text | quem fez a ação |
| acao | Single select | `criar`, `editar`, `cancelar` |
| payload | Long text | JSON do diff/snapshot |
| em | Created time | auto |

### `LogAprovacoes`

| field | tipo | notas |
|---|---|---|
| solicitacao_id | Single line text | |
| ator | Single line text | gestor que decidiu |
| decisao | Single select | `aprovada`, `recusada`, `atendida` |
| motivo | Long text | obrigatório se `decisao=recusada` (V9) |
| em | Created time | auto |

## Seed mínimo (T27)

1. Em `Setores` crie linhas: `padaria`, `caixa`, `acougue` (ou os setores reais).
2. Em `Usuarios` crie um gestor:
   - `usuario`: `gestor`
   - `senha_hash`: gere com `node -e "console.log(require('bcryptjs').hashSync('SUA_SENHA', 10))"`
   - `papel`: `gestor`
   - `setor`: (vazio)
   - `ativo`: marcado

A partir daí, o próprio gestor cria outros gestores e líderes via UI (`/solicita-insumos/admin/usuarios`).
