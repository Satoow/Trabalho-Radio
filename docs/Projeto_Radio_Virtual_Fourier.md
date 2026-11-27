# Projeto: rádio virtual com Transformada de Fourier

## Instrução para o novo chat

Quero desenvolver uma aplicação acadêmica para apresentar ao professor de Transformada de Fourier. Use este documento como contexto inicial do projeto e me ajude a implementar, entender e apresentar cada etapa.

A ideia escolhida é um rádio virtual com duas estações simuladas. Quero um projeto visual, interativo e possível de reproduzir, com a Transformada de Fourier participando efetivamente do processamento. Preciso entender o código e conseguir explicar o funcionamento ao professor.

Ainda não existe código implementado. Este arquivo contém a proposta e um caminho técnico inicial. MATLAB foi sugerido porque já o utilizei em Cálculo Numérico, mas a plataforma ainda não foi confirmada. Primeiro, confirme se tenho acesso ao MATLAB; caso não tenha, proponha uma alternativa simples. Não presuma disponibilidade de toolboxes pagas.

## 1. Objetivo

Simular duas estações que transmitem mensagens em faixas de frequência diferentes. Somar as transmissões, selecionar uma estação por filtragem no domínio da frequência e recuperar seu áudio.

A demonstração deve tornar visíveis três ideias:

1. Um sinal pode conter várias transmissões simultâneas.
2. A Transformada de Fourier permite representar esse sinal em termos de frequências.
3. Podemos selecionar uma faixa nessa representação e recuperar a mensagem correspondente.

Não será necessário transmitir ondas por antena, acessar rádios pela internet ou comprar equipamentos. As transmissões serão calculadas no computador.

## 2. Exemplo da demonstração

Usar dois áudios curtos, preferencialmente gravados por mim:

- Estação 1: “Você está ouvindo a Rádio UEMA.”
- Estação 2: “Esta é uma aplicação da Transformada de Fourier.”

Cada áudio deve durar aproximadamente cinco segundos. Podem ser usadas frases diferentes para facilitar a comparação auditiva. Caso as gravações ainda não estejam disponíveis, iniciar a validação com sinais sintéticos e manter a importação de áudio como parte da versão final.

Ao clicar na Estação 1 ou na Estação 2, o aplicativo deve destacar a faixa correspondente, apresentar o resultado da filtragem e permitir ouvir a mensagem recuperada.

## 3. Como o processamento funciona

### 3.1 Preparação dos áudios

Converter os áudios para mono, ajustar ambos à mesma taxa de amostragem, retirar a média se necessário, limitar a banda e igualar o comprimento por preenchimento com zeros ou corte. Controlar amplitudes para evitar saturação na reprodução.

As mensagens originais serão chamadas de m1[n] e m2[n].

### 3.2 Modulação

Usar inicialmente modulação em amplitude com duas bandas laterais e portadora suprimida, chamada DSB-SC. Ela tem uma expressão simples e facilita uma demonstração com demodulação coerente.

Para t = n/Fs:

    s1[n] = m1[n] · cos(2π fc1 n/Fs)
    s2[n] = m2[n] · cos(2π fc2 n/Fs)

Essa multiplicação desloca cópias do espectro de cada mensagem para regiões em torno das respectivas portadoras. Cada estação ocupa uma faixa, e não apenas uma frequência isolada.

O sinal recebido simulado será:

    s[n] = s1[n] + s2[n]

É essencial modular antes de somar: duas vozes comuns podem ter frequências sobrepostas, e uma simples seleção de faixa não permite separá-las de forma geral.

### 3.3 Transformada de Fourier

Calcular a Transformada Discreta de Fourier usando a FFT:

    S[k] = FFT(s[n])

A FFT é um algoritmo para calcular a DFT. Na apresentação, relacionar esse cálculo à Transformada de Fourier estudada na disciplina, deixando clara a diferença entre o modelo contínuo e o processamento de amostras no computador.

O gráfico de magnitude do espectro permite localizar as faixas das duas estações. Manter os coeficientes complexos completos para o processamento; usar o módulo apenas para visualização.

### 3.4 Seleção da estação no domínio da frequência

Criar uma máscara H[k] que preserve as bandas da estação escolhida e suprima as demais:

    S_selecionado[k] = S[k] · H[k]

Para sinais reais, preservar as bandas correspondentes em frequências positivas e negativas, mantendo a simetria conjugada.

A seleção deve depender dos limites da faixa de frequência da estação. Não substituir esse processo por um botão que simplesmente reproduza o arquivo original.

### 3.5 Transformada inversa

Reconstruir a transmissão selecionada no domínio do tempo:

    s_selecionado[n] = IFFT(S_selecionado[k])

Essa etapa recupera o sinal modulado da estação selecionada. Ainda é necessário demodular para obter a mensagem de áudio.

### 3.6 Demodulação e reprodução

Como a simulação conhece a frequência e a fase da portadora, usar demodulação coerente:

    v[n] = 2 · s_selecionado[n] · cos(2π fc n/Fs)

Aplicar um filtro passa-baixas para manter a mensagem e remover o termo deslocado para frequências mais altas. O resultado será a estimativa do áudio original, limitada pela banda e pelos filtros utilizados.

Para manter a implementação acessível, o passa-baixas também pode ser feito por FFT, máscara simétrica e IFFT. Tratar efeitos de borda e explicar que uma máscara abrupta é uma aproximação didática que pode gerar oscilações no tempo.

## 4. Parâmetros iniciais sugeridos

Estes números são uma proposta de implementação, não uma exigência do professor:

| Parâmetro | Proposta inicial |
| --- | --- |
| Número de estações | 2 |
| Duração de cada mensagem | Aproximadamente 5 segundos |
| Taxa de amostragem Fs | 48.000 amostras por segundo |
| Banda das mensagens | Até aproximadamente 3.000 Hz |
| Portadora da Estação 1 | 8.000 Hz |
| Portadora da Estação 2 | 16.000 Hz |

Nesse exemplo, as bandas positivas das estações ficam aproximadamente em 5–11 kHz e 13–19 kHz. Há separação entre as estações e o limite superior fica abaixo da frequência de Nyquist, Fs/2 = 24 kHz. Reservar margem para as transições dos filtros.

Ao alterar esses valores, verificar novamente sobreposição, taxa de amostragem e aliasing. Não usar frequências reais de radiodifusão: os valores são adequados a uma simulação digital didática.

## 5. Interface mínima

A primeira versão deve ter:

- Identificação das duas mensagens carregadas.
- Botões “Estação 1” e “Estação 2”.
- Botão “Ouvir mensagem recuperada”.
- Botão “Parar áudio”.
- Gráfico do sinal recebido no tempo, com uma janela curta para ser legível.
- Gráfico do espectro recebido, com as duas estações identificadas.
- Gráfico do espectro após a seleção, destacando a faixa preservada.
- Frequência da estação selecionada e explicação curta da etapa atual.

Se houver espaço, mostrar também a mensagem original e a recuperada no tempo. Priorizar funcionamento correto e gráficos legíveis antes de aprimorar o visual.

## 6. Papel exato de cada operação

| Operação | Função no projeto |
| --- | --- |
| Modulação | Colocar as mensagens em faixas distintas. |
| FFT | Calcular a representação do sinal em frequência. |
| Máscara de filtragem | Selecionar as frequências da estação desejada. |
| IFFT | Reconstruir o sinal filtrado no tempo. |
| Demodulação e passa-baixas | Recuperar a mensagem de áudio. |

A Transformada de Fourier não identifica automaticamente quem está falando. A separação funciona porque projetamos as estações para ocupar faixas distintas.

Também não afirmar que todo rádio físico precisa calcular uma FFT: este projeto escolhe a filtragem no domínio da frequência para demonstrar Fourier de forma explícita.

