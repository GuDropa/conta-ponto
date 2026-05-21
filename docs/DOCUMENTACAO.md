# Conta Ponto — Documentação Completa (Liderança e RH)

Sistema **mobile-first** (também utilizável no **desktop**) para acelerar a **conferência de cartões de ponto mecânicos** do Supermercado Unimax, usando **OCR com IA no servidor** (cadeia **Gemini** e, se configurada, **Anthropic**) para extrair marcações (HH:MM) a partir de **duas fotos por colaborador (frente e verso)** e gerar uma **planilha Excel (`.xlsx`) para o RH**, com **histórico local** para baixar de novo sem reprocessar.

---

## Visão executiva (para liderança)

### Objetivo do sistema
- **Reduzir tempo operacional do RH** na digitação/conferência de marcações do cartão.
- **Padronizar a saída**: planilha **`.xlsx`** (Excel); o conteúdo segue a mesma estrutura lógica de colunas usada na versão antiga em CSV.
- **Diminuir retrabalho**: a leitura feita uma vez fica salva no aparelho (histórico).

### O que o sistema faz (em 1 minuto)
- O RH **fotografa** cartões (sempre **2 fotos por funcionário: frente + verso**).
- O sistema envia as imagens para uma rota segura no servidor (`/api/ocr`) que executa o OCR (prompt especializado; **Gemini** primeiro, **Anthropic** na cadeia se a chave existir e o erro permitir retentativa).
- O retorno é consolidado com base no **período de leitura (datas De / Até)** e exportado em **`.xlsx`**.
- A planilha fica registrada no **Histórico**, permitindo baixar novamente depois.

### Ganhos e diferenciais
- **Processamento em lote**: várias pessoas em uma única ação, com chamadas concorrentes no servidor.
- **Resiliência a falhas**: se um par falhar, os demais pares seguem; o erro aparece na planilha.
- **Indicador de progresso** no lote: mensagens de status (o envio costuma ser **uma requisição** com todas as imagens; o que se vê no app reflete fases como envio e finalização, não necessariamente “cada cartão concluído” em eventos do servidor).
- **Preservação de trabalho**: fotos “pendentes” são mantidas no aparelho (rascunho via IndexedDB), reduzindo perda por recarregar a página.

### Limites de escopo (o que não é)
- Não substitui o processo legal/administrativo de ponto: é uma **ferramenta de apoio à conferência**.
- Não “corrige” inconsistências do cartão (ex.: saída menor que entrada); cálculos evitam negativos e podem resultar em 0 em casos inválidos.

---

## Manual do RH (passo a passo)

### 1) Acessar o sistema
- Abra o app no celular (recomendado) ou computador.
- A tela inicial tem duas abas:
  - **Importar cartões**: captura e processamento OCR e geração da planilha.
  - **Histórico**: re-download de **`.xlsx`** já gerados e ajuste do **período** daquela leitura (ou compatibilidade com entradas antigas de filtro por dias).

### 2) Importar cartões (captura correta das fotos)
O sistema **usa a ordem das imagens** como regra de agrupamento.

- **Regra de ouro**:  
  - **Foto 1 e 2** = mesmo cartão (**frente** e **verso**) do mesmo colaborador  
  - **Foto 3 e 4** = próximo colaborador  
  - e assim por diante

#### Como tirar as fotos
- Toque em **Tirar foto** para abrir a câmera traseira, ou **Galeria** para selecionar imagens existentes.
- Confirme na área **Pré-visualização dos cartões** se os pares ficaram corretos (Frente/Verso).

#### Atenção: foto sem par
- Se houver um número **ímpar** de fotos, a última fica como **“foto sem par”** e **não é enviada** até existir a segunda foto.
- A planilha pode ser gerada usando apenas os pares completos; a foto sem par é ignorada e isso aparece como aviso.

### 3) Período desta leitura (conferência)
Antes de processar, defina o **primeiro e o último dia** da fotografia do cartão, nos campos **De** e **Até** (seletor de data).

- Isso **não muda a leitura** que a IA faz na imagem; serve para alinhar as **linhas de dia** do cartão a **datas reais** e para filtrar o que entra no **`.xlsx`** (dias fora do período podem ser omitidos ou sinalizados no fluxo).
- O intervalo **não pode passar de 31 dias** (uma folha de ponto). Pode cruzar o fim do mês (ex.: **29/04 a 03/05**).
- As datas usadas nessa tela são salvas com cada entrada do **histórico** e podem ser **editadas depois** ao reexportar (sem reprocessar fotos). Entradas muito antigas podem ainda ter só a lista de “dias incluídos” (compatibilidade legada).

### 4) Processar e gerar a planilha
Com pelo menos **2 fotos** e **período válido** (sem mensagem de erro de validação):
- Toque no botão equivalente a **Ler 1 cartão e gerar planilha** ou **Gerar planilha — N funcionários** (o rótulo depende de quantos pares há).
- Para 1 par: o sistema envia, processa e baixa o **`.xlsx`**.
- Para vários pares: o sistema processa **em paralelo no servidor** e baixa o **`.xlsx`** consolidado.

#### Onde a planilha aparece
- O navegador inicia o download do arquivo (`.xlsx`) automaticamente.
- Uma cópia do relatório (sem texto bruto da IA) é salva no **Histórico**, permitindo baixar novamente depois.

### 5) Usar o Histórico
Na aba **Histórico**:
- **Baixar** / ação de download: reexporta o **`.xlsx`** sem reprocessar imagens.
- **Editar**: ajusta o **período (De / Até)** daquela leitura para “reemitir” a planilha (novo cálculo de linhas, mesmos dados de OCR).
- **Excluir**: remove a entrada.
- **Limpar histórico**: apaga todos os relatórios salvos naquele aparelho.

---

## Como o OCR funciona (explicação útil para RH)

### Entrada obrigatória do OCR
Para cada colaborador, o sistema espera **exatamente 2 imagens**:
- **Imagem 1**: frente do cartão
- **Imagem 2**: verso do cartão

### O que a IA extrai
O prompt do OCR é especializado em cartão de ponto mecânico (Evo Ponto Fácil) e solicita:
- **Nome do colaborador** (quando legível).
- **Marcações por dia (1–31)**, consolidadas entre frente e verso.
- Campos de marcação:
  - **Manhã**: `entry1`, `exit1`
  - **Tarde**: `entry2`, `exit2`
  - **Extra**: `extraEntry`, `extraExit`

### Como a planilha (`.xlsx`) é montada
Para cada par (colaborador) e cada dia (após o mapeamento ao **período de leitura**):
- 1 linha por dia com as colunas (resumo; nomes exatos vêm do gerador de relatório):
  - identificação do par, colaborador, data/dia, entradas e saídas (manhã/tarde/extra), observação
- Se houver erro no OCR do par, a planilha registra a falha na **Observação** para aquele colaborador.
- Internamente, o mesmo arranjo de colunas alimenta exportações legadas em texto **CSV** (UTF-8 com BOM) quando ainda usadas no código de suporte; o fluxo principal do app é **`.xlsx`**.

---

## Recomendações de uso (para melhor taxa de acerto)

### Fotografia (impacta mais que qualquer outra coisa)
- **Luz uniforme** (evite sombra forte e reflexo).
- **Cartão inteiro no quadro** (sem cortar bordas/tabela).
- **Foco e nitidez**: espere o auto-foco estabilizar.
- **Evite inclinação** (perspectiva): fotografe “de cima”, paralelo ao cartão.
- **Não use zoom digital**; aproxime o celular fisicamente.
- Se possível, use um **fundo neutro** (mesa lisa) para facilitar contraste.

### Operação em lote
- Faça os pares em sequência, com disciplina de ordem.
- Use a pré-visualização para checar se **frente/verso** não foram invertidos.
- Se errar a ordem, remova a(s) foto(s) e adicione novamente na sequência correta.

### Conferência da planilha
O OCR acelera, mas a conferência é indispensável:
- Verifique dias com marcações faltantes.
- Atenção a caracteres “borrados” (ex.: 08:00 vs 06:00).
- Em caso de erro, refaça as fotos (melhor luz/nitidez) e processe novamente.

---

## Limitações e comportamentos esperados

### 1) Dependência de qualidade de imagem
Se a marcação estiver muito fraca, borrada, com reflexo ou a tabela estiver cortada, a IA pode:
- não detectar horários,
- trocar dígitos,
- confundir colunas (ordem esquerda→direita).

### 2) Limite de “modelo do cartão”
O prompt está otimizado para um formato específico de cartão (cartão mecânico com:
**Entrada/Saída Manhã**, **Entrada/Saída Tarde**, **Extra**).  
Cartões com layout muito diferente podem reduzir a precisão.

### 3) “Dia do mês” sempre 1–31
O OCR tenta usar a numeração da linha do cartão para determinar o **dia**.  
Se a numeração estiver ilegível, pode haver associações incorretas (dia trocado).

### 4) Erros e retomada em lote
No processamento em lote:
- Um par com erro **não interrompe** os demais.
- A planilha registra a falha na coluna **Observação**.

### 5) Internet e quota de IA
É necessário:
- conexão com internet,
- **pelo menos uma** chave no servidor: `GEMINI_API_KEY` e/ou `ANTHROPIC_API_KEY` (a cadeia de OCR exige configuração mínima),
- quota disponível no(s) provedor(es) usado(s).

Quando a quota é excedida, o sistema retorna mensagem orientando a tentar novamente.

### 6) Histórico e rascunho são por aparelho/navegador
- O **histórico de planilhas (`.xlsx`)** é salvo no **localStorage** do navegador (chave lógica de histórico; nome antigo do módulo ainda fala em “CSV” no código).
- O rascunho de fotos (para recuperação após recarregar a página) usa **IndexedDB**.
- Isso significa:
  - não sincroniza automaticamente entre aparelhos,
  - pode ser apagado ao limpar dados do navegador,
  - pode variar conforme políticas do dispositivo (armazenamento/privacidade).

### 7) Tamanho de rascunho de fotos
O rascunho de fotos tem um limite aproximado de **~45MB** para evitar falha silenciosa em aparelhos com pouco espaço. Se exceder, o sistema pode não salvar o rascunho.

---

## Privacidade e segurança (o que é enviado e o que fica local)

### O que vai para o servidor / IA
- As imagens selecionadas (frente e verso) são enviadas ao endpoint **`/api/ocr`**.
- A rota monta uma **cadeia de visão** (ordem: **Gemini** se houver chave, depois **Anthropic** se houver chave) até obter a leitura ou esgotar tentativas compatíveis com o tipo de erro.

### Onde as chaves de IA ficam
- `GEMINI_API_KEY` e `ANTHROPIC_API_KEY` são **somente do servidor** (variáveis de ambiente).  
  **Não** são expostas ao navegador. Pode existir **só Gemini**, **só Anthropic** (menos comum) ou **ambas** (cadeia com fallback).

### O que fica salvo no aparelho
- **Histórico (exportações do lote)**: guarda um “resumo” do relatório (sem o texto bruto retornado pela IA, para economizar espaço).
- **Rascunho de fotos**: pode guardar temporariamente as fotos pendentes para recuperação.

### Observação importante
Mesmo sem guardar o texto bruto da IA no histórico, as planilhas e os relatórios podem conter **dados pessoais** (nome do colaborador). Recomendação:
- usar aparelhos de trabalho,
- proteger com senha/biometria,
- evitar compartilhar o aparelho com terceiros.

---

## Solução de problemas (RH)

