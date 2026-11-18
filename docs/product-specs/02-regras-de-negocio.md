# 02 — Regras de negócio

Formato: `RN-<MÓDULO>-<nº>` — regra. **[O]** observado na referência; **[I]** inferido/proposto.

---

## 1. Conta de usuário, cadastro e elegibilidade (USR)

- **RN-USR-01** [O] O serviço destina-se a pessoas físicas e finanças pessoais; uso empresarial não tem suporte, indenização nem reembolso.
- **RN-USR-02** [O] Não há idade mínima. Entre 16 e 17 anos, o usuário deve revisar os termos com o representante legal; abaixo de 16, o representante legal deve consentir.
- **RN-USR-03** [O] O cadastro exige dados pessoais mínimos (nome, e-mail; data de nascimento opcional). Aceitar os termos é condição do cadastro.
- **RN-USR-04** [O] Recursos de agentes de IA (MCP) exigem **e-mail verificado**.
- **RN-USR-05** [O] O usuário pode excluir a conta e **todos** os dados pelo próprio app (perfil do usuário), sem contato com o suporte.
- **RN-USR-06** [O] Contas sem acesso por mais de **6 meses** são excluídas automaticamente com todos os dados.
  - [I] Enviar e-mails de aviso 30 e 7 dias antes da exclusão.
- **RN-USR-07** [O] Senha é responsabilidade do usuário; deve existir fluxo de redefinição de senha.
- **RN-USR-08** [O] No plano Zooloo Plus, o usuário pode compartilhar o mesmo login com outra pessoa (uso em casal). [I] Recomenda-se, em vez disso, suportar convite de membro com credenciais próprias — ver RN-PRF-08.
- **RN-USR-09** [O] Pedidos de cópia de dados (anexos e dados financeiros) atendidos por e-mail ao suporte. [I] Na nossa versão, oferecer exportação self-service completa (ZIP com JSON/CSV + anexos).

## 2. Dispositivos e sessão (DEV)

- **RN-DEV-01** [O] Plano Essencial: uso em **1 dispositivo**. Entrar em um novo dispositivo desconecta o anterior.
- **RN-DEV-02** [O] Plano Essencial: no máximo **5 desconexões por mês** (ciclo mensal). Esgotado o limite, aguardar o próximo ciclo, salvo exceção liberada pelo suporte.
- **RN-DEV-03** [O] Planos Plus+: dispositivos ilimitados, sincronizados.
- **RN-DEV-04** [O] Tela "Dispositivos conectados" lista e permite desconectar dispositivos.
- **RN-DEV-05** [O] Reinstalação gera novo identificador local de dispositivo.
- **RN-DEV-06** [I] Cada navegador ou instalação PWA conta como um dispositivo, identificado por um `install_id` salvo no armazenamento local. A aba do navegador e o PWA instalado a partir do mesmo navegador e do mesmo perfil de navegador compartilham o armazenamento e contam como **um** dispositivo. Como Web/PWA exige Plus+ (RN-PLN-07), não há conflito com RN-DEV-01.

## 3. Perfis (PRF)

- **RN-PRF-01** [O] Perfil = controle financeiro independente (contas, categorias, lançamentos, orçamentos etc. próprios) dentro do mesmo usuário.
- **RN-PRF-02** [O] Usos: pessoal, família, pequeno negócio, controles em **moedas diferentes**. Cada perfil tem uma moeda [I: moeda definida na criação, imutável depois que houver lançamentos].
- **RN-PRF-03** [O] Operações: criar, editar, arquivar, excluir (em Perfil do usuário › Gerenciar perfis).
- **RN-PRF-04** [O] Arquivar preserva os dados e retira o perfil do uso cotidiano. Excluir remove **todos** os dados do perfil; o app recomenda criar um ponto de restauração antes.
- **RN-PRF-05** [O] Perfis adicionais: ilimitados no Plus+. No Essencial, cada perfil adicional é comprado à parte (pagamento único).
- **RN-PRF-06** [O] Ao cancelar o Zooloo Plus, os perfis que excedem a cota do usuário (fora os comprados avulsos) são **arquivados automaticamente**. Nenhum dado é excluído.
- **RN-PRF-07** [O] PIN de **4 dígitos** por perfil; no máximo **2 perfis** protegidos por PIN (Plus+).
  - [I] Após 5 tentativas erradas, bloquear por 5 min, depois aplicar backoff exponencial. Recuperar o PIN exige a senha da conta.
- **RN-PRF-08** [O] Transferências entre perfis representam aportes ao controle compartilhado (casal). [I] Uma transferência entre perfis gera uma despesa (ou saída) no perfil de origem e uma receita (ou entrada) no de destino, ligadas por `transfer_link_id`. Se as moedas diferirem, ambos os valores são informados.
- **RN-PRF-09** [O] Em MCP, citar o nome de um perfil na conversa não restringe as permissões. O escopo é o usuário inteiro e as respostas devem indicar o perfil consultado.

## 4. Contas (CTA)

- **RN-CTA-01** [O] Conta tem: descrição, saldo inicial, categoria de conta (tipo/grupo visual), limite de cheque especial opcional, imagem/ícone, flag "conta padrão", flag "ignorar nos totais", vínculo "agrupar em".
- **RN-CTA-02** [O] Receita aumenta, despesa reduz e transferência move saldo entre duas contas.
- **RN-CTA-03** [O] Três leituras de saldo:
  - **Saldo inicial**: ponto de partida.
  - **Saldo atual**: saldo inicial + movimentos **efetivados**.
  - **Saldo previsto**: saldo atual + movimentos **pendentes** até a data-alvo (+ orçamentos, se configurado — RN-ORC-14).
- **RN-CTA-04** [O] Reajustar saldo: o usuário informa o valor real e escolhe como a diferença é representada: (a) alterar o saldo inicial; (b) criar uma receita/despesa de ajuste; (c) abrir o formulário para detalhar o lançamento.
- **RN-CTA-05** [O] Conta de agrupamento: criada com "Esta é uma conta para agrupamento". Contas filhas apontam para ela em "Agrupar em". O saldo do grupo é a soma das filhas. [I] Um grupo não recebe lançamentos diretos e não aninha outro grupo (1 nível).
- **RN-CTA-06** [O] Conta marcada como **investimento** acompanha evolução. Em renda fixa, reajustes de saldo representam rendimentos.
- **RN-CTA-07** [O] Conta "ignorada nos totais" não soma no saldo geral. Transferências entre conta incluída e conta ignorada afetam o balanço (RN-TRF-03).
- **RN-CTA-08** [O] Campo "Número da conta" permite reconhecer transferências com contas Open Finance (RN-OF-12).
- **RN-CTA-09** [O] Campo "identificação do banco" + últimos 4 dígitos ajudam a importar notificações.
- **RN-CTA-10** [I] Uma conta com lançamentos não pode ser excluída sem escolher entre (a) excluir os lançamentos ou (b) arquivar a conta. Arquivar oculta a conta das listas e mantém o histórico.

## 5. Categorias e tags (CAT)

- **RN-CAT-01** [O] Categorias são separadas por tipo (receita ou despesa) e têm subcategorias (2 níveis).
- **RN-CAT-02** [O] Arquivar uma categoria preserva o histórico. **Excluir** move os lançamentos para a categoria **"Outros"**.
- **RN-CAT-03** [O] "Outros" é categoria de sistema, uma por tipo, e não pode ser excluída [I].
- **RN-CAT-04** [O] O app oferece um conjunto inicial de categorias no onboarding.
- **RN-CAT-05** [O] "Mover transações entre categorias" redistribui lançamentos em massa (Plus+, conforme a tabela de planos).
- **RN-CAT-06** [O] Tags são transversais (viagem, projeto, pessoa). Um lançamento pode ter N tags.
- **RN-CAT-07** [I] Nomes de categoria são únicos por (perfil, tipo, pai). Nomes de tag são únicos por perfil, sem diferenciar maiúsculas.

## 6. Lançamentos (LAN)

### 6.1 Tipos e campos
- **RN-LAN-01** [O] Tipos: **Receita**, **Despesa**, **Transferência**. Despesa pode ser em conta (débito) ou em cartão.
- **RN-LAN-02** [O] Campos: descrição, valor, situação (efetivado/pendente), data de lançamento, data de vencimento, data de efetivação, categoria/subcategoria (receita/despesa), conta ou cartão, tags, observações, anexo, local/estabelecimento.
- **RN-LAN-03** [O] Flag por lançamento "ignorar nos totais" (não soma em saldos gerais, gráficos e orçamentos, salvo opção do orçamento — RN-ORC-07).

### 6.2 Datas
- **RN-LAN-04** [O] Fluxo de caixa e extrato de contas: o pendente usa a **data de vencimento** e o efetivado usa a **data de efetivação**.
- **RN-LAN-05** [O] Análises por competência usam a **data de lançamento**.
- **RN-LAN-06** [O] Cartão: a fatura é escolhida pelo **vencimento** e as compras dentro dela são ordenadas pela **data de lançamento**.
- **RN-LAN-07** [I] Ao marcar como efetivado sem data de efetivação, usar hoje. Ao voltar para pendente, limpar a data de efetivação.

### 6.3 Recorrência
- **RN-LAN-08** [O] Recorrência:
  - **Não recorrente**: ocorre uma vez.
  - **Fixa**: repete continuamente, sem término automático. O valor pode ser ajustado mês a mês (cada ocorrência é editável).
  - **Parcelada/Repetida**: quantidade, parcela inicial e periodicidade definidas.
- **RN-LAN-09** [O] Ao parcelar, o usuário informa o **total** (o app divide) ou o **valor de cada parcela**.
- **RN-LAN-10** [O] É possível iniciar a partir de uma parcela diferente da 1ª (ex.: começar na parcela 4/10) para não criar meses passados.
- **RN-LAN-11** [I] Divisão do total: `parcela = floor(total*100/n)/100`. O resíduo de centavos vai para a **1ª** parcela (mesmo comportamento observado nos bancos — RN-OF-08).
- **RN-LAN-12** [I] Edição de ocorrência de série: perguntar o escopo "somente esta", "esta e as próximas" ou "todas". Exclusão segue os mesmos escopos.
- **RN-LAN-13** [O] Novas séries fixas/parceladas criadas via agente começam **pendentes**, sem vencimento retroativo e com parcelas iguais.
- **RN-LAN-14** [I] Periodicidades: diária, semanal, quinzenal, mensal, bimestral, trimestral, semestral, anual. Nos meses curtos, o vencimento no dia 29–31 cai no último dia do mês.
- **RN-LAN-15** [I] Fixas são materializadas de forma preguiçosa: ocorrências virtuais até o horizonte consultado, persistidas ao editar/efetivar. Isso evita gerar registros infinitos.

### 6.4 Multicategorias
- **RN-LAN-16** [O] Uma despesa multicategorias distribui o total entre várias categorias/subcategorias.
- **RN-LAN-17** [I] A soma das partes deve ser igual ao total, ou a diferença vai automaticamente para a última parte. Relatórios por categoria usam o valor de cada parte.

### 6.5 Sinal negativo (reembolso, estorno, compensação)
- **RN-LAN-18** [O] Despesa **negativa sem cartão** = **reembolso**, tratado como entrada.
- **RN-LAN-19** [O] Despesa **negativa em cartão** = **estorno**, reduz a fatura.
- **RN-LAN-20** [O] Receita **negativa** = **compensação**, tratada como saída.
- **RN-LAN-21** [O] Nos detalhes, ação "Transformar em compensação/reembolso" quando aplicável. O produto incentiva registrar a devolução em vez de excluir o original (preserva histórico).
- **RN-LAN-22** [I] Em relatórios por categoria, reembolso abate o total da categoria de despesa e compensação abate o total da categoria de receita.

### 6.6 Conversões
- **RN-LAN-23** [O] "Transformar em › Despesa de cartão": escolher o cartão; o lançamento sai da conta e entra na fatura.
- **RN-LAN-24** [O] "Transformar em débito": escolher conta, vencimento e situação; desvincula do cartão.
- **RN-LAN-25** [O] Sugestão "transformar despesa/receita em transferência" quando o app suspeitar de transferência entre contas próprias (Open Finance).

### 6.7 Busca e lote
- **RN-LAN-26** [O] A busca considera descrição, categoria, conta, observações, tags e local. Asterisco **no início** busca pelo final da palavra (`*mercado`) e **no fim** busca pelo começo (`super*`).
- **RN-LAN-27** [O] Alteração em lote: selecionar N lançamentos (pressão longa no mobile, seleção no Web), escolher a ação e confirmar um **resumo** antes de aplicar. O lote também pode partir de um filtro salvo de Relatórios ou de um pedido à Zoe (que prepara para revisão).
- **RN-LAN-28** [I] Ações de lote: alterar categoria, conta, tags (adicionar/remover), situação (efetivar/pendente), data, ignorar nos totais, excluir.

### 6.8 Anexos
- **RN-LAN-29** [O] Anexos por lançamento. Cota: Essencial até **1 MB/mês**, Plus+ ilimitado.
- **RN-LAN-30** [I] Tipos aceitos: imagens (jpg, png, heic), PDF. Máximo de 10 MB por arquivo no Plus+.

## 7. Transferências (TRF)

