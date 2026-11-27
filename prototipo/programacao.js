// Processa as partituras em frases com ataque e soltura nas extremidades.
// O receptor preserva o sinal modulado filtrado para a comparação no laboratório.
async function prepararProgramacao(recordings) {
  const {size,fs} = RadioDSP;
  const length = size*RadioMusic.parts;
  const samples = new Float32Array(length);
  const stations = [0,1].map(()=>({filtered:new Float32Array(length),audio:new Float32Array(length)}));
  for (let part=0; part<RadioMusic.parts; part++) {
    const messages = stations.map((_,id)=>{
      const phrase = recordings ? Float64Array.from(recordings[id].subarray(part*size,(part+1)*size)) :
        RadioMusic.phrase(id,part,size,fs);
      RadioDSP.lowpass(phrase);
      return phrase;
    });
    const mix = RadioDSP.transmit(...messages);
    const from=part*size;
    samples.set(mix.samples,from);
    stations.forEach((station,id)=>{
      const selected = RadioDSP.selectBand(mix,id);
      const filtered = station.filtered.subarray(from,from+size);
      station.audio.set(RadioDSP.demodulate(selected,id,filtered),from);
    });
    await new Promise(resolve=>setTimeout(resolve,0));
  }
  return {samples,stations};
}
