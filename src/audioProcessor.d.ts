// audioProcessor.d.ts
export declare class AudioProcessor extends EventTarget {
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
  
    /**
     * @param timeInterval Update interval (ms)
     * @param freqStart Start frequency (Hz)
     * @param freqEnd End frequency (Hz)
     * @param alternating Toggle alternating mode
     */
    constructor(timeInterval?: number, freqStart?: number, freqEnd?: number, alternating?: boolean);
  
    start(): Promise<void>;
    stop(): void;
    setIntervalTime(ms: number): void;
    setAlternating(flag: boolean): void;
    resetMeasurements(): void;
  }
  