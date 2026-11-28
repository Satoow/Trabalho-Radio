# Rádio Fourier na Fiat Toro

Simulador de duas estações de rádio para demonstrar modulação, seleção por frequência e recuperação de áudio. A Rádio UEMA (AM) transmite *Ode à Alegria* em 8 kHz e a Rádio Horizonte (FM) transmite *Frei Jacques* em 16 kHz.

## Executar

Com Python instalado, abra um terminal na raiz do projeto e execute:

```sh
python -m http.server 8732 --bind 127.0.0.1 --directory prototipo
```

Abra [o simulador local](http://127.0.0.1:8732/). Também é possível abrir `prototipo/index.html` diretamente em um navegador moderno. Nesse modo a aplicação recria as músicas a partir das partituras locais.

## Demonstrar

1. Clique na central multimídia da Toro e abra **Rádio**.
2. Escolha **FM** ou **AM**, confira a música e aperte **Ouvir estação**.
3. Abra **Visualizar Fourier**. Em **Filtro**, compare o espectro recebido com a saída ao trocar de estação. Em **Áudio**, pause para explicar um pico da música recuperada. Arraste o cursor para ler um ponto e consulte o cálculo logo abaixo do gráfico.

O [roteiro do grupo](docs/Roteiro_para_o_grupo.md) sugere falas e uma demonstração de quatro minutos. A [proposta inicial](docs/Projeto_Radio_Virtual_Fourier.md) descreve o modelo matemático.

## Organização

- `prototipo/` contém a interface, o processamento de sinais e os gráficos.
- `prototipo/assets/` contém as músicas, as capas, a imagem da cabine e o mapa usados na aplicação.
- `docs/` contém o material da apresentação e do projeto.
