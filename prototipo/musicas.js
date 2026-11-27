// Partituras dos dois temas. Cada frase ocupa oito tempos musicais.
// Os números são notas MIDI e os pares indicam [nota, duração em tempos].
const RadioMusic = (() => {
  const ode = [
    [64,64,65,67,67,65,64,62], [60,60,62,64,[64,1.5],[62,.5],[62,2]],
    [64,64,65,67,67,65,64,62], [60,60,62,64,[62,1.5],[60,.5],[60,2]],
    [62,62,64,60,62,[64,.5],[65,.5],64,60],
    [62,[64,.5],[65,.5],64,62,60,62,[55,2]],
    [64,64,65,67,67,65,64,62], [60,60,62,64,[62,1.5],[60,.5],[60,2]]
  ];
  const jacques = [
    [67,69,71,67,67,69,71,67], [71,72,[74,2],71,72,[74,2]],
    [[74,.5],[76,.5],[74,.5],[72,.5],71,67,[74,.5],[76,.5],[74,.5],[72,.5],71,67],
    [67,62,[67,2],67,62,[67,2]]
  ];
  const tracks = [
    {title:'Ode à Alegria', credit:'L. van Beethoven', instrument:'Piano', cover:'assets/ode.jpg', file:'assets/ode.wav'},
    {title:'Frei Jacques', credit:'Tema tradicional francês', instrument:'Cordas dedilhadas', cover:'assets/frei.jpg', file:'assets/frei.wav'}
  ];
  function phrase(id, part, size, fs) {
    const out = new Float64Array(size), beat = size / 8;
    function voice(note, startBeat, duration, gain, plucked) {
      const start = Math.round(startBeat*beat), length = Math.min(size-start, Math.round(duration*beat));
      const pitch = 440 * 2 ** ((note-69)/12), step = 2*Math.PI*pitch/fs;
      for (let i=0; i<length; i++) {
        const t=i/fs, phase=i*step;
        const envelope=Math.min(1,t/.009,(length-i)/(.045*fs))*Math.exp(-t*(plucked?3.6:1.65));
        const overtone=plucked ? .32*Math.sin(2*phase)+.17*Math.sin(3*phase)+.08*Math.sin(5*phase)
                              : .24*Math.sin(2*phase)+.085*Math.sin(3*phase)+.04*Math.sin(4*phase);
        out[start+i]+=gain*envelope*(Math.sin(phase)+Math.exp(-2*t)*overtone);
      }
    }
    const score = id ? jacques[part%4] : ode[part];
    let beatIndex=0;
    for (const item of score) {
      const [note,beats]=Array.isArray(item)?item:[item,1];
      voice(note,beatIndex,beats*.97,.47,id===1);
      if (id && part>=4) voice(note-12,beatIndex,beats*.94,.12,true);
      beatIndex+=beats;
    }
    const roots = id ? [[43,43],[43,50],[50,43],[43,43]][part%4] :
      [[48,43],[48,43],[48,43],[48,48],[43,48],[43,43],[48,43],[43,48]][part];
    roots.forEach((root,half) => {
      const start=half*4;
      voice(root,start,1.9,.17,id===1);
      voice(root+7,start+1,.88,.10,true);
      voice(root+12,start+2,1.6,.13,id===1);
      voice(root+7,start+3,.85,.085,true);
    });
    return out;
  }
  return {tracks, phrase, parts:8};
})();
if (typeof module !== 'undefined') module.exports = RadioMusic;
