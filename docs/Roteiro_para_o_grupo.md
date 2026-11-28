# Rádio Fourier na Fiat Toro

## Mensagem para o grupo

Pessoal, nosso projeto simula duas estações de rádio transmitindo ao mesmo tempo. Na central da Toro, a gente escolhe qual delas quer ouvir. As duas músicas entram juntas no mesmo sinal, cada uma em uma faixa de frequência. Usamos Fourier para enxergar essas faixas e filtrar a que interessa. Depois reconstruímos o sinal no tempo e recuperamos a melodia. Na apresentação, dá para ouvir a troca de estação e ver qual faixa foi selecionada.

## Roteiro de demonstração • cerca de 4 minutos

| Parte | O que fazer | O que explicar |
| --- | --- | --- |
| 1. O problema • 40 s | Na cabine, clicar na multimídia e abrir **Rádio**. Escolher **AM · Rádio UEMA** para ver a faixa e o botão de reprodução. | “Como um receptor consegue escolher uma estação quando recebe as duas ao mesmo tempo?” A UEMA transmite **Ode à Alegria**, em arranjo de piano. A Horizonte transmite **Frei Jacques**, em cordas dedilhadas. Os dois arranjos instrumentais acompanham o simulador em WAV. |
| 2. A transmissão • 50 s | Abrir **Visualizar Fourier**. Apertar **Ouvir estação**, mostrar **1 · Mistura** e avançar para **2 · FFT**. Apontar os dois grupos de picos. | Na AM, a melodia multiplica uma portadora de 8 kHz. Na FM, a melodia varia a frequência instantânea de uma portadora próxima de 16 kHz. Somamos as duas transmissões para formar uma única entrada para o receptor. |
| 3. A sintonia • 1 min | Abrir **3 · Filtro**, selecionar **UEMA** e comparar os gráficos de cima e de baixo. Pausar o áudio para discutir o mesmo instante nos dois gráficos. | A FFT calcula a transformada discreta de Fourier das amostras do sinal somado. Na tela, a altura da curva representa a magnitude. Para sintonizar, o código preserva os coeficientes complexos da faixa escolhida e zera os demais. |
| 4. A recuperação • 1 min | Retomar o áudio e clicar em **Horizonte**. Mostrar a faixa **12–20 kHz**, abrir **4 · Áudio** e apontar a forma de onda recuperada. | A IFFT traz a transmissão selecionada de volta ao tempo. Ela ainda está modulada. Na FM, medimos quanto a fase avança entre amostras para recuperar a melodia. Na AM, multiplicamos pela portadora sincronizada. Nos dois casos, um passa-baixas conserva o áudio até 3 kHz. O que ouvimos é a melodia recuperada. |
| 5. Conclusão • 30 s | Pausar, voltar a **3 · Filtro** e trocar de estação para comparar as saídas. | A mistura de entrada é a mesma nas duas escolhas. Mudam a faixa preservada e o método de demodulação. É isso que faz mudar a melodia. |

Para dividir entre quatro pessoas, cada uma pode assumir uma das quatro primeiras partes. Quem trocar a estação também pode fazer a conclusão.

## Como ler a tela

No gráfico compacto do rádio, o eixo horizontal vai de 4 a 20 kHz. A região colorida marca a faixa que o receptor conserva. A outra estação continua visível em cinza porque o gráfico mostra a **mistura antes do filtro**. A altura das barras mostra a magnitude na janela atual. A FFT de visualização usa 2.048 amostras (cerca de 43 ms a 48 kHz), com janela de Hann. Os espectros usam a mesma escala de −72 a 0 dBFS. Ao pausar, a imagem conserva a posição da música para comparar as estações.
 
Arraste o cursor sobre o gráfico ou use as setas no controle **Cursor de leitura**. O valor ao lado de cada título indica o ponto selecionado. Abaixo do controle, **Cálculo desta etapa** mostra a conta para explicar ao grupo.

Nas etapas **FFT** e **Filtro**, os espectros cobrem de 0 a 24 kHz. Em **3 · Filtro**, o gráfico superior mostra a FFT local da mistura e o inferior, a FFT local do sinal filtrado, antes da demodulação. Pequenos resíduos espectrais podem vir da janela curta de observação. Em **1 · Mistura** e **4 · Áudio**, o eixo horizontal mede milissegundos a partir da posição exibida em **Tempo da faixa**.
 
**O que apontar durante a música.** A sintonia permanece em 8 ou 16 kHz, enquanto o **Pico do áudio** estima a frequência mais forte da música recuperada naquele instante. Na etapa **4 · Áudio**, o gráfico inferior amplia a faixa de 0 a 3 kHz e indica esse pico em hertz. Uma nota, um harmônico ou o acompanhamento pode dominar. No silêncio, o painel mostra um traço. Faça a comparação com o áudio pausado e depois retome para ver os picos mudarem.
 
## Onde Fourier entra no código

O processamento está em `prototipo/sinal.js`. A preparação das faixas está em `prototipo/programacao.js`. Na notação abaixo, `n` é o índice de tempo da amostra, `k` é o índice de frequência e `Fs` vale 48.000 amostras por segundo.

1. **Gerar e modular.** O simulador carrega os dois arranjos instrumentais, aplica `lowpass()` para limitar cada mensagem a 3 kHz e processa as frases musicais em blocos. Em `transmit()`, o sinal recebido é a soma de `m1[n] × cos(2π × 8000 × n/Fs)` e `0,40 × cos(φ[n])`. Na FM, a fase avança a cada amostra segundo `φ[n] − φ[n−1] = 2π × (fc + 600 × m2[n])/Fs`. A mensagem FM é centrada em zero por frase. A portadora nominal é 16 kHz, ajustada ao ponto mais próximo da DFT para evitar estalos na emenda.
2. **Analisar.** Ainda em `transmit()`, `fft(real, imag)` calcula a DFT da soma. As partes real e imaginária guardam a informação de amplitude e fase. Durante a reprodução, a tela calcula outra FFT em janelas curtas da mistura e da transmissão filtrada, sincronizadas pelo relógio de áudio.
3. **Selecionar e reconstruir.** `selectBand()` copia o espectro comum e aplica a máscara da estação. Preserva também as bandas espelhadas nas frequências negativas. Em `demodulate()`, a chamada `fft(real, imag, true)` calcula a inversa.
4. **Recuperar o áudio.** Na AM, `demodulate()` multiplica o resultado por `2 × cos(2π × fc × n/Fs)`, em que `fc` é a frequência escolhida. Isso devolve a mensagem à sua faixa original e também gera uma cópia deslocada. `lowpass()` elimina essa cópia usando FFT, máscara de 3 kHz e IFFT. Na FM, o receptor forma o sinal analítico, mede a diferença de fase entre amostras, calcula a frequência instantânea, subtrai a portadora e divide pelo desvio de 600 Hz por unidade de amplitude. Aplica então o mesmo passa-baixas. O navegador reproduz essas amostras e usa a mesma saída para medir o pico do áudio.

## Duas perguntas que podem aparecer

**Por que dá para separar as estações?** Cada melodia foi limitada a 3 kHz antes da modulação. As janelas de recepção são 5–11 kHz para AM e 12–20 kHz para FM. Há 1 kHz entre elas. A máscara FM é mais larga para acomodar as bandas laterais da modulação. Somar duas vozes diretamente geralmente misturaria componentes nas mesmas frequências.

**Por que escolher 8 e 16 kHz?** São portadoras didáticas que cabem na simulação. Com amostragem de 48 kHz, o limite de Nyquist é 24 kHz. A borda mais alta usada, 20 kHz, fica abaixo desse limite. Toda a transmissão é calculada localmente.

## Experimento de previsão

Em **Visualizar Fourier**, pressione **Comparar AM e FM neste instante**. A reprodução pausa e o cursor começa perto de 16 kHz. Pergunte à turma em qual saída esse pico vai aparecer. Clique em **Revelar as duas saídas** e leia a entrada, a saída AM e a saída FM no mesmo instante e na mesma escala. A máscara FM conserva essa região. A máscara AM a atenua. Mova o cursor para a região de 8 kHz e compare novamente.

Em **2 · FFT**, use as setas do cursor para selecionar um índice. Por exemplo, 14 × (48.000 ÷ 2.048) = 328,125 Hz. A frequência indicada nessa conta é a posição que você escolheu no espectro. O indicador **Pico da música agora** é outra medida: acompanha a componente mais forte do áudio recuperado.
