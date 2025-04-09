// audioProcessor.js
export class AudioProcessor extends EventTarget {
    /**
     * @param {number} timeInterval زمان آپدیت (میلی‌ثانیه)
     * @param {number} freqStart شروع باند فرکانسی (به Hz)
     * @param {number} freqEnd پایان باند فرکانسی (به Hz)
     * @param {boolean} alternating اگر true باشد، در هر سیکل حالت اندازه‌گیری به صورت متناوب تغییر می‌کند
     */
    constructor(timeInterval = 2000, freqStart = 250, freqEnd = 4000, alternating = false) {
      super();
      this.timeInterval = timeInterval;
      this.freqStart = freqStart;
      this.freqEnd = freqEnd;
      this.freqRange = freqEnd - freqStart;
      this.centerFrequency = (freqStart + freqEnd) / 2;
      this.Q = this.centerFrequency / this.freqRange;
  
      // حالت اندازه‌گیری: true یعنی اندازه‌گیری نویز، false یعنی اندازه‌گیری سیگنال
      this.noiseMode = true;
      // اگر alternating فعال باشد، هر سیکل حالت تغییر می‌کند؛ در غیر این صورت بعد از یک سیکل نویز، همیشه سیگنال گرفته می‌شود.
      this.alternating = alternating;
  
      // متغیرهای تجمعی برای محاسبه قدرت
      this.avgPSignal = 0;
      this.avgPNoise = 0;
      this.signalFrames = 0;
      this.noiseFrames = 0;
  
      // آخرین مقادیر محاسبه‌شده
      this.rmsSignal = 0;
      this.rmsNoise = 0;
      this.snr = 0;
  
      // منابع صوتی
      this.audioContext = null;
      this.mediaStream = null;
      this.analyser = null;
      this.bandPassFilter = null;
      this.dataArray = null;
      this.fftSize = 16384;
  
      // شناسه‌های تایمر
      this.updateTimerId = null;
      this.rafId = null;
    }
  
