// audioProcessor.js
export class AudioProcessor extends EventTarget {
  /**
   * @param {number} timeInterval Update interval (ms)
   * @param {number} freqStart Start frequency (Hz)
   * @param {number} freqEnd End frequency (Hz)
   * @param {boolean} alternating Toggle alternating mode
   */
  constructor(timeInterval = 2000, freqStart = 250, freqEnd = 4000, alternating = false) {
    super();
    this.timeInterval = timeInterval;
    this.freqStart = freqStart;
    this.freqEnd = freqEnd;
    this.freqRange = freqEnd - freqStart;
    this.centerFrequency = (freqStart + freqEnd) / 2;
    this.Q = this.centerFrequency / this.freqRange;

    this.noiseMode = true; // start in noise mode
    this.alternating = alternating; // alternating flag

    this.sumPSignal = 0;
    this.sumPNoise = 0;
    this.signalFrames = 0;
    this.noiseFrames = 0;

    this.rmsSignal = 0;
    this.rmsNoise = 0;
    this.snr = 0;

    this.audioContext = null;
    this.mediaStream = null;
    this.analyser = null;
    this.bandPassFilter = null;
    this.dataArray = null;
    this.fftSize = 16384;

    this.updateTimerId = null;
    this.rafId = null;
  }

  // Start audio processing
  async start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return Promise.reject(new Error("Microphone not supported"));
    }
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.bandPassFilter = this.audioContext.createBiquadFilter();
      this.bandPassFilter.type = "bandpass";
      this.bandPassFilter.frequency.value = this.centerFrequency;
      this.bandPassFilter.Q.value = this.Q;
      source.connect(this.bandPassFilter);

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.bandPassFilter.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);

      this._processAudio(); // start loop
      this._startUpdateTimer(); // start timer

      return Promise.resolve();
    } catch (err) {
      return Promise.reject(err);
    }
  }

  // Stop audio processing
  stop() {
    if (this.updateTimerId) {
      clearInterval(this.updateTimerId);
      this.updateTimerId = null;
    }
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }

  // Set update interval
  setIntervalTime(ms) {
    this.timeInterval = ms;
    if (this.updateTimerId) {
      clearInterval(this.updateTimerId);
      this._startUpdateTimer();
    }
  }

  // Toggle alternating mode
  setAlternating(flag) {
    this.alternating = flag;
  }

  // Reset cumulative measurements
  resetMeasurements() {
    this.sumPSignal = 0;
    this.sumPNoise = 0;
    this.rmsNoise = 0;
    this.rmsSignal = 0;
    this.signalFrames = 0;
    this.noiseFrames = 0;
  }

  // Audio processing loop (using requestAnimationFrame)
  _processAudio() {
    if (!this.analyser || !this.dataArray) return;
    this.analyser.getByteFrequencyData(this.dataArray);

    let sumSquares = 0;
    for (let i = this.freqStart; i < this.freqEnd && i < this.dataArray.length; i++) {
      sumSquares += this.dataArray[i] ** 2;
    }
    const rms = Math.sqrt(sumSquares / this.freqRange);

    if (this.noiseMode) {
      if (rms > 0) {
        this.rmsNoise = rms;
      }
      this.sumPNoise += (rms * rms);
      this.noiseFrames++;
    } else {
      if (rms > 0) {
        this.rmsSignal = rms;
      }
      this.sumPSignal += (rms * rms);
      this.signalFrames++;
    }

    this.rafId = requestAnimationFrame(() => this._processAudio());
  }

  // Timer for SNR updates
  _startUpdateTimer() {
    this.updateTimerId = setInterval(() => {
      if (!this.noiseMode) {
        const avgSignal = this.signalFrames ? (this.sumPSignal / this.signalFrames) : 0;
        const avgNoise = this.noiseFrames ? (this.sumPNoise / this.noiseFrames) : 0;
        this.snr = avgNoise > 0 ? (10 * Math.log10(avgSignal / avgNoise)) : 0;
      } else {
        this.snr = 0;
      }

      const detail = {
        rmsSignal: this.rmsSignal,
        rmsNoise: this.rmsNoise,
        snr: this.snr,
        noiseMode: this.noiseMode,
        timestamp: Date.now()
      };

      this.dispatchEvent(new CustomEvent("update", { detail }));

      if (!this.noiseMode) {
        this.sumPSignal = 0;
        this.signalFrames = 0;
        this.rmsSignal = 0;
        this.rmsNoise = 0;
      }

      if (this.alternating) {
        this.noiseMode = !this.noiseMode;
        if (!this.noiseMode) {
          this.sumPSignal = 0;
          this.signalFrames = 0;
          this.rmsSignal = 0;
          this.rmsNoise = 0;
        }
      } else {
        if (this.noiseMode) {
          this.noiseMode = false;
        }
      }
    }, this.timeInterval);
  }
}