- **RN-TRF-01** [O] Transferência move valor da conta origem para a conta destino, sem criar receita nem despesa quando ambas participam dos totais.
- **RN-TRF-02** [O] O mesmo vale quando **ambas** estão ignoradas nos totais.
- **RN-TRF-03** [O] Balanço de transferências:
  - De conta **incluída** para conta **ignorada**: valor **poupado**.
  - De conta **ignorada** para conta **incluída**: **retirada**.
  - Entre contas de mesma configuração: não altera o balanço, mas aparece na movimentação total de transferências.
- **RN-TRF-04** [I] Origem ≠ destino. Uma transferência pode ser pendente e ser recorrente/parcelada como os demais lançamentos.

## 8. Cartões de crédito e faturas (CRT)

- **RN-CRT-01** [O] Cartão: nome, imagem, final(is) do cartão (vários separados por vírgula para adicionais/virtuais da **mesma** fatura), dia de vencimento, regra de fechamento, limite, conta de pagamento padrão, "nome na carteira digital" (iOS).
- **RN-CRT-02** [O] Regras de fechamento:
  - **N dias antes do vencimento** (padrão mais comum; acompanha mudanças no vencimento).
  - **Dia fixo do mês**.
- **RN-CRT-03** [O] A regra de fechamento determina a fatura de cada compra: uma compra com data de lançamento **até** o fechamento entra na fatura do vencimento corrente; depois do fechamento, entra na seguinte. [I] A compra feita no próprio dia de fechamento entra na fatura que fecha naquele dia.
- **RN-CRT-04** [O] O limite permite exibir o valor usado e o disponível. [O] Existem "compras ignoradas no limite". [I] Limite disponível = limite − (soma das despesas não pagas de todas as faturas abertas e futuras, inclusive parcelas futuras) + créditos.
- **RN-CRT-05** [O] A despesa parcelada no cartão mostra a parcela atual em cada fatura. Despesas fixas geram previsões nos ciclos seguintes.
- **RN-CRT-06** [O] Estornos (valores negativos) reduzem o total da fatura.
- **RN-CRT-07** [O] **Pagar fatura**: escolher a conta e confirmar o valor. O pagamento **efetiva** as despesas contempladas e vincula a parte paga à conta escolhida.
- **RN-CRT-08** [O] **Pagamento parcial** é permitido, inclusive com **contas diferentes**. O extrato de cada conta mostra só a parte paga por ela.
- **RN-CRT-09** [O] **Antecipar pagamento** reduz o pendente antes do vencimento.
- **RN-CRT-10** [O] Pagamento **acima do total** gera **crédito** na fatura seguinte.
- **RN-CRT-11** [O] **Reabrir fatura** desfaz o estado de pagamento para correção.
- **RN-CRT-12** [O] No OFX de fatura, o pagamento pode vir como crédito, mas deve ser registrado pela função "Pagar fatura".
- **RN-CRT-13** [I] Situação da fatura: `aberta` (antes do fechamento), `fechada` (após o fechamento, não paga), `paga`, `paga parcialmente`, `vencida` (após o vencimento com saldo > 0).
- **RN-CRT-14** [I] Pagamento parcial: o saldo restante **permanece** na fatura como pendente. Não há rolagem automática com juros; o usuário pode lançar encargos manualmente.
- **RN-CRT-15** [O] Iniciar o controle com parcelamentos em curso: cadastrar a partir da parcela atual informando o total de parcelas.

## 9. Extrato (EXT)

- **RN-EXT-01** [O] Lista linear de receitas, despesas e transferências. Pendentes na data de vencimento, efetivados na data de efetivação. Cada seção de data termina com o **saldo do momento**.
- **RN-EXT-02** [O] Extrato de cartão: fatura escolhida pelo vencimento, compras ordenadas pela data de lançamento.
- **RN-EXT-03** [O] Extrato de conta: o pagamento de fatura aparece apenas pelo valor pago com aquela conta.
- **RN-EXT-04** [O] Opções: agrupar despesas de cartão por fatura; ordenar por data crescente/decrescente/alfabética; totais diários de crédito e débito; mostrar/ocultar pendentes, efetivados e ignorados; considerar ou não o saldo inicial.

## 10. Orçamentos (ORC)

- **RN-ORC-01** [O] O orçamento compara uma **meta** com as despesas **ou** receitas que atendem aos filtros. As abas Despesas e Receitas são independentes.
- **RN-ORC-02** [O] Tipos de período:
  - **Mensal**: começa no mês de vigência e continua nos seguintes.
  - **Personalizado**: data de início e de término.
- **RN-ORC-03** [O] Filtros: categorias e subcategorias (várias); tags com modo **pelo menos uma / todas / nenhuma**; cartões (só em despesas); sem filtros = total geral.
- **RN-ORC-04** [O] Meta **fixa** ou, em orçamento mensal de despesa, **percentual das receitas**: (a) da receita total do mês; ou (b) da **meta** de um orçamento mensal de receita específico (valor planejado, não o recebido).
- **RN-ORC-05** [O] **Orçamento agrupado**: reúne orçamentos mensais existentes (ex.: 50/30/20). A meta é a soma dos componentes; não tem meta fixa, percentual nem filtros próprios.
- **RN-ORC-06** [O] Indicadores: Meta; Efetivado; Pendente; Saldo = meta − considerado (negativo em despesa = **estouro**); Percentual.
- **RN-ORC-07** [O] Opção "considerar transações não somadas": inclui lançamentos e contas ignorados nos totais.
- **RN-ORC-08** [O] Opção **Previsto**: desligada, conta só efetivados; ligada, soma também os pendentes do período. Exemplo: 200 pagos + 100 pendentes = atual 200, previsto 300. Não altera os lançamentos.
- **RN-ORC-09** [O] Data de referência: **vencimento**; **efetivação** (data real para efetivados, vencimento para pendentes); **lançamento** (competência).
- **RN-ORC-10** [O] Recomendação para cartão: referência por **lançamento** com Previsto ligado, para a compra contar no mês em que ocorreu.
- **RN-ORC-11** [O] Alterar meta (mensal simples, valor fixo): aplicar "só no mês selecionado" ou "deste mês em diante". O histórico dos meses anteriores é preservado.
- **RN-ORC-12** [O] Transferir saldo entre orçamentos mensais compatíveis; Copiar (reutiliza filtros); Arquivar a partir de um período (preserva o histórico); Excluir (remove a referência histórica).
- **RN-ORC-13** [O] Alerta percentual em orçamentos de despesa (ex.: aviso a 80%). Opção "Exibir na tela de Resumo"; se o card não existir, ele é adicionado ao criar o primeiro orçamento exibido.
- **RN-ORC-14** [O] "Considerar no saldo previsto" (mensal simples): o saldo restante dos orçamentos marcados é descontado do Previsto. Se a **soma** dos saldos dos orçamentos de despesa marcados ficar **negativa**, o app deixa de descontar, para não reservar de novo dinheiro já gasto.
- **RN-ORC-15** [O] **Meta recomendada**: calculada a partir do histórico suficiente (comportamento passado). [I] Média dos últimos 3–6 meses completos, desconsiderando o mês corrente. Exige no mínimo 3 meses com dados.
- **RN-ORC-16** [O] Lançamentos do recurso Empréstimos não entram em orçamentos (RN-EMP-06).
- **RN-ORC-17** [O] Detalhes: lista das transações consideradas e evolução de uso × meta nos últimos meses.

