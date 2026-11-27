const $ = selector => document.querySelector(selector);
const cabin = $('#cabine'), screenUI = $('#screen'), enter = $('#enter');
const names = ['Rádio UEMA', 'Rádio Horizonte'];
let zoomed = false, station = 0, app = 'home';
let ctx, gain, mix, audioSource, startedAt = 0, offset = 0, ticket = 0;
const recovered = [];
let preparing;
const tracks = RadioMusic.tracks;

function loadBroadcast() {
  if (preparing) return preparing;
  $('#msg').textContent = 'Preparando as duas estações…';
  $('#play').disabled = $('#openLab').disabled = true;
  async function loadRecordings() {
    const decoder=new OfflineAudioContext(1,1,RadioDSP.fs);
    return Promise.all(tracks.map(async track=>{
      const response=await fetch(track.file);
      if (!response.ok) throw Error('Falha ao carregar '+track.title);
      const audio=await decoder.decodeAudioData(await response.arrayBuffer());
      return audio.getChannelData(0).slice();
    }));
  }
  const load = location.protocol === 'file:' ? prepararProgramacao() : loadRecordings().then(recordings=>{
    if (!window.Worker) return prepararProgramacao(recordings);
    return new Promise((resolve,reject)=>{
      const worker = new Worker('preparar-worker.js');
      worker.onmessage = e => { worker.terminate(); resolve(e.data); };
      worker.onerror = e => { worker.terminate(); reject(Error(e.message)); };
      worker.postMessage(recordings,recordings.map(samples=>samples.buffer));
    });
  });
  preparing = load.then(result=>{
    mix=result;
    $('#msg').textContent='Pronto para ouvir';
    $('#openLab').disabled=false;
    drawSpectrum();
  }).catch(()=>{
    preparing=null;
    $('#msg').textContent='Falha ao preparar as músicas. Toque em ouvir para tentar de novo.';
  }).finally(()=>{ $('#play').disabled=false; update(); });
  return preparing;
}
function position() {
  if (!audioSource) return offset;
  return (ctx.currentTime-startedAt) % audioSource.buffer.duration;
}
function drawSpectrum(index=Math.floor(position()*RadioDSP.fs)) {
  if (!mix) return;
  const canvas=$('#spectrum'), pen=canvas.getContext('2d');
  const {width,height}=canvas, {carriers,bandwidth,fs,frameSize}=RadioDSP;
  const fc=carriers[station], low=4000, high=20000;
  const values=RadioDSP.analyze(mix.samples,index);
  const pixel=hz=>(hz-low)*width/(high-low);
  const accent=getComputedStyle($('#radio')).getPropertyValue('--accent').trim();
  pen.clearRect(0,0,width,height);
  pen.fillStyle=accent+'20';
  pen.fillRect(pixel(fc-bandwidth),0,pixel(fc+bandwidth)-pixel(fc-bandwidth),height);
  for (let x=0; x<128; x++) {
    const hz=low+x*(high-low)/128;
    const first=Math.ceil(hz*frameSize/fs), end=Math.ceil((hz+(high-low)/128)*frameSize/fs);
    let peak=0;
    for(let k=first;k<end;k++) peak=Math.max(peak,values[k]);
    const level=Math.max(0,1+20*Math.log10(peak)/72);
    pen.fillStyle=Math.abs(hz-fc)<=bandwidth?accent:'#879397';
    pen.fillRect(x*width/128,height*(1-level),width/128-.8,height*level);
  }
  $('#band').textContent=(fc-bandwidth)/1000+'–'+(fc+bandwidth)/1000+' kHz';
  canvas.setAttribute('aria-label','Espectro da mistura no instante da reprodução, de 4 a 20 kHz.');
}

