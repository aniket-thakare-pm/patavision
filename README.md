# PataVision: The Last-100m Spatial Address Engine
> **A Lightweight Spatial Navigation Protocol for Unmapped Indian Doorsteps**  
> *Submission for the Grow Hiring Challenge*

[![Live Demo](https://img.shields.io/badge/Demo-Vercel_Ready-emerald?style=flat-square)](https://github.com/aniket-thakare-pm/patavision)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Built With](https://img.shields.io/badge/Stack-React_|_Tailwind_|_Gemini_Multimodal-amber?style=flat-square)](https://github.com/aniket-thakare-pm/patavision)

---

## 📌 The Problem
In India, street numbering breaks down outside planned sectors. Google Maps gets a courier to the general neighborhood, but the final 150 meters—a dense maze of unmarked alleys, unnumbered gates, and complex society podiums—remains a navigational black hole.

* **For Delivery Drivers:** Wandering in alleys and making repetitive phone calls (*"Bhaiya kahan aana hai?"*) wastes **6 to 8 minutes per delivery**, blowing 10-minute quick-commerce SLAs.
* **For Residents:** Constant phone interruptions while in meetings or asleep.
* **For Logistics (Delhivery / Blinkit):** 20% of deliveries in complex areas trigger expensive **Return-to-Origin (RTO)**, costing ₹120–₹180 per failed delivery.

---

## 💡 The Solution
**PataVision** is a universal, zero-install spatial address capsule that bridges the gap between human landmark intuition and delivery navigation:

1. **The 60-Second Resident Capsule:** Residents define a Macro GPS Anchor (e.g. *Ganesh Temple Chowk*), record a 10-second native voice note, and configure 2–3 visual waypoints.
2. **Universal Address Handle (`pata.link/...`):** Residents paste their custom handle directly into **Address Line 2** on Blinkit, Zepto, Swiggy, or Amazon.
3. **Driver AR Guidance HUD:** When the delivery driver arrives, tapping the link opens an instant, zero-install mobile browser HUD featuring:
   * **Floating Spatial Anchor Pin:** Hovering over target landmarks with a distance countdown.
   * **Dynamic Ground Chevrons:** 3D perspective path arrows showing turns (curving left, straight, or curving right into the gali).
   * **Multimodal Vision Verification:** Uses Google Gemini 2.0 Flash to verify physical landmarks in the camera feed.
   * **Bilingual Voice Guidance:** Native speech synthesis in Hindi and English.
4. **Ephemeral Geofenced Privacy:** Waypoints and doorstep photos unlock only when the driver is within 150m of the anchor point, self-destructing 10 minutes post-delivery.

---

## 🛠️ Tech Stack & Architecture

* **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide Icons.
* **Camera & Sensors:** HTML5 `navigator.mediaDevices.getUserMedia`, `DeviceOrientationEvent` (Compass bearing).
* **Multimodal AI:** Google Gemini 2.0 Flash (live frame visual analysis) with Interactive Simulator fallback.
* **Audio:** Web Speech API (`window.speechSynthesis`) for Hindi and English voice guidance.
* **Deployment:** Vite + Vercel (HTTPS-ready for camera/mic permissions).

---

## 🚀 Getting Started

### Local Setup
```bash
git clone https://github.com/aniket-thakare-pm/patavision.git
cd patavision
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) $\rightarrow$ **Add New Project**.
2. Select `aniket-thakare-pm/patavision`.
3. Click **Deploy**.

---

## 📄 License
MIT License. Built for the Grow Product Hiring Challenge.