## 11. Objetivos (OBJ)

- **RN-OBJ-01** [O] Objetivo: descrição, valor da meta, data esperada, motivação, cor, ícone, modo de acompanhamento.
- **RN-OBJ-02** [O] Modos:
  - **Depósitos**: alcançado = saldo inicial do objetivo + Σ depósitos.
  - **Conta/grupo vinculado**: alcançado = saldo da conta ou grupo. Saldo inicial e depósitos próprios são **ignorados**.
- **RN-OBJ-03** [O] O modo pode ser alterado na edição.
- **RN-OBJ-04** [O] Card: Objetivo, Alcançado, Falta (= meta − alcançado), Percentual, **Ideal por mês** (= falta ÷ meses restantes até a data), Expectativa. Se a data passar, recomendar revisar o prazo.
  - [I] Meses restantes = `max(1, ceil(diferença em meses entre hoje e a data esperada))`.
- **RN-OBJ-05** [O] Simulador: informar um valor mensal e mostrar a data em que a meta seria alcançada. Com histórico suficiente, mostrar uma **data provável** pela evolução recente.
- **RN-OBJ-06** [O] Gráfico dos **últimos 6 meses** (depósitos ou saldo), com opção "Considerar mês atual".
- **RN-OBJ-07** [O] Depósito: valor positivo = aporte, negativo = retirada. Data, observação e flag **Mensal** (recorrente).
- **RN-OBJ-08** [O] O depósito mensal começa na data cadastrada e **não cria ocorrências retroativas**.
- **RN-OBJ-09** [O] Editar ou excluir um depósito recalcula o alcançado. Se ficar abaixo da meta, um objetivo concluído é **reaberto**.
- **RN-OBJ-10** [O] Conclusão automática quando o alcançado ≥ meta (modo depósitos). Ação manual "Alcançado" conclui ou reabre. A data de conclusão é registrada para comparar com o prazo (antes, no prazo ou depois).
- **RN-OBJ-11** [O] Objetivos vinculados a conta **não aceitam** depósitos separados (inclusive via Zoe).
- **RN-OBJ-12** [O] Android: ao cadastrar certas receitas ou transferências, oferecer a criação de um depósito equivalente em um objetivo.

## 12. Empréstimos (EMP) — Plus+

- **RN-EMP-01** [O] Disponível só no Plus+ (e no teste). Organiza acordos do perfil; não contrata crédito nem cobra.
- **RN-EMP-02** [O] Tipos: **Emprestei dinheiro** e **Peguei emprestado**. Campos: descrição, pessoa/instituição, valor, data, conta, categorias, plano de devolução, previsão de quitação, juros, observações.
- **RN-EMP-03** [O] **Já estava em andamento**: informar só o saldo em aberto, sem criar a movimentação inicial.
- **RN-EMP-04** [O] Lançamentos gerados:
  - Emprestei: saída inicial = **receita negativa (compensação)**; devolução = **despesa negativa (reembolso)**.
  - Peguei: entrada inicial = **receita positiva**; devolução = **despesa positiva**.
- **RN-EMP-05** [O] A movimentação inicial usa uma categoria de receita e as devoluções usam categoria de despesa. Em "já em andamento" sem parcelas, a categoria é pedida na devolução.
- **RN-EMP-06** [O] O principal movimenta a conta, mas os lançamentos do recurso **ignoram gráficos, estatísticas e orçamentos**. Juros seguem o tratamento normal.
- **RN-EMP-07** [O] Plano de devolução (opcional): quantidade de parcelas, intervalo, primeiro vencimento. Cria lançamentos **pendentes**. Programar não confirma o pagamento.
- **RN-EMP-08** [O] Devoluções parciais reduzem as parcelas pendentes correspondentes e **não podem superar o saldo em aberto**.
- **RN-EMP-09** [O] Reprogramar substitui só as parcelas pendentes e preserva as registradas.
- **RN-EMP-10** [O] Previsão de quitação: opcional. Sem data, usa a última parcela quando o plano cobre todo o saldo.
- **RN-EMP-11** [O] Progresso = principal devolvido ÷ principal (sem juros e sem abatimentos). Um saldo zerado por abatimento pode ter progresso < 100%.
- **RN-EMP-12** [O] Juros na devolução são informados à parte: recebidos = receita, pagos = despesa. Não reduzem o principal.
- **RN-EMP-13** [O] "Definir juros": taxa efetiva (%), ao mês ou ao ano, data de referência. É informativo e não acrescenta juros automaticamente.
- **RN-EMP-14** [O] "Comparar amortização e investimento" (Peguei emprestado com taxa): entradas são o rendimento líquido anual e a TR anual estimada. O resultado é indicativo (não é CET).
- **RN-EMP-15** [O] **Abatimento**: reduz o saldo **sem** movimentar conta. "Desfazer abatimento" devolve o valor ao saldo.
- **RN-EMP-16** [O] **Vincular lançamento existente** como devolução. Elegíveis: efetivados, mesmo perfil e moeda, data ≥ data do acordo, valor ≤ saldo disponível. **Excluídos**: transferências, despesas de cartão, lançamentos com encargos.
- **RN-EMP-17** [O] Lançamentos criados pelo recurso são protegidos: não podem ser desvinculados livremente nem ter dados financeiros alterados nas telas comuns.
- **RN-EMP-18** [O] Edição permitida: descrição, pessoa, observações, previsão, juros. Tipo, valor inicial e lançamentos anteriores são imutáveis.
- **RN-EMP-19** [O] Arquivar retira da lista ativa sem quitar. Reativar retoma. Excluir oferece: (a) manter todos os lançamentos (voltam a ser editáveis); (b) excluir só os pendentes, incluindo vencidos; (c) excluir todos os vinculados, o que altera saldos.
- **RN-EMP-20** [O] Card no Resumo: Total emprestado e Total devido em aberto (não arquivados).
- **RN-EMP-21** [O] Alternativa manual: uma conta dedicada ao empréstimo movida por transferências, com juros como receita.

## 13. Resumo / Dashboard (DSH)

- **RN-DSH-01** [O] Cards configuráveis (adicionar, remover, ordenar): contas, cartões, visão geral, pendências, orçamentos, objetivos, categorias, últimas transações, empréstimos, Saúde Financeira. No Web, os cards podem ocupar colunas diferentes.
- **RN-DSH-02** [O] "Novos cards" extras exigem Plus+ (conforme a tabela de planos).
- **RN-DSH-03** [O] Configurar saldo: exibir inicial, atual e previsto; **acumulação em meses futuros** (o previsto do mês N inclui o saldo projetado de N−1); incluir orçamentos de receita/despesa no previsto.
- **RN-DSH-04** [O] **Detalhamento do saldo**: mostra quais grupos compõem os valores.
- **RN-DSH-05** [O] **Modo privado**: oculta valores na interface.

