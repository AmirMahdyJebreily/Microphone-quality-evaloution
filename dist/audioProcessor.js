"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioProcessor = void 0;
// audioProcessor.ts
class AudioProcessor extends EventTarget {
    constructor(timeInterval = 2000, freqStart = 250, freqEnd = 4000, alternating = false) {
        super();
        Object.defineProperty(this, "timeInterval", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "freqStart", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "freqEnd", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "freqRange", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "centerFrequency", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "Q", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "noiseMode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "alternating", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "sumPSignal", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "sumPNoise", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "signalFrames", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "noiseFrames", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "rmsSignal", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "rmsNoise", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "snr", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "audioContext", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "mediaStream", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "analyser", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "bandPassFilter", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "dataArray", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "fftSize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "updateTimerId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "rafId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
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
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                return Promise.reject(new Error("Microphone not supported"));
            }
            try {
                this.mediaStream = yield navigator.mediaDevices.getUserMedia({ audio: true });
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
            }
            catch (err) {
                return Promise.reject(err);
            }
        });
    }
    stop() {
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
    setIntervalTime(ms) {
        this.timeInterval = ms;
        if (this.updateTimerId !== null) {
            clearInterval(this.updateTimerId);
            this._startUpdateTimer();
        }
    }
    setAlternating(flag) {
        this.alternating = flag;
    }
    resetMeasurements() {
        this.sumPSignal = 0;
        this.sumPNoise = 0;
        this.rmsSignal = 0;
        this.rmsNoise = 0;
        this.signalFrames = 0;
        this.noiseFrames = 0;
    }
    _processAudio() {
        if (!this.analyser || !this.dataArray)
            return;
        this.analyser.getByteFrequencyData(this.dataArray);
        let sumSquares = 0;
        for (let i = this.freqStart; i < this.freqEnd && i < this.dataArray.length; i++) {
            sumSquares += Math.pow(this.dataArray[i], 2);
        }
        const rms = Math.sqrt(sumSquares / this.freqRange);
        if (this.noiseMode) {
            if (rms > 0) {
                this.rmsNoise = rms;
            }
            this.sumPNoise += (rms * rms);
            this.noiseFrames++;
        }
        else {
            if (rms > 0) {
                this.rmsSignal = rms;
            }
            this.sumPSignal += (rms * rms);
            this.signalFrames++;
        }
        this.rafId = requestAnimationFrame(() => this._processAudio());
    }
    _startUpdateTimer() {
        this.updateTimerId = window.setInterval(() => {
            if (!this.noiseMode) {
                const avgSignal = this.signalFrames ? (this.sumPSignal / this.signalFrames) : 0;
                const avgNoise = this.noiseFrames ? (this.sumPNoise / this.noiseFrames) : 0;
                this.snr = avgNoise > 0 ? (10 * Math.log10(avgSignal / avgNoise)) : 0;
            }
            else {
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
            }
            else {
                if (this.noiseMode) {
                    this.noiseMode = false;
                }
            }
        }, this.timeInterval);
    }
}
exports.AudioProcessor = AudioProcessor;
//# sourceMappingURL=audioProcessor.js.map