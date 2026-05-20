# 🚀 LeadGen Automator: Full-Stack B2B Lead Generation Tool

An elegant, high-performance visual dashboard and full-stack extraction shell built with **React**, **Express**, and **Tailwind CSS**. Designed for modern outbound growth, marketing teams, and developers to automate, target, and sync B2B leads smoothly.

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://www.netlify.com)

---

## ✨ Features

- **🌓 Sleek Dual-Themed UI**: Visually stunning dashboard featuring high-contrast Light/Dark themes, responsive bento stats grid, and micro-animations.
- **🔍 Intelligent Search Pipelines**:
  - **Google Grounding Model (Live Gemini 3.5)**: Scrape real-word online listings, addresses, coordinates, and contact details with real-time accuracy.
  - **Interactive Scraper Simulation**: Test queries safely locally before launching live engines.
- **📄 Interactive Leads Spreadsheet**: Fast, keyword-filtering spreadsheets containing columns like Name, Address, Phone, Email/N/A, and Facebook handles.
- **🔌 Companion Extraction Blueprints**: Easily copy modular local scraping scripts written in **Node.js (Puppeteer & Cheerio)** or **PHP (Symfony Crawler & GuzzleHTTP)** to run your own unlimited high-speed extractors offline.
- **🟢 Google Sheets Sync**: Connect your Google Account using integrated secure OAuth and instantly sync harvested leads into your spreadsheets.
- **⚡ Deploy Ready**: Includes pre-configured `netlify.toml` and redirects for lightning-fast serverless deployment on **Netlify Functions**.

---

## 🛠️ Technology Stack

- **Frontend**: React (Vite), Tailwind CSS, Lucide Icons, Framer Motion
- **Backend API**: Node.js, Express, Serverless-HTTP
- **API integrations**: Google Gemini API, Google Sheets OAuth API

---

## 🚀 Quick Local Setup

Follow these steps to run the application locally on your computer:

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/leadgen-automator.git
cd leadgen-automator
npm install