## 14. Relatórios e gráficos (REL)

- **RN-REL-01** [O] Filtros: período, tipo de transação, situação, categorias, contas, cartões, tags e outros. Visualização em lista, gráfico ou evolução.
- **RN-REL-02** [O] **Filtros salvos** para repetir consultas, exportações e alterações em lote.
- **RN-REL-03** [O] **Modo comparativo**: dois períodos com os mesmos critérios; mostra totais, evolução e diferenças por grupo; exportável.
- **RN-REL-04** [O] Filtros avançados exigem Plus+ (conforme a tabela de planos).
- **RN-REL-05** [O] Gráficos: categorias/subcategorias (os avançados exigem Plus+), evolução diária/mensal, fluxo de caixa (entradas × saídas × balanço), contas e investimentos (evolução patrimonial).
- **RN-REL-06** [O] **Saúde Financeira**: pontuação + gráfico radar de dimensões; é um diagnóstico do que está registrado.
  - [I] Dimensões propostas (0–100 cada; nota = média ponderada): Taxa de poupança (receitas − despesas)/receitas; Comprometimento com cartão (fatura ÷ receita); Reserva de emergência (saldo em contas ÷ média de despesas mensais, meta de 6 meses); Aderência a orçamentos (% de orçamentos não estourados); Pontualidade (% de pendências pagas até o vencimento); Endividamento (saldo devido de empréstimos ÷ receita anual).
- **RN-REL-07** [O] Assistente de relatórios: descrição em linguagem natural → a IA configura os filtros (consome créditos).
- **RN-REL-08** [O] Comparações usam uma data de referência consistente. As telas devem indicar qual data está em uso.

## 15. Importação, exportação e conciliação (IMP)

### CSV/XLSX
- **RN-IMP-01** [O] **Modelos** reutilizáveis: campos na ordem das colunas (descrição, valor, data de lançamento/vencimento/efetivação com formato configurável e horário preservado, categoria, subcategoria, conta, conta destino, cartão, observações, estabelecimento, **Campo ignorado**).
- **RN-IMP-02** [O] Configurações: primeira linha é cabeçalho; separador `,` ou `;`; formato de data; "negativo = despesa, positivo = receita"; conta ou cartão padrão.
- **RN-IMP-03** [O] Linhas com **conta destino** = transferências.
- **RN-IMP-04** [O] Sem categoria no arquivo, o app pode categorizar automaticamente.
- **RN-IMP-05** [O] Fluxo: prévia → cadastros encontrados → sugestões de conciliação → confirmação.
- **RN-IMP-06** [I] Conta, cartão ou categoria inexistente na prévia: oferecer "criar" ou "mapear para um existente".

### OFX
- **RN-IMP-07** [O] Selecionar o arquivo e a conta/cartão de destino, revisar os semelhantes encontrados e manter marcados só os itens a criar ou atualizar.
- **RN-IMP-08** [I] Usar o `FITID` do OFX como chave de idempotência por conta: reimportar não duplica.

### Exportação
- **RN-IMP-09** [O] Pontos de exportação: Extrato (movimento linear da conta ou cartão); Relatórios (com filtros); Modelos CSV/XLSX; comparativos e evoluções.
- **RN-IMP-10** [O] Formatos: **XLSX**, **CSV**, **PDF**. Exportação e modelos personalizados exigem Plus+ (conforme a tabela de planos).

### Conciliação
- **RN-IMP-11** [O] Sinais comparados: tipo, valor, data, conta, cartão, descrição, recorrência.
- **RN-IMP-12** [O] Sugestão ≠ confirmação: o usuário revisa qual registro preservar.
- **RN-IMP-13** [O] **Mesclar**: selecionar exatamente 1 lançamento manual + 1 Open Finance, do mesmo tipo, perfil e conta/cartão. O **manual é preservado** e recebe o vínculo do importado.
- **RN-IMP-14** [O] Havendo candidatos igualmente prováveis, o app **não escolhe automaticamente**.
- **RN-IMP-15** [I] Pontuação de conciliação: valor exato (obrigatório, ou tolerância para "valor variável"); |Δdata| ≤ 3 dias; mesma conta/cartão; similaridade de descrição (token set ≥ 0,6); mesma série recorrente. Sugerir se score ≥ 0,7; ambíguo se a diferença entre os 2 primeiros for < 0,1.

## 16. Notificações, SMS e automações do SO (NTF) — mobile

- **RN-NTF-01** [O] Android: ler notificações bancárias e de carteiras digitais e SMS (permissão do sistema; execução em segundo plano).
- **RN-NTF-02** [O] O parser identifica banco pelo texto, tipo, valor, comerciante e cartão/conta (últimos 4 dígitos).
- **RN-NTF-03** [O] "Escolher como importar": revisar o tipo (despesa, despesa cartão, receita, transferência) antes de criar.
- **RN-NTF-04** [O] **Evitar duplicações por tempo**: mesma combinação valor + comerciante em uma janela configurável. A configuração vale por aparelho e é única para notificações, Carteira e SMS.
- **RN-NTF-05** [O] Conciliação na importação: "Efetivar" baixa um pendente existente; "Importar" cria outro lançamento. Despesas de cartão ficam fora dessa conciliação. Candidatos ambíguos não são escolhidos automaticamente.
- **RN-NTF-06** [O] **Importação genérica**: tenta interpretar textos não reconhecidos que contenham valor. Requer revisão.
- **RN-NTF-07** [O] **Histórico de notificações**: local, **não sincronizado**, validade de **5/10/20/30 dias** (padrão 5). Permite importar ou excluir; excluir o histórico não apaga o lançamento.
- **RN-NTF-08** [O] Contas/cartões conectados ao Open Finance **ignoram** a importação de notificações por padrão. Opção em Configurações › Open Finance: "Permitir importação de notificações" (Android) ou "Permitir importação de pagamentos" (iOS), **desligada por padrão**.
- **RN-NTF-09** [O] Identificação de cartão: os finais devem ser únicos entre cadastros para evitar ambiguidade.
- **RN-NTF-10** [O] iOS: ações do app Atalhos — "Importar da Carteira Digital" (cartão, comerciante, valor), "Importar SMS" (conteúdo), "Importar notificação" (app, título, subtítulo, corpo; requer iOS 27+), Siri ("Nova despesa/receita/transferência no …") e automação "Hora do dia". Apple Pay requer iOS 17+.
- **RN-NTF-11** [O] Para a Carteira, o "Nome do cartão na carteira digital" deve coincidir com o nome exibido no app Carteira.
- **RN-NTF-12** [O] Android: leitura de **cupom fiscal** (QR Code NFC-e) para lançar despesa; disponível no Essencial e varia por estado emissor.
- **RN-NTF-13** [O] Android: integração com **Google Agenda** (vencimentos como eventos).