    /**
     * شروع پردازش صوت؛ دسترسی میکروفون، راه‌اندازی کانتکست صوتی، فیلتر باندپاس و آنالایزر
     * همچنین حلقه پردازش و تایمر آپدیت فعال می‌شود.
     * برمی‌گرداند Promise که پس از شروع موفق resolve می‌شود.
     */
    async start() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return Promise.reject(new Error("میکروفون در این مرورگر پشتیبانی نمی‌شود."));
      }
      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        // ایجاد فیلتر باندپاس برای دامنه فرکانسی دلخواه
        this.bandPassFilter = this.audioContext.createBiquadFilter();
        this.bandPassFilter.type = "bandpass";
        this.bandPassFilter.frequency.value = this.centerFrequency;
        this.bandPassFilter.Q.value = this.Q;
        source.connect(this.bandPassFilter);
  
        // راه‌اندازی آنالایزر
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = this.fftSize;
        this.bandPassFilter.connect(this.analyser);
  
        const bufferLength = this.analyser.frequencyBinCount;
        // استفاده از داده‌های 8 بیتی جهت پردازش (برای سادگی)
        this.dataArray = new Uint8Array(bufferLength);
  
        // شروع حلقه پردازش پیوسته با requestAnimationFrame
        this._processAudio();
        // راه‌اندازی تایمر آپدیت با زمان تنظیم‌شده
        this._startUpdateTimer();
  
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    }
  
    /**
     * توقف پردازش صوت؛ متوقف کردن تایمر‌ها، بستن کانتکست صوتی و میکروفون.
     */
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
  
    /**
     * تنظیم زمان آپدیت (میلی‌ثانیه) به دلخواه.
     * @param {number} ms زمان جدید به میلی‌ثانیه.
     */
    setIntervalTime(ms) {
      this.timeInterval = ms;
      if (this.updateTimerId) {
        clearInterval(this.updateTimerId);
        this._startUpdateTimer();
      }
    }
  
    /**
     * تنظیم حالت alternating؛ اگر true حالت اندازه‌گیری در هر سیکل تغییر می‌کند.
     * @param {boolean} flag
     */
    setAlternating(flag) {
      this.alternating = flag;
    }
  
    /**
     * تابع ریست کامل؛ برای پاکسازی مقادیر تجمعی نویز و سیگنال.
     */
    resetMeasurements() {
      this.avgPSignal = 0;
      this.avgPNoise = 0;
      this.signalFrames = 0;
      this.noiseFrames = 0;
    }
  
    /**
     * حلقه پردازش پیوسته (با استفاده از requestAnimationFrame)
     * در هر فریم، داده‌های فرکانسی گرفته شده و RMS محاسبه می‌شود.
     */
    _processAudio() {
      if (!this.analyser || !this.dataArray) return;
      this.analyser.getByteFrequencyData(this.dataArray);
  
      let sumSquares = 0;
      for (let i = this.freqStart; i < this.freqEnd && i < this.dataArray.length; i++) {
        sumSquares += this.dataArray[i] ** 2;
      }
      // محاسبه RMS برای محدوده انتخاب‌شده
      const rms = Math.sqrt(sumSquares / this.freqRange);
  
      if (this.noiseMode) {
        this.rmsNoise = rms;
        // تجمع RMS به صورت توان
        this.avgPNoise += (rms * rms) / this.freqRange;
        this.noiseFrames++;
      } else {
        this.rmsSignal = rms;
        this.avgPSignal += (rms * rms) / this.freqRange;
        this.signalFrames++;
      }
  
      this.rafId = requestAnimationFrame(() => this._processAudio());
    }
  
    /**
     * راه‌اندازی تایمر آپدیت:
     * - در حالت signal: SNR با استفاده از میانگین قدرت سیگنال و نویز محاسبه می‌شود.
     * - در حالت noise: به جای استفاده از تنها آخرین مقدار، RMS میانگین از تجمع داده‌ها محاسبه می‌شود.
     * - سپس رویداد "update" با جزئیات محاسباتی dispatch می‌شود.
     * - اگر alternating فعال باشد، حالت اندازه‌گیری تغییر می‌یابد.
     */
    _startUpdateTimer() {
      this.updateTimerId = setInterval(() => {
        let computedRmsNoise = this.rmsNoise;
        // اگر در حالت نویز هستیم و حداقل یک فریم ثبت شده، میانگین RMS نویز را محاسبه می‌کنیم
        if (this.noiseMode && this.noiseFrames > 0) {
          computedRmsNoise = Math.sqrt(this.avgPNoise / this.noiseFrames);
        }
  
        if (!this.noiseMode) {
          if (avgPSignal > 0) {
            this.snr = 10 * Math.log10(avgPNoise / avgPSignal);
          } else {
            this.snr = 0;
          }
        } else {
          this.snr = 0;
        }
  
        const detail = {
          rmsSignal: this.rmsSignal.toFixed(2),
          // ارسال مقدار میانگین RMS نویز
          rmsNoise: computedRmsNoise.toFixed(2),
          snr: this.snr.toFixed(2),
          noiseMode: this.noiseMode,
          timestamp: Date.now()
        };
  
        this.dispatchEvent(new CustomEvent("update", { detail }));
  
        // در حالت signal مقادیر مربوط به سیگنال ریست می‌شود (تا میانگین جدید محاسبه شود)
        if (!this.noiseMode) {
          this.avgPSignal = 0;
          this.signalFrames = 0;
        }
  
        // تغییر حالت اندازه‌گیری:
        if (this.alternating) {
          this.noiseMode = !this.noiseMode;
          // در هنگام تغییر به signal، مقدار سیگنال ریست می‌شود، ولی مقادیر نویز حفظ می‌شود.
          if (!this.noiseMode) {
            this.avgPSignal = 0;
            this.signalFrames = 0;
          }
        } else {
          // اگر alternating فعال نباشد، یکبار پس از اولین سیکل نویز، حالت به signal تغییر می‌کند.
          if (this.noiseMode) {
            this.noiseMode = false;
            // در این حالت، avgPNoise حفظ می‌شود.
          }
        }
      }, this.timeInterval);
    }
  }
  