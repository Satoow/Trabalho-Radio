importScripts('sinal.js','musicas.js','programacao.js');
self.onmessage = async event => {
  const result=await prepararProgramacao(event.data);
  const buffers=[result.samples.buffer];
  for (const station of result.stations) buffers.push(station.filtered.buffer,station.audio.buffer);
  self.postMessage(result,buffers);
};