## 17. Open Finance (OF) — Zooloo Conecta / Pro

- **RN-OF-01** [O] Conexão via agregador (**Pluggy**) com mais de 100 instituições; **somente leitura**; autorização feita no ambiente do banco; revogável.
- **RN-OF-02** [O] Limite **por instituição conectada** (não por conta/cartão): Zooloo Conecta 3, Pro 10. Pro aceita PF e PJ.
- **RN-OF-03** [O] Não incluído no teste grátis. Mesmo sem assinar, é possível ver a lista de bancos suportados.
- **RN-OF-04** [O] Dados: contas, cartões, saldos, faturas e transações do período autorizado. **Investimentos não suportados**.
- **RN-OF-05** [O] Atualização automática até **4×/dia**. Novas transações podem levar horas ou até **5 dias**. Atualizar manualmente várias vezes não acelera.
- **RN-OF-06** [O] Importação inicial: período recente, **até cerca de 3 meses**, conforme a instituição.
- **RN-OF-07** [O] **Vincular a um controle manual**: a conta/cartão existente passa a receber atualizações **a partir do vínculo**, sem importar o histórico anterior (evita duplicidade).
- **RN-OF-08** [O] Parcelamentos: o banco envia só a parcela atual + posição + total. O app **cria as parcelas futuras previstas** com o valor da 1ª. Quando a parcela real chega, atualiza a prevista (sem criar outra). Se o parcelamento some das faturas (cancelamento/estorno), as previsões **a partir da 2ª** criadas automaticamente podem ser removidas.
- **RN-OF-09** [O] Categorização: (a) automática pela IA e pelo histórico, podendo **criar categorias**; ou (b) "usar apenas categorias existentes" (sem correspondência → **Outros**).
- **RN-OF-10** [O] Transações Open Finance editáveis: descrição, categorias, tags, observações; podem ser **excluídas**. **Não** editáveis: valor, datas, conta/cartão.
- **RN-OF-11** [O] Lançamentos manuais em contas conectadas são permitidos (planejamento). O app tenta reconhecê-los quando a real chega (valor, data, descrição, observações).
- **RN-OF-12** [O] Reconhecimento de **transferências** entre contas conectadas de mesma titularidade, ou com uma conta manual que tenha "Número da conta" preenchido. Sem correspondência, sugere transformar em transferência.
- **RN-OF-13** [O] Automações: **efetivação parcial** (import baixa parte de um lançamento maior); **valor variável** (conta fixa reconhecida com valor diferente — água, luz); **sugestão de conciliação**. Recomenda-se evitar descrições genéricas ("Pix", "Pagamento").
- **RN-OF-14** [O] Remover vínculo de um item interrompe as atualizações e **preserva** o histórico. Excluir a conexão interrompe todos os itens da instituição; os dados importados permanecem.
- **RN-OF-15** [O] "Reiniciar dados": baixar de novo todo o histórico da conexão (usar só quando necessário).
- **RN-OF-16** [O] A conexão fica desatualizada por exigência do banco ou se o app passar **mais de 30 dias sem atividade**. Ação: reconectar/atualizar.
- **RN-OF-17** [O] Troca de cartão/agência pode exigir novo consentimento: remover a conexão, criar nova para a mesma instituição e vincular ao controle manual existente.
- **RN-OF-18** [O] Evitar 2 conexões da mesma instituição. [I] Bloquear a duplicata com mensagem orientando a reconectar.
- **RN-OF-19** [O] Reajustar saldo pode usar o saldo informado pelo banco.
- **RN-OF-20** [I] Ao cancelar ou fazer downgrade do plano Conecta, as conexões são suspensas (sem novas atualizações) e os dados permanecem. Se o novo limite for menor, o usuário escolhe quais manter ativas.

## 18. Sincronização, backup e restauração (SYN)

- **RN-SYN-01** [O] Essencial: **backup em nuvem** (sem multi-dispositivo). Plus+: sincronização automática com internet.
- **RN-SYN-02** [O] Botão **Sincronizar** força o pull dos dados da nuvem.
- **RN-SYN-03** [O] O app funciona **offline**; alterações feitas offline aparecem nos outros dispositivos/MCP só depois do envio. [I] Vale para mobile **e** PWA (RN-PWA-05).
- **RN-SYN-04** [O] **Pontos de restauração** (Plus+, até **15**): descrição + observação. Ações: criar, restaurar, excluir. Restaurar **substitui** o estado atual (conferir data e perfil). Recomendado antes de importações grandes, exclusões e reorganizações.
- **RN-SYN-05** [I] O ponto de restauração tem escopo de **perfil**. Ao atingir 15, é preciso excluir um para criar outro. Restaurar cria automaticamente um ponto "antes da restauração" (se houver vaga).
- **RN-SYN-06** [I] Resolução de conflitos: last-writer-wins por campo, com relógio híbrido (HLC). Exclusão vence edição concorrente. Ver doc 07.

## 18A. Web e Desktop — PWA (PWA) — Plus+

- **RN-PWA-01** [I] **Uma única base de código**: o Web app é um PWA (Web App Manifest + Service Worker). O mesmo código roda na aba do navegador e no modo instalado (`display: standalone`).
- **RN-PWA-02** [I] **Plano**: Web e Desktop (PWA) são liberados a partir do **Zooloo Plus**, inclusive no teste de 15 dias. No Essencial, o login no Web/PWA leva à tela de upgrade (RF-AUT-11).
- **RN-PWA-03** [I] **Instalação**: a opção "Instalar aplicativo Zooloo" aparece no menu do usuário e em um banner discreto, que pode ser dispensado por 30 dias. A opção só é exibida quando:
  - o usuário está logado com Plus+;
  - o navegador suporta a instalação;
  - o app ainda não está instalado (`display-mode: standalone` falso).

  Comportamento por navegador:
  - Chrome e Edge (Windows/macOS/Linux/ChromeOS): prompt nativo (`beforeinstallprompt`).
  - Safari no macOS 14+: instrução "Arquivo › Adicionar ao Dock".
  - Navegadores sem suporte (ex.: Firefox desktop): o botão fica oculto e o uso continua no navegador.
