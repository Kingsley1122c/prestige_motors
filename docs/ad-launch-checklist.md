# Ad Launch Checklist

## Production env values

Fill these before launching any paid traffic:

- `VITE_API_BASE_URL`
- `VITE_META_PIXEL_ID`
- `VITE_TIKTOK_PIXEL_ID`
- `VITE_GOOGLE_TAG_ID`
- `VITE_GOOGLE_ADS_ID`
- `FRONTEND_ORIGIN`

Reference templates:

- Frontend env: `client/.env.production.example`
- Backend env: `server/.env.example`

## Landing pages

- SUV campaigns: `/campaigns/suvs`
- Lexus campaigns: `/campaigns/lexus`
- Supercar campaigns: `/campaigns/supercars`

## Event mapping

- `PageView`: fires on route changes for Meta, TikTok, and Google
- `Lead`: fires when a buyer requests payment instructions
- `Purchase`: fires after Paystack verification confirms payment

## Meta: Facebook and Instagram

### Required account items

- Meta Pixel ID
- Verified domain
- Ad account billing active
- Conversion event selected: `Lead`

### Recommended landing pages

- SUVs: `/campaigns/suvs`
- Lexus: `/campaigns/lexus`
- Supercars: `/campaigns/supercars`

### Fill before launch

- Campaign name:
- Objective:
- Audience:
- Daily budget:
- Pixel ID:
- Destination URL:
- Primary text:
- Headline:

## TikTok

### Required account items

- TikTok Pixel ID
- Ad account billing active
- Video creatives exported in vertical format

### Fill before launch

- Campaign name:
- Objective:
- Audience:
- Daily budget:
- Pixel ID:
- Destination URL:
- Hook line:
- CTA:

## Google Search

### Required account items

- Google tag ID
- Google Ads conversion tag ID
- Billing active
- Keyword list and match types reviewed

### Fill before launch

- Campaign name:
- Target country/city:
- Daily budget:
- Google tag ID:
- Google Ads ID:
- Destination URL:
- Headline set:
- Description set:

## Final checks

- Deploy frontend with live env values
- Confirm browser loads the correct landing page
- Use platform helpers or tag assistants to verify Pixel, TikTok, and Google tags are firing
- Submit one test payment request and confirm `Lead` is recorded
- Complete one mock or real checkout flow and confirm `Purchase` is recorded
- Start with one campaign per landing page before widening spend
