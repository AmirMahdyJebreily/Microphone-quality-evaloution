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

const FREQUENCY_START = 300;
const FREQUENCY_END = 3500;
const signalStart = (length, sampleRate) => Math.floor(length * (FREQUENCY_START / (sampleRate / 2)));
const signalEnd = (length, sampleRate) => Math.floor(length * (FREQUENCY_END / (sampleRate / 2)));
const TIME = 2000;

function classifySNR(snr) {
  const categories = [
    { min: -Infinity, max: 1, label: "خیلی داغون" },
    { min: 1, max: 3, label: "داغون" },
    { min: 3, max: 6, label: "بد" },
    { min: 6, max: 9, label: "قابل قبول" },
    { min: 9, max: 12, label: "متوسط" },
    { min: 12, max: 14, label: "خوب" },
    { min: 14, max: 16, label: "خیلی خوب" },
    { min: 16, max: 17, label: "عالی" },
    { min: 17, max: 18, label: "کیفیت استدیو" },
    { min: 18, max: Infinity, label: "خفن ترین کیفیت" }
  ];
  for (let category of categories) {
    if (snr >= category.min && snr < category.max) {
      return category.label;
    }
  }
  return "Unknown";
}

let avg_P_signal = 0
let avg_P_noise = 0
let snr = 0

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const bandPassFilter = audioContext.createBiquadFilter();
    bandPassFilter.type = 'bandpass';
    bandPassFilter.frequency.value = (FREQUENCY_END - FREQUENCY_START) / 2;
    bandPassFilter.Q.value = 0.75;
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 16384;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    source.connect(bandPassFilter);
    bandPassFilter.connect(analyser);



    setInterval(() => {
      if (recording) {
        
        snr = analyzeSNR(avg_P_signal, avg_P_noise);

        avg_P_signal = 0
        avg_P_noise = 0

        snrLabel.innerHTML = `SNR: ${snr.toFixed(2)}<br/>${classifySNR(snr)}`
        console.clear()
      }
    }, TIME)

    const freqRange = {
      start: signalStart(bufferLength, audioContext.sampleRate),
      end: signalEnd(bufferLength, audioContext.sampleRate)
    }
    function checkQuality() {
      analyser.getByteFrequencyData(dataArray);
      let sumSignalSquares = 0;
      let sumNoiseSquares = 0;
      let countOfSignalFreq = FREQUENCY_END - FREQUENCY_START

      for (let i = 0; i < bufferLength; i++) {
        if (i >= freqRange.start && i <= freqRange.end) {
          sumSignalSquares += dataArray[i] ** 2
        } else {
          sumNoiseSquares += dataArray[i] ** 2
        }
      }

      const rmsSignal = Math.sqrt(sumSignalSquares / countOfSignalFreq);
      const rmsNoise = Math.sqrt(sumNoiseSquares / (bufferLength - countOfSignalFreq));

      avg_P_signal += (rmsSignal * rmsSignal) / countOfSignalFreq
      avg_P_noise += (rmsNoise * rmsNoise) / (bufferLength - countOfSignalFreq)

      console.log(`Signal RMS Level: ${rmsSignal.toFixed(2)} - ${(talking) ? 'talking' : 'no talk'}`);

      if (rmsSignal < 25) {
        rmsLabel.innerHTML = "صحبت نمیکنید";
        talking = false
      } else if (rmsSignal > 70) {
        rmsLabel.innerHTML = "ممکن است صدا بیش از حد بلند باشد.";
      } else {
        rmsLabel.innerHTML = "درحل صحبت";
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