- **RN-PWA-04** [I] **App instalado**: nome curto "Zooloo" e nome completo "Zooloo Finanças". Abre em janela própria, com ícone na área de trabalho e no menu Iniciar (Windows) ou no Dock e Launchpad (macOS). Começa no Resumo (`start_url=/app`). Desinstalar é feito pelo próprio navegador ou pelo SO e **não** apaga dados da nuvem.
- **RN-PWA-05** [I] **Offline**: CRUD completo offline (lançamentos, contas, cartões, faturas, orçamentos, objetivos, empréstimos, categorias, tags) para os perfis já baixados no dispositivo. Os dados ficam em banco local cifrado (SQLite WASM sobre OPFS, VFS `opfs-sahpool` — doc 09 §4, doc 10 §6.2). Em navegador sem OPFS, o app funciona online com aviso, sem CRUD offline. As alterações entram em uma fila e são sincronizadas ao reconectar.
- **RN-PWA-06** [I] **Disparo da sincronização no PWA**:
  - evento `online`;
  - foco ou abertura da janela;
  - intervalo de 60 s enquanto online;
  - Background Sync, onde suportado;
  - aviso do servidor via WebSocket/SSE.

  O protocolo, o merge (HLC por campo) e a resolução de conflitos são os mesmos do mobile (RN-SYN-06).
- **RN-PWA-07** [I] **Funções que exigem rede** ficam desabilitadas offline, com aviso "Disponível quando estiver online":
  - Open Finance (conectar, atualizar, reconectar);
  - Zoe e Relatório Inteligente;
  - assinatura e pagamento;
  - consentimento MCP;
  - restaurar ou criar ponto de restauração;
  - pareamento Zooloo Kids.

  Anexos adicionados offline ficam na fila de upload. Importar OFX/CSV funciona offline (o parsing e a conciliação são locais) e sincroniza depois.
- **RN-PWA-08** [I] **Computador pessoal** [O, termos da referência: o desktop deve ser usado em computador pessoal]. No login, a opção "Manter dados neste computador (uso pessoal)" vem marcada.
  - Desmarcada: **modo sessão**, sem banco offline persistente (dados só em memória). Tudo é apagado ao fechar ou sair.
  - Sair (logout), em qualquer modo, apaga o banco local, os caches e a fila, depois de tentar enviar as alterações pendentes. Se houver alterações não enviadas e o usuário estiver offline, o logout exige confirmação explícita ("X alterações serão perdidas").
- **RN-PWA-09** [I] **Sessão offline**: o app abre com os dados locais sem rede por até **30 dias** desde a última validação online. Depois disso, exige login online. O PIN de perfil (RN-PRF-07) continua exigido offline, validado contra o hash sincronizado.
- **RN-PWA-10** [I] **Plano offline**: o entitlement fica em cache com `valid_until` = fim do período pago + 7 dias de tolerância. Expirado o prazo, o PWA entra em modo somente leitura até reconectar. Ao reconectar, aplica o downgrade, se houver (RN-PLN-09).
- **RN-PWA-11** [I] **Atualizações**: um novo Service Worker é baixado em segundo plano e exibe "Nova versão do Zooloo disponível — Atualizar". Nunca recarrega com formulário aberto ou com fila de sincronização em andamento. As migrações do schema local são versionadas e executadas antes de liberar a UI.
- **RN-PWA-12** [I] **Integrações de desktop** (onde suportado; não são requisitos para funcionar):
  - atalhos do ícone (manifest `shortcuts`): Nova despesa, Nova receita, Transferência, Zoe;
  - badge no ícone com a quantidade de pendências vencidas (Badging API);
  - abrir `.ofx`/`.csv`/`.xlsx` com o Zooloo (File Handling API) → tela de importação;
  - Web Push para os mesmos eventos do mobile, com opt-in.
- **RN-PWA-13** [I] **Recursos exclusivos do mobile** continuam fora do PWA: leitura de notificações e SMS, Siri/Atalhos/Carteira, widgets de tela inicial e câmera de cupom fiscal (no PWA, aceitar upload da foto do QR).
- **RN-PWA-14** [I] **Armazenamento**: o app solicita armazenamento persistente (`navigator.storage.persist()`) e alerta quando a cota está baixa. O servidor é a fonte de verdade. Se o navegador apagar os dados locais, o PWA baixa tudo de novo; só se perdem alterações ainda não enviadas, e o app avisa sobre esse risco quando a fila tem mais de 24 h.
- **RN-PWA-15** [I] **Lojas (opcional)**: o mesmo PWA pode ser publicado na Microsoft Store (empacotado via PWABuilder), sem código separado. O acesso continua condicionado ao login Plus+.

## 19. Zoe — IA interna (ZOE) — Plus+

- **RN-ZOE-01** [O] Consultar despesas, receitas, faturas, saldos e pendências; criar receitas, despesas e transferências em linguagem natural (texto/voz); criar orçamentos, objetivos e depósitos (em objetivos não vinculados); gerar relatórios e análises; efetivar transações; preparar lotes para revisão; interpretar recibos e imagens/PDF.
- **RN-ZOE-02** [O] Ações: a Zoe apresenta um **resumo para confirmação** antes de executar.
- **RN-ZOE-03** [O] Consome **créditos de IA** mensais (Zooloo Plus 500, Conecta 1.000, Pro 1.500), que **não acumulam**. O consumo varia por recurso. Cota separada da do MCP.
- **RN-ZOE-04** [O] **Relatório Inteligente** mensal: análise do mês × anteriores, evolução, pontos de atenção e sugestões.
- **RN-ZOE-05** [O] Análises contextuais em objetivos, orçamentos e faturas.
- **RN-ZOE-06** [I] Tabela de consumo proposta: pergunta simples 1 crédito; análise/relatório 5; leitura de imagem/PDF 10; Relatório Inteligente gratuito (1/mês). Créditos zerados → recurso bloqueado até a renovação no dia 1.

## 20. Agentes externos / MCP (MCP) — Plus+

- **RN-MCP-01** [O] Requisitos: e-mail verificado + assinatura Plus+ **ou** teste vigente.
- **RN-MCP-02** [O] OAuth 2.1: Authorization Code + **PKCE S256**, **DCR** (registro dinâmico), cliente público (`token_endpoint_auth_method=none`), refresh token. Escopos `finances:read` e `finances:write`.
- **RN-MCP-03** [O] Callback: HTTPS público, ou `http://127.0.0.1`/`[::1]` com porta 1024–65535. **Proibido**: `localhost`, IP privado, curingas, query (`?`) ou fragmento (`#`). Deve ser idêntico no registro, na autorização e no token.
- **RN-MCP-04** [O] Sem pedido de escrita, o acesso é somente leitura. Ampliar de leitura para escrita exige **nova autorização**.
- **RN-MCP-05** [O] Opções "Criar registros sem confirmação adicional" e "Ajustar transações sem confirmação adicional". Em integrações **não verificadas**, começam **desligadas** e a tela mostra o aviso "Integração não verificada".
- **RN-MCP-06** [O] **Sempre** exigem revisão e confirmação, mesmo com criação direta: edições, efetivações, pagamento de fatura e gestão de orçamentos (esta exige autorização específica).
- **RN-MCP-07** [O] A criação direta só ocorre a partir de **pedido explícito** do usuário, não de sugestão do agente.
- **RN-MCP-08** [O] Limites compartilhados entre agentes e perfis:

  | Plano | Consultas/dia | Consultas/mês | Escritas/dia |
  |---|---|---|---|
  | Zooloo Plus | 500 | 3.000 | 50 |
  | Zooloo Conecta | 1.000 | 6.000 | 150 |
  | Zooloo Pro | 2.000 | 10.000 | 300 |

  Renovação diária à **meia-noite** e mensal no **dia 1**, horário de Brasília. "Escritas" incluem criações, alterações e exclusões. Criar outra conexão ou trocar de perfil **não** libera a cota.
