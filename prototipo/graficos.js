// O painel usa o mesmo bloco transmitido e a mesma recepção que o player.
const lab = $('#lab');
const stationColors = ['#bae6fd', '#ffc69f'];
let stage = 0;
let animation = 0, lastDraw = -Infinity;

function plotSignal(canvas, samples, isSpectrum, durationMs, index, highlightBand = false) {
  const {fs, carriers, bandwidth} = RadioDSP;
  const {width, height} = canvas.getBoundingClientRect();
  if (!width || !height) return;
  const density = window.devicePixelRatio || 1;
  const w=Math.round(width*density), h=Math.round(height*density);
  if (canvas.width!==w || canvas.height!==h) { canvas.width=w; canvas.height=h; }
  const pen = canvas.getContext('2d');
  pen.setTransform(canvas.width / width,0,0,canvas.height / height,0,0);
  pen.clearRect(0,0,width,height);
  const left = 40, right = width - 19, top = 21, bottom = height - 27;
  const x = fraction => left + fraction * (right - left);
  const y = fraction => bottom - fraction * (bottom - top);
  pen.font = '12px "Segoe UI", sans-serif';
  function label(value, px, py, align = 'center', color = '#bfcbd0') {
    pen.fillStyle = color;
    pen.textAlign = align;
    pen.fillText(value, px, py);
  }
  if (highlightBand) {
    const fc = carriers[station], nyquist = fs / 2;
    pen.fillStyle = stationColors[station] + '17';
    pen.fillRect(x((fc-bandwidth)/nyquist), top, 2*bandwidth/nyquist*(right-left), bottom-top);
  }
  const musical = isSpectrum && stage===3;
  const maxHz = musical ? bandwidth : fs/2;
  const yTicks = isSpectrum ? [-72, -36, 0] : [-1, 0, 1];
  yTicks.forEach((tick, i) => {
    const py = y(i/2);
    pen.fillStyle = '#3a484f';
    pen.fillRect(left, py, right-left, 1);
    label(String(tick), left-7, py+3, 'right');
  });
  // O eixo de tempo é relativo ao início da janela exibida.
  const divisions = isSpectrum ? 6 : 4;
  for (let i = 0; i <= divisions; i++) {
    const fraction = i / divisions;
    const value = isSpectrum ? fraction * maxHz / 1000 : fraction * durationMs;
    pen.fillStyle = '#253238';
    pen.fillRect(x(fraction), top, 1, bottom-top);
    label(value.toLocaleString('pt-BR'), x(fraction), bottom+18);
  }
  if (isSpectrum) {
    if (musical) {
      const hz=RadioDSP.peakHz(samples);
      if (hz!==null) {
        pen.fillStyle='#e3e6df66';
        pen.fillRect(x(hz/maxHz),top,1,bottom-top);
        label(Math.round(hz)+' Hz',Math.max(left+20,x(hz/maxHz)),13,'center',stationColors[station]);
      }
    }
    for (let id = 0; !musical && id < carriers.length; id++) {
      if (!highlightBand || id === station) {
        label(names[id].replace('Rádio ', ''), x(carriers[id]/(fs/2)), 13, 'center', stationColors[id]);
      }
    }
    const columns=musical ? Math.ceil(bandwidth*RadioDSP.frameSize/fs) : samples.length;
    const barWidth=Math.max(1,(right-left)/columns);
    samples.forEach((magnitude, i) => {
      if (i>=columns) return;
      const level = Math.max(0, 1 + 20 * Math.log10(magnitude) / 72);
      const hz = (i+.5) / samples.length * fs / 2;
      const id = carriers.findIndex(fc => Math.abs(fc-hz) <= bandwidth);
      pen.fillStyle = musical ? stationColors[station] : stationColors[id] || '#aeb9bc';
      pen.fillRect(x(i/columns), y(level), barWidth, bottom-y(level));
    });
  } else {
    const start = index, count = Math.round(durationMs*fs/1000);
    pen.strokeStyle = stage === 0 ? '#d5e5e7' : stationColors[station];
    pen.lineWidth = 1.7;
    pen.beginPath();
    for (let i = 0; i <= count; i++) {
      const px = x(i/count), py = y((samples[(start+i)%samples.length]+1)/2);
      if (i === 0) pen.moveTo(px,py);
      else pen.lineTo(px,py);
    }
    pen.stroke();
  }
}

function renderAnalysis() {
  if (!lab.open || !mix) return;
  const fc = RadioDSP.carriers[station] / 1000, half = RadioDSP.bandwidth / 1000;
  const band = (fc-half) + '–' + (fc+half) + ' kHz';
  const titles = ['Duas transmissões no mesmo sinal', 'Onde estão as duas estações?', 'O que o filtro deixa passar?', 'Da transmissão à melodia'];
  const notes = [
    'Duas músicas compartilham o mesmo sinal. Durante a reprodução, esta janela acompanha dois milissegundos da mistura.',
    'A FFT representa a mistura em frequências. Os picos azuis se agrupam em torno de 8 kHz e os laranjas, de 16 kHz. Aqui vemos a metade positiva do espectro.',
    'A faixa sombreada é a passagem do filtro de ' + names[station] + ' (' + band + '). Compare os dois gráficos na mesma escala e troque a sintonia.',
    'A IFFT reconstrói a transmissão selecionada. A demodulação e o passa-baixas de 3 kHz recuperam a música de ' + names[station] + '. Ouça a estação e compare este trecho com o da outra melodia.'
  ];
  $('#stageName').textContent = titles[stage];
  $('#stageNote').textContent = notes[stage];
  $('#stageCount').textContent = (stage+1) + ' de 4';
  $('#prevStage').disabled = stage === 0;
  $('#nextStage').disabled = stage === 3;
  $('#comparison').hidden = stage < 2;
  document.querySelectorAll('[data-step]').forEach(button => {
    if (Number(button.dataset.step) === stage) button.setAttribute('aria-current','step');
    else button.removeAttribute('aria-current');
  });
  const spectral = stage === 1 || stage === 2;
  const label = spectral ? 'Magnitude (dBFS) × frequência (kHz)' : 'Amplitude × tempo na janela (ms)';
  $('#plotLabel').textContent = (stage === 2 ? 'Entrada · ' : '') + label;
  $('#afterLabel').textContent = stage===3 ? 'Espectro do áudio recuperado · magnitude (dBFS) × frequência (kHz)' : 'Saída do filtro · ' + label;
  renderFrame();
}

function renderFrame() {
  if (!mix || document.hidden || app!=='radio') return;
  const t=position(), index=Math.floor(t*RadioDSP.fs);
  if (!lab.open) { drawSpectrum(index); return; }
  const channel=mix.stations[station];
  const audioSpectrum=RadioDSP.analyze(channel.audio,index);
  const pitch=RadioDSP.peakHz(audioSpectrum);
  $('#pitch').textContent=pitch===null?'—':Math.round(pitch)+' Hz';
  const tenths=Math.floor(t*10);
  $('#elapsed').textContent=Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0')+','+tenths%10;
  const spectral=stage===1 || stage===2;
  const data=spectral?RadioDSP.analyze(mix.samples,index):stage===0?mix.samples:channel.audio;
  plotSignal($('#labPlot'),data,spectral,stage===0?2:12,index,stage===2);
  if (stage===3) plotSignal($('#afterPlot'),audioSpectrum,true,0,index);
  if (stage===2) plotSignal($('#afterPlot'),RadioDSP.analyze(channel.filtered,index),true,0,index,true);
}

function animateFrame(time) {
  animation=0;
  if (document.hidden || !audioSource || app!=='radio') return;
  if (time-lastDraw>=64) { renderFrame(); lastDraw=time; }
  animation=requestAnimationFrame(animateFrame);
}
function syncDisplay() {
  cancelAnimationFrame(animation);
  animation=0;
  renderFrame();
  if (audioSource && !document.hidden && app==='radio') animation=requestAnimationFrame(animateFrame);
}
document.addEventListener('radiochange',syncDisplay);
document.addEventListener('visibilitychange',syncDisplay);

function setStage(next) {
  stage = next;
  renderAnalysis();
}
$('#openLab').onclick = () => { lab.showModal(); setStage(0); };
$('#closeLab').onclick = () => lab.close();
lab.addEventListener('close', () => { $('#openLab').focus(); syncDisplay(); });
$('#labPlay').onclick = () => $('#play').click();
$('#prevStage').onclick = () => setStage(stage-1);
$('#nextStage').onclick = () => setStage(stage+1);
document.querySelectorAll('[data-step]').forEach(button => {
  button.onclick = () => setStage(Number(button.dataset.step));
});
new ResizeObserver(renderAnalysis).observe($('#labPlot'));
