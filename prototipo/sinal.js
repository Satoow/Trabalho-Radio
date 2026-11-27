// Rádio DSB-SC: as duas estações compartilham o mesmo bloco de amostras.
const RadioDSP = (() => {
  const fs = 48000, size = 262144, carriers = [8000, 16000], bandwidth = 3000;
  const tau = 2 * Math.PI;
  function fft(real, imag, inverse = false) {
    const n = real.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        [real[i], real[j]] = [real[j], real[i]];
        [imag[i], imag[j]] = [imag[j], imag[i]];
      }
    }
    for (let span = 2; span <= n; span *= 2) {
      const angle = (inverse ? tau : -tau) / span;
      const c = Math.cos(angle), s = Math.sin(angle);
      for (let start = 0; start < n; start += span) {
        let wr = 1, wi = 0;
        for (let k = start; k < start + span / 2; k++) {
          const j = k + span / 2;
          const r = wr * real[j] - wi * imag[j], v = wr * imag[j] + wi * real[j];
          real[j] = real[k] - r; imag[j] = imag[k] - v;
          real[k] += r; imag[k] += v;
          const next = wr * c - wi * s;
          wi = wr * s + wi * c; wr = next;
        }
      }
    }
    if (inverse) for (let i = 0; i < n; i++) { real[i] /= n; imag[i] /= n; }
  }
  const frequency = k => Math.min(k, size - k) * fs / size;
  function lowpass(samples) {
    const imag = new Float64Array(size);
    fft(samples, imag);
    for (let k = 0; k < size; k++) if (frequency(k) > bandwidth) samples[k] = imag[k] = 0;
    fft(samples, imag, true);
  }
  function transmit(a, b) {
    const real = new Float64Array(size), imag = new Float64Array(size);
    for (let i = 0; i < size; i++) real[i] = a[i]*Math.cos(tau*carriers[0]*i/fs) + b[i]*Math.cos(tau*carriers[1]*i/fs);
    const samples = real.slice();
    fft(real, imag);
    return {real, imag, samples};
  }
  function selectBand(mix, id) {
    const fc = carriers[id], real = mix.real.slice(), imag = mix.imag.slice();
    for (let k = 0; k < size; k++) if (Math.abs(frequency(k)-fc) > bandwidth) real[k] = imag[k] = 0;
    return {real, imag};
  }
  function demodulate({real, imag}, id, radioSamples) {
    const fc = carriers[id];
    fft(real, imag, true);
    if (radioSamples) radioSamples.set(real);
    for (let i = 0; i < size; i++) real[i] *= 2*Math.cos(tau*fc*i/fs);
    lowpass(real);
    return Float32Array.from(real);
  }
  function receive(mix, id) {
    return demodulate(selectBand(mix, id), id);
  }
  // FFT local com janela de Hann, calibrada para uma senoide de amplitude 1.
  const frameSize = 2048;
  const window = Float64Array.from({length:frameSize}, (_,i) => .5-.5*Math.cos(tau*i/frameSize));
  function analyze(samples, sampleIndex) {
    const real = new Float64Array(frameSize), imag = new Float64Array(frameSize);
    for (let i=0; i<frameSize; i++) {
      const index = (sampleIndex+i-frameSize/2+samples.length)%samples.length;
      real[i] = samples[index]*window[i];
    }
    fft(real,imag);
    const magnitude = new Float64Array(frameSize/2);
    for (let k=0; k<magnitude.length; k++) magnitude[k] = Math.hypot(real[k],imag[k])*4/frameSize;
    magnitude[0] /= 2;
    return magnitude;
  }
  function peakHz(magnitudes) {
    let peak=1;
    for (let k=2; k<=Math.floor(bandwidth*frameSize/fs); k++)
      if (magnitudes[k]>magnitudes[peak]) peak=k;
    if (magnitudes[peak]<.0005) return null;
    const a=Math.log(magnitudes[peak-1]+1e-12), b=Math.log(magnitudes[peak]+1e-12), c=Math.log(magnitudes[peak+1]+1e-12);
    const shift=(a-c)/(2*(a-2*b+c));
    return (peak+(Number.isFinite(shift)?Math.max(-.5,Math.min(.5,shift)):0))*fs/frameSize;
  }
  // Um pico por intervalo na metade positiva do espectro.
  function spectrumPeaks({real, imag}, low, high, columns) {
    const peaks = new Float64Array(columns);
    for (let k = Math.ceil(low * size / fs); k * fs / size < high; k++) {
      const column = Math.floor((k * fs / size - low) * columns / (high - low));
      peaks[column] = Math.max(peaks[column], Math.hypot(real[k], imag[k]));
    }
    return peaks;
  }
  return {fs, size, carriers, bandwidth, lowpass, analyze, peakHz, frameSize, transmit, receive, selectBand, demodulate, spectrumPeaks};
})();
if (typeof module !== 'undefined') module.exports = RadioDSP;