## 7. Por que esta aplicação foi escolhida

- Tem uma finalidade concreta: selecionar uma transmissão dentro de uma mistura.
- Produz uma demonstração visual e auditiva.
- Relaciona domínio do tempo, domínio da frequência, filtragem e reconstrução.
- Permite usar mensagens próprias e apresentar sem depender da internet.
- Tem escopo controlável com duas estações e áudios pré-gravados.

A dificuldade é intermediária porque também exige explicar modulação e demodulação. Esses conceitos devem ser introduzidos apenas no nível necessário; o foco da apresentação deve continuar na Transformada de Fourier.

## 8. Etapas de desenvolvimento

1. Confirmar a plataforma e as dependências disponíveis.
2. Montar uma versão sem interface com duas mensagens sintéticas conhecidas.
3. Validar modulação, soma, FFT, seleção, IFFT e demodulação.
4. Integrar dois áudios curtos e verificar a recuperação de ambos.
5. Criar os gráficos didáticos e a interface mínima.
6. Preparar instruções de execução e uma demonstração reproduzível.
7. Preparar minha fala e respostas para possíveis perguntas do professor.

Explicar cada etapa com linguagem simples, apresentar a fórmula antes da implementação correspondente e esclarecer o significado das variáveis. Entregar código completo e instruções suficientes para executar.

## 9. Critérios para considerar a versão pronta

- As duas mensagens realmente compõem o mesmo sinal recebido.
- A troca de estação altera a máscara aplicada ao espectro desse sinal.
- O áudio reproduzido vem da cadeia de recuperação, e não diretamente do arquivo original.
- Os gráficos mostram as bandas previstas e a redução da estação rejeitada.
- Frequências positivas e negativas são tratadas corretamente.
- A mensagem recuperada é reconhecível, sem saturação relevante.
- Uma validação com mensagens sintéticas de frequências conhecidas confirma a seleção e a recuperação.
- O aplicativo funciona com os arquivos incluídos e tem instruções de execução.

## 10. Roteiro curto para apresentar

1. Apresentar as duas mensagens e o objetivo de selecionar uma delas.
2. Explicar que a modulação coloca cada mensagem em uma faixa diferente.
3. Mostrar o sinal somado no tempo.
4. Mostrar sua FFT e localizar as estações no espectro.
5. Selecionar uma estação e mostrar quais frequências foram preservadas.
6. Explicar a transformada inversa e a demodulação.
7. Reproduzir a mensagem recuperada e repetir com a outra estação.

Fala central:

> Neste projeto, usamos a Transformada de Fourier para representar uma mistura de transmissões no domínio da frequência. Aplicamos um filtro para selecionar a faixa da estação desejada. Depois, voltamos ao domínio do tempo e demodulamos o sinal para recuperar a mensagem.

## 11. Referências técnicas iniciais

- FFT e Transformada Discreta de Fourier: https://www.mathworks.com/help/matlab/ref/fft.html
- Transformadas de Fourier no MATLAB: https://www.mathworks.com/help/matlab/math/fourier-transforms.html
- Modulação em aplicações de comunicação: https://www.mathworks.com/help/signal/ug/communications-applications.html
- Demodulação AM: https://www.mathworks.com/help/comm/ref/amdemod.html

As referências ajudam a fundamentar os conceitos. A implementação deve verificar disponibilidade e licenciamento antes de depender de funções específicas.

## 12. Primeiro pedido ao assistente do novo chat

Leia este documento inteiro e comece a me ajudar a construir o projeto. Confirme a plataforma disponível, proponha a estrutura mínima de arquivos e avance para a primeira versão funcional do processamento. Preserve a FFT, a filtragem no domínio da frequência e a IFFT como partes reais do aplicativo. Quero aprender o suficiente para explicar o projeto ao professor, além de ter a aplicação funcionando.
