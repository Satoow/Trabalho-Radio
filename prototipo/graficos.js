// O painel usa o mesmo bloco transmitido e a mesma recepção que o player.
const lab = $('#lab');
const stationColors = ['#bae6fd', '#ffc69f'];
let stage = 0;
let comparing = false, revealed = false;
let animation = 0, lastDraw = -Infinity;
const probe = $('#probePosition');
const numberBR = (value,digits=2) => value.toLocaleString('pt-BR',{maximumFractionDigits:digits});
const plotLeft=40, plotRight=19;

function plotSignal(canvas, samples, isSpectrum, durationMs, index, highlightBand = false, channelId = station) {
  const {fs, carriers, bandwidth} = RadioDSP;
  const {width, height} = canvas.getBoundingClientRect();
  if (!width || !height) return;
  const density = window.devicePixelRatio || 1;
  const w=Math.round(width*density), h=Math.round(height*density);
  if (canvas.width!==w || canvas.height!==h) { canvas.width=w; canvas.height=h; }
  const pen = canvas.getContext('2d');
  pen.setTransform(canvas.width / width,0,0,canvas.height / height,0,0);
  pen.clearRect(0,0,width,height);
  const left = plotLeft, right = width - plotRight, top = 26, bottom = height - 27;
  const x = fraction => left + fraction * (right - left);
  const y = fraction => bottom - fraction * (bottom - top);
  pen.font = '12px "Segoe UI", sans-serif';
  function label(value, px, py, align = 'center', color = '#bfcbd0') {
    pen.fillStyle = color;
    pen.textAlign = align;
    pen.fillText(value, px, py);
  }
  if (highlightBand) {
    const fc = carriers[channelId], nyquist = fs / 2;
    pen.fillStyle = stationColors[channelId] + '22';
    const half=RadioDSP.halfBands[channelId];
    pen.fillRect(x((fc-half)/nyquist), top, 2*half/nyquist*(right-left), bottom-top);
  }
  const musical = isSpectrum && stage===3;
  const maxHz = musical ? bandwidth : fs/2;
  const yTicks = isSpectrum ? [-72, -48, -24, 0] : [-1, 0, 1];
  yTicks.forEach((tick, i) => {
    const py = y(i/(yTicks.length-1));
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
      if (!highlightBand || id === channelId) {
        label(modes[id]+' · '+names[id].replace('Rádio ', ''), x(carriers[id]/(fs/2)), 13, 'center', stationColors[id]);
      }
    }
    const columns=musical ? Math.floor(bandwidth*RadioDSP.frameSize/fs)+1 : samples.length;
    const paint = (first,end,color) => {
      const path = new Path2D();
      for (let i=first; i<end; i++) {
        const level=Math.max(0,Math.min(1,1+20*Math.log10(samples[i])/72));
        const px=x(i*fs/RadioDSP.frameSize/maxHz);
        if (i===first) path.moveTo(px,y(level)); else path.lineTo(px,y(level));
      }
      pen.strokeStyle=color; pen.lineWidth=1.65; pen.stroke(path);
      path.lineTo(x((end-1)*fs/RadioDSP.frameSize/maxHz),bottom);
      path.lineTo(x(first*fs/RadioDSP.frameSize/maxHz),bottom); path.closePath();
      const fade=pen.createLinearGradient(0,top,0,bottom);
      fade.addColorStop(0,color+'ad'); fade.addColorStop(1,color+'15');
      pen.fillStyle=fade; pen.fill(path);
    };
    if (musical) paint(0,columns,stationColors[station]);
    else {
      const split=Math.round(11500*RadioDSP.frameSize/fs);
      paint(0,split+1,stationColors[0]); paint(split,columns,stationColors[1]);
    }
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
  const fraction=Number(probe.value)/Number(probe.max);
  const bin=Math.min(samples.length-1,Math.round(fraction*maxHz*RadioDSP.frameSize/fs));
  const sampleOffset=Math.round(fraction*durationMs*fs/1000);
  const dt=sampleOffset*1000/fs;
  const sample=samples[(index+Math.round(dt*fs/1000))%samples.length];
  const db=isSpectrum ? 20*Math.log10(samples[bin]) : 0;
  const level=isSpectrum ? Math.max(0,Math.min(1,1+db/72)) : (sample+1)/2;
  const px=isSpectrum ? x(bin*fs/RadioDSP.frameSize/maxHz) : x(dt/durationMs);
  pen.strokeStyle='#f2ead3a0';pen.setLineDash([3,4]);pen.beginPath();
  pen.moveTo(px,top);pen.lineTo(px,bottom);pen.stroke();pen.setLineDash([]);
  pen.fillStyle='#fff2cb';pen.beginPath();pen.arc(px,y(level),3.2,0,2*Math.PI);pen.fill();
  const readout=canvas.parentElement.querySelector('.point-reading');
  readout.textContent=isSpectrum
    ? numberBR(bin*fs/RadioDSP.frameSize,0)+' Hz · '+(db < -72 ? '< −72' : numberBR(db,1))+' dBFS'
    : numberBR(dt)+' ms · amplitude '+numberBR(sample,3);
  if (isSpectrum || stage===0) {
    const spacing=fs/RadioDSP.frameSize;
    $('#cursorMath').textContent=isSpectrum
      ? 'No cursor · índice '+bin+' × '+numberBR(spacing,4)+' Hz = '+numberBR(bin*spacing,4)+' Hz'
      : 'No cursor · '+sampleOffset+' intervalos ÷ '+numberBR(fs)+' amostras/s = '+numberBR(dt,4)+' ms';
  }
}

function renderAnalysis() {
  if (!lab.open || !mix) return;
  const fc = RadioDSP.carriers[station] / 1000, half = RadioDSP.halfBands[station] / 1000;
  const band = (fc-half) + '–' + (fc+half) + ' kHz';
  const titles = ['Duas transmissões no mesmo sinal', 'Onde estão as duas estações?', 'O que o filtro deixa passar?', 'Da transmissão à melodia'];
  const notes = [
    'Duas músicas compartilham o mesmo sinal. Durante a reprodução, esta janela acompanha dois milissegundos da mistura.',
    'A FFT representa a mistura em frequências. Os picos azuis se agrupam em torno de 8 kHz e os laranjas, de 16 kHz. Aqui vemos a metade positiva do espectro.',
    'A área sombreada marca a faixa da '+names[station]+' ('+band+'). Pause e mova o cursor para comparar a mesma frequência na entrada e na saída.',
    'A IFFT reconstrói a transmissão. '+(station===0 ? 'Na AM, o receptor multiplica pela portadora sincronizada.' : 'Na FM, o receptor mede a variação da fase a cada amostra.')+' O passa-baixas conserva o áudio até 3 kHz.'
  ];
  $('#frequencyNote').textContent=station===0
    ? 'Na AM, a portadora didática fica em 8 kHz enquanto as notas da música mudam.'
    : 'Na FM, a frequência instantânea varia em torno da portadora didática de 16 kHz conforme a música.';
  $('#compareNow').textContent=comparing ? 'Encerrar comparação' : 'Comparar AM e FM neste instante';
  $('#revealOutputs').hidden=!comparing || revealed;
  $('#fmComparison').hidden=!comparing || !revealed;
  $('#labPlay').disabled=comparing || $('#play').disabled;
  document.querySelectorAll('.lab-controls [data-id]').forEach(button=>button.disabled=comparing);
  $('#stageName').textContent = comparing ? 'Uma entrada, duas sintonias' : titles[stage];
  $('#stageNote').textContent = comparing ? (revealed ? 'Compare a mesma frequência nas três curvas. As escalas e o instante são iguais.' : 'O instante está congelado. Em qual saída você espera encontrar o pico perto de 16 kHz?') : notes[stage];
  $('#stageCount').textContent = (stage+1) + ' de 4';
  $('#prevStage').disabled = stage === 0;
  $('#nextStage').disabled = stage === 3;
  $('#comparison').hidden = stage < 2 || (comparing && !revealed);
  document.querySelectorAll('[data-step]').forEach(button => {
    if (Number(button.dataset.step) === stage) button.setAttribute('aria-current','step');
    else button.removeAttribute('aria-current');
  });
  const spectral = stage === 1 || stage === 2;
  const label = spectral ? 'Magnitude (dBFS) × frequência (kHz)' : 'Amplitude × tempo na janela (ms)';
  $('#plotLabel').textContent = (stage === 2 ? 'Entrada · ' : '') + label;
  $('#afterLabel').textContent = stage===3 ? 'Espectro do áudio recuperado · magnitude (dBFS) × frequência (kHz)' : 'Saída do filtro · ' + label;
  if (comparing) $('#afterLabel').textContent='Saída AM · '+label;
  const calculations=[
    ['Duração da janela no tempo','96 amostras ÷ 48.000 amostras/s = 0,002 s = 2 ms',
      'O gráfico cobre 96 intervalos entre amostras. A altura em cada instante é a soma da transmissão AM com a FM.'],
    ['Resolução da FFT do gráfico','48.000 Hz ÷ 2.048 = 23,4375 Hz por intervalo',
      'A FFT usa uma janela de Hann de 2.048 amostras. Ela abrange 2.048 ÷ 48.000 = 42,67 ms. O ponto k do espectro representa k × 23,4375 Hz.'],
    ['Limites da máscara '+modes[station],fc+' − '+half+' = '+(fc-half)+' kHz     |     '+fc+' + '+half+' = '+(fc+half)+' kHz',
      'O filtro do receptor conserva os coeficientes entre esses limites e a faixa espelhada nas frequências negativas. Os gráficos mostram o espectro de uma janela curta antes e depois dessa seleção.'],
    station===0 ? ['Recuperação da AM com portadora suprimida','2 · m(t) · cos²(2π f꜀ t) = m(t) + m(t) · cos(4π f꜀ t)',
      'Ao multiplicar pela portadora de 8 kHz, surge uma cópia na banda original e outra centrada em 16 kHz. O passa-baixas de 3 kHz preserva a primeira.'] :
      ['Recuperação da FM por diferença de fase','m[n] ≈ (fᵢ[n] − 16.000 Hz) ÷ 600 Hz',
      'A frequência instantânea vem do avanço de fase: fᵢ = Δφ × 48.000 ÷ (2π). Exemplo: 16.120 Hz correspondem a (16.120 − 16.000) ÷ 600 = 0,20 de amplitude antes do passa-baixas.']
  ];
  const [title,formula,explain]=comparing ? ['Faixas dos dois receptores','AM · 8 ± 3 = 5 a 11 kHz     |     FM · 16 ± 4 = 12 a 20 kHz',
    'Cada filtro conserva uma faixa da mesma mistura. As duas saídas ainda são transmissões moduladas.'] : calculations[stage];
  $('#calcTitle').textContent=title; $('#calcFormula').textContent=formula; $('#calcExplain').textContent=explain;
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
  plotSignal($('#labPlot'),data,spectral,stage===0?2:12,index,stage===2 && !comparing);
  if (stage===3) plotSignal($('#afterPlot'),audioSpectrum,true,0,index);
  if (comparing && revealed) {
    plotSignal($('#afterPlot'),RadioDSP.analyze(mix.stations[0].filtered,index),true,0,index,true,0);
    plotSignal($('#fmPlot'),RadioDSP.analyze(mix.stations[1].filtered,index),true,0,index,true,1);
  }
  if (stage===2 && !comparing) plotSignal($('#afterPlot'),RadioDSP.analyze(channel.filtered,index),true,0,index,true);
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
  comparing=false; revealed=false;
  stage = next;
  renderAnalysis();
}
$('#compareNow').onclick=()=>{
  if (comparing) { setStage(2); return; }
  if (audioSource) $('#play').click();
  // Invalida também uma solicitação de reprodução que ainda aguarda o áudio.
  ++ticket;
  $('#play').disabled=false;
  comparing=true; revealed=false; stage=2;
  probe.value=Math.round(Number(probe.max)*RadioDSP.carriers[1]/(RadioDSP.fs/2));
  renderAnalysis();
};
$('#revealOutputs').onclick=()=>{ revealed=true; renderAnalysis(); $('#compareNow').focus(); };
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
probe.oninput=renderFrame;
for (const chart of [$('#labPlot'),$('#afterPlot'),$('#fmPlot')]) {
  function inspect(event) {
    const rect=chart.getBoundingClientRect();
    const fraction=(event.clientX-rect.left-plotLeft)/(rect.width-plotLeft-plotRight);
    probe.value=Math.round(Number(probe.max)*Math.max(0,Math.min(1,fraction)));
    renderFrame();
  }
  chart.onpointerdown=event=>{ chart.setPointerCapture(event.pointerId); inspect(event); };
  chart.onpointermove=event=>{ if(chart.hasPointerCapture(event.pointerId)) inspect(event); };
}
