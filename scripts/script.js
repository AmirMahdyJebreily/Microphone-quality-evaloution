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
const statusQuality = document.querySelector('#quality');
const statusAdvice = document.querySelector('#adviece');

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
    statusRMS.innerHTML = "Click on Record button and wait for processing noise...";
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
  statusRMS.innerHTML = "Click on Record button and wait...";
  statusSNR.innerHTML = "...";
});

// دکمه ریست حالت نویز؛ در این حالت تنها تجمع نویز و سیگنال ریست می‌شود بدون توقف پردازش
toggleResetNoiseButton.addEventListener("click", () => {
  processor.resetMeasurements();
  console.log("Noise and signals are resets...");
});



// دریافت رویداد آپدیت از ماژول و به‌روز کردن DOM
processor.addEventListener("update", (event) => {
  const { rmsSignal, rmsNoise, snr, noiseMode, timestamp } = event.detail;
  const {message,micQuality} = generateAudioAdvice(snr, rmsSignal);
  
  if (noiseMode) {
    // در حالت نویز، فقط مقدار نویز نمایش داده می‌شود؛ SNR = --
    statusRMS.innerHTML = `Messuring noise<br/>RMS Noise: ${rmsNoise}`;
    statusSNR.innerHTML = `SNR: --`;
  } else {
    statusRMS.innerHTML = `RMS Signal: ${rmsSignal}`;
    statusSNR.innerHTML = `SNR: ${snr} dB`;
    statusAdvice.innerHTML = message;
    statusQuality.innerHTML = `${micQuality}/5`
  }
  console.log("بروزرسانی در", new Date(timestamp).toLocaleTimeString(), event.detail);
});


function generateAudioAdvice(snr, rms) {
  let advice = "";
  let micQuality = 0;

  // Evaluate recording quality based on SNR
  if (snr >= 18) {
    advice += "Audio is excellent, ";
    micQuality = 5;
  } else if (snr >= 15) {
    advice += "Audio is good, ";
    micQuality = 4;
  } else if (snr >= 10) {
    advice += "Audio is acceptable, ";
    micQuality = 3;
  } else if (snr >= 5) {
    advice += "Audio is not ideal. Record in a quieter environment, ";
    micQuality = 2;
  } else {
    advice += "Audio is poor; your speech may not be processed correctly, ";
    micQuality = 1;
  }

  // Check the recorded audio level (RMS)
  console.log("RMS: ", rms);
  
  if (rms > 120) {
    advice += "Sound is too loud and may cause noise.";
    if (micQuality > 1) micQuality--;
  } else if (rms < 6) {
    advice += "Adjust the microphone distance.";
    if (micQuality > 1) micQuality--;
  } else {
    advice += "Mic distance seems appropriate.";
  }

  return { message: advice.trim(), micQuality: micQuality };
}
