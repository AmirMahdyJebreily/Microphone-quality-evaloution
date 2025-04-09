// audioProcessor.ts
export class AudioProcessor extends EventTarget {
    timeInterval: number;
    freqStart: number;
    freqEnd: number;
    freqRange: number;
    centerFrequency: number;
    Q: number;
    noiseMode: boolean;
    alternating: boolean;
    sumPSignal: number;
    sumPNoise: number;
    signalFrames: number;
    noiseFrames: number;
    rmsSignal: number;
    rmsNoise: number;
    snr: number;
    audioContext: AudioContext | null;
    mediaStream: MediaStream | null;
    analyser: AnalyserNode | null;
    bandPassFilter: BiquadFilterNode | null;
    dataArray: Uint8Array | null;
    fftSize: number;
    updateTimerId: number | null;
    rafId: number | null;

    constructor(timeInterval = 2000, freqStart = 250, freqEnd = 4000, alternating = false) {
        super();
        this.timeInterval = timeInterval;
        this.freqStart = freqStart;
        this.freqEnd = freqEnd;
        this.freqRange = freqEnd - freqStart;
        this.centerFrequency = (freqStart + freqEnd) / 2;
        this.Q = this.centerFrequency / this.freqRange;

        this.noiseMode = true; // initial noise measurement
        this.alternating = alternating; // alternating mode flag

        this.sumPSignal = 0;
        this.sumPNoise = 0;
        this.signalFrames = 0;
        this.noiseFrames = 0;

        this.rmsSignal = 1;
        this.rmsNoise = 1;
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

    async start(): Promise<void> {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            return Promise.reject(new Error("Microphone not supported"));
        }
        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.audioContext = new (window.AudioContext)();

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

            this._processAudio(); // start audio processing loop
            this._startUpdateTimer(); // start update timer

            return Promise.resolve();
        } catch (err) {
            return Promise.reject(err);
        }
    }

    stop(): void {
        if (this.updateTimerId !== null) {
            clearInterval(this.updateTimerId);
            this.updateTimerId = null;
        }
        if (this.rafId !== null) {
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

    setIntervalTime(ms: number): void {
        this.timeInterval = ms;
        if (this.updateTimerId !== null) {
            clearInterval(this.updateTimerId);
            this._startUpdateTimer();
        }
    }

    setAlternating(flag: boolean): void {
        this.alternating = flag;
    }

    resetMeasurements(): void {
        this.sumPSignal = 0;
        this.sumPNoise = 0;
        this.signalFrames = 0;
        this.noiseFrames = 0;
    }

    private _processAudio(): void {
        if (!this.analyser || !this.dataArray) return;
        this.analyser.getByteFrequencyData(this.dataArray);

        let sumSquares = 0;
        for (let i = this.freqStart; i < this.freqEnd && i < this.dataArray.length; i++) {
            sumSquares += this.dataArray[i] ** 2;
        }
        const rms = Math.sqrt(sumSquares / this.freqRange);

        if (this.noiseMode) {
            if (rms > 0) {
                this.rmsNoise *= rms ** (1 / this.freqRange);
            }
            this.sumPNoise += (rms * rms);
            this.noiseFrames++;
        } else {
            if (rms > 0) {
                this.rmsSignal *= rms ** (1 / this.freqRange);
            }
            this.sumPSignal += (rms * rms);
            this.signalFrames++;
        }

        this.rafId = requestAnimationFrame(() => this._processAudio());
    }

    private _startUpdateTimer(): void {
        this.updateTimerId = window.setInterval(() => {
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
                this.rmsSignal = 1
                this.rmsNoise = 1
            }

            if (this.alternating) {
                this.noiseMode = !this.noiseMode;
                if (!this.noiseMode) {
                    this.sumPSignal = 0;
                    this.signalFrames = 0;
                    this.rmsSignal = 1
                    this.rmsNoise = 1
                }
            } else {
                if (this.noiseMode) {
                    this.noiseMode = false;
                }
            }
        }, this.timeInterval);
    }
}