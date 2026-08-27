# Alibaba.com Store Manager

Project ID: `AIC-2006-0010`

A dependency-free HTML, CSS, and JavaScript MVP that helps export product managers turn one source image into three scene compositions, create a long-form PNG detail image with pricing, selling points, and OEM capabilities, and add the result to a daily publishing schedule.

The interface and generated image templates support English, Simplified Chinese, Spanish, and German. The selected language is saved in the current browser, while product names, keywords, and other user-entered content are preserved exactly as entered.

## MVP Assumption

This version simulates the complete prepare–compose–generate–schedule–copy/download workflow. Drafts and schedules are stored only in the current browser. The local version can place a source image into three scene compositions; generating genuinely new, unphotographed product angles requires a server-side image model. Live automated publishing to Alibaba.com requires an authorized official API or another compliant automation method.

## Run Locally

```powershell
npm run dev
```

Then open `http://127.0.0.1:4173`.

## Validate and Build

```powershell
npm run check
npm run build
```

Production files are written to `dist/`.

## Deploy to Vercel

Import this directory into Vercel. The included `vercel.json` defines the build command and `dist` output directory. During a Vercel build, the production hostname is used to create absolute social-preview URLs. For another hosting provider, set `PUBLIC_SITE_URL=https://your-domain.example` before building.

## Core Workflow

1. Upload one JPG, PNG, or WebP product image. A transparent or solid background works best.
2. Choose Auto-match, Rehabilitation Clinic, Sports Training Studio, Outdoor Sports, or Clean Studio.
3. Enter the English product name, category, keywords, selling points, OEM capabilities, pricing, and publishing rules.
4. Generate front, 45°, and side scene compositions plus one long-form PNG detail image. Use Demo & Testing Settings to verify failure and retry feedback.
5. Download the three product views, copy the detail copy, or download the full detail image as a PNG.

## Image Capability Boundary

- The local MVP does not upload product images to any external service. Generated assets remain in page memory, so the source image must be selected again after a refresh.
- The local compositor attempts to separate products from transparent or solid backgrounds. A complex source background may remain visible inside the composition.
- Genuine new-angle generation should call an image model from a Vercel Serverless Function. API keys must stay in server-side environment variables and must never be included in front-end code.
