# 🎧 Microphone Signal Quality Analyzer for JavaScript

A lightweight in-browser tool for evaluating **microphone signal quality** using the Web Audio API. It is designed to help users prepare optimal audio input for **speech-to-text models** such as Whisper, VOSK, or DeepSpeech — without requiring control over gain settings.

## Install and usage 
```bash
npm i microphone-quality-evaloution@latest
```

![Microphone Signal Quality Analyzer](./docs/screen.png)

[Persian Version](./docs/README_Fa.md)


---

## 🔍 Overview

This tool analyzes real-time microphone input and gives simple advice based on:

- **RMS (Root Mean Square)** energy of your voice
- **SNR (Signal-to-Noise Ratio)** in the speech frequency band
- **Power of the voice signal** and **background noise**
- User behavior (e.g., speaking too softly or loudly)

The output is a short recommendation message, suitable for everyday users (no technical terms), along with a 1–5 mic quality score.

---

## 🧠 Signal Processing works

The tool uses a chain of Web Audio nodes for analysis:

1. **`MediaStreamSource`** — receives live audio input from the microphone.
2. **`BiquadFilterNode`** (bandpass) — isolates the frequency range typical of human speech:
   - Frequency range: **250 Hz to 4000 Hz**
   - Center frequency: $`\frac{(250 + 4000)}{2} = 2125 Hz`$
   - Quality factor: $`Q = \frac{center frequency}{bandwidth}`$
3. **`AnalyserNode`** — uses FFT (size 16384) to measure the frequency-domain energy.

Every 2 seconds:
- Computes **RMS** over the target frequency band
- Estimates power of the **voice** and **background noise**
- Calculates **SNR (in dB)** using:

  $`\text{SNR}_{dB} = 10 \cdot \log_{10}\left(\frac{P_{\text{signal}}}{P_{\text{noise}}}\right)`$

---

## ✅ What Makes “Good” Audio?

| Metric | Good Range        | Notes                                               |
|--------|-------------------|-----------------------------------------------------|
| RMS    | ~20 to 70         | Too low = weak voice; too high = possible clipping |
| SNR    | > 15 dB (ideal 18+) | Lower SNR indicates high noise or weak speech     |

Users are advised to:
- Speak clearly, at a moderate volume
- Move closer to the mic if needed
- Reduce ambient noise (e.g., fans, traffic)

No gain or hardware control is assumed.

---

## 🗣️ Output Example

The tool displays:
- A brief **recommendation message** (e.g. “Your voice is too quiet”)
- **SNR value** and **RMS level**
- A **mic quality score** between 1 (poor) and 5 (excellent)

---

## ⚙️ Designed For

- Pre-checking mic setup for **speech recognition**
- Ensuring recording conditions are within **model-friendly bounds**
- Real-time use in web-based voice tools

---

## 🚀 Future Improvements

- Adaptive multi-band filters for more precise isolation  
- ML-based noise profiling and environment classification  
- User-specific calibration (tracking speaking habits over time)

---

## 📎 Dependencies

- Web platform only  
- No external JS libraries required  
- Fully client-side, secure and lightweight  

---

> 🧪 Built for experimentation, prototyping, and real-world speech applications.


With ❤️&☕ by codeagha
