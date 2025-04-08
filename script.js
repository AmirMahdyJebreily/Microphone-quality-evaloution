"use strict";

const STOP = 'Stop';
const RECORD = 'Record';

const toggleRecordButton = document.querySelector('#toggleRecord');
const rmsLabel = document.querySelector('#statusRMS');
const snrLabel = document.querySelector('#statusSNR');
const frequencyCanvas = document.getElementById("frequencyCanvas");
const canvasContext = frequencyCanvas.getContext("2d");

let recording = false;
let talking = false;
toggleRecordButton.addEventListener("click", async () => {
  recording = !recording;
  if (recording) {
    toggleRecordButton.innerHTML = STOP;
    await startRecording();
  } else {
    toggleRecordButton.innerHTML = RECORD;
  }
});

const FREQUENCY_START = 250;
const FREQUENCY_END = 4000;
const TIME = 2000;

function generateAudioAdvice(snr, rms) {
  let advice = "";
  let micQuality = 0;

  // بررسی کیفیت ضبط بر اساس نسبت سیگنال به نویز (SNR)
  if (snr >= 18) {
    advice += "کیفیت صدا بسیار عالی است، ";
    micQuality = 5;
  } else if (snr >= 15) {
    advice += "صدا خوب است، اگر میتوانید اندکی نویز محیط را کم کنید. ";
    micQuality = 4;
  } else if (snr >= 10) {
    advice += "صدا بد نیست، ولی بهتر است در محیط آرم تری ضبط کنید ،";
    micQuality = 3;
  } else if (snr >= 7) {
    advice += "کیفیت چندان مناسب نیست. در محیط آرام تری ضبط کنید ،";
    micQuality = 2;
  } else {
    advice += "صدا اصلا خوب نیست، محیط را عوض کنید،";
    micQuality = 1;
  }

  // بررسی سطح صدای ضبط‌شده (RMS)
  // در بسیاری از کاربردهای صوتی، سطح مطلوب صدای ضبط‌شده بین حدود 22 تا 27 دسی‌بل در نظر گرفته می‌شود.
  if (rms > 70) {
    advice += "صدا بیش از حد بلند است ممکن است باعث ایجاد نویز شود..";
    if (micQuality > 1) micQuality--;
  } else if (rms < 6) {
    advice += "صدای شما بسیار کم است. ممکن است با نویز محیط ترکیب شود";
    if (micQuality > 1) micQuality--;
  } else {
    advice += "میکروفون را اندکی تنظیم کنید.";
  }

  return { message: advice.trim(), micQuality: micQuality };
}

let rmsSignal = 0;
let rmsNoise = 0;
let avg_P_signal = 0
let avg_P_noise = 0
let snr = 0

let noise_record = true

const FREQUENCY_RANGE = (FREQUENCY_END - FREQUENCY_START);
const CENTER_FREQUENCY = FREQUENCY_RANGE / 2;
const _Q = CENTER_FREQUENCY / FREQUENCY_RANGE

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const bandPassFilter = audioContext.createBiquadFilter();
    bandPassFilter.type = 'bandpass';
    bandPassFilter.frequency.value = CENTER_FREQUENCY;
    bandPassFilter.Q.value = _Q;
    source.connect(bandPassFilter);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 16384;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    bandPassFilter.connect(analyser);

    setInterval(() => {
      if (recording) {
        if (!noise_record) {
          snr = analyzeSNR(avg_P_signal, avg_P_noise);
        }

        let feedback = generateAudioAdvice(snr, avg_P_signal, avg_P_noise, rmsSignal)     
        snrLabel.innerHTML = `SNR: ${snr.toFixed(2)}<br/>${feedback.message}<br/>${feedback.micQuality}`

        noise_record = false
        avg_P_signal = 0
      }
    }, TIME)

    function checkQuality() {
      analyser.getByteFrequencyData(dataArray);
      let sumSignalSquares = 0;
      let sumNoiseSquares = 0;

      for (let i = FREQUENCY_START; i < FREQUENCY_END; i++) {
        if (!noise_record) {
          sumSignalSquares += dataArray[i] ** 2      
        } else {
          sumNoiseSquares += dataArray[i] ** 2
        }
      }

      rmsSignal = Math.sqrt(sumSignalSquares / FREQUENCY_RANGE);
      rmsNoise = Math.sqrt(sumNoiseSquares / FREQUENCY_RANGE);

      if (!noise_record) {
        avg_P_signal += (rmsSignal * rmsSignal) / FREQUENCY_RANGE;
      } else {
        avg_P_noise += (rmsNoise * rmsNoise) / FREQUENCY_RANGE;
      }

      console.log(`Ps: ${avg_P_signal.toFixed(2)} - Pn: ${avg_P_noise.toFixed(2)} - ${(talking) ? 'talking' : 'no talk'}`);

      if (rmsSignal < 20) {
        rmsLabel.innerHTML = (!noise_record) ? "برای پردازش صدای خودتان صحبت کنید" : "در حال پردازش نویز محیط، صحبت نکنید"
        talking = false
      } else if (rmsSignal > 70) {
        rmsLabel.innerHTML = "ممکن است صدا بیش از حد بلند باشد.";
      } else {
        rmsLabel.innerHTML = "درحل صحبت هستید";
        talking = true
      }
      //plot(dataArray, bufferLength)

      if (recording)
        requestAnimationFrame(checkQuality)
    }


    checkQuality();

  } catch (error) {
    rmsLabel.innerHTML = "خطا در دسترسی به میکروفون:" + error;
  }
}

function plot(dataArray, bufferLength) {
  // Preparing canvas
  canvasContext.fillStyle = "black";
  canvasContext.fillRect(0, 0, frequencyCanvas.width, frequencyCanvas.height);
  const barWidth = (frequencyCanvas.width / bufferLength) * 2.5;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    if (recording) {
      const barHeight = dataArray[i] / frequencyCanvas.height;
      canvasContext.fillStyle = `rgb(${barHeight + 100}, ${barHeight + 100}, ${barHeight + 100})`;
      canvasContext.fillRect(x, frequencyCanvas.height - barHeight, barWidth, barHeight);
      x += barWidth;
    }
  }
}

function analyseSquares(freq, s, freqRange,) {


  return { sumSignalSquares, sumNoiseSquares }

}

function analyzeSNR(P_signal, P_noise) {
  console.log(P_signal);
  return 10 * (Math.log10(P_signal / P_noise));
}

function computeClarityPercentage(snr, dynamicRange) {
  const idealSNR = 18;
  const idealDynamicRange = 448;
  const snrPercent = Math.min(100, (snr / idealSNR) * 100);
  const dynamicRangePercent = Math.min(100, (dynamicRange / idealDynamicRange) * 100);
  return (snrPercent + dynamicRangePercent) / 2;
}


