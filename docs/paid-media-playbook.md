# Paid Media Playbook

## Landing pages

- SUVs: `/campaigns/suvs`
- Lexus: `/campaigns/lexus`
- Supercars: `/campaigns/supercars`

Use these as the primary ad destinations instead of sending every campaign to the homepage.

## Campaign setup

### Meta: Facebook and Instagram

#### Campaign 1: SUV leads

- Objective: Leads
- Conversion location: Website
- Optimization event: `Lead`
- Landing page: `/campaigns/suvs`
- Audience: age 28-58, luxury auto, family SUV, executive travel, Lexus, Land Rover, Toyota Land Cruiser, Cadillac Escalade
- Creatives: carousel of 4 to 6 SUVs with deposit and location overlays
- CTA: `Learn More`

#### Campaign 2: Lexus stock

- Objective: Sales or Leads
- Conversion event: `Lead`
- Landing page: `/campaigns/lexus`
- Audience: Lexus in-market buyers, luxury sedan/SUV shoppers, website retargeting
- Creatives: short Reels and square feed ads showing RX, ES, LX inventory
- CTA: `View Inventory`

#### Campaign 3: Supercars

- Objective: Traffic first, then retarget to Leads
- Landing page: `/campaigns/supercars`
- Audience: exotic cars, Ferrari, Lamborghini, McLaren, luxury travel, high-net-worth interests
- Creatives: cinematic video, close-up detail shots, short inventory montage
- CTA: `See Cars`

### TikTok

#### Campaign 1: SUV video clicks

- Objective: Traffic
- Optimization: Landing page views
- Landing page: `/campaigns/suvs`
- Video angle: quick walkaround, interior comfort, financing/deposit overlay
- Hook: `Need a luxury SUV without marketplace guesswork?`

#### Campaign 2: Lexus brand stock

- Objective: Traffic or Leads
- Landing page: `/campaigns/lexus`
- Video angle: reliability + prestige + verified buying process
- Hook: `Lexus RX, ES, and LX stock ready now.`

#### Campaign 3: Exotic attention campaign

- Objective: Traffic
- Landing page: `/campaigns/supercars`
- Video angle: fast cuts, exhaust notes, badges, cockpit shots, price and deposit flashes
- Hook: `Supercars available now in Miami and other US hubs.`

### Google Search

#### Campaign group: SUVs

- Landing page: `/campaigns/suvs`
- Core keywords:
  - luxury suv for sale
  - lexus suv for sale
  - escalade for sale miami
  - land cruiser for sale usa
  - luxury suv financing

#### Campaign group: Lexus

- Landing page: `/campaigns/lexus`
- Core keywords:
  - lexus rx for sale
  - lexus es for sale
  - lexus lx for sale
  - used lexus suv usa
  - lexus finance dealership

#### Campaign group: Supercars

- Landing page: `/campaigns/supercars`
- Core keywords:
  - ferrari for sale miami
  - lamborghini for sale usa
  - mclaren for sale near me
  - exotic car dealership miami
  - supercars for sale usa

## Ad copy

### Facebook and Instagram primary text

#### SUVs

Luxury SUVs with clear pricing, deposit-first buying, and inspection support before release. Browse verified stock across Miami, Houston, Dallas, and more.

#### Lexus

Shop Lexus RX, ES, and LX inventory with cleaner buying steps, finance visibility, and real stock instead of vague listing promises.

#### Supercars

Ferrari, Lamborghini, McLaren, and other halo cars available now with concierge support, inspection-first handling, and transparent deposit flow.

### Facebook and Instagram headlines

- Luxury SUVs Available Now
- Lexus RX, ES, and LX Stock
- Ferrari and Lamborghini Inventory
- Verified Luxury Car Buying
- Book Inspection Before Release

### TikTok hooks

- These luxury SUVs are live right now.
- Looking for Lexus RX or ES stock without the usual listing-site confusion?
- Supercars in Miami, LA, and other US hubs.
- Deposit-first luxury car buying with real inventory.
- Walk into the exact car you saw in the ad.

### Google search headlines

- Luxury SUVs For Sale Now
- Lexus RX ES LX Inventory
- Ferrari And Lamborghini Stock
- Miami Exotic Car Inventory
- Verified Luxury Car Listings
- Finance And Deposit Options
- Book A Vehicle Inspection
- View Executive SUV Stock

### Google search descriptions

- Browse luxury SUVs, Lexus sedans, and supercars with pricing, deposit options, and inspection-first release terms.
- View verified stock across Miami and key US hubs. Start with inventory, financing, or inspection support today.

## Tracking notes

- `PageView` fires on route changes.
- `Lead` fires when a buyer requests payment instructions.
- `Purchase` fires after Paystack verification confirms payment.
- Configure frontend env vars for Meta, TikTok, and Google before launching campaigns.
