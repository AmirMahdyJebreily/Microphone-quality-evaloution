// main.js
import { AudioProcessor } from "./audioProcessor.js";

// مقدار دهی اولیه به پردازشگر صوتی با زمان آپدیت دلخواه (مثلاً 2000 میلی‌ثانیه)
const processor = new AudioProcessor(2000);

// المان‌های DOM
const toggleRecordButton = document.querySelector('#toggleRecord');
const toggleResetButton = document.querySelector('#btnReset');
const toggleResetNoiseButton = document.querySelector('#btnResetNoise');
const rmsLabel = document.querySelector('#statusRMS');
const snrLabel = document.querySelector('#statusSNR');

let recording = false;
const RECORD = 'Record';
const STOP = 'Stop';

// رویداد شروع/متوقف کردن ضبط
toggleRecordButton.addEventListener("click", async () => {
  recording = !recording;
  if (recording) {
    toggleRecordButton.innerHTML = STOP;
    try {
      await processor.start();
      console.log("Audio processing started");
    } catch (err) {
      console.error("Error starting processor:", err);
      rmsLabel.innerHTML = `خطا: ${err.message}`;
    }
  } else {
    toggleRecordButton.innerHTML = RECORD;
    // در حالت توقف، می‌توانید مقادیر را ریست و یا پیغام مناسب نمایش دهید.
    rmsLabel.innerHTML = "برای شروع ضبط، دکمه Record را بزنید.";
    snrLabel.innerHTML = "...";
    processor.stop();
  }
});


// دکمه ریست برای حالت کلی
toggleResetButton.addEventListener("click", () => {
  // ریست وضعیت‌های نمایش داده شده
  rmsLabel.innerHTML = "برای شروع ضبط، دکمه Record را بزنید.";
  snrLabel.innerHTML = "...";
  recording = false;
  processor.stop();
});

// دکمه ریست نویز: به ماژول اطلاع می‌دهیم که در دوره بعد نویز اندازه‌گیری شود
toggleResetNoiseButton.addEventListener("click", () => {
  // اگر بخواهید بین حالت‌های نویز و سیگنال تغییر دهید:
  processor.setNoiseMode(true);
  console.log("حالت اندازه‌گیری نویز فعال شد.");
});

// دریافت رویداد آپدیت از ماژول و بروزرسانی DOM
processor.addEventListener("update", (event) => {
  const { rmsSignal, rmsNoise, snr, noiseMode, timestamp } = event.detail;
  if (noiseMode) {
    rmsLabel.innerHTML = `در حال اندازه‌گیری نویز...<br/>RMS Noise: ${rmsNoise}`;
    snrLabel.innerHTML = `SNR: --`;
  } else {
    rmsLabel.innerHTML = `RMS Signal: ${rmsSignal}`;
    snrLabel.innerHTML = `SNR: ${snr} dB`;
  }
  //processor.setNoiseMode(false);
  console.log("Update at", new Date(timestamp).toLocaleTimeString(), event.detail);
});
