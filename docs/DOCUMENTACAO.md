# Conta Ponto — Documentação Completa (Liderança e RH)

Sistema **mobile-first** para acelerar a **conferência de cartões de ponto mecânicos** do Supermercado Unimax, usando **OCR com IA (Gemini)** para extrair marcações (HH:MM) a partir de **duas fotos por colaborador (frente e verso)** e gerar um **CSV para o RH**, com **histórico local** para re-download sem reprocessar.

---

## Visão executiva (para liderança)

### Objetivo do sistema
- **Reduzir tempo operacional do RH** na digitação/conferência de marcações do cartão.
- **Padronizar a saída** (CSV compatível com Excel, separador `;`, UTF-8 com BOM).
- **Diminuir retrabalho**: a leitura feita uma vez fica salva no aparelho (histórico).

### O que o sistema faz (em 1 minuto)
- O RH **fotografa** cartões (sempre **2 fotos por funcionário: frente + verso**).
- O sistema envia as imagens para uma rota segura no servidor (`/api/ocr`) que chama o **Gemini** com um prompt especializado.
- O retorno é consolidado em **marcações por dia (1–31)** e exportado em **CSV**.
- O CSV fica registrado no **Histórico**, permitindo baixar novamente depois.

### Ganhos e diferenciais
- **Processamento em lote**: várias pessoas em uma única ação, com chamadas concorrentes no servidor.
- **Resiliência a falhas**: se um par falhar, os demais pares seguem; o erro aparece no CSV.
- **Preservação de trabalho**: fotos “pendentes” são mantidas no aparelho (rascunho via IndexedDB), reduzindo perda por recarregar a página.

### Limites de escopo (o que não é)
- Não substitui o processo legal/administrativo de ponto: é uma **ferramenta de apoio à conferência**.
- Não “corrige” inconsistências do cartão (ex.: saída menor que entrada); cálculos evitam negativos e podem resultar em 0 em casos inválidos.

---

## Manual do RH (passo a passo)

### 1) Acessar o sistema
- Abra o app no celular (recomendado) ou computador.
- A tela inicial tem duas abas:
  - **Importar cartões**: captura e processamento OCR/CSV.
  - **Histórico**: re-download de CSV já gerados e ajuste do “intervalo no CSV”.

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
- O relatório/CSV pode ser gerado usando apenas os pares completos; a foto sem par é ignorada e isso aparece como aviso.

### 3) Intervalo no CSV (conferência)
Antes de processar, selecione o intervalo de dias (1–31) que **entrará no CSV**.

- Isso **não muda a leitura** que a IA faz; apenas filtra o que vai no arquivo exportado.
- Exemplo: se você está conferindo somente dias 1–15, selecione **De 1 Até 15**.
- O intervalo escolhido fica salvo como **preferência no aparelho**.

### 4) Processar e gerar CSV
Com pelo menos **2 fotos** e **um intervalo válido**:
- Toque em **Gerar CSV**.
- Para 1 par: o sistema faz a leitura e baixa o CSV.
- Para vários pares: o sistema processa **em paralelo** e baixa o CSV consolidado.

#### Onde o CSV aparece
- O navegador baixa o arquivo automaticamente.
- Uma cópia do relatório (sem texto bruto da IA) é salva no **Histórico**, permitindo baixar novamente depois.

### 5) Usar o Histórico
Na aba **Histórico**:
- **Baixar CSV**: reexporta o CSV sem reprocessar imagens.
- **Editar**: altera apenas o intervalo de dias do CSV daquela leitura (útil para “reemitir”).
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

### Como o CSV é montado
Para cada par (colaborador) e cada dia detectado:
- 1 linha por dia com as colunas:
  - Par, Colaborador, Dia, Entrada/Saída (manhã/tarde/extra), Observação
- Se houver erro no OCR do par, o CSV recebe uma linha com **Observação** preenchida.

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

### Conferência do CSV
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
- O CSV registra a falha na coluna **Observação**.

### 5) Internet e quota de IA
É necessário:
- conexão com internet,
- chave configurada no servidor,
- quota disponível no provedor (Gemini).

Quando a quota é excedida, o sistema retorna mensagem orientando a tentar novamente.

### 6) Histórico e rascunho são por aparelho/navegador
- O **Histórico de CSV** é salvo no **localStorage** do navegador.
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
- O endpoint chama o provedor de IA (Gemini) para extrair horários e nome do colaborador.

### Onde a chave da IA fica
- A chave `GEMINI_API_KEY` é **somente do servidor** (variável de ambiente).  
  Ela **não é exposta ao navegador**.

### O que fica salvo no aparelho
- **Histórico (CSV)**: guarda um “resumo” do relatório (sem o texto bruto retornado pela IA).
- **Rascunho de fotos**: pode guardar temporariamente as fotos pendentes para recuperação.

### Observação importante
Mesmo sem guardar o texto bruto da IA no histórico, o CSV e os relatórios podem conter **dados pessoais** (nome do colaborador). Recomendação:
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