### “O sistema diz que precisa de quantidade par de imagens”
- **Causa**: para cada colaborador são necessárias **2 fotos** (frente + verso).
- **Como resolver**:
  - tire/envie a **segunda foto** do mesmo cartão imediatamente, ou
  - remova a foto “sobrando” na pré-visualização.
- **Dica**: o app mostra claramente quando há **1 foto sem par** e avisa que ela não será enviada.

### “A planilha veio sem horários” ou “Nenhum horário detectado”
- **Causas comuns**:
  - foto desfocada, com reflexo, baixa luz;
  - cartão cortado (dia/colunas fora do quadro);
  - marcações muito fracas ou borradas;
  - cartão com layout diferente do esperado.
- **Como resolver**:
  - refaça as fotos em ambiente mais iluminado, sem reflexo;
  - garanta o cartão inteiro e paralelo à câmera;
  - evite zoom digital.

### “Alguns cartões deram erro no lote”
- **Comportamento esperado**: falhas em um par **não interrompem** os demais.
- **Onde ver detalhes**: na planilha, a coluna **Observação** traz a mensagem do erro para aquele “Par”.
- **Ação recomendada**: refaça as fotos somente dos pares com erro e processe novamente.

### “Perdi as fotos ao recarregar a página”
- Em celulares, o sistema tenta salvar um **rascunho** automaticamente (IndexedDB).
- Se o rascunho estiver muito grande (~45MB) ou o navegador limitar armazenamento, pode não ser salvo.
- **Boas práticas**:
  - processe em blocos menores;
  - evite manter muitos cartões pendentes por muito tempo.

### “Não consigo baixar a planilha” (download não inicia)
- Alguns navegadores/ambientes bloqueiam downloads automáticos.
- Tente:
  - repetir o download pelo **Histórico**;
  - usar Chrome/Edge atualizados;
  - verificar permissões de pop-up/download do navegador.

---

## Perguntas frequentes (FAQ)

### O sistema substitui a conferência do RH?
Não. Ele **acelera a leitura** e padroniza a exportação, mas a **validação final** continua sendo responsabilidade do RH.

### O histórico é compartilhado entre aparelhos?
Não. O histórico é **local** (neste navegador e neste aparelho). Para centralizar, é necessário um processo externo (ex.: salvar a planilha em rede/drive corporativo).

### Posso reexportar só parte dos dias (período diferente)?
Sim. O **período (De / Até)** usado na captura, ou ajustado no **Editar** do histórico, altera quais **datas** e marcações entram no **`.xlsx`**, mapeando o dia da linha do cartão às datas do calendário — **sem** reprocessar as imagens, desde que os dados da leitura continuem no histórico. Entradas muito antigas podem ainda usar legado de “lista de dias” no código.

### Se eu editar o período no Histórico, a IA roda de novo?
Não. Editar no histórico altera o **período de exportação** (e o mapeamento de datas) daquela entrada; **não** reenvia as fotos ao OCR.

---

## Apêndice técnico (TI / suporte interno)

### Arquitetura resumida
- **Frontend (Next.js App Router)**: UI mobile-first e uso em desktop, captura/upload, pré-visualização, histórico local, geração de **`.xlsx`** no cliente (biblioteca `xlsx`).
- **Backend (API Route)**: endpoint `POST /api/ocr` — cadeia **Gemini → Anthropic** (conforme chaves), prompt estruturado, lote por pares.
- **Saída**:
  - **Planilha RH** (`.xlsx`, lote, com erros por par quando houver);
  - **Relatório de horas** na rota `/relatorio`: PNG, compartilhamento e **`.xlsx`** (dados em `localStorage` da grade `conta-ponto.timecard.rows.v1`).

### Endpoint de OCR
- **Rota**: `POST /api/ocr`
- **Entrada**: `multipart/form-data` com várias partes `images`
  - **2 imagens**: processa 1 colaborador (retorna `{ employeeName, detections, raw, modelUsed }`)
  - **4, 6, 8... imagens**: processa em lote por pares (retorna `{ batch: true, pairs: [...] }`)
