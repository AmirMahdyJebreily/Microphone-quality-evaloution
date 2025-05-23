# 🎧 تحلیل‌گر کیفیت سیگنال میکروفون

این ابزار به‌صورت بلادرنگ ورودی میکروفون را با استفاده از **Web Audio API** تحلیل می‌کند. هدف آن ارزیابی شرایط میکروفون و محیط برای بهینه‌سازی کیفیت ورودی جهت استفاده در **مدل‌های تبدیل گفتار به متن** (مانند Whisper یا VOSK) است.

---

## 🔬 مفاهیم اصلی پردازش سیگنال

این ابزار با استفاده از مفاهیم **پردازش دیجیتال سیگنال (DSP)**، کیفیت ضبط میکروفون را به‌صورت درون‌مرورگری ارزیابی می‌کند. هدف آن ارائهٔ بازخورد کاربردی به کاربر بر اساس تحلیل موارد زیر است:

- **RMS (میانگین مربع ریشه‌ای)** در بازهٔ فرکانسی گفتار انسان
- **SNR (نسبت سیگنال به نویز)** بر اساس توان سیگنال و نویز
- **توان سیگنال و نویز** از طریق انرژی طیفی در باند مشخص‌شده

### 🎯 چرا مهم است؟

اغلب سیستم‌های مدرن تشخیص گفتار در شرایطی بهترین عملکرد را دارند که:
- SNR بالاتر از ۱۵ تا ۱۸ دسی‌بل باشد  
- RMS سیگنال در بازهٔ متوسط (حدود ۲۰ تا ۷۰) قرار گیرد  
- نویز محیط در محدودهٔ ۲۵۰ تا ۴۰۰۰ هرتز کمینه باشد  

این ابزار بدون نیاز به تنظیم Gain، کاربر را راهنمایی می‌کند تا صدایی شفاف، بدون نویز و مناسب برای مدل‌های تبدیل گفتار به متن تولید کند.

---

## 🎛️ نحوهٔ عملکرد (زنجیرهٔ پردازش)

1. یک **AudioContext** از طریق ورودی میکروفون ساخته می‌شود.
2. یک **BiquadFilterNode** با مشخصات فیلتر میان‌گذر (bandpass) اعمال می‌شود:
   - `type = 'bandpass'`
   - `frequency = 2125 Hz` (مرکز باند ۲۵۰ تا ۴۰۰۰ هرتز)
   - `Q = مرکز فرکانس / عرض باند`
3. سیگنال فیلترشده وارد یک **AnalyserNode** با `fftSize = 16384` می‌شود تا تحلیل طیفی دقیق‌تری انجام گیرد.
4. هر ۲ ثانیه:
   - توان سیگنال و نویز از انرژی در باند فرکانسی محاسبه می‌شود
   - مقدار RMS اندازه‌گیری می‌گردد
   - نسبت SNR به‌صورت زیر محاسبه می‌شود:
     $`
     \text{SNR (dB)} = 10 \cdot \log_{10}\left(\frac{P_{\text{signal}}}{P_{\text{noise}}}\right)
     `$
5. بازخورد برای کاربر بر اساس:
   - آستانه‌های RMS و SNR
   - تشخیص گفتار یا سکوت از روی دامنه سیگنال
   - مقایسه با محدوده‌های مطلوب تولید می‌شود.

---

## 🗣️ خروجی

- پیامی ساده و خلاصه به کاربر نمایش داده می‌شود که توصیه می‌کند:
  - به محیط آرام‌تری برود
  - صدای خود را بلندتر یا آرام‌تر کند
  - فاصلهٔ میکروفون را تغییر دهد  
- همچنین **امتیازی از ۱ تا ۵** برای کیفیت صدای میکروفون نمایش داده می‌شود.

---

## ✅ مناسب برای

- بررسی شرایط ضبط پیش از تبدیل گفتار به متن در مرورگر
- نرم‌افزارهای مبتنی بر Whisper / VOSK / DeepSpeech
- ابزارهای گفتاری تعاملی برای بهبود کیفیت

---
با ❤️ و ☕، کدآقا