### “O CSV veio sem horários” ou “Nenhum horário detectado”
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
- **Onde ver detalhes**: no CSV, a coluna **Observação** traz a mensagem do erro para aquele “Par”.
- **Ação recomendada**: refaça as fotos somente dos pares com erro e processe novamente.

### “Perdi as fotos ao recarregar a página”
- Em celulares, o sistema tenta salvar um **rascunho** automaticamente (IndexedDB).
- Se o rascunho estiver muito grande (~45MB) ou o navegador limitar armazenamento, pode não ser salvo.
- **Boas práticas**:
  - processe em blocos menores;
  - evite manter muitos cartões pendentes por muito tempo.

### “Não consigo baixar o CSV” (download não inicia)
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
Não. O histórico é **local** (neste navegador e neste aparelho). Para centralizar, é necessário um processo externo (ex.: salvar CSV em rede/drive corporativo).

### Posso gerar CSV apenas de um intervalo de dias?
Sim. O campo **Intervalo no CSV** filtra o que vai para o CSV, sem “perder” o restante da leitura guardada.

### Se eu editar o intervalo no Histórico, a IA roda de novo?
Não. Editar no Histórico só altera o filtro de exportação do CSV daquela entrada; não reprocessa imagens.

---

## Apêndice técnico (TI / suporte interno)

### Arquitetura resumida
- **Frontend (Next.js App Router)**: UI mobile-first, captura/upload, pré-visualização, histórico local.
- **Backend (API Route)**: endpoint `POST /api/ocr` para chamar Gemini com prompt estruturado.
- **Saída**:
  - CSV RH (lote, com erros por par quando houver);
  - Relatório de horas (PNG/compartilhamento e CSV) na rota `/relatorio` (baseado em dados do `localStorage` do cartão).

### Endpoint de OCR
- **Rota**: `POST /api/ocr`
- **Entrada**: `multipart/form-data` com várias partes `images`
  - **2 imagens**: processa 1 colaborador (retorna `{ employeeName, detections, raw, modelUsed }`)
  - **4, 6, 8... imagens**: processa em lote por pares (retorna `{ batch: true, pairs: [...] }`)
- **Regras importantes**:
  - quantidade **par** de imagens é obrigatória;
  - a ordem define o pareamento: `[0,1]`, `[2,3]`, ...

### Resiliência e fallback de modelo
O servidor tenta modelos Gemini em ordem de fallback e pode fazer retries em casos de:
- rate limit/quota (HTTP 429),
- instabilidades de rede.

Se todos falharem por quota, retorna erro orientando a tentar novamente após alguns minutos.

### Compressão de imagens no browser
Antes de enviar ao servidor, o cliente:
- decodifica a imagem (preferencialmente com `createImageBitmap` com rotação EXIF quando suportado),
- redimensiona para no máximo **1600px** no maior lado,
- exporta como **JPEG** com qualidade aproximada **0.85**.

Isso reduz custo/latência e melhora chance de completar dentro de limites de execução do deploy.

### Duração máxima da rota
O endpoint exporta `maxDuration = 300` (pensado para lotes grandes em ambientes como Vercel).

### Persistência no cliente (dados locais)
- **Histórico de CSV** (`localStorage`):
  - chave: `conta-ponto:csv-history`
  - limite: até **40 entradas**
  - o campo `raw` do retorno da IA é **zerado** antes de persistir (economia de espaço).
- **Preferência do intervalo no CSV** (`localStorage`):
  - chave: `conta-ponto:csv-included-days`
- **Rascunho de fotos** (IndexedDB):
  - banco: `conta-ponto-camera`, store `draft`, key `v1`
  - limite aproximado de armazenamento do rascunho: **~45MB**

### Variáveis de ambiente
- **Obrigatória**: `GEMINI_API_KEY`
  - usada apenas no servidor.

### Observações sobre “Relatório de horas” (`/relatorio`)
Existe uma tela separada que:
- lê `conta-ponto.timecard.rows.v1` do `localStorage`,
- calcula horas trabalhadas por dia e total do mês,
- permite exportar PNG e um CSV de horas.

Essa área é útil quando os dados de ponto são preenchidos manualmente no armazenamento do app (ou por uma integração futura). Ela não depende diretamente do OCR em lote para o CSV do RH.

---

## Checklist de implantação (TI)
- Configurar `GEMINI_API_KEY` no ambiente (ex.: Vercel → Environment Variables).
- Garantir que o domínio/ambiente tenha HTTPS (para câmera e Web Share em muitos navegadores).
- Recomendar uso em navegadores modernos (Chrome/Edge em Android; Safari recente em iOS).

---

## Termos e definições (glossário)
- **Par**: conjunto de duas imagens (frente+verso) do mesmo colaborador.
- **Detecção**: dia do mês + marcações extraídas (`entry1/exit1/entry2/exit2/extraEntry/extraExit`).
- **Intervalo no CSV**: filtro de dias (1–31) aplicado somente na exportação do CSV.

