// main.js
import { AudioProcessor } from "./audioProcessor.js";

// مقداردهی اولیه پردازشگر صوتی با زمان آپدیت دلخواه (مثلاً 2000 میلی‌ثانیه)
// در اینجا alternating می‌تواند true یا false باشد؛ true یعنی هر سیکل حالت تغییر می‌کند.
const processor = new AudioProcessor(2000, 250, 4000, false);

const toggleRecordButton = document.querySelector('#toggleRecord');
const toggleResetButton = document.querySelector('#btnReset');
const toggleResetNoiseButton = document.querySelector('#btnResetNoise');
const statusRMS = document.querySelector('#statusRMS');
const statusSNR = document.querySelector('#statusSNR');

let recording = false;
const RECORD = 'Record';
const STOP = 'Stop';

// Start/Stop recording
toggleRecordButton.addEventListener("click", async () => {
  recording = !recording;
  if (recording) {
    toggleRecordButton.innerHTML = STOP;
    try {
      await processor.start();
      console.log("Start processing...");
    } catch (err) {
      console.error("An error in start processing: ", err);
      statusRMS.innerHTML = `Error: ${err.message}`;
    }
  } else {
    toggleRecordButton.innerHTML = RECORD;
    statusRMS.innerHTML = "روی دکمه Record کلیک کنید و منتظر بمانید تا نویز اندازه‌گیری شود.";
    statusSNR.innerHTML = "...";
    processor.stop();
  }
});

// دکمه ریست کلی (برای ریست مقادیر تجمعی نویز و سیگنال)
// توجه داشته باشید که این عمل باعث پاک شدن avgPNoise نیز می‌شود.
toggleResetButton.addEventListener("click", () => {
  processor.resetMeasurements();
  recording = false;
  processor.stop();
  toggleRecordButton.innerHTML = RECORD;
  statusRMS.innerHTML = "روی دکمه Record کلیک کنید و منتظر بمانید.";
  statusSNR.innerHTML = "...";
});

// دکمه ریست حالت نویز؛ در این حالت تنها تجمع نویز و سیگنال ریست می‌شود بدون توقف پردازش
toggleResetNoiseButton.addEventListener("click", () => {
  processor.resetMeasurements();
  console.log("تنظیمات نویز و سیگنال ریست شدند (avgNoise حفظ نمی‌شود).");
});

// دریافت رویداد آپدیت از ماژول و به‌روز کردن DOM
processor.addEventListener("update", (event) => {
  const { rmsSignal, rmsNoise, snr, noiseMode, timestamp } = event.detail;
  if (noiseMode) {
    // در حالت نویز، فقط مقدار نویز نمایش داده می‌شود؛ SNR = --
    statusRMS.innerHTML = `در حال اندازه‌گیری نویز<br/>RMS Noise: ${rmsNoise}`;
    statusSNR.innerHTML = `SNR: --`;
  } else {
    statusRMS.innerHTML = `RMS Signal: ${rmsSignal}`;
    statusSNR.innerHTML = `SNR: ${snr} dB`;
  }
  console.log("بروزرسانی در", new Date(timestamp).toLocaleTimeString(), event.detail);
});