// Coordenadas do vidro no cenário de 1536 × 1024. Tela, botão e foto
// compartilham a mesma transformação durante a aproximação.
function layout() {
  const {width:w,height:h} = cabin.getBoundingClientRect();
  const base = Math.max(w/1536, h/1024)*1.035;
  const focused = Math.min((w-36)/340,(h-32)/520,1.35);
  const sx = zoomed ? focused : base*151/340;
  const sy = zoomed ? focused : base*213/520;
  const x = zoomed ? -170*sx : (706-768)*base;
  const y = zoomed ? -260*sy : -h/2 + 303*base - Math.max(0,1024*base-h)*.16;
  $('#glass').style.transform = `translate(${x}px,${y}px) scale(${sx},${sy})`;
  $('#cam').style.transform = `translate(${x-706*sx*340/151}px,${y-303*sy*520/213}px) scale(${sx*340/151},${sy*520/213})`;
  Object.assign(enter.style,{transform:`translate(${x}px,${y}px)`,width:`${151*base}px`,height:`${213*base}px`});
}
new ResizeObserver(layout).observe(cabin);
const headMotion = matchMedia('(prefers-reduced-motion: no-preference)');
function look(x=0,y=0) {
  const view = $('#view');
  view.style.setProperty('--head-x', x);
  view.style.setProperty('--head-y', y);
}
cabin.addEventListener('pointermove', e => {
  if (zoomed || !headMotion.matches || e.pointerType !== 'mouse') return;
  const bounds = cabin.getBoundingClientRect();
  look(2*(e.clientX-bounds.left)/bounds.width-1, 2*(e.clientY-bounds.top)/bounds.height-1);
});
cabin.addEventListener('pointerleave', () => look());
headMotion.addEventListener('change', () => look());
function focusApp() {
  (app === 'home' ? $('.grid [data-app="radio"]') : app === 'radio' ? $('#play') : $('#apps')).focus({preventScroll:true});
}
function zoom(on) {
  look();
  zoomed = on;
  cabin.classList.toggle('zoomed', on);
  enter.hidden = on;
  screenUI.inert = !on;
  layout(); update();
  if (on) focusApp(); else enter.focus({preventScroll:true});
}
enter.onclick = () => zoom(true);
$('#exit').onclick = () => zoom(false);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && zoomed && !$('#lab').open) zoom(false); });
function openApp(next) {
  app = next;
  $('#home').hidden = app !== 'home';
  $('#radio').hidden = app !== 'radio';
  $('#extra').hidden = ['home','radio'].includes(app);
  screenUI.classList.toggle('player', app !== 'home');
  document.querySelectorAll('.shortcuts button').forEach(button => {
    if (button.dataset.app === app) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  const body = $('#extraBody');
  body.replaceChildren();
  if (app === 'gps') {
    $('#extraName').textContent = 'Brasil';
    const map = new Image(); map.src = 'assets/brasil.svg'; map.alt='Contorno do Brasil';
    map.style.filter='invert(85%) sepia(35%) saturate(500%) hue-rotate(94deg)';
    body.append(map, 'Mapa demonstrativo · IBGE');
  } else if (app === 'email') {
    $('#extraName').textContent = 'Caixa de entrada'; body.textContent = 'Nenhuma mensagem.';
  } else if (app === 'musica') {
    $('#extraName').textContent = 'Música'; body.textContent = 'Sua biblioteca está vazia.';
  }
  update();
  if (app === 'radio') { loadBroadcast(); drawSpectrum(); }
  focusApp();
}
document.querySelectorAll('[data-app]').forEach(b => b.onclick = () => openApp(b.dataset.app));
$('#apps').onclick = () => openApp('home');
function update() {
  $('#stationName').textContent = names[station];
  const track = tracks[station];
  for(const element of [$('#trackArt'),$('#labArt')]) element.src=track.cover;
  $('#trackName').textContent=$('#labTrack').textContent=track.title;
  $('#trackCredit').textContent=$('#labCredit').textContent=track.credit+' · '+track.instrument;
  $('#carrierReading').textContent=RadioDSP.carriers[station]/1000+' kHz';
  $('#transport').textContent=audioSource?'Ao vivo':'Em pausa';
  $('#lab').classList.toggle('on-air',!!audioSource);
  $('#lab').dataset.station=station;
  $('#freq').textContent = RadioDSP.carriers[station] / 1000;
  $('#radio').dataset.station = station;
  document.querySelectorAll('[data-id]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.id) === station)));
  const action = audioSource ? 'Pausar' : 'Ouvir estação';
  $('#play').setAttribute('aria-label', action);
  $('#play').title = action;
  $('#labPlay').textContent = audioSource ? 'Pausar áudio' : 'Ouvir estação';
  $('#labPlay').disabled = $('#play').disabled;
  $('#play use').setAttribute('href', audioSource ? '#i-pause' : '#i-play');
  $('#now').textContent = audioSource ? 'Tocando agora' : 'Última sintonia';
  $('#nowName').textContent = audioSource ? track.title : names[station];
  $('#location').textContent = !zoomed ? 'Cabine' : ({home:'Multimídia',radio:'Multimídia / Rádio',gps:'GPS',email:'E-mail',musica:'Música'})[app];
  document.dispatchEvent(new Event('radiochange'));
}
function stopAudio() {
  if (audioSource) { audioSource.stop(); audioSource.disconnect(); audioSource = null; }
}
async function play() {
  const request = ++ticket;
  $('#play').disabled = true;
  $('#labPlay').disabled = true;
  try {
    if (!ctx) {
      ctx = new AudioContext();
      gain = ctx.createGain(); gain.connect(ctx.destination);
      gain.gain.value = Number($('#vol').value)/100;
    }
    await ctx.resume();
    $('#msg').textContent = 'Sintonizando…';
    await new Promise(resolve => setTimeout(resolve, 30));
    if (request !== ticket) return;
    if (!mix) await loadBroadcast();
    if (!mix || request !== ticket) return;
    if (!recovered[station]) {
      const signal = mix.stations[station].audio;
      const buffer = ctx.createBuffer(1,signal.length,RadioDSP.fs);
      buffer.copyToChannel(signal,0); recovered[station] = buffer;
    }
    stopAudio();
    audioSource = ctx.createBufferSource(); audioSource.buffer = recovered[station];
    audioSource.loop = true; audioSource.connect(gain);
    startedAt = ctx.currentTime-offset; audioSource.start(0,offset);
    $('#msg').textContent = 'Reproduzindo a música recuperada';
  } catch {
    stopAudio(); $('#msg').textContent = 'Falha ao iniciar o áudio. Toque para tentar novamente.';
  } finally { if (request === ticket) { $('#play').disabled=false; update(); } }
}
$('#play').onclick = () => {
  if (!audioSource) return play();
  offset = (ctx.currentTime-startedAt) % audioSource.buffer.duration;
  stopAudio(); $('#msg').textContent = 'Pausado'; update();
};
document.querySelectorAll('[data-id]').forEach(b => b.onclick = () => {
  const next = Number(b.dataset.id);
  if (station === next) return;
  const resume = !!audioSource || (!!mix && $('#play').disabled);
  offset = position();
  stopAudio(); station = next;
  $('#msg').textContent = 'Pronto para ouvir'; update(); drawSpectrum();
  if ($('#lab').open) renderAnalysis();
  if (resume) play();
});
$('#vol').oninput = e => {
  $('output').textContent=e.target.value+'%';
  if (gain) gain.gain.setTargetAtTime(Number(e.target.value)/100,ctx.currentTime,.015);
};
function clock() { $('#clock').textContent = new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); }
clock(); setInterval(clock,30000); layout(); update();