- **RN-MCP-09** [O] O MCP lê dados **sincronizados** (não consulta o banco em tempo real).
- **RN-MCP-10** [O] Perfil protegido por PIN: o agente recebe um link de desbloqueio e o PIN é digitado **somente** na página do sistema.
- **RN-MCP-11** [O] Revogar: Configurações › Mais › Conexões MCP e Agentes de IA › Desconectar. Os registros são preservados. Apagar a conversa no agente **não** revoga.
- **RN-MCP-12** [O] Ferramentas de consulta: resumo, contas, transações, faturas, categorias, orçamentos, pendências/vencidos, comparações.
- **RN-MCP-13** [O] Cada agente oficial tem um client ID pré-registrado (ex.: `zooloo-claude`). Os demais usam DCR, sem ID genérico nem segredo compartilhado.

## 21. Zooloo Kids (KID)

- **RN-KID-01** [O] App Zooloo Kids gratuito para a criança (8–12 anos): "Ganhei" e "Gastei" (lançamentos), saldo, "Meu mês" (gastos por categoria), "Meus sonhos" (metas com barra de progresso), dicas e historinhas.
- **RN-KID-02** [O] Vínculo: no Zooloo Kids, "Área do responsável" → login com a conta adulta → criar ou selecionar o perfil da criança.
- **RN-KID-03** [O] Com assinatura Plus+ do responsável: no app adulto, ver saldo, ganhos, gastos, movimentações recentes e sonhos dos perfis vinculados.
- **RN-KID-04** [O] **Combinados**: criados e geridos **só** pelo responsável (Plus+); a criança vê o prazo, a situação (pendente/concluído) e a recompensa opcional.
- **RN-KID-05** [O] Sem assinatura: a criança continua usando o Zooloo Kids, sem acompanhamento nem Combinados.
- **RN-KID-06** [I] A criança marca o Combinado como "feito"; o responsável **confirma** a conclusão. Se houver recompensa monetária, a confirmação gera um "Ganhei" automático no Zooloo Kids.
- **RN-KID-07** [I] Perfil Zooloo Kids não tem login próprio por e-mail; o dispositivo da criança é pareado pelo responsável. Não coletar dados pessoais da criança além do apelido e avatar (LGPD art. 14).

## 22. Planos, assinatura e cobrança (PLN)

- **RN-PLN-01** [O] Planos: Essencial, Zooloo Plus, Zooloo Conecta, Zooloo Pro (detalhes no doc 08).
- **RN-PLN-02** [O] **Teste de 15 dias do Zooloo Plus**, iniciado automaticamente no cadastro, sem cartão; **não** inclui Open Finance. [I] Um teste por usuário (por e-mail verificado).
- **RN-PLN-03** [O] Assinatura pessoal e intransferível, vinculada ao comprador.
- **RN-PLN-04** [O] Renovação automática; cancelamento a qualquer momento; ao cancelar, **nenhum dado é excluído**, só os recursos deixam de estar disponíveis.
- **RN-PLN-05** [O] Arrependimento: cancelamento com reembolso em até **7 dias** após a contratação. Depois disso, **sem reembolso** integral ou proporcional.
- **RN-PLN-06** [O] Compra pelo site ou in-app (Google Play / App Store).
- **RN-PLN-07** [O] A versão para computador exige Plus+. [I] No Zooloo, o **Zooloo Plus** libera **Web + Desktop (PWA)**: o usuário usa no navegador ou instala "Instalar aplicativo Zooloo" no Windows/macOS, com ícone na área de trabalho. Os dois usam a mesma base de código e o mesmo login.
- **RN-PLN-08** [O] Créditos de IA renovam mensalmente e não acumulam.
- **RN-PLN-09** [I] Downgrade/expiração (Plus+ → Essencial):
  - Dispositivos: o mais recente permanece e os demais são desconectados (RN-DEV-01).
  - Perfis excedentes arquivados (RN-PRF-06); PINs mantidos.
  - Web/PWA: acesso somente à tela de planos e à exportação. Antes do bloqueio, o PWA envia as alterações pendentes (sync final) e depois apaga o banco local do navegador.
  - Empréstimos: somente leitura.
  - Pontos de restauração: mantidos, sem criar novos.
  - Orçamentos/relatórios avançados: somente leitura.
  - MCP: tokens revogados.
- **RN-PLN-10** [O] O plano Zooloo Essencial exibe "poucas propagandas"; planos pagos não exibem.

## 23. Calculadoras públicas (CAL)

- **RN-CAL-01** [O] **Juros compostos**: entradas valor inicial, taxa (% anual ou mensal), período (anos ou meses), aporte mensal. Taxa anual convertida para a mensal equivalente: `i_m = (1+i_a)^(1/12) − 1`. Saídas: montante final, total investido, juros acumulados, gráfico.
  - `M_n = M_{n-1}·(1+i_m) + aporte` (aporte no fim do mês) [I].
- **RN-CAL-02** [O] **Renda passiva com retirada**: valor inicial, retirada mensal, taxa, prazo. Mostra a evolução mês a mês (tabela; gráfico em prazos longos). `S_n = S_{n-1}·(1+i_m) − retirada` [I]; indicar o mês em que o saldo zera.
- **RN-CAL-03** [O] **CDI**: valor, CDI anual (pré-preenchido com a referência, editável), % do CDI, período (dias úteis, meses ou anos). Saídas: bruto, líquido com IR, evolução.
  - [I] `taxa_diária = (1+CDI·%CDI)^(1/252) − 1`. IR regressivo sobre o rendimento: até 180 dias 22,5%; 181–360 20%; 361–720 17,5%; acima de 720 15% (dias corridos). Converter meses/anos em dias úteis com 21 por mês e 252 por ano.
- **RN-CAL-04** [O] **Reserva de emergência**: modelo de trabalho (Servidor público, CLT, Autônomo/MEI/empreendedor), salário, custo fixo mensal, quanto guarda por mês. Saídas: meses ideais, valor e tempo para atingir.
  - [I] Meses: Servidor 3, CLT 6, Autônomo 12. Reserva = custo fixo × meses. Tempo = ceil(reserva ÷ poupança mensal).