- **Regras importantes**:
  - quantidade **par** de imagens é obrigatória;
  - a ordem define o pareamento: `[0,1]`, `[2,3]`, ...

### Resiliência e fallback de modelo
- **Dentro do Gemini**: ordem de modelos (ex.: `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-2.5-pro`) com **retries** em erros recuperáveis (ex.: 429, instabilidade).
- **Entre provedores**: se o Gemini esgotar opções, o `runVisionOcrChain` pode passar para o **Anthropic** (se `ANTHROPIC_API_KEY` existir e o erro permitir avançar na cadeia).
- Se **todos** falharem (quota, indisponibilidade), a resposta orienta a tentar novamente após alguns minutos, conforme o caso.

### Compressão de imagens no browser
Antes de enviar ao servidor, o cliente:
- decodifica a imagem (preferencialmente com `createImageBitmap` com rotação EXIF quando suportado),
- redimensiona para no máximo **1600px** no maior lado,
- exporta como **JPEG** com qualidade aproximada **0.85**.

Isso reduz custo/latência e melhora chance de completar dentro de limites de execução do deploy.

### Duração máxima da rota
O endpoint exporta `maxDuration = 300` (pensado para lotes grandes em ambientes como Vercel).

### Persistência no cliente (dados locais)
- **Histórico de exportações do lote** (`localStorage`):
  - chave: `conta-ponto:csv-history` (nome legado; armazena payloads usados para **`.xlsx`**)
  - limite: até **40 entradas**
  - o campo `raw` do retorno da IA é **zerado** antes de persistir (economia de espaço).
- **Rascunho de fotos** (IndexedDB):
  - banco: `conta-ponto-camera`, store `draft`, key `v1`
  - limite aproximado de armazenamento do rascunho: **~45MB**
- **Grade manual de horas** (relatório): `conta-ponto.timecard.rows.v1` no `localStorage` (página `/relatorio`).

### Variáveis de ambiente
- **Pelo menos uma** entre `GEMINI_API_KEY` e `ANTHROPIC_API_KEY` (a rota exige isso).
- Uso **somente no servidor**; nunca expor no front.

### Observações sobre “Relatório de horas” (`/relatorio`)
Tela separada do fluxo de OCR em lote:
- lê a grade no `localStorage` (`conta-ponto.timecard.rows.v1`),
- calcula **horas trabalhadas** por dia, **total do mês** (inclui regras como turno que **cruza meia-noite** e, nos totais, **janela noturna 22:00–06:00** conforme implementação em `time-utils.ts`),
- exporta **PNG** (imagem) e **`.xlsx`**.

Não depende do OCR em lote do RH; serve quando os horários são **digitados/ajustados** na grade (ou integração futura com essa base).

---

## Checklist de implantação (TI)
- Configurar `GEMINI_API_KEY` e/ou `ANTHROPIC_API_KEY` no ambiente (ex.: Vercel → Environment Variables) — mínimo **um** dos dois.
- Garantir que o domínio/ambiente tenha **HTTPS** (câmera, Web Share e boas práticas de PWA no app).
- Recomendar uso em navegadores modernos (Chrome/Edge em Android; Safari recente em iOS).

---

## Termos e definições (glossário)
- **Par**: conjunto de duas imagens (frente+verso) do mesmo colaborador.
- **Detecção**: numeração de dia no cartão (1–31) + marcações extraídas (`entry1/exit1/entry2/exit2/extraEntry/extraExit`), depois mapeadas ao calendário pelo **período De/Até**.
- **Período desta leitura**: intervalo de **datas** (máx. 31 dias) que liga a folha do cartão ao calendário e filtra a exportação do **`.xlsx`**; pode ser ajustado depois no **Histórico** (sem re-OCR). Entradas antigas do histórico podem ainda refletir o modelo legado de “dias 1–31 selecionados” no código.

