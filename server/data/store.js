const COUNTRY_OPTIONS = [
  { code: 'NG', name: 'Nigeria', currencyCode: 'NGN', locale: 'en-NG', exchangeRate: 1550 },
  { code: 'GH', name: 'Ghana', currencyCode: 'GHS', locale: 'en-GH', exchangeRate: 15.2 },
  { code: 'KE', name: 'Kenya', currencyCode: 'KES', locale: 'en-KE', exchangeRate: 130 },
  { code: 'AE', name: 'United Arab Emirates', currencyCode: 'AED', locale: 'en-AE', exchangeRate: 3.67 },
  { code: 'US', name: 'United States', currencyCode: 'USD', locale: 'en-US', exchangeRate: 1 },
]

const DEFAULT_COUNTRY_CODE = 'US'
const readConfiguredValue = (key, fallback = '') => {
  const configuredValue = String(process.env[key] || '').trim()
  return configuredValue || fallback
}
const ADMIN_LOGIN_HINT_EMAIL = readConfiguredValue('ADMIN_LOGIN_HINT_EMAIL')

const cloneValue = (value) => JSON.parse(JSON.stringify(value))

const getCountrySettings = (countryCode = DEFAULT_COUNTRY_CODE) =>
  COUNTRY_OPTIONS.find((country) => country.code === countryCode) || COUNTRY_OPTIONS[0]

const buildPlans = (priceUsd, minimumDepositUsd, durations = [6, 12, 18, 24]) => {
  const financedAmount = priceUsd - minimumDepositUsd

  return durations.map((months) => {
    const serviceFactor = 1 + months * 0.0065
    return {
      months,
      monthlyUsd: Math.ceil((financedAmount * serviceFactor) / months),
    }
  })
}

const roundToNearest = (value, step) => Math.round(Number(value) / step) * step

const buildRentalTerms = (priceUsd, bodyStyle) => {
  const dailyBase = Math.max(450, roundToNearest(priceUsd * 0.0065, 50))
  const minimumDays = ['SUV', 'Truck', 'Van'].includes(bodyStyle) ? 2 : 1
  const mileageLimitDaily = ['SUV', 'Truck'].includes(bodyStyle) ? 120 : 100

  return {
    dailyUsd: dailyBase,
    weekendUsd: roundToNearest(dailyBase * 2.7, 50),
    weeklyUsd: roundToNearest(dailyBase * 6, 50),
    monthlyUsd: roundToNearest(dailyBase * 22, 100),
    securityDepositUsd: Math.max(2000, roundToNearest(dailyBase * 2, 100)),
    minimumDays,
    mileageLimitDaily,
    chauffeurAvailable: priceUsd >= 180000 || ['Sedan', 'Van'].includes(bodyStyle),
  }
}

const normalizeRentalTerms = (inputTerms, priceUsd, bodyStyle) => {
  const defaults = buildRentalTerms(priceUsd, bodyStyle)

  return {
    dailyUsd: Number(inputTerms?.dailyUsd || defaults.dailyUsd),
    weekendUsd: Number(inputTerms?.weekendUsd || defaults.weekendUsd),
    weeklyUsd: Number(inputTerms?.weeklyUsd || defaults.weeklyUsd),
    monthlyUsd: Number(inputTerms?.monthlyUsd || defaults.monthlyUsd),
    securityDepositUsd: Number(inputTerms?.securityDepositUsd || defaults.securityDepositUsd),
    minimumDays: Number(inputTerms?.minimumDays || defaults.minimumDays),
    mileageLimitDaily: Number(inputTerms?.mileageLimitDaily || defaults.mileageLimitDaily),
    chauffeurAvailable: inputTerms?.chauffeurAvailable ?? defaults.chauffeurAvailable,
  }
}

const MEDIA_PALETTES = [
  { frame: '#08111f', frameSoft: '#11213b', accent: '#d6ad2f', accentSoft: '#f3d782', line: '#f5efe2', ink: '#e8edf7' },
  { frame: '#130d09', frameSoft: '#2a1b13', accent: '#dca763', accentSoft: '#f4d8af', line: '#fff2dc', ink: '#f2ede8' },
  { frame: '#0f1316', frameSoft: '#1a2026', accent: '#86c6ff', accentSoft: '#cfe9ff', line: '#ecf6ff', ink: '#ecf2f7' },
  { frame: '#150d14', frameSoft: '#25142a', accent: '#f08ca5', accentSoft: '#ffd3df', line: '#fff1f5', ink: '#f8eef3' },
]

const MEDIA_THEME_RULES = [
  {
    name: 'Performance Ember',
    note: 'High-contrast trim palette for halo and performance specifications',
    matcher: /raptor|trx|turbo|competition|type s|speed|sapphire|plaid|performance|supercharged|sport/i,
    paletteIndex: 0,
  },
  {
    name: 'Executive Reserve',
    note: 'Warm metallic palette for flagship luxury and rear-cabin focused trims',
    matcher: /maybach|flying spur|century|escalade|navigator|black label|denali|wagoneer|high country|executive|flagship/i,
    paletteIndex: 1,
  },
  {
    name: 'Electric Horizon',
    note: 'Cool luminous palette for EV and advanced electrified nameplates',
    matcher: /\bev\b|electric|rivian|lucid|tesla|hummer/i,
    paletteIndex: 2,
  },
  {
    name: 'Expedition Slate',
    note: 'Muted terrain palette for off-road, utility, and adventure-oriented trims',
    matcher: /defender|land cruiser|tundra|bronco|4wd|outbound|trail|expedition|truck|pickup|suv/i,
    paletteIndex: 3,
  },
]

const hashTextValue = (input) => Array.from(String(input || '')).reduce((total, character) => total + character.charCodeAt(0), 0)

const getVehicleTheme = ({ brand, model, year, badge, bodyStyle, fuelType }) => {
  const matchSource = `${brand} ${model} ${badge || ''} ${bodyStyle || ''} ${fuelType || ''}`
  const matchingTheme = MEDIA_THEME_RULES.find((theme) => theme.matcher.test(matchSource))

  if (matchingTheme) {
    return {
      name: matchingTheme.name,
      note: matchingTheme.note,
      palette: MEDIA_PALETTES[matchingTheme.paletteIndex],
    }
  }

  const paletteIndex = hashTextValue(`${brand}-${model}-${year}`) % MEDIA_PALETTES.length

  return {
    name: 'Signature Atelier',
    note: 'Catalog palette generated from the vehicle name and trim details',
    palette: MEDIA_PALETTES[paletteIndex],
  }
}

const normalizeBodyStyle = (bodyStyle = '') => String(bodyStyle).toLowerCase()

const buildVehicleViewPlan = (bodyStyle) => {
  const normalizedBodyStyle = normalizeBodyStyle(bodyStyle)

  if (normalizedBodyStyle.includes('truck') || normalizedBodyStyle.includes('pickup')) {
    return [
      { scene: 'exterior', label: 'Exterior front three-quarter', detail: 'Verified front fascia and stance' },
      { scene: 'exterior', label: 'Exterior side profile', detail: 'Wheelbase and body side view' },
      { scene: 'exterior', label: 'Exterior rear three-quarter', detail: 'Tailgate, lamps, and rear bodywork' },
      { scene: 'interior', label: 'Cabin dashboard', detail: 'Driver cockpit and dash architecture' },
      { scene: 'interior', label: 'Front seats', detail: 'Bolsters, trim, and console layout' },
      { scene: 'interior', label: 'Rear seating', detail: 'Second-row access and cabin finish' },
      { scene: 'detail', label: 'Cargo bed detail', detail: 'Bed utility, liner, and tailgate zone' },
    ]
  }

  if (normalizedBodyStyle.includes('van')) {
    return [
      { scene: 'exterior', label: 'Exterior front three-quarter', detail: 'Nose, grille, and wheel design' },
      { scene: 'exterior', label: 'Exterior side profile', detail: 'Body length and executive lounge proportions' },
      { scene: 'exterior', label: 'Exterior rear three-quarter', detail: 'Tail lamps, hatch, and coachwork' },
      { scene: 'interior', label: 'Cockpit dashboard', detail: 'Driver layout and center display stack' },
      { scene: 'interior', label: 'Executive lounge seats', detail: 'Captain chairs and comfort controls' },
      { scene: 'interior', label: 'Rear cabin amenities', detail: 'Tables, screens, and ambient finish' },
      { scene: 'detail', label: 'Door and entry detail', detail: 'Sliding entry and premium trim surfaces' },
    ]
  }

  if (normalizedBodyStyle.includes('coupe') || normalizedBodyStyle.includes('sportback')) {
    return [
      { scene: 'exterior', label: 'Exterior front three-quarter', detail: 'Front bumper, lights, and hood line' },
      { scene: 'exterior', label: 'Exterior side profile', detail: 'Roofline, stance, and wheel design' },
      { scene: 'exterior', label: 'Exterior rear three-quarter', detail: 'Rear haunches and tail treatment' },
      { scene: 'interior', label: 'Cockpit dashboard', detail: 'Digital cluster and center console' },
      { scene: 'interior', label: 'Front sport seats', detail: 'Seat contours and upholstery theme' },
      { scene: 'interior', label: 'Passenger cabin', detail: 'Cabin materials and trim layout' },
      { scene: 'detail', label: 'Wheel and brake detail', detail: 'Performance hardware and finish' },
    ]
  }

  if (normalizedBodyStyle.includes('sedan')) {
    return [
      { scene: 'exterior', label: 'Exterior front three-quarter', detail: 'Front bodywork and grille signature' },
      { scene: 'exterior', label: 'Exterior side profile', detail: 'Wheelbase and formal roofline' },
      { scene: 'exterior', label: 'Exterior rear three-quarter', detail: 'Rear lamps and deck treatment' },
      { scene: 'interior', label: 'Cockpit dashboard', detail: 'Dash architecture and display layout' },
      { scene: 'interior', label: 'Front seats', detail: 'Driver and passenger seating finish' },
      { scene: 'interior', label: 'Rear executive seating', detail: 'Second-row comfort and legroom' },
      { scene: 'detail', label: 'Trim and console detail', detail: 'Wood, metal, and switchgear finish' },
    ]
  }

  return [
    { scene: 'exterior', label: 'Exterior front three-quarter', detail: 'Front fascia and body stance' },
    { scene: 'exterior', label: 'Exterior side profile', detail: 'Side silhouette and wheel design' },
    { scene: 'exterior', label: 'Exterior rear three-quarter', detail: 'Rear body lines and lamps' },
    { scene: 'interior', label: 'Cockpit dashboard', detail: 'Driver display and center stack' },
    { scene: 'interior', label: 'Front seats', detail: 'Seat shape and interior finish' },
    { scene: 'interior', label: 'Rear cabin', detail: 'Second-row or third-row comfort zone' },
    { scene: 'detail', label: 'Wheel and trim detail', detail: 'Exterior accents and material finish' },
  ]
}

const buildExteriorIllustration = (bodyStyle, palette) => {
  const normalizedBodyStyle = normalizeBodyStyle(bodyStyle)

  if (normalizedBodyStyle.includes('truck') || normalizedBodyStyle.includes('pickup')) {
    return `
      <rect x="210" y="410" width="470" height="88" rx="28" fill="${palette.frameSoft}" opacity="0.96" />
      <path d="M260 332 L430 332 Q474 332 505 364 L560 364 Q614 364 642 388 L694 388 L694 430 L238 430 Q222 430 214 420 L214 380 Q214 352 260 332 Z" fill="${palette.line}" opacity="0.92" />
      <rect x="530" y="360" width="114" height="56" rx="14" fill="${palette.accent}" opacity="0.9" />
      <rect x="305" y="348" width="128" height="52" rx="18" fill="${palette.accentSoft}" opacity="0.8" />
    `
  }

  if (normalizedBodyStyle.includes('van')) {
    return `
      <rect x="224" y="390" width="460" height="96" rx="30" fill="${palette.frameSoft}" opacity="0.96" />
      <path d="M272 304 L520 304 Q590 304 626 340 L678 340 L678 408 L222 408 L222 356 Q222 334 272 304 Z" fill="${palette.line}" opacity="0.92" />
      <rect x="314" y="324" width="154" height="62" rx="18" fill="${palette.accentSoft}" opacity="0.78" />
      <rect x="482" y="324" width="126" height="62" rx="18" fill="${palette.accent}" opacity="0.78" />
    `
  }

  if (normalizedBodyStyle.includes('coupe') || normalizedBodyStyle.includes('sportback')) {
    return `
      <rect x="236" y="416" width="432" height="82" rx="28" fill="${palette.frameSoft}" opacity="0.96" />
      <path d="M286 368 Q360 300 470 300 Q562 300 620 356 L668 392 L668 430 L236 430 L236 408 Q236 390 286 368 Z" fill="${palette.line}" opacity="0.93" />
      <path d="M378 322 L522 322 Q566 322 602 354 L458 354 Q416 354 378 322 Z" fill="${palette.accentSoft}" opacity="0.78" />
    `
  }

  if (normalizedBodyStyle.includes('sedan')) {
    return `
      <rect x="220" y="418" width="468" height="80" rx="28" fill="${palette.frameSoft}" opacity="0.96" />
      <path d="M274 360 Q346 308 444 308 H556 Q620 308 674 388 L688 408 L688 430 H220 L220 402 Q220 382 274 360 Z" fill="${palette.line}" opacity="0.93" />
      <rect x="374" y="330" width="172" height="54" rx="18" fill="${palette.accentSoft}" opacity="0.8" />
    `
  }

  return `
    <rect x="214" y="404" width="476" height="92" rx="30" fill="${palette.frameSoft}" opacity="0.96" />
    <path d="M268 332 H554 Q622 332 672 384 L690 404 L690 430 H214 V382 Q214 360 268 332 Z" fill="${palette.line}" opacity="0.93" />
    <rect x="332" y="348" width="148" height="52" rx="18" fill="${palette.accentSoft}" opacity="0.8" />
    <rect x="486" y="348" width="128" height="52" rx="18" fill="${palette.accent}" opacity="0.8" />
  `
}

const buildInteriorIllustration = (bodyStyle, palette) => {
  const normalizedBodyStyle = normalizeBodyStyle(bodyStyle)
  const rearSeatWidth = normalizedBodyStyle.includes('van') ? 188 : normalizedBodyStyle.includes('truck') ? 148 : 168

  return `
    <path d="M220 254 Q324 198 450 198 H546 Q674 198 778 254 L748 332 H252 Z" fill="${palette.frameSoft}" opacity="0.96" />
    <rect x="320" y="236" width="160" height="64" rx="18" fill="${palette.accentSoft}" opacity="0.9" />
    <rect x="500" y="236" width="126" height="64" rx="18" fill="${palette.accent}" opacity="0.88" />
    <rect x="292" y="388" width="124" height="142" rx="28" fill="${palette.line}" opacity="0.92" />
    <rect x="528" y="388" width="124" height="142" rx="28" fill="${palette.line}" opacity="0.92" />
    <rect x="396" y="430" width="152" height="86" rx="22" fill="${palette.frame}" opacity="0.95" />
    <rect x="356" y="562" width="${rearSeatWidth}" height="74" rx="24" fill="${palette.accentSoft}" opacity="0.88" />
  `
}

const buildDetailIllustration = (bodyStyle, palette) => {
  const normalizedBodyStyle = normalizeBodyStyle(bodyStyle)

  if (normalizedBodyStyle.includes('truck') || normalizedBodyStyle.includes('pickup')) {
    return `
      <rect x="250" y="266" width="428" height="228" rx="30" fill="${palette.frameSoft}" opacity="0.95" />
      <rect x="286" y="302" width="356" height="156" rx="18" fill="${palette.line}" opacity="0.92" />
      <rect x="286" y="448" width="356" height="32" rx="12" fill="${palette.accent}" opacity="0.88" />
    `
  }

  return `
    <circle cx="354" cy="430" r="114" fill="${palette.line}" opacity="0.92" />
    <circle cx="354" cy="430" r="74" fill="${palette.frameSoft}" opacity="0.95" />
    <circle cx="354" cy="430" r="34" fill="${palette.accent}" opacity="0.92" />
    <rect x="478" y="308" width="180" height="170" rx="26" fill="${palette.accentSoft}" opacity="0.88" />
    <rect x="506" y="340" width="124" height="22" rx="10" fill="${palette.frameSoft}" opacity="0.85" />
    <rect x="506" y="382" width="92" height="22" rx="10" fill="${palette.frameSoft}" opacity="0.85" />
    <rect x="506" y="424" width="108" height="22" rx="10" fill="${palette.frameSoft}" opacity="0.85" />
  `
}

const createVehicleMediaCard = ({ brand, model, year, bodyStyle, exteriorColor, interiorColor, badge, scene, label, detail, theme }) => {
  const resolvedTheme = theme || getVehicleTheme({ brand, model, year, badge, bodyStyle })
  const palette = resolvedTheme.palette
  const vehicleName = `${brand} ${model}`
  const sceneBadge = scene === 'interior' ? 'Interior' : scene === 'detail' ? 'Detail' : 'Exterior'
  const artwork = scene === 'interior'
    ? buildInteriorIllustration(bodyStyle, palette)
    : scene === 'detail'
      ? buildDetailIllustration(bodyStyle, palette)
      : buildExteriorIllustration(bodyStyle, palette)

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 720" role="img" aria-label="${vehicleName} ${label}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${palette.frame}" />
          <stop offset="100%" stop-color="${palette.frameSoft}" />
        </linearGradient>
        <linearGradient id="glow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.95" />
          <stop offset="100%" stop-color="${palette.accentSoft}" stop-opacity="0.9" />
        </linearGradient>
      </defs>
      <rect width="960" height="720" rx="38" fill="url(#bg)" />
      <circle cx="182" cy="118" r="144" fill="${palette.accent}" opacity="0.12" />
      <circle cx="824" cy="612" r="188" fill="${palette.accentSoft}" opacity="0.08" />
      <rect x="56" y="56" width="848" height="608" rx="32" fill="none" stroke="${palette.line}" stroke-opacity="0.14" />
      <rect x="86" y="88" width="150" height="18" rx="9" fill="url(#glow)" opacity="0.92" />
      <rect x="720" y="88" width="150" height="32" rx="16" fill="${palette.frame}" fill-opacity="0.78" stroke="${palette.line}" stroke-opacity="0.3" />
      <text x="748" y="110" fill="${palette.accentSoft}" font-family="Segoe UI, Arial, sans-serif" font-size="15" font-weight="700">${sceneBadge}</text>
      ${artwork}
      <circle cx="308" cy="516" r="56" fill="${palette.frame}" opacity="0.98" />
      <circle cx="308" cy="516" r="34" fill="${palette.accentSoft}" opacity="0.92" />
      <circle cx="628" cy="516" r="56" fill="${palette.frame}" opacity="0.98" />
      <circle cx="628" cy="516" r="34" fill="${palette.accentSoft}" opacity="0.92" />
    </svg>
  `

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.replace(/\n\s+/g, ' ').trim())}`
}

const buildVehicleDisplayGallery = (vehicle) => {
  const theme = getVehicleTheme(vehicle)

  return buildVehicleViewPlan(vehicle.bodyStyle).map((view, index) => ({
    id: `${vehicle.id}-display-${index + 1}`,
    scene: view.scene,
    label: view.label,
    detail: view.detail,
    themeName: theme.name,
    themeNote: theme.note,
    src: createVehicleMediaCard({ ...vehicle, ...view, theme }),
  }))
}

const attachVehicleDisplayMedia = (vehicle) => {
  if (!vehicle) {
    return null
  }

  const displayGalleryItems = buildVehicleDisplayGallery(vehicle)
  const displayTheme = getVehicleTheme(vehicle)
  const displayGallery = displayGalleryItems.map((item) => item.src)

  return {
    ...vehicle,
    displayTheme: { name: displayTheme.name, note: displayTheme.note, accent: displayTheme.palette.accent },
    displayHeroImage: displayGallery[0],
    displayGallery,
    displayGalleryItems,
  }
}

const buildCommonsFilePath = (fileName) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}`

const VERIFIED_MEDIA_LIBRARY = {
  'lexus-lx-600-2023': {
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/2018_Lexus_LX_570_%28facelift%29%2C_front_3.24.23.jpg/1280px-2018_Lexus_LX_570_%28facelift%29%2C_front_3.24.23.jpg',
    gallery: ['https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/2018_Lexus_LX_570_%28facelift%29%2C_front_3.24.23.jpg/1280px-2018_Lexus_LX_570_%28facelift%29%2C_front_3.24.23.jpg'],
    mediaVerified: true,
  },
  'toyota-land-cruiser-2021': {
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/2021_Toyota_Land_Cruiser_300_3.4_ZX_%28Colombia%29_front_view_04.png/1280px-2021_Toyota_Land_Cruiser_300_3.4_ZX_%28Colombia%29_front_view_04.png',
    gallery: ['https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/2021_Toyota_Land_Cruiser_300_3.4_ZX_%28Colombia%29_front_view_04.png/1280px-2021_Toyota_Land_Cruiser_300_3.4_ZX_%28Colombia%29_front_view_04.png'],
    mediaVerified: true,
  },
  'ferrari-purosangue-2024': {
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Ferrari_Purosangue_DSC_7008.jpg/1280px-Ferrari_Purosangue_DSC_7008.jpg',
    gallery: [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Ferrari_Purosangue_DSC_7008.jpg/1280px-Ferrari_Purosangue_DSC_7008.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/2023_Ferrari_Purosangue_1.jpg/1280px-2023_Ferrari_Purosangue_1.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/2023_Ferrari_Purosangue_2.jpg/1280px-2023_Ferrari_Purosangue_2.jpg',
    ],
    mediaVerified: true,
  },
  'ferrari-296-gtb-2025': {
    heroImage: buildCommonsFilePath('2024 Ferrari 296 GTB.jpg'),
    gallery: [
      buildCommonsFilePath('2024 Ferrari 296 GTB.jpg'),
      buildCommonsFilePath('Ferrari 296 GTB (7LA-171K) front.jpg'),
      buildCommonsFilePath('Ferrari 296 GTB (7LA-171K) right.jpg'),
      buildCommonsFilePath('Ferrari 296 GTB (7LA-171K) rear.jpg'),
    ],
    mediaVerified: true,
  },
  'rolls-royce-ghost-2023': {
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/2022_Rolls-Royce_Ghost_Black_Badge_in_Arctic_White%2C_front_left.jpg/1280px-2022_Rolls-Royce_Ghost_Black_Badge_in_Arctic_White%2C_front_left.jpg',
    gallery: [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/2022_Rolls-Royce_Ghost_Black_Badge_in_Arctic_White%2C_front_left.jpg/1280px-2022_Rolls-Royce_Ghost_Black_Badge_in_Arctic_White%2C_front_left.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Rolls-Royce_Ghost_%28MSP16%29.jpg/1280px-Rolls-Royce_Ghost_%28MSP16%29.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Rolls-Royce_Ghost_II_Midnight_Sapphire_%288%29_%28cropped%29.jpg/1280px-Rolls-Royce_Ghost_II_Midnight_Sapphire_%288%29_%28cropped%29.jpg',
    ],
    mediaVerified: true,
  },
  'mercedes-s580-2022': {
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Mercedes-Benz_W223_IMG_3951.jpg/1280px-Mercedes-Benz_W223_IMG_3951.jpg',
    gallery: ['https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Mercedes-Benz_W223_IMG_3951.jpg/1280px-Mercedes-Benz_W223_IMG_3951.jpg'],
    mediaVerified: true,
  },
  'maybach-gls-600-2024': {
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Mercedes-Benz_X167_IMG_5259.jpg/1280px-Mercedes-Benz_X167_IMG_5259.jpg',
    gallery: ['https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Mercedes-Benz_X167_IMG_5259.jpg/1280px-Mercedes-Benz_X167_IMG_5259.jpg'],
    mediaVerified: true,
  },
  'bentley-bentayga-2024': {
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Bentley_Bentayga_V8_%28FL%29_IMG_0005.jpg/1280px-Bentley_Bentayga_V8_%28FL%29_IMG_0005.jpg',
    gallery: ['https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Bentley_Bentayga_V8_%28FL%29_IMG_0005.jpg/1280px-Bentley_Bentayga_V8_%28FL%29_IMG_0005.jpg'],
    mediaVerified: true,
  },
  'bentley-flying-spur-speed-2024': {
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Bentley_Flying_Spur_Macau_front_view_%28June_9%2C_2025%29.jpg/1280px-Bentley_Flying_Spur_Macau_front_view_%28June_9%2C_2025%29.jpg',
    gallery: ['https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Bentley_Flying_Spur_Macau_front_view_%28June_9%2C_2025%29.jpg/1280px-Bentley_Flying_Spur_Macau_front_view_%28June_9%2C_2025%29.jpg'],
    mediaVerified: true,
  },
  'bmw-m8-gran-coupe-2024': {
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/2019_BMW_840d_xDrive_Automatic_3.0_Front.jpg/1280px-2019_BMW_840d_xDrive_Automatic_3.0_Front.jpg',
    gallery: ['https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/2019_BMW_840d_xDrive_Automatic_3.0_Front.jpg/1280px-2019_BMW_840d_xDrive_Automatic_3.0_Front.jpg'],
    mediaVerified: true,
  },
  'ford-f150-raptor-r-2024': {
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/2021_Ford_F-150_Raptor%2C_front.jpg/1280px-2021_Ford_F-150_Raptor%2C_front.jpg',
    gallery: ['https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/2021_Ford_F-150_Raptor%2C_front.jpg/1280px-2021_Ford_F-150_Raptor%2C_front.jpg'],
    mediaVerified: true,
  },
  'ram-1500-trx-2024': {
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/2023_Ram_1500_TRX_Havoc_Edition_in_Baja_Yellow_Clearcoat%2C_Front_Left%2C_04-30-2023.jpg/1280px-2023_Ram_1500_TRX_Havoc_Edition_in_Baja_Yellow_Clearcoat%2C_Front_Left%2C_04-30-2023.jpg',
    gallery: ['https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/2023_Ram_1500_TRX_Havoc_Edition_in_Baja_Yellow_Clearcoat%2C_Front_Left%2C_04-30-2023.jpg/1280px-2023_Ram_1500_TRX_Havoc_Edition_in_Baja_Yellow_Clearcoat%2C_Front_Left%2C_04-30-2023.jpg'],
    mediaVerified: true,
  },
  'gmc-hummer-ev-pickup-2025': {
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/2022_GMC_Hummer_EV_pickup_front.jpg/1280px-2022_GMC_Hummer_EV_pickup_front.jpg',
    gallery: ['https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/2022_GMC_Hummer_EV_pickup_front.jpg/1280px-2022_GMC_Hummer_EV_pickup_front.jpg'],
    mediaVerified: true,
  },
  'chevrolet-silverado-hd-2024': {
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/2022_Chevrolet_Silverado_2500HD_High_Country%2C_Front_Left%2C_11-21-2021.jpg/1280px-2022_Chevrolet_Silverado_2500HD_High_Country%2C_Front_Left%2C_11-21-2021.jpg',
    gallery: ['https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/2022_Chevrolet_Silverado_2500HD_High_Country%2C_Front_Left%2C_11-21-2021.jpg/1280px-2022_Chevrolet_Silverado_2500HD_High_Country%2C_Front_Left%2C_11-21-2021.jpg'],
    mediaVerified: true,
  },
  'lamborghini-urus-2024': {
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Lamborghini_Urus_SE_DSC_8524.jpg/1280px-Lamborghini_Urus_SE_DSC_8524.jpg',
    gallery: [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Lamborghini_Urus_SE_DSC_8524.jpg/1280px-Lamborghini_Urus_SE_DSC_8524.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/2018_01_31_Lancement_Urus_Lamborghini_Paris_%C2%A9Laurine_Paumard_Photographe.jpg/1280px-2018_01_31_Lancement_Urus_Lamborghini_Paris_%C2%A9Laurine_Paumard_Photographe.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/2018_01_31_Lancement_Urus_Lamborghini_Paris%282%29_%C2%A9Laurine_Paumard_Photographe.jpg/1280px-2018_01_31_Lancement_Urus_Lamborghini_Paris%282%29_%C2%A9Laurine_Paumard_Photographe.jpg',
    ],
    mediaVerified: true,
  },
  'lamborghini-revuelto-2025': {
    heroImage: buildCommonsFilePath('2023 Lamborghini Revuelto 1.jpg'),
    gallery: [
      buildCommonsFilePath('2023 Lamborghini Revuelto 1.jpg'),
      buildCommonsFilePath('2023 Lamborghini Revuelto 2.jpg'),
      buildCommonsFilePath('2023 Lamborghini Revuelto Rear.jpg'),
      buildCommonsFilePath('Lamborghini Revuelto intérieur 01.jpg'),
    ],
    mediaVerified: true,
  },
  'maserati-mc20-2024': {
    heroImage: buildCommonsFilePath('Maserati MC20 (7BA-MC30) front.jpg'),
    gallery: [
      buildCommonsFilePath('Maserati MC20 (7BA-MC30) front.jpg'),
      buildCommonsFilePath('Maserati MC20 (7BA-MC30) rear.jpg'),
      buildCommonsFilePath('2023 Maserati MC20 in Digital Mint, front right.jpg'),
      buildCommonsFilePath('2022 Maserati MC20 in Grigio Misterio, rear right.jpg'),
    ],
    mediaVerified: true,
  },
  'mclaren-artura-2025': {
    heroImage: buildCommonsFilePath('2023 McLaren Artura in Supernova Silver, front left.jpg'),
    gallery: [
      buildCommonsFilePath('2023 McLaren Artura in Supernova Silver, front left.jpg'),
      buildCommonsFilePath('The frontview of McLaren ARTURA.jpg'),
      buildCommonsFilePath('The rearview of McLaren ARTURA.jpg'),
      buildCommonsFilePath('McLaren Artura McLaren Orange (1).jpg'),
    ],
    mediaVerified: true,
  },
  'mclaren-720s-spider-2024': {
    heroImage: buildCommonsFilePath('2020 McLaren 720S front.jpg'),
    gallery: [
      buildCommonsFilePath('2020 McLaren 720S front.jpg'),
      buildCommonsFilePath('2020 McLaren 720S rear.jpg'),
      buildCommonsFilePath('McLaren 720S Performance Spider (2022) (52451897301).jpg'),
      buildCommonsFilePath('McLaren 720S Spider (2022) (53331176462).jpg'),
    ],
    mediaVerified: true,
  },
  'porsche-911-gt3-rs-2025': {
    heroImage: buildCommonsFilePath('Porsche 911 GT3 RS 992.jpg'),
    gallery: [
      buildCommonsFilePath('Porsche 911 GT3 RS 992.jpg'),
      buildCommonsFilePath('Porsche 911 GT3 RS 992 1.jpg'),
      buildCommonsFilePath('Porsche 911 GT3 RS 992 3.jpg'),
      buildCommonsFilePath('Porsche 911 GT3 RS 992 5.jpg'),
    ],
    mediaVerified: true,
  },
  'porsche-911-turbo-s-2024': {
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/2025_Porsche_992_Carrera_convertible_DSC_7026.jpg/1280px-2025_Porsche_992_Carrera_convertible_DSC_7026.jpg',
    gallery: ['https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/2025_Porsche_992_Carrera_convertible_DSC_7026.jpg/1280px-2025_Porsche_992_Carrera_convertible_DSC_7026.jpg'],
    mediaVerified: true,
  },
  'mercedes-amg-gt63-se-2025': {
    heroImage: buildCommonsFilePath('Mercedes-AMG GT 63 S E Performance Coupé (C192) front.jpg'),
    gallery: [
      buildCommonsFilePath('Mercedes-AMG GT 63 S E Performance Coupé (C192) front.jpg'),
      buildCommonsFilePath('Mercedes-AMG GT 63 S E Performance Coupé (C192) rear.jpg'),
      buildCommonsFilePath('Mercedes-AMG GT 63 S E Performance Coupé (C192) right.jpg'),
      buildCommonsFilePath('Mercedes-AMG C192 GT 63 S E Performance IMG 9251.jpg'),
    ],
    mediaVerified: true,
  },
  'chevrolet-corvette-z06-2025': {
    heroImage: buildCommonsFilePath('Chevrolet Corvette Z06 Coupé (C8, 2025) (54873883018).jpg'),
    gallery: [
      buildCommonsFilePath('Chevrolet Corvette Z06 Coupé (C8, 2025) (54873883018).jpg'),
      buildCommonsFilePath('Chevrolet Corvette Z06 Coupé (C8, 2024) (54090514722).jpg'),
      buildCommonsFilePath('Chevrolet Corvette Z06 (C8) Washington DC Metro Area, USA (1).jpg'),
      buildCommonsFilePath('Chevrolet Corvette Z06 (C8) Washington DC Metro Area, USA (4).jpg'),
    ],
    mediaVerified: true,
  },
  'lucid-air-sapphire-2024': {
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/2022_Lucid_Air_Grand_Touring_in_Zenith_Red%2C_front_left.jpg/1280px-2022_Lucid_Air_Grand_Touring_in_Zenith_Red%2C_front_left.jpg',
    gallery: ['https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/2022_Lucid_Air_Grand_Touring_in_Zenith_Red%2C_front_left.jpg/1280px-2022_Lucid_Air_Grand_Touring_in_Zenith_Red%2C_front_left.jpg'],
    mediaVerified: true,
  },
  'aston-martin-dbx707-2024': {
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/2021_Aston_Martin_DBX_in_Midnight_Blue%2C_front_left.jpg/1280px-2021_Aston_Martin_DBX_in_Midnight_Blue%2C_front_left.jpg',
    gallery: ['https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/2021_Aston_Martin_DBX_in_Midnight_Blue%2C_front_left.jpg/1280px-2021_Aston_Martin_DBX_in_Midnight_Blue%2C_front_left.jpg'],
    mediaVerified: true,
  },
  'honda-nsx-type-s-2022': {
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Honda%2C_Paris_Motor_Show_2018%2C_Paris_%281Y7A1625%29_%28cropped%29.jpg/1280px-Honda%2C_Paris_Motor_Show_2018%2C_Paris_%281Y7A1625%29_%28cropped%29.jpg',
    gallery: ['https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Honda%2C_Paris_Motor_Show_2018%2C_Paris_%281Y7A1625%29_%28cropped%29.jpg/1280px-Honda%2C_Paris_Motor_Show_2018%2C_Paris_%281Y7A1625%29_%28cropped%29.jpg'],
    mediaVerified: true,
  },
  'toyota-century-suv-2024': {
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Toyota_Century%2C_Paris%2C_France.jpg/1280px-Toyota_Century%2C_Paris%2C_France.jpg',
    gallery: ['https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Toyota_Century%2C_Paris%2C_France.jpg/1280px-Toyota_Century%2C_Paris%2C_France.jpg'],
    mediaVerified: true,
  },
  'mercedes-g63-2023': {
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Mercedes-Benz_W463_G_350_BlueTEC_01.jpg/1280px-Mercedes-Benz_W463_G_350_BlueTEC_01.jpg',
    gallery: ['https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Mercedes-Benz_W463_G_350_BlueTEC_01.jpg/1280px-Mercedes-Benz_W463_G_350_BlueTEC_01.jpg'],
    mediaVerified: true,
  },
  'lexus-lm-500h-2024': {
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Lexus_LM_350h_AWD_AAWH15_Sonic_Quartz_with_cargo_box_%2B_roof_rack_01_%28cropped%29.jpg/1280px-Lexus_LM_350h_AWD_AAWH15_Sonic_Quartz_with_cargo_box_%2B_roof_rack_01_%28cropped%29.jpg',
    gallery: ['https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Lexus_LM_350h_AWD_AAWH15_Sonic_Quartz_with_cargo_box_%2B_roof_rack_01_%28cropped%29.jpg/1280px-Lexus_LM_350h_AWD_AAWH15_Sonic_Quartz_with_cargo_box_%2B_roof_rack_01_%28cropped%29.jpg'],
    mediaVerified: true,
  },
  'lexus-rx-350-f-sport-2024': {
    heroImage: buildCommonsFilePath('Lexus RX 350"F SPORT" (5BA-TALA15-AWZGT(F)) front.jpg'),
    gallery: [
      buildCommonsFilePath('Lexus RX 350"F SPORT" (5BA-TALA15-AWZGT(F)) front.jpg'),
      buildCommonsFilePath('Lexus RX 350"F SPORT" (5BA-TALA15-AWZGT(F)) rear.jpg'),
      buildCommonsFilePath('LEXUS RX F-SPORT (AL10, 2022) China.jpg'),
      buildCommonsFilePath('LEXUS RX F-SPORT (AL10, 2022) China (2).jpg'),
    ],
    mediaVerified: true,
  },
  'lexus-rx-500h-f-sport-2024': {
    heroImage: buildCommonsFilePath('Lexus RX 500h F Sport.jpg'),
    gallery: [
      buildCommonsFilePath('Lexus RX 500h F Sport.jpg'),
      buildCommonsFilePath('Lexus RX 500h F Sport Lights.jpg'),
      buildCommonsFilePath('LEXUS RX F-SPORT (AL10, 2022) China.jpg'),
      buildCommonsFilePath('LEXUS RX F-SPORT (AL10, 2022) China (2).jpg'),
    ],
    mediaVerified: true,
  },
  'lexus-rx-350h-luxury-2025': {
    heroImage: buildCommonsFilePath('2023 Denver Auto Show Lexus RX front quarter.jpg'),
    gallery: [
      buildCommonsFilePath('2023 Denver Auto Show Lexus RX front quarter.jpg'),
      buildCommonsFilePath('Lexus RX (AL10, 2022) Auto Zuerich 2023 1X7A1483.jpg'),
      buildCommonsFilePath('Lexus RX (AL10, 2022) Auto Zuerich 2023 1X7A1484.jpg'),
      buildCommonsFilePath('Lexus RX350 (ALA10) Washington DC Metro Area, USA (7).jpg'),
    ],
    mediaVerified: true,
  },
  'lexus-gx-550-overtrail-2025': {
    heroImage: buildCommonsFilePath('2024 Lexus GX 550 Overtrail (United States) front view 01.jpg'),
    gallery: [
      buildCommonsFilePath('2024 Lexus GX 550 Overtrail (United States) front view 01.jpg'),
      buildCommonsFilePath('2024 Lexus GX 550 Overtrail (United States) front view 02.jpg'),
      buildCommonsFilePath('2024 Lexus GX 550 Overtrail (United States) rear view.jpg'),
      buildCommonsFilePath('Lexus GX550 Overtrail Plus.jpg'),
    ],
    mediaVerified: true,
  },
  'lexus-tx-500h-f-sport-2025': {
    heroImage: buildCommonsFilePath('2024 Lexus TX 500h F Sport (United States) front view.png'),
    gallery: [
      buildCommonsFilePath('2024 Lexus TX 500h F Sport (United States) front view.png'),
      buildCommonsFilePath('25 Lexus TX 500h F Sport Performance Premium.jpg'),
      buildCommonsFilePath('Lexus TX 500h (2023) (53492076926).jpg'),
    ],
    mediaVerified: true,
  },
  'lexus-es-350-ultra-luxury-2024': {
    heroImage: buildCommonsFilePath('2022 Lexus ES 350 Premier GSZ10 in Sonic Titanium, front right, 06-15-2024.jpg'),
    gallery: [
      buildCommonsFilePath('2022 Lexus ES 350 Premier GSZ10 in Sonic Titanium, front right, 06-15-2024.jpg'),
      buildCommonsFilePath('2022 Lexus ES 350 Premier GSZ10 in Sonic Titanium, rear right, 06-15-2024.jpg'),
      buildCommonsFilePath('19 Lexus ES 350 Ultra Luxury.jpg'),
      buildCommonsFilePath('Lexus ES 350 (GSZ10) IMG 4332.jpg'),
    ],
    mediaVerified: true,
  },
  'lexus-es-300h-luxury-2025': {
    heroImage: buildCommonsFilePath('2024 Lexus ES 300h Executive in Sonic Chrome, front left.jpg'),
    gallery: [
      buildCommonsFilePath('2024 Lexus ES 300h Executive in Sonic Chrome, front left.jpg'),
      buildCommonsFilePath('2024 Lexus ES 300h Executive in Sonic Chrome, rear right.jpg'),
      buildCommonsFilePath('2025 Lexus ES 300h Sports luxury front.jpg'),
      buildCommonsFilePath('2025 Lexus ES 300h Sports luxury rear.jpg'),
    ],
    mediaVerified: true,
  },
  'lexus-es-250-awd-2024': {
    heroImage: buildCommonsFilePath('2022 Lexus ES 250 front view.jpg'),
    gallery: [
      buildCommonsFilePath('2022 Lexus ES 250 front view.jpg'),
      buildCommonsFilePath('2020 Lexus ES250 rear view in Brunei.jpg'),
      buildCommonsFilePath('LEXUS ES 250(ES 260) (XZ10) China (1).jpg'),
      buildCommonsFilePath('LEXUS ES 250(ES 260) (XZ10) China (3).jpg'),
    ],
    mediaVerified: true,
  },
  'lexus-rx-350-premium-2023': {
    heroImage: buildCommonsFilePath('Lexus RX 350"F SPORT" (5BA-TALA15-AWZGT(F)) front.jpg'),
    gallery: [
      buildCommonsFilePath('Lexus RX 350"F SPORT" (5BA-TALA15-AWZGT(F)) front.jpg'),
      buildCommonsFilePath('Lexus RX 350"F SPORT" (5BA-TALA15-AWZGT(F)) rear.jpg'),
      buildCommonsFilePath('Lexus RX (AL10, 2022) Auto Zuerich 2023 1X7A1483.jpg'),
      buildCommonsFilePath('Lexus RX350 (ALA10) Washington DC Metro Area, USA (7).jpg'),
    ],
    mediaVerified: true,
  },
  'lexus-rx-350h-premium-plus-2024': {
    heroImage: buildCommonsFilePath('2023 Denver Auto Show Lexus RX front quarter.jpg'),
    gallery: [
      buildCommonsFilePath('2023 Denver Auto Show Lexus RX front quarter.jpg'),
      buildCommonsFilePath('Lexus RX (AL10, 2022) Auto Zuerich 2023 1X7A1483.jpg'),
      buildCommonsFilePath('Lexus RX (AL10, 2022) Auto Zuerich 2023 1X7A1484.jpg'),
      buildCommonsFilePath('Lexus RX350 (ALA10) Washington DC Metro Area, USA (7).jpg'),
    ],
    mediaVerified: true,
  },
  'lexus-is-500-f-sport-2024': {
    heroImage: buildCommonsFilePath('Lexus IS 500"F SPORT Performance" (5BA-USE30-BEZLH) front.jpg'),
    gallery: [
      buildCommonsFilePath('Lexus IS 500"F SPORT Performance" (5BA-USE30-BEZLH) front.jpg'),
      buildCommonsFilePath('Lexus IS 500"F SPORT Performance" (5BA-USE30-BEZLH) rear.jpg'),
      buildCommonsFilePath('Lexus IS 500 F Sport (2024) (54092771172).jpg'),
      buildCommonsFilePath('Lexus IS 500 F Sport (2024) (54093637941).jpg'),
    ],
    mediaVerified: true,
  },
  'lexus-lc-500-convertible-2024': {
    heroImage: buildCommonsFilePath('Lexus LC 500 Convertible (5BA-URZ100-AKUBH) front.jpg'),
    gallery: [
      buildCommonsFilePath('Lexus LC 500 Convertible (5BA-URZ100-AKUBH) front.jpg'),
      buildCommonsFilePath('Lexus LC 500 Convertible (5BA-URZ100-AKUBH) rear.jpg'),
      buildCommonsFilePath('Lexus LC 500 Cabriolet (2024) (53625472202).jpg'),
      buildCommonsFilePath('Lexus LC 500 Cabriolet (2024) (53626810660).jpg'),
    ],
    mediaVerified: true,
  },
  'lexus-ls-500-awd-2025': {
    heroImage: buildCommonsFilePath('Lexus LS 500 AWD VXFA50 FL Black (1).jpg'),
    gallery: [
      buildCommonsFilePath('Lexus LS 500 AWD VXFA50 FL Black (1).jpg'),
      buildCommonsFilePath('Lexus LS 500 AWD VXFA50 FL Black (2).jpg'),
      buildCommonsFilePath('Lexus LS 500 AWD VXFA50 FL Black (3).jpg'),
      buildCommonsFilePath('Lexus LS 500 AWD VXFA50 FL Black (4).jpg'),
    ],
    mediaVerified: true,
  },
  'lexus-es-350-f-sport-2023': {
    heroImage: buildCommonsFilePath('2022 Lexus ES 350 Premier GSZ10 in Sonic Titanium, front right, 06-15-2024.jpg'),
    gallery: [
      buildCommonsFilePath('2022 Lexus ES 350 Premier GSZ10 in Sonic Titanium, front right, 06-15-2024.jpg'),
      buildCommonsFilePath('2022 Lexus ES 350 Premier GSZ10 in Sonic Titanium, rear right, 06-15-2024.jpg'),
      buildCommonsFilePath('19 Lexus ES 350 Ultra Luxury.jpg'),
      buildCommonsFilePath('Lexus ES 350 (GSZ10) IMG 4332.jpg'),
    ],
    mediaVerified: true,
  },
  'lexus-es-250-luxury-2022': {
    heroImage: buildCommonsFilePath('2022 Lexus ES 250 front view.jpg'),
    gallery: [
      buildCommonsFilePath('2022 Lexus ES 250 front view.jpg'),
      buildCommonsFilePath('2020 Lexus ES250 rear view in Brunei.jpg'),
      buildCommonsFilePath('LEXUS ES 250(ES 260) (XZ10) China (1).jpg'),
      buildCommonsFilePath('LEXUS ES 250(ES 260) (XZ10) China (3).jpg'),
    ],
    mediaVerified: true,
  },
  'bmw-m5-touring-2025': {
    heroImage: buildCommonsFilePath('BMW M5 Touring (G99) Washington DC Metro Area, USA.jpg'),
    gallery: [
      buildCommonsFilePath('BMW M5 Touring (G99) Washington DC Metro Area, USA.jpg'),
      buildCommonsFilePath('BMW M5 Touring (G99) Washington DC Metro Area, USA (1).jpg'),
      buildCommonsFilePath('BMW M5 G99 Touring Marina Bay Blue Metallic.jpg'),
      buildCommonsFilePath('2024 BMW M5 Touring 1.jpg'),
    ],
    mediaVerified: true,
  },
  'toyota-camry-xse-2023': {
    heroImage: buildCommonsFilePath('2020 Toyota Camry XSE front.jpg'),
    gallery: [
      buildCommonsFilePath('2020 Toyota Camry XSE front.jpg'),
      buildCommonsFilePath('2020 Toyota Camry XSE rear.jpg'),
      buildCommonsFilePath('Toyota Camry Hybrid XSE XV70 FL Precious Metal (4).jpg'),
      buildCommonsFilePath('Toyota Camry Hybrid XSE XV70 FL Precious Metal (5).jpg'),
    ],
    mediaVerified: true,
  },
  'toyota-rav4-xle-premium-2022': {
    heroImage: buildCommonsFilePath('19 Toyota RAV4 XLE Premium.jpg'),
    gallery: [
      buildCommonsFilePath('19 Toyota RAV4 XLE Premium.jpg'),
      buildCommonsFilePath('22 Toyota RAV4 Hybrid XLE Premium.jpg'),
      buildCommonsFilePath('2019 Toyota Rav4 XLE Premium Package AWD in Silver Sky Metallic, rear left, 2024-11-01.jpg'),
    ],
    mediaVerified: true,
  },
  'toyota-corolla-cross-xle-2023': {
    heroImage: buildCommonsFilePath('2023 Toyota Corolla Cross XLE 4WD in Wind Chill Pearl, front left.jpg'),
    gallery: [
      buildCommonsFilePath('2023 Toyota Corolla Cross XLE 4WD in Wind Chill Pearl, front left.jpg'),
      buildCommonsFilePath('2022 Toyota Corolla Cross XLE front.jpg'),
      buildCommonsFilePath('2022 Toyota Corolla Cross XLE rear.jpg'),
      buildCommonsFilePath('22 Toyota Corolla Cross XLE.jpg'),
    ],
    mediaVerified: true,
  },
  'honda-civic-ex-2023': {
    heroImage: buildCommonsFilePath('Honda Civic Turbo EX 2023 (52901257239).jpg'),
    gallery: [
      buildCommonsFilePath('Honda Civic Turbo EX 2023 (52901257239).jpg'),
      buildCommonsFilePath('2019 Honda Civic EX hatchback, rear right, 08-27-2023.jpg'),
      buildCommonsFilePath('2022 Honda Civic Hatchback EX-L in Platinum White Pearl, front right (cropped).jpg'),
      buildCommonsFilePath('2022 Honda Civic Hatchback EX-L in Platinum White Pearl, rear right (cropped).jpg'),
    ],
    mediaVerified: true,
  },
  'acura-mdx-type-s-2025': {
    heroImage: buildCommonsFilePath('23 Acura MDX SH-AWD Type S Advance.jpg'),
    gallery: [
      buildCommonsFilePath('23 Acura MDX SH-AWD Type S Advance.jpg'),
      buildCommonsFilePath('2022 Acura MDX Type S.jpg'),
      buildCommonsFilePath('Acura MDX Type-S (2023) (53488853272).jpg'),
      buildCommonsFilePath('2022 Acura MDX Type-S.jpg'),
    ],
    mediaVerified: true,
  },
  'toyota-tacoma-trd-off-road-2023': {
    heroImage: buildCommonsFilePath('Toyota Tacoma TRD Off Road (N400) IMG 9735.jpg'),
    gallery: [
      buildCommonsFilePath('Toyota Tacoma TRD Off Road (N400) IMG 9735.jpg'),
      buildCommonsFilePath('Toyota Tacoma TRD Off Road (N400) IMG 9727 (cropped).jpg'),
      buildCommonsFilePath('Toyota Tacoma TRD Off Road (N400) IMG 9727.jpg'),
      buildCommonsFilePath('Toyota Tacoma TRD Off Road (N400) DSC 7353.jpg'),
    ],
    mediaVerified: true,
  },
  'ford-ranger-lariat-2023': {
    heroImage: buildCommonsFilePath('24 Ford Ranger Lariat.jpg'),
    gallery: [
      buildCommonsFilePath('24 Ford Ranger Lariat.jpg'),
      buildCommonsFilePath('2019 Ford Ranger Lariat crew cab.jpg'),
      buildCommonsFilePath('Ford Ranger LARIAT 4WD SuperCrew (2024) (53620395647).jpg'),
      buildCommonsFilePath('Ford Ranger LARIAT 4WD SuperCrew (2024) (53620395657).jpg'),
    ],
    mediaVerified: true,
  },
  'nissan-frontier-pro-4x-2023': {
    heroImage: buildCommonsFilePath('Nissan Frontier (D41) Pro-4X Automesse Ludwigsburg 2022 1X7A5885.jpg'),
    gallery: [
      buildCommonsFilePath('Nissan Frontier (D41) Pro-4X Automesse Ludwigsburg 2022 1X7A5885.jpg'),
      buildCommonsFilePath('Nissan Frontier (D41) Pro-4X Automesse Ludwigsburg 2022 1X7A5942.jpg'),
      buildCommonsFilePath('Nissan Frontier (D41) Pro-4X 1X7A7196.jpg'),
    ],
    mediaVerified: true,
  },
  'toyota-hilux-invincible-2022': {
    heroImage: buildCommonsFilePath('Toyota Hilux Invincible 50 (38438265462).jpg'),
    gallery: [
      buildCommonsFilePath('Toyota Hilux Invincible 50 (38438265462).jpg'),
      buildCommonsFilePath('2021 Toyota Hilux Invincible D-4D 4WD 2.4.jpg'),
      buildCommonsFilePath('2016 Toyota HiLux Invincible D-4D 4WD 2.4 Front.jpg'),
    ],
    mediaVerified: true,
  },
  'lincoln-navigator-black-label-2024': {
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/2019_Lincoln_Navigator_%27Reserve%27%2C_front_8.29.20.jpg/1280px-2019_Lincoln_Navigator_%27Reserve%27%2C_front_8.29.20.jpg',
    gallery: ['https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/2019_Lincoln_Navigator_%27Reserve%27%2C_front_8.29.20.jpg/1280px-2019_Lincoln_Navigator_%27Reserve%27%2C_front_8.29.20.jpg'],
    mediaVerified: true,
  },
  'cadillac-escalade-v-2024': {
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/2021_Cadillac_Escalade_ESV_4WD_Premium_Luxury_in_Satin_Steel_Metallic%2C_front_right.jpg/1280px-2021_Cadillac_Escalade_ESV_4WD_Premium_Luxury_in_Satin_Steel_Metallic%2C_front_right.jpg',
    gallery: ['https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/2021_Cadillac_Escalade_ESV_4WD_Premium_Luxury_in_Satin_Steel_Metallic%2C_front_right.jpg/1280px-2021_Cadillac_Escalade_ESV_4WD_Premium_Luxury_in_Satin_Steel_Metallic%2C_front_right.jpg'],
    mediaVerified: true,
  },
  'audi-rs7-2024': {
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Audi_RS7_C8_DSC_7842.jpg/1280px-Audi_RS7_C8_DSC_7842.jpg',
    gallery: ['https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Audi_RS7_C8_DSC_7842.jpg/1280px-Audi_RS7_C8_DSC_7842.jpg'],
    mediaVerified: true,
  },
  'gmc-yukon-denali-ultimate-2024': {
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/%2721_GMC_Yukon.jpg/1280px-%2721_GMC_Yukon.jpg',
    gallery: ['https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/%2721_GMC_Yukon.jpg/1280px-%2721_GMC_Yukon.jpg'],
    mediaVerified: true,
  },
  'nissan-gtr-2022': {
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/2009-2010_Nissan_GT-R_%28R35%29_coupe_01.jpg/1280px-2009-2010_Nissan_GT-R_%28R35%29_coupe_01.jpg',
    gallery: ['https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/2009-2010_Nissan_GT-R_%28R35%29_coupe_01.jpg/1280px-2009-2010_Nissan_GT-R_%28R35%29_coupe_01.jpg'],
    mediaVerified: true,
  },
  'jeep-grand-wagoneer-series-iii-2024': {
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Jeep_Grand_Wagoneer_Edmonton_2022_2.jpg/1280px-Jeep_Grand_Wagoneer_Edmonton_2022_2.jpg',
    gallery: ['https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Jeep_Grand_Wagoneer_Edmonton_2022_2.jpg/1280px-Jeep_Grand_Wagoneer_Edmonton_2022_2.jpg'],
    mediaVerified: true,
  },
  'land-rover-defender-130-2025': {
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Land_Rover_Defender_110_D40_SE_L663_Pangea_Green_%281%29_%28cropped%29.jpg/1280px-Land_Rover_Defender_110_D40_SE_L663_Pangea_Green_%281%29_%28cropped%29.jpg',
    gallery: ['https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Land_Rover_Defender_110_D40_SE_L663_Pangea_Green_%281%29_%28cropped%29.jpg/1280px-Land_Rover_Defender_110_D40_SE_L663_Pangea_Green_%281%29_%28cropped%29.jpg'],
    mediaVerified: true,
  },
  'porsche-cayenne-2024': {
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Porsche_Cayenne_%28III%2C_Facelift%29_%E2%80%93_f_01012025.jpg/1280px-Porsche_Cayenne_%28III%2C_Facelift%29_%E2%80%93_f_01012025.jpg',
    gallery: ['https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Porsche_Cayenne_%28III%2C_Facelift%29_%E2%80%93_f_01012025.jpg/1280px-Porsche_Cayenne_%28III%2C_Facelift%29_%E2%80%93_f_01012025.jpg'],
    mediaVerified: true,
  },
  'tesla-model-x-plaid-2024': {
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/2017_Tesla_Model_X_100D_Front.jpg/1280px-2017_Tesla_Model_X_100D_Front.jpg',
    gallery: ['https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/2017_Tesla_Model_X_100D_Front.jpg/1280px-2017_Tesla_Model_X_100D_Front.jpg'],
    mediaVerified: true,
  },
  'rivian-r1t-quad-motor-2024': {
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/2022_Rivian_R1T_%28in_Glacier_White%29%2C_front_6.21.22.jpg/1280px-2022_Rivian_R1T_%28in_Glacier_White%29%2C_front_6.21.22.jpg',
    gallery: ['https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/2022_Rivian_R1T_%28in_Glacier_White%29%2C_front_6.21.22.jpg/1280px-2022_Rivian_R1T_%28in_Glacier_White%29%2C_front_6.21.22.jpg'],
    mediaVerified: true,
  },
  'range-rover-sport-2022': {
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/2015_Land_Rover_Range_Rover_Sport_HSE_3.0_Front.jpg/1280px-2015_Land_Rover_Range_Rover_Sport_HSE_3.0_Front.jpg',
    gallery: ['https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/2015_Land_Rover_Range_Rover_Sport_HSE_3.0_Front.jpg/1280px-2015_Land_Rover_Range_Rover_Sport_HSE_3.0_Front.jpg'],
    mediaVerified: true,
  },
  'bmw-x7-2023': {
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/BMW_G07_1X7A1696.jpg/1280px-BMW_G07_1X7A1696.jpg',
    gallery: ['https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/BMW_G07_1X7A1696.jpg/1280px-BMW_G07_1X7A1696.jpg'],
    mediaVerified: true,
  },
  'toyota-alphard-2024': {
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/2018-2023_Toyota_Alphard_X.jpg/1280px-2018-2023_Toyota_Alphard_X.jpg',
    gallery: ['https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/2018-2023_Toyota_Alphard_X.jpg/1280px-2018-2023_Toyota_Alphard_X.jpg'],
    mediaVerified: true,
  },
  'toyota-tundra-capstone-2024': {
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/2022_Toyota_Tundra_Limited_CrewMax_Short_Bed_4x4_with_TRD_Off-Road_Package%2C_front_left%2C_11-01-2022.jpg/1280px-2022_Toyota_Tundra_Limited_CrewMax_Short_Bed_4x4_with_TRD_Off-Road_Package%2C_front_left%2C_11-01-2022.jpg',
    gallery: ['https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/2022_Toyota_Tundra_Limited_CrewMax_Short_Bed_4x4_with_TRD_Off-Road_Package%2C_front_left%2C_11-01-2022.jpg/1280px-2022_Toyota_Tundra_Limited_CrewMax_Short_Bed_4x4_with_TRD_Off-Road_Package%2C_front_left%2C_11-01-2022.jpg'],
    mediaVerified: true,
  },
}

const attachVerifiedMedia = (input) => {
  const verifiedMedia = VERIFIED_MEDIA_LIBRARY[input.id]

  if (!verifiedMedia) {
    return input
  }

  return {
    ...input,
    ...verifiedMedia,
  }
}

const STOCK_PHOTO_SETS = {
  lexusSuv: [
    'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=80',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/BMW_G07_1X7A1696.jpg/1280px-BMW_G07_1X7A1696.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/2021_Aston_Martin_DBX_in_Midnight_Blue%2C_front_left.jpg/1280px-2021_Aston_Martin_DBX_in_Midnight_Blue%2C_front_left.jpg',
  ],
  lexusSedan: [
    'https://images.unsplash.com/photo-1494905998402-395d579af36f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80',
  ],
  lexusCoupe: [
    'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=1200&q=80',
  ],
  premiumSuv: [
    'https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?auto=format&fit=crop&w=1200&q=80',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/2021_Aston_Martin_DBX_in_Midnight_Blue%2C_front_left.jpg/1280px-2021_Aston_Martin_DBX_in_Midnight_Blue%2C_front_left.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/2015_Land_Rover_Range_Rover_Sport_HSE_3.0_Front.jpg/1280px-2015_Land_Rover_Range_Rover_Sport_HSE_3.0_Front.jpg',
  ],
  performanceSedan: [
    'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1494905998402-395d579af36f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80',
  ],
  ferrari: [
    'https://images.unsplash.com/photo-1502161254066-6c74afbf07aa?auto=format&fit=crop&w=1200&q=80',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/2023_Ferrari_Purosangue_1.jpg/1280px-2023_Ferrari_Purosangue_1.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/2023_Ferrari_Purosangue_2.jpg/1280px-2023_Ferrari_Purosangue_2.jpg',
  ],
  lamborghini: [
    'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=1200&q=80',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/2018_01_31_Lancement_Urus_Lamborghini_Paris_%C2%A9Laurine_Paumard_Photographe.jpg/1280px-2018_01_31_Lancement_Urus_Lamborghini_Paris_%C2%A9Laurine_Paumard_Photographe.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/2018_01_31_Lancement_Urus_Lamborghini_Paris%282%29_%C2%A9Laurine_Paumard_Photographe.jpg/1280px-2018_01_31_Lancement_Urus_Lamborghini_Paris%282%29_%C2%A9Laurine_Paumard_Photographe.jpg',
  ],
  porsche: [
    'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=1200&q=80',
  ],
  exotic: [
    'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1200&q=80',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/2009-2010_Nissan_GT-R_%28R35%29_coupe_01.jpg/1280px-2009-2010_Nissan_GT-R_%28R35%29_coupe_01.jpg',
    'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=1200&q=80',
  ],
  americanPerformance: [
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1517026575980-3e1e2dedeab4?auto=format&fit=crop&w=1200&q=80',
  ],
}

const resolveStockPhotoSet = (query = '') => {
  const normalizedQuery = String(query).toLowerCase()

  if (normalizedQuery.includes('ferrari')) {
    return STOCK_PHOTO_SETS.ferrari
  }

  if (normalizedQuery.includes('lamborghini')) {
    return STOCK_PHOTO_SETS.lamborghini
  }

  if (normalizedQuery.includes('porsche')) {
    return STOCK_PHOTO_SETS.porsche
  }

  if (normalizedQuery.includes('mclaren') || normalizedQuery.includes('maserati')) {
    return STOCK_PHOTO_SETS.exotic
  }

  if (normalizedQuery.includes('corvette')) {
    return STOCK_PHOTO_SETS.americanPerformance
  }

  if (normalizedQuery.includes('bmw') || normalizedQuery.includes('amg') || normalizedQuery.includes('mercedes')) {
    return STOCK_PHOTO_SETS.performanceSedan
  }

  if (normalizedQuery.includes('lexus lc')) {
    return STOCK_PHOTO_SETS.lexusCoupe
  }

  if (normalizedQuery.includes('lexus es') || normalizedQuery.includes('lexus is') || normalizedQuery.includes('lexus ls')) {
    return STOCK_PHOTO_SETS.lexusSedan
  }

  if (normalizedQuery.includes('lexus') || normalizedQuery.includes('acura mdx')) {
    return STOCK_PHOTO_SETS.lexusSuv
  }

  return STOCK_PHOTO_SETS.premiumSuv
}

const buildStockPhotoUrl = (query, variant = 1, brand = '') => {
  const photoSet = buildDistinctCatalogPhotoPool(query, brand)

  return photoSet[(variant - 1) % photoSet.length]
}

const CURATED_MULTI_IMAGE_GALLERIES = {
  'lamborghini-revuelto-2025': {
    heroImage: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  'ferrari-296-gtb-2025': {
    heroImage: 'https://images.unsplash.com/photo-1502161254066-6c74afbf07aa?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1502161254066-6c74afbf07aa?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  'ferrari-purosangue-2024': {
    heroImage: 'https://images.unsplash.com/photo-1502161254066-6c74afbf07aa?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1502161254066-6c74afbf07aa?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  'maserati-mc20-2024': {
    heroImage: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1489824904134-891ab64532f1?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  'mclaren-artura-2025': {
    heroImage: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  'mclaren-720s-spider-2024': {
    heroImage: 'https://images.unsplash.com/photo-1502161254066-6c74afbf07aa?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1502161254066-6c74afbf07aa?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  'rolls-royce-ghost-2023': {
    heroImage: 'https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  'lamborghini-urus-2024': {
    heroImage: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  'porsche-911-gt3-rs-2025': {
    heroImage: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1489824904134-891ab64532f1?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1502161254066-6c74afbf07aa?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  'mercedes-amg-gt63-se-2025': {
    heroImage: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1502161254066-6c74afbf07aa?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  'chevrolet-corvette-z06-2025': {
    heroImage: 'https://images.unsplash.com/photo-1517026575980-3e1e2dedeab4?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1517026575980-3e1e2dedeab4?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  'porsche-911-turbo-s-2024': {
    heroImage: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1489824904134-891ab64532f1?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1502161254066-6c74afbf07aa?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  'bentley-flying-spur-speed-2024': {
    heroImage: 'https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1200&q=80',
    ],
  },
}

const usesBlockedCatalogMediaSource = (value) => String(value || '').includes('upload.wikimedia.org')

const buildCatalogMediaQuery = (input) =>
  String(input?.stockPhotoQuery || `${input?.brand || ''} ${input?.model || ''} ${input?.bodyStyle || ''} ${input?.fuelType || ''}`)
    .trim()

const galleryUsesBlockedCatalogMediaSource = (gallery = []) =>
  Array.isArray(gallery) && gallery.some((image) => usesBlockedCatalogMediaSource(image))

const dedupeGalleryImages = (gallery = []) => Array.from(new Set((gallery || []).filter(Boolean)))

const BRAND_IMAGE_KEYWORDS = {
  Acura: ['acura', 'mdx'],
  'Aston Martin': ['aston-martin', 'aston_martin', 'dbx'],
  Audi: ['audi', 'rs7'],
  Bentley: ['bentley', 'bentayga', 'flying_spur'],
  BMW: ['bmw', 'x7', 'm5', 'm8'],
  Cadillac: ['cadillac', 'escalade'],
  Chevrolet: ['chevrolet', 'corvette', 'silverado'],
  Ferrari: ['ferrari', 'purosangue', '296'],
  Ford: ['ford', 'raptor', 'f-150'],
  GMC: ['gmc', 'hummer', 'yukon'],
  Honda: ['honda', 'nsx'],
  Jeep: ['jeep', 'wagoneer'],
  Lamborghini: ['lamborghini', 'urus', 'revuelto'],
  'Land Rover': ['land_rover', 'land-rover', 'range_rover', 'range-rover', 'defender'],
  Lexus: ['lexus', 'rx', 'es', 'gx', 'tx', 'lc', 'ls', 'lx', 'lm'],
  Lincoln: ['lincoln', 'navigator'],
  Lucid: ['lucid', 'air'],
  Maserati: ['maserati', 'mc20'],
  'Mercedes-Benz': ['mercedes', 'amg', 'maybach', 'g_63', 'gls', 'w223'],
  McLaren: ['mclaren', 'artura', '720s'],
  Nissan: ['nissan', 'gt-r', 'gtr'],
  Porsche: ['porsche', '911', 'cayenne'],
  Ram: ['ram', 'trx'],
  'Rolls-Royce': ['rolls-royce', 'rolls_royce', 'ghost'],
  Rivian: ['rivian', 'r1t'],
  Tesla: ['tesla', 'model_x'],
  Toyota: ['toyota', 'land_cruiser', 'alphard', 'tundra', 'century'],
}

const imageMatchesVehicleBrand = (brand, imageUrl) => {
  const normalizedUrl = String(imageUrl || '').toLowerCase()

  if (!normalizedUrl || normalizedUrl.includes('images.unsplash.com')) {
    return true
  }

  const brandKeywords = BRAND_IMAGE_KEYWORDS[String(brand || '')]

  if (!brandKeywords?.length) {
    return true
  }

  return brandKeywords.some((keyword) => normalizedUrl.includes(keyword))
}

const filterBrandCompatibleImages = (brand, images = []) =>
  (images || []).filter((image) => imageMatchesVehicleBrand(brand, image))

const buildDistinctCatalogPhotoPool = (query = '', brand = '') =>
  dedupeGalleryImages(filterBrandCompatibleImages(brand, [
    ...resolveStockPhotoSet(query),
    ...STOCK_PHOTO_SETS.premiumSuv,
    ...STOCK_PHOTO_SETS.performanceSedan,
    ...STOCK_PHOTO_SETS.exotic,
    ...STOCK_PHOTO_SETS.americanPerformance,
  ]))

const buildCatalogFallbackGallery = (query, preferredLength = 4, brand = '') => {
  const count = Math.max(3, Math.min(Number(preferredLength) || 3, 4))
  const photoPool = buildDistinctCatalogPhotoPool(query, brand)

  if (!query || !photoPool.length) {
    return []
  }

  return photoPool.slice(0, count)
}

const sanitizeCatalogMedia = (input) => {
  const curatedGallery = CURATED_MULTI_IMAGE_GALLERIES[input?.id]
  const preferredGallery = Array.isArray(input?.gallery) ? input.gallery.filter(Boolean) : []
  const mediaQuery = buildCatalogMediaQuery(input)
  const fallbackGallery = buildCatalogFallbackGallery(mediaQuery, preferredGallery.length || 4, input?.brand)
  const fallbackHero = fallbackGallery[0] || buildStockPhotoUrl(mediaQuery, 1, input?.brand)
  const trustedVerifiedGallery = input?.mediaVerified
    ? dedupeGalleryImages([input?.heroImage, ...preferredGallery])
    : []
  const trustedVerifiedHero = trustedVerifiedGallery[0] || String(input?.heroImage || '')

  if (trustedVerifiedGallery.length) {
    return {
      ...input,
      mediaVerified: true,
      heroImage: trustedVerifiedHero,
      gallery: trustedVerifiedGallery.slice(0, 4),
    }
  }

  if (curatedGallery) {
    return {
      ...input,
      mediaVerified: true,
      heroImage: curatedGallery.heroImage,
      gallery: curatedGallery.gallery,
    }
  }
  const hasSafePreferredGallery = preferredGallery.length && !galleryUsesBlockedCatalogMediaSource(preferredGallery)
  const dedupedPreferredGallery = hasSafePreferredGallery ? dedupeGalleryImages(preferredGallery) : []
  const nextGallery = hasSafePreferredGallery
    ? dedupeGalleryImages([...dedupedPreferredGallery, ...fallbackGallery]).slice(0, Math.max(3, Math.min(preferredGallery.length || 3, 4)))
    : fallbackGallery
  const nextHero = input?.heroImage && !usesBlockedCatalogMediaSource(input.heroImage)
    ? input.heroImage
    : nextGallery[0] || fallbackHero

  return {
    ...input,
    mediaVerified: true,
    heroImage: nextHero,
    gallery: nextGallery.length ? nextGallery : [nextHero].filter(Boolean),
  }
}

const withStockPhotos = (query, input) => ({
  ...input,
  stockPhotoQuery: query,
  heroImage: buildStockPhotoUrl(query, 1, input?.brand),
  gallery: [
    buildStockPhotoUrl(query, 1, input?.brand),
    buildStockPhotoUrl(query, 2, input?.brand),
    buildStockPhotoUrl(query, 3, input?.brand),
  ],
})

const USED_CONDITION_PATTERN = /used|pre-?owned|certified/i

const isUsedVehicleCondition = (condition = '') => USED_CONDITION_PATTERN.test(String(condition || ''))

const buildVehicleCommerceProfile = ({ bodyStyle, condition, priceUsd, paymentTypes, rentable }) => {
  const basePaymentTypes = Array.from(new Set((paymentTypes || []).filter(Boolean)))
  const normalizedBodyStyle = normalizeBodyStyle(bodyStyle)
  const isTruckVehicle = normalizedBodyStyle.includes('truck') || normalizedBodyStyle.includes('pickup')
  const isUsedVehicle = isUsedVehicleCondition(condition)
  const isRentalOnlyLuxury = Number(priceUsd) > 300000

  if (isRentalOnlyLuxury) {
    return {
      paymentTypes: ['rental'],
      rentable: true,
      isRentalOnlyLuxury,
      isTruckVehicle,
      isUsedVehicle,
    }
  }

  const nextPaymentTypes = basePaymentTypes.length ? [...basePaymentTypes] : ['full', 'installment']

  if (isUsedVehicle || isTruckVehicle) {
    nextPaymentTypes.push('rental')
  }

  return {
    paymentTypes: Array.from(new Set(nextPaymentTypes)),
    rentable: isUsedVehicle || isTruckVehicle ? true : rentable ?? true,
    isRentalOnlyLuxury,
    isTruckVehicle,
    isUsedVehicle,
  }
}

const createCarRecord = (input) => {
  const resolvedInput = attachVerifiedMedia(input)
  const mediaInput = resolvedInput.catalogManaged === false ? resolvedInput : sanitizeCatalogMedia(resolvedInput)
  const priceUsd = Number(mediaInput.priceUsd)
  const minimumDepositUsd = Number(mediaInput.minimumDepositUsd)
  const bodyStyle = mediaInput.bodyStyle
  const durations = mediaInput.installmentDurations?.length
    ? mediaInput.installmentDurations.map((value) => Number(value))
    : [6, 12, 18, 24]
  const defaultCountry = getCountrySettings(DEFAULT_COUNTRY_CODE)
  const commerceProfile = buildVehicleCommerceProfile({
    bodyStyle,
    condition: mediaInput.condition,
    priceUsd,
    paymentTypes: mediaInput.paymentTypes,
    rentable: mediaInput.rentable,
  })
  const highlights = Array.from(new Set([
    ...(mediaInput.highlights || []),
    commerceProfile.isRentalOnlyLuxury
      ? 'Worldwide premium rental coordination available'
      : 'Worldwide delivery and export support available',
  ]))

  return attachVehicleDisplayMedia({
    id: mediaInput.id,
    badge: mediaInput.badge || 'Featured',
    brand: mediaInput.brand,
    model: mediaInput.model,
    year: Number(mediaInput.year),
    mileage: Number(mediaInput.mileage),
    location: mediaInput.location,
    condition: mediaInput.condition,
    priceUsd,
    priceLocal: Math.round(priceUsd * defaultCountry.exchangeRate),
    currencyCode: defaultCountry.currencyCode,
    minimumDepositUsd,
    installmentDurations: durations,
    monthlyPlans: buildPlans(priceUsd, minimumDepositUsd, durations),
    paymentTypes: commerceProfile.paymentTypes,
    rentable: commerceProfile.rentable,
    rentalTerms: normalizeRentalTerms(mediaInput.rentalTerms, priceUsd, bodyStyle),
    bodyStyle,
    fuelType: mediaInput.fuelType,
    transmission: mediaInput.transmission,
    drivetrain: mediaInput.drivetrain,
    exteriorColor: mediaInput.exteriorColor,
    interiorColor: mediaInput.interiorColor,
    description: mediaInput.description,
    mediaVerified: Boolean(mediaInput.mediaVerified),
    heroImage: mediaInput.heroImage || '',
    gallery: mediaInput.gallery || [],
    features: mediaInput.features || [],
    highlights,
    delivery: {
      feeUsd: Number(mediaInput.delivery?.feeUsd || 0),
      eta: mediaInput.delivery?.eta || '2-5 business days',
    },
  })
}

const createUserRecord = (input) => ({
  id: input.id,
  fullName: input.fullName,
  email: input.email,
  phone: input.phone,
  password: input.password,
  role: input.role || 'user',
  country: input.country || DEFAULT_COUNTRY_CODE,
  location: input.location || 'Not set',
  favoriteCarIds: input.favoriteCarIds || [],
  notifications: input.notifications || [],
})

const cars = [
  createCarRecord({
    id: 'lexus-lx-600-2023', badge: 'Flagship', brand: 'Lexus', model: 'LX 600 F SPORT', year: 2023, mileage: 8200,
    location: 'Houston', condition: 'Certified used', priceUsd: 128000, minimumDepositUsd: 15000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Petrol', transmission: '10-speed automatic', drivetrain: 'AWD', exteriorColor: 'Obsidian Black', interiorColor: 'Saddle Tan',
    description: 'A flagship luxury SUV positioned in our Texas partner inventory with commanding road presence, executive rear comfort, and full verification before payment.',
    heroImage: 'https://images.unsplash.com/photo-1494905998402-395d579af36f?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1494905998402-395d579af36f?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1200&q=80'],
    features: ['360 camera', 'Mark Levinson audio', 'Ventilated seats', 'Adaptive suspension'],
    highlights: ['Houston inspection available same day', 'Financing up to 24 months', 'Verified VIN report included'],
    delivery: { feeUsd: 350, eta: '2-4 business days after approval' },
  }),
  createCarRecord({
    id: 'mercedes-s580-2022', badge: 'Executive', brand: 'Mercedes-Benz', model: 'S 580 4MATIC', year: 2022, mileage: 15400,
    location: 'Atlanta', condition: 'Certified used', priceUsd: 146000, minimumDepositUsd: 18000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Sedan', fuelType: 'Petrol', transmission: '9-speed automatic', drivetrain: 'AWD', exteriorColor: 'Graphite Grey', interiorColor: 'Macchiato Beige',
    description: 'Long-wheelbase comfort and modern safety technology for buyers who want chauffeured luxury sourced through our Atlanta executive showroom network.',
    heroImage: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=1200&q=80'],
    features: ['Rear executive seating', 'Burmester 4D audio', 'Air suspension', 'Night package'],
    highlights: ['Atlanta showroom verification appointment', 'Bank transfer or escrow supported', 'Business registration details available'],
    delivery: { feeUsd: 420, eta: '3-5 business days after deposit confirmation' },
  }),
  createCarRecord({
    id: 'toyota-land-cruiser-2021', badge: 'Popular', brand: 'Toyota', model: 'Land Cruiser GR Sport', year: 2021, mileage: 27600,
    location: 'Dallas', condition: 'Certified used', priceUsd: 93000, minimumDepositUsd: 9000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Petrol', transmission: '10-speed automatic', drivetrain: '4WD', exteriorColor: 'Pearl White', interiorColor: 'Black Leather',
    description: 'A dependable premium SUV for families and fleet buyers, offered through our Dallas stock with clear ownership records and flexible monthly plans.',
    heroImage: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=1200&q=80'],
    features: ['Crawl control', 'Adaptive cruise', 'Third-row seating', 'Off-road package'],
    highlights: ['Ideal for installment buyers', 'Dallas inspection and test drive required before release', 'Delivery only after approval'],
    delivery: { feeUsd: 300, eta: '2-4 business days after approval' },
  }),
  createCarRecord({
    id: 'bmw-x7-2023', badge: 'New Arrival', brand: 'BMW', model: 'X7 xDrive40i', year: 2023, mileage: 10900,
    location: 'Chicago', condition: 'Certified used', priceUsd: 118500, minimumDepositUsd: 14000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Petrol', transmission: '8-speed automatic', drivetrain: 'AWD', exteriorColor: 'Black Sapphire', interiorColor: 'Ivory White',
    description: 'Spacious three-row comfort with a refined digital cabin and payment options structured for executives and family buyers sourcing through Chicago.',
    heroImage: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1523983388277-336a66bf9bcd?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1200&q=80'],
    features: ['Panoramic roof', 'Gesture control', 'Harman Kardon audio', 'Air suspension'],
    highlights: ['Chicago inspection before any release', 'Automated receipts for all payments', 'Delivery request after deposit'],
    delivery: { feeUsd: 360, eta: '2-5 business days after payment verification' },
  }),
  createCarRecord({
    id: 'range-rover-sport-2022', badge: 'Premium', brand: 'Land Rover', model: 'Range Rover Sport HSE', year: 2022, mileage: 19100,
    location: 'San Francisco', condition: 'Certified used', priceUsd: 121000, minimumDepositUsd: 15000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Petrol', transmission: '8-speed automatic', drivetrain: 'AWD', exteriorColor: 'Santorini Black', interiorColor: 'Ebony',
    description: 'Performance SUV styling with a carefully documented ownership trail, suited for buyers who want West Coast inventory with flexible financing.',
    heroImage: 'https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?auto=format&fit=crop&w=1200&q=80'],
    features: ['Terrain response', 'Meridian audio', 'Matrix LED', 'Heated steering'],
    highlights: ['Bay Area delivery estimate shown upfront', 'Escrow available for qualified buyers', 'Inspection-first process'],
    delivery: { feeUsd: 480, eta: '5-7 business days after financing approval' },
  }),
  createCarRecord({
    id: 'porsche-cayenne-2024', badge: 'Collector Pick', brand: 'Porsche', model: 'Cayenne Platinum Edition', year: 2024, mileage: 4200,
    location: 'Osaka', condition: 'Brand new', priceUsd: 136000, minimumDepositUsd: 20000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Petrol', transmission: '8-speed Tiptronic', drivetrain: 'AWD', exteriorColor: 'Jet Black Metallic', interiorColor: 'Bordeaux Red',
    description: 'A high-specification luxury SUV for discerning buyers who want a premium Japan-market import experience with documented financing and compliance steps.',
    heroImage: 'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1485291571150-772bcfc10da5?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80'],
    features: ['Sport Chrono package', 'BOSE surround', 'Head-up display', 'Adaptive sport seats'],
    highlights: ['Osaka import documentation disclosed', 'Loan and escrow workflows supported', 'Premium concierge inspection scheduling'],
    delivery: { feeUsd: 650, eta: '7-10 business days after release approval' },
  }),
  createCarRecord({
    id: 'cadillac-escalade-v-2024', badge: 'USA Arrival', brand: 'Cadillac', model: 'Escalade V', year: 2024, mileage: 6100,
    location: 'Los Angeles', condition: 'Certified used', priceUsd: 164000, minimumDepositUsd: 22000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Petrol', transmission: '10-speed automatic', drivetrain: 'AWD', exteriorColor: 'Black Raven', interiorColor: 'Jet Black',
    description: 'A full-size performance luxury SUV sourced from the US market with bold styling, concierge inspection support, and transparent financing terms.',
    heroImage: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1200&q=80'],
    features: ['Super Cruise', 'AKG studio audio', 'Executive second row', 'Night vision'],
    highlights: ['US-based inventory release', 'High-value vehicle verification included', 'Ideal for executive family transport'],
    delivery: { feeUsd: 540, eta: '2-5 business days after approval' },
  }),
  createCarRecord({
    id: 'tesla-model-x-plaid-2024', badge: 'Electric', brand: 'Tesla', model: 'Model X Plaid', year: 2024, mileage: 3400,
    location: 'New York', condition: 'Brand new', priceUsd: 129500, minimumDepositUsd: 17000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Electric', transmission: 'Single-speed', drivetrain: 'AWD', exteriorColor: 'Pearl White', interiorColor: 'Cream',
    description: 'High-performance electric luxury SUV with falcon-wing doors, digital controls, and an America-based handover process.',
    heroImage: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1200&q=80'],
    features: ['Autopilot', 'Six-seat layout', 'HEPA filtration', 'Panoramic windshield'],
    highlights: ['Popular US luxury EV', 'Inspection available in Manhattan partner showroom', 'Receipt and escrow workflow supported'],
    delivery: { feeUsd: 510, eta: '3-6 business days after payment verification' },
  }),
  createCarRecord({
    id: 'mercedes-g63-2023', badge: 'Miami Select', brand: 'Mercedes-Benz', model: 'AMG G 63', year: 2023, mileage: 7800,
    location: 'Miami', condition: 'Certified used', priceUsd: 198000, minimumDepositUsd: 28000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Petrol', transmission: '9-speed automatic', drivetrain: 'AWD', exteriorColor: 'Magno Black', interiorColor: 'Classic Red',
    description: 'An ultra-premium luxury icon with US showroom access, detailed ownership records, and structured monthly plans.',
    heroImage: 'https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80'],
    features: ['AMG performance exhaust', 'Burmester audio', 'Nappa leather', '360 camera'],
    highlights: ['Miami-based inspection scheduling', 'High-deposit buyers supported', 'Ideal for premium export or US handover'],
    delivery: { feeUsd: 620, eta: '3-5 business days after release approval' },
  }),
  createCarRecord({
    id: 'lexus-lm-500h-2024', badge: 'Asia Exclusive', brand: 'Lexus', model: 'LM 500h Ultra Luxury', year: 2024, mileage: 2500,
    location: 'Tokyo', condition: 'Brand new', priceUsd: 172000, minimumDepositUsd: 24000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Luxury Van', fuelType: 'Hybrid', transmission: 'Automatic', drivetrain: 'AWD', exteriorColor: 'Sonic Titanium', interiorColor: 'White Leather',
    description: 'A chauffeur-grade luxury MPV from Japan with private lounge seating and Asia-market documentation for careful buyers.',
    heroImage: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?auto=format&fit=crop&w=1200&q=80'],
    features: ['Rear lounge package', 'Hybrid powertrain', 'Mark Levinson audio', 'Executive climate control'],
    highlights: ['Japan-market luxury import', 'Asia documentation reviewed before release', 'High-comfort chauffeur configuration'],
    delivery: { feeUsd: 700, eta: '7-12 business days after approval' },
  }),
  createCarRecord(withStockPhotos('lexus rx 350 f sport handling suv', {
    id: 'lexus-rx-350-f-sport-2024', badge: 'Fresh Arrival', brand: 'Lexus', model: 'RX 350 F SPORT Handling', year: 2024, mileage: 3900,
    location: 'Miami', condition: 'Certified used', priceUsd: 64800, minimumDepositUsd: 8500, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Petrol', transmission: '8-speed automatic', drivetrain: 'AWD', exteriorColor: 'Ultra White', interiorColor: 'Black NuLuxe',
    description: 'A sharp RX configured in F SPORT Handling trim for buyers who want Lexus comfort with a firmer chassis, clean design, and straightforward monthly planning.',
    features: ['Panoramic roof', '14-inch touchscreen', 'Head-up display', 'Adaptive variable suspension'],
    highlights: ['Miami showroom handover available', 'Clean Carfax available on request', 'Deposit and installment options active'],
    delivery: { feeUsd: 290, eta: '2-4 business days after approval' },
  })),
  createCarRecord(withStockPhotos('lexus rx 500h f sport performance suv', {
    id: 'lexus-rx-500h-f-sport-2024', badge: 'Hybrid Performance', brand: 'Lexus', model: 'RX 500h F SPORT Performance', year: 2024, mileage: 2100,
    location: 'Los Angeles', condition: 'Certified used', priceUsd: 76200, minimumDepositUsd: 9800, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Hybrid', transmission: '6-speed automatic', drivetrain: 'AWD', exteriorColor: 'Copper Crest', interiorColor: 'Dark Rose Leather',
    description: 'A range-topping RX hybrid with stronger mid-range response, rich interior trim, and premium crossover practicality for buyers who want a more current Lexus spec.',
    features: ['DIRECT4 AWD', 'Mark Levinson surround audio', 'Dynamic rear steering', 'Advanced Park assist'],
    highlights: ['West Coast delivery lane open', 'Hybrid flagship RX allocation', 'Full inspection before release'],
    delivery: { feeUsd: 340, eta: '3-5 business days after approval' },
  })),
  createCarRecord(withStockPhotos('lexus rx 350h luxury suv', {
    id: 'lexus-rx-350h-luxury-2025', badge: 'Luxury Hybrid', brand: 'Lexus', model: 'RX 350h Luxury', year: 2025, mileage: 1200,
    location: 'Seattle', condition: 'Certified used', priceUsd: 69800, minimumDepositUsd: 9000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Hybrid', transmission: 'eCVT', drivetrain: 'AWD', exteriorColor: 'Nightfall Mica', interiorColor: 'Macadamia Leather',
    description: 'This RX 350h Luxury is positioned for buyers who want Lexus efficiency, softer long-distance comfort, and a polished cabin rather than aggressive trim styling.',
    features: ['Semi-aniline leather', 'Digital rearview mirror', 'Panoramic view monitor', 'Triple-beam LED headlamps'],
    highlights: ['New-model hybrid inventory', 'Seattle-origin inspection slot available', 'Ideal for executive city use'],
    delivery: { feeUsd: 360, eta: '3-5 business days after approval' },
  })),
  createCarRecord(withStockPhotos('lexus es 350 ultra luxury sedan', {
    id: 'lexus-es-350-ultra-luxury-2024', badge: 'Executive Sedan', brand: 'Lexus', model: 'ES 350 Ultra Luxury', year: 2024, mileage: 4300,
    location: 'Atlanta', condition: 'Certified used', priceUsd: 52900, minimumDepositUsd: 7200, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Sedan', fuelType: 'Petrol', transmission: '8-speed automatic', drivetrain: 'FWD', exteriorColor: 'Caviar', interiorColor: 'Acorn Leather',
    description: 'A comfort-first ES with the softer ride quality, quiet cabin, and rear-seat friendliness that make it an easy step into premium executive transport.',
    features: ['17-speaker Mark Levinson audio', 'Power rear sunshade', 'Heated wood-trim steering wheel', 'Panoramic glass roof'],
    highlights: ['Atlanta executive stock', 'Well-suited to chauffeur or owner-driver use', 'Low-mile Ultra Luxury trim'],
    delivery: { feeUsd: 250, eta: '2-4 business days after approval' },
  })),
  createCarRecord(withStockPhotos('lexus es 300h luxury sedan', {
    id: 'lexus-es-300h-luxury-2025', badge: 'Fuel Saver', brand: 'Lexus', model: 'ES 300h Luxury', year: 2025, mileage: 1600,
    location: 'Chicago', condition: 'Certified used', priceUsd: 54800, minimumDepositUsd: 7500, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Sedan', fuelType: 'Hybrid', transmission: 'eCVT', drivetrain: 'FWD', exteriorColor: 'Iridium', interiorColor: 'Palomino Leather',
    description: 'A new ES 300h configured for buyers who want lower running costs, quiet cruising, and the classic Lexus sedan format without stepping into a large flagship.',
    features: ['Hybrid efficiency system', '12.3-inch multimedia display', 'Blind spot monitor', 'Lexus Safety System+ 3.0'],
    highlights: ['Chicago metro inventory', 'Strong commuter and executive value', 'Soft-touch Lexus cabin finish'],
    delivery: { feeUsd: 260, eta: '2-4 business days after approval' },
  })),
  createCarRecord(withStockPhotos('lexus rx 350 premium suv used', {
    id: 'lexus-rx-350-premium-2023', badge: 'Neatly Used RX', brand: 'Lexus', model: 'RX 350 Premium', year: 2023, mileage: 11800,
    location: 'London', condition: 'Certified used', priceUsd: 51800, minimumDepositUsd: 6800, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Petrol', transmission: '8-speed automatic', drivetrain: 'AWD', exteriorColor: 'Cloudburst Grey', interiorColor: 'Macadamia Leather',
    description: 'A neatly used RX built for global family buyers who want clean Lexus comfort, practical running costs, and verified export-ready paperwork.',
    features: ['Blind spot monitor', 'Wireless Apple CarPlay', 'Panoramic roof', 'Power tailgate'],
    highlights: ['London export lane active', 'Clean used RX stock with verified gallery images', 'Purchase and rental options both available'],
    delivery: { feeUsd: 420, eta: '4-8 business days after approval' },
  })),
  createCarRecord(withStockPhotos('lexus rx 350h premium plus used suv', {
    id: 'lexus-rx-350h-premium-plus-2024', badge: 'Used Hybrid RX', brand: 'Lexus', model: 'RX 350h Premium+', year: 2024, mileage: 9600,
    location: 'Dubai', condition: 'Certified used', priceUsd: 57200, minimumDepositUsd: 7600, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Hybrid', transmission: 'eCVT', drivetrain: 'AWD', exteriorColor: 'Sonic Copper', interiorColor: 'Black Leather',
    description: 'A neatly used RX hybrid with a smoother ride, lower fuel spend, and a worldwide delivery profile for buyers moving between city and long-distance use.',
    features: ['Panoramic monitor', 'Mark Levinson audio', 'Digital key', 'Heated and ventilated seats'],
    highlights: ['Dubai inspection and export support', 'Hybrid RX kept in neatly used condition', 'Low-mile premium-plus trim'],
    delivery: { feeUsd: 470, eta: '5-9 business days after approval' },
  })),
  createCarRecord(withStockPhotos('lexus es 250 awd sedan', {
    id: 'lexus-es-250-awd-2024', badge: 'All Weather', brand: 'Lexus', model: 'ES 250 AWD', year: 2024, mileage: 5800,
    location: 'New York', condition: 'Certified used', priceUsd: 47100, minimumDepositUsd: 6500, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Sedan', fuelType: 'Petrol', transmission: '8-speed automatic', drivetrain: 'AWD', exteriorColor: 'Cloudburst Grey', interiorColor: 'Black Leather',
    description: 'An ES 250 AWD for buyers who want Lexus sedan refinement with extra year-round traction and a cleaner monthly entry point than the larger SUV inventory.',
    features: ['AWD traction', 'Wireless Apple CarPlay', 'Blind spot monitor', 'Heated front seats'],
    highlights: ['New York handover possible', 'Lower-entry Lexus executive sedan', 'Strong winter-market fit'],
    delivery: { feeUsd: 240, eta: '2-4 business days after approval' },
  })),
  createCarRecord(withStockPhotos('lexus es 350 f sport used sedan', {
    id: 'lexus-es-350-f-sport-2023', badge: 'Used ES Sport', brand: 'Lexus', model: 'ES 350 F SPORT', year: 2023, mileage: 14300,
    location: 'Toronto', condition: 'Certified used', priceUsd: 41800, minimumDepositUsd: 5600, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Sedan', fuelType: 'Petrol', transmission: '8-speed automatic', drivetrain: 'FWD', exteriorColor: 'Ultra White', interiorColor: 'Circuit Red',
    description: 'A neatly used ES F SPORT for buyers who want a sportier Lexus sedan look without leaving the dependable daily-driver price range.',
    features: ['F SPORT seats', 'Adaptive variable suspension', '12.3-inch display', 'Blind spot assist'],
    highlights: ['Toronto handover and export support', 'Used ES trim with sporty cabin finish', 'Budget-conscious premium sedan option'],
    delivery: { feeUsd: 310, eta: '3-6 business days after approval' },
  })),
  createCarRecord(withStockPhotos('lexus es 250 luxury used sedan', {
    id: 'lexus-es-250-luxury-2022', badge: 'Entry Lexus', brand: 'Lexus', model: 'ES 250 Luxury', year: 2022, mileage: 22100,
    location: 'Johannesburg', condition: 'Certified used', priceUsd: 36200, minimumDepositUsd: 4900, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Sedan', fuelType: 'Petrol', transmission: '8-speed automatic', drivetrain: 'AWD', exteriorColor: 'Silver Lining', interiorColor: 'Rich Cream',
    description: 'A neatly used Lexus ES added for lower-entry buyers who want comfort, strong cabin quietness, and a calmer monthly target than SUV stock.',
    features: ['Leather trim', 'Memory seats', 'Parking sensors', 'Heated steering wheel'],
    highlights: ['Johannesburg export-ready desk', 'Lower-budget Lexus executive sedan', 'Used condition verified before release'],
    delivery: { feeUsd: 520, eta: '6-10 business days after approval' },
  })),
  createCarRecord(withStockPhotos('lexus gx 550 overtrail suv', {
    id: 'lexus-gx-550-overtrail-2025', badge: 'Trail Luxe', brand: 'Lexus', model: 'GX 550 Overtrail+', year: 2025, mileage: 1800,
    location: 'Dallas', condition: 'Certified used', priceUsd: 84300, minimumDepositUsd: 11000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Petrol', transmission: '10-speed automatic', drivetrain: '4WD', exteriorColor: 'Incognito', interiorColor: 'Black Leather',
    description: 'A new GX 550 Overtrail+ blending Lexus cabin quality with a more squared-off body and proper off-road hardware for buyers who want a tougher premium SUV.',
    features: ['E-KDSS suspension', '33-inch all-terrain package', 'Crawl control', 'Panoramic monitor'],
    highlights: ['Dallas off-road luxury stock', 'New GX body style', 'Suitable for adventure-led family use'],
    delivery: { feeUsd: 330, eta: '3-5 business days after approval' },
  })),
  createCarRecord(withStockPhotos('toyota camry xse used sedan', {
    id: 'toyota-camry-xse-2023', badge: 'Budget Sedan', brand: 'Toyota', model: 'Camry XSE', year: 2023, mileage: 18600,
    location: 'Lagos', condition: 'Certified used', priceUsd: 28600, minimumDepositUsd: 3900, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Sedan', fuelType: 'Petrol', transmission: '8-speed automatic', drivetrain: 'FWD', exteriorColor: 'Supersonic Red', interiorColor: 'Black',
    description: 'A neatly used Camry added for buyers who want lower-budget comfort, easy parts access, and a clean daily-driver profile for global delivery.',
    features: ['Leather and suede trim', 'Adaptive cruise', 'Blind spot monitor', 'Dual-zone climate'],
    highlights: ['Lagos delivery lane open', 'Low-budget used Toyota sedan', 'Purchase and rental flow both supported'],
    delivery: { feeUsd: 540, eta: '6-10 business days after approval' },
  })),
  createCarRecord(withStockPhotos('toyota rav4 xle premium used suv', {
    id: 'toyota-rav4-xle-premium-2022', badge: 'Budget SUV', brand: 'Toyota', model: 'RAV4 XLE Premium', year: 2022, mileage: 23800,
    location: 'Nairobi', condition: 'Certified used', priceUsd: 27800, minimumDepositUsd: 3800, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Petrol', transmission: '8-speed automatic', drivetrain: 'AWD', exteriorColor: 'Blueprint', interiorColor: 'Ash Grey',
    description: 'A neatly used RAV4 for buyers who want durable SUV utility, strong resale confidence, and a lower monthly entry than the premium Lexus lane.',
    features: ['Power liftgate', 'Lane tracing assist', 'Moonroof', 'Wireless charging'],
    highlights: ['Nairobi global shipping coordination', 'Used Toyota SUV with clean gallery set', 'Popular lower-budget family option'],
    delivery: { feeUsd: 560, eta: '6-10 business days after approval' },
  })),
  createCarRecord(withStockPhotos('toyota corolla cross xle used suv', {
    id: 'toyota-corolla-cross-xle-2023', badge: 'Budget Crossover', brand: 'Toyota', model: 'Corolla Cross XLE', year: 2023, mileage: 17400,
    location: 'Accra', condition: 'Certified used', priceUsd: 24200, minimumDepositUsd: 3300, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Petrol', transmission: 'CVT', drivetrain: 'FWD', exteriorColor: 'Celestite', interiorColor: 'Black Fabric',
    description: 'A neatly used Corolla Cross built for lower-budget buyers who still want ground clearance, Toyota dependability, and worldwide delivery support.',
    features: ['Apple CarPlay', 'Roof rails', 'Blind spot monitor', 'Smart key'],
    highlights: ['Accra export and local-release support', 'Low-budget Toyota crossover', 'Clean daily-use family choice'],
    delivery: { feeUsd: 530, eta: '6-9 business days after approval' },
  })),
  createCarRecord(withStockPhotos('honda civic ex used sedan', {
    id: 'honda-civic-ex-2023', badge: 'Used Daily', brand: 'Honda', model: 'Civic EX', year: 2023, mileage: 21200,
    location: 'Kuala Lumpur', condition: 'Certified used', priceUsd: 22100, minimumDepositUsd: 3100, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Sedan', fuelType: 'Petrol', transmission: 'CVT', drivetrain: 'FWD', exteriorColor: 'Meteorite Grey', interiorColor: 'Black Cloth',
    description: 'A neatly used Civic that keeps the budget end of the catalog strong for buyers who want dependable transport with a cleaner ownership cost profile.',
    features: ['Honda Sensing', 'Remote start', 'Sunroof', '8-speaker audio'],
    highlights: ['Kuala Lumpur export route available', 'Low-budget used daily driver', 'Straightforward purchase or rental path'],
    delivery: { feeUsd: 590, eta: '7-11 business days after approval' },
  })),
  createCarRecord(withStockPhotos('acura mdx type s advance suv', {
    id: 'acura-mdx-type-s-2025', badge: 'Performance Family', brand: 'Acura', model: 'MDX Type S Advance', year: 2025, mileage: 2400,
    location: 'Scottsdale', condition: 'Brand new', priceUsd: 79200, minimumDepositUsd: 10200, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Petrol', transmission: '10-speed automatic', drivetrain: 'AWD', exteriorColor: 'Liquid Carbon Metallic', interiorColor: 'Red Leather',
    description: 'A sharper three-row SUV added for buyers cross-shopping Lexus RX and GX inventory but wanting a more aggressive steering and suspension setup.',
    features: ['ELS Studio 3D audio', 'Air suspension', 'Massaging front seats', '360 surround camera'],
    highlights: ['Scottsdale premium family stock', 'Strong RX/GX alternative', 'Deposit and finance plans available'],
    delivery: { feeUsd: 315, eta: '3-5 business days after approval' },
  })),
  createCarRecord(withStockPhotos('lexus tx 500h f sport premium suv', {
    id: 'lexus-tx-500h-f-sport-2025', badge: 'Three-Row Hybrid', brand: 'Lexus', model: 'TX 500h F SPORT Premium', year: 2025, mileage: 1400,
    location: 'Miami', condition: 'Certified used', priceUsd: 74200, minimumDepositUsd: 9600, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Hybrid', transmission: '6-speed automatic', drivetrain: 'AWD', exteriorColor: 'Wind Chill Pearl', interiorColor: 'Black Leather',
    description: 'A current TX hybrid added for buyers who want Lexus three-row practicality without leaving the premium comfort lane or the brand’s cleaner cabin design language.',
    features: ['Three-row seating', 'DIRECT4 AWD', 'Mark Levinson audio', 'Panoramic view monitor'],
    highlights: ['Miami family-luxury stock', 'Current three-row Lexus allocation', 'Strong RX upgrade path'],
    delivery: { feeUsd: 320, eta: '2-4 business days after approval' },
  })),
  createCarRecord(withStockPhotos('lexus is 500 f sport performance sedan', {
    id: 'lexus-is-500-f-sport-2024', badge: 'V8 Sport Sedan', brand: 'Lexus', model: 'IS 500 F SPORT Performance', year: 2024, mileage: 3200,
    location: 'Los Angeles', condition: 'Certified used', priceUsd: 64600, minimumDepositUsd: 8400, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Sedan', fuelType: 'Petrol', transmission: '8-speed automatic', drivetrain: 'RWD', exteriorColor: 'Infrared', interiorColor: 'Black NuLuxe',
    description: 'A compact Lexus sports sedan with the naturally aspirated V8 character enthusiasts still want, added for buyers cross-shopping executive sedans and lighter performance cars.',
    features: ['5.0-liter V8', 'Torsen limited-slip differential', 'Adaptive variable suspension', 'Performance exhaust'],
    highlights: ['West Coast enthusiast stock', 'Low-mile V8 Lexus sedan', 'Clean sports-sedan price point'],
    delivery: { feeUsd: 295, eta: '3-5 business days after approval' },
  })),
  createCarRecord(withStockPhotos('lexus lc 500 convertible coupe', {
    id: 'lexus-lc-500-convertible-2024', badge: 'Grand Touring', brand: 'Lexus', model: 'LC 500 Convertible', year: 2024, mileage: 2100,
    location: 'Scottsdale', condition: 'Brand new', priceUsd: 108500, minimumDepositUsd: 14200, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Coupe', fuelType: 'Petrol', transmission: '10-speed automatic', drivetrain: 'RWD', exteriorColor: 'Structural Blue', interiorColor: 'Toast Leather',
    description: 'An LC 500 Convertible for buyers who want a more emotional Lexus flagship with grand touring pace, premium finish, and a higher-visibility weekend profile.',
    features: ['Convertible soft top', 'Mark Levinson audio', 'Limited-slip differential', 'Adaptive dampers'],
    highlights: ['Scottsdale open-top GT stock', 'Lexus halo two-door added', 'Ideal for collector-style weekend ownership'],
    delivery: { feeUsd: 410, eta: '3-5 business days after approval' },
  })),
  createCarRecord(withStockPhotos('lexus ls 500 awd sedan', {
    id: 'lexus-ls-500-awd-2025', badge: 'Flagship Sedan', brand: 'Lexus', model: 'LS 500 AWD', year: 2025, mileage: 1100,
    location: 'New York', condition: 'Certified used', priceUsd: 93400, minimumDepositUsd: 12600, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Sedan', fuelType: 'Petrol', transmission: '10-speed automatic', drivetrain: 'AWD', exteriorColor: 'Manganese Luster', interiorColor: 'White and Art Wood',
    description: 'A full-size Lexus flagship sedan aimed at buyers who want a softer luxury alternative to German executive cars without dropping out of the top-tier cabin class.',
    features: ['Executive rear package', '28-way front seats', 'Kiriko glass trim', 'Air suspension'],
    highlights: ['New York executive inventory', 'Large-cabin Lexus flagship', 'Suitable for owner-driver or chauffeured use'],
    delivery: { feeUsd: 340, eta: '2-4 business days after approval' },
  })),
  createCarRecord(withStockPhotos('ferrari 296 gtb supercar coupe', {
    id: 'ferrari-296-gtb-2025', badge: 'Hybrid Supercar', brand: 'Ferrari', model: '296 GTB', year: 2025, mileage: 900,
    location: 'Miami', condition: 'Brand new', priceUsd: 372000, minimumDepositUsd: 61000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Coupe', fuelType: 'Hybrid', transmission: '8-speed dual clutch', drivetrain: 'RWD', exteriorColor: 'Rosso Corsa', interiorColor: 'Nero Alcantara',
    description: 'A mid-engine Ferrari hybrid supercar positioned for buyers who want cleaner current-era Maranello performance with transparent release steps and premium finance screening.',
    features: ['Plug-in hybrid V6', 'Assetto Fiorano package', 'Carbon racing seats', 'Digital telemetry'],
    highlights: ['Miami exotic lane allocation', 'Current Ferrari hybrid flagship feel', 'Collector-grade handover path'],
    delivery: { feeUsd: 940, eta: '3-6 business days after approval' },
  })),
  createCarRecord(withStockPhotos('lamborghini revuelto supercar coupe', {
    id: 'lamborghini-revuelto-2025', badge: 'V12 Halo', brand: 'Lamborghini', model: 'Revuelto', year: 2025, mileage: 600,
    location: 'Beverly Hills', condition: 'Brand new', priceUsd: 689000, minimumDepositUsd: 115000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Coupe', fuelType: 'Hybrid', transmission: '8-speed dual clutch', drivetrain: 'AWD', exteriorColor: 'Verde Citrea', interiorColor: 'Nero Ade',
    description: 'A top-shelf Lamborghini halo car added for clients searching genuine current-generation supercar inventory rather than only SUV-led exotic stock.',
    features: ['Naturally aspirated V12 hybrid', 'Carbon monofuselage', 'Rear-wheel steering', 'Active aero package'],
    highlights: ['Beverly Hills halo allocation', 'Highest-tier exotic inventory now live', 'Inspection and finance handled separately'],
    delivery: { feeUsd: 1250, eta: '4-7 business days after approval' },
  })),
  createCarRecord(withStockPhotos('mclaren 720s spider supercar', {
    id: 'mclaren-720s-spider-2024', badge: 'Track and Open Air', brand: 'McLaren', model: '720S Spider', year: 2024, mileage: 1700,
    location: 'Las Vegas', condition: 'Certified used', priceUsd: 318000, minimumDepositUsd: 52000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Coupe', fuelType: 'Petrol', transmission: '7-speed dual clutch', drivetrain: 'RWD', exteriorColor: 'Papaya Spark', interiorColor: 'Carbon Black',
    description: 'A 720S Spider for buyers who want a lighter, sharper exotic than the larger GT crowd, now added to the US supercar selection with a cleaner monthly profile than the absolute halo tier.',
    features: ['Retractable hard top', 'Carbon Monocage II-S', 'Bowers & Wilkins audio', 'Variable drift control'],
    highlights: ['Las Vegas supercar lane', 'Open-top McLaren stock added', 'Strong exotic finance candidate'],
    delivery: { feeUsd: 880, eta: '3-6 business days after approval' },
  })),
  createCarRecord(withStockPhotos('porsche 911 gt3 rs coupe', {
    id: 'porsche-911-gt3-rs-2025', badge: 'Track Weapon', brand: 'Porsche', model: '911 GT3 RS', year: 2025, mileage: 800,
    location: 'Chicago', condition: 'Brand new', priceUsd: 348000, minimumDepositUsd: 57000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Coupe', fuelType: 'Petrol', transmission: '7-speed PDK', drivetrain: 'RWD', exteriorColor: 'Arctic Grey', interiorColor: 'Black and Guards Red',
    description: 'A serious GT3 RS allocation now on the board for clients who want a proper track-focused Porsche in the same premium buying workflow as the larger exotic inventory.',
    features: ['Active aerodynamics', 'Weissach package', 'Carbon bucket seats', 'Track telemetry'],
    highlights: ['Chicago performance allocation', 'High-demand Porsche halo stock', 'Track-focused coupe now live'],
    delivery: { feeUsd: 760, eta: '3-5 business days after approval' },
  })),
  createCarRecord(withStockPhotos('bmw m5 touring performance sedan', {
    id: 'bmw-m5-touring-2025', badge: 'Fast Estate', brand: 'BMW', model: 'M5 Touring', year: 2025, mileage: 1200,
    location: 'New York', condition: 'Brand new', priceUsd: 154000, minimumDepositUsd: 22000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Sedan', fuelType: 'Hybrid', transmission: '8-speed automatic', drivetrain: 'AWD', exteriorColor: 'Frozen Deep Grey', interiorColor: 'Silverstone Leather',
    description: 'A new-generation M5 Touring added for buyers who want super-sedan pace with more usable luggage space and a more understated badge than the usual exotic lane.',
    features: ['M xDrive', 'Carbon roof', 'Bowers & Wilkins audio', 'Adaptive M suspension'],
    highlights: ['New York performance wagon stock', 'Strong executive performance alternative', 'Hybrid M flagship now live'],
    delivery: { feeUsd: 410, eta: '2-4 business days after approval' },
  })),
  createCarRecord(withStockPhotos('mercedes amg gt 63 s e performance coupe', {
    id: 'mercedes-amg-gt63-se-2025', badge: 'Hybrid AMG', brand: 'Mercedes-AMG', model: 'GT 63 S E Performance', year: 2025, mileage: 900,
    location: 'Miami', condition: 'Brand new', priceUsd: 198000, minimumDepositUsd: 29000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Coupe', fuelType: 'Hybrid', transmission: '9-speed automatic', drivetrain: 'AWD', exteriorColor: 'Manufaktur Alpine Grey', interiorColor: 'Black Nappa',
    description: 'A modern AMG hybrid halo coupe for buyers who want Mercedes muscle with current-generation cabin tech and a sharper exotic-adjacent presence.',
    features: ['AMG Performance 4MATIC+', 'Active rear steering', 'Burmester high-end audio', 'Carbon ceramic brakes'],
    highlights: ['Miami AMG halo inventory', 'Strong Porsche and McLaren crossover option', 'Premium finance-ready coupe'],
    delivery: { feeUsd: 460, eta: '2-4 business days after approval' },
  })),
  createCarRecord(withStockPhotos('maserati mc20 supercar coupe', {
    id: 'maserati-mc20-2024', badge: 'Italian Mid-Engine', brand: 'Maserati', model: 'MC20', year: 2024, mileage: 1500,
    location: 'Beverly Hills', condition: 'Certified used', priceUsd: 276000, minimumDepositUsd: 43000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Coupe', fuelType: 'Petrol', transmission: '8-speed dual clutch', drivetrain: 'RWD', exteriorColor: 'Bianco Audace', interiorColor: 'Nero Alcantara',
    description: 'A lighter Italian supercar added for clients who want a mid-engine exotic with a rarer badge and a more distinctive collector profile than the mainstream choices.',
    features: ['Nettuno V6', 'Carbon fiber tub', 'Lift system', 'Sonus faber audio'],
    highlights: ['Beverly Hills boutique exotic stock', 'Rare badge in current inventory', 'Collector-friendly documentation'],
    delivery: { feeUsd: 870, eta: '3-6 business days after approval' },
  })),
  createCarRecord(withStockPhotos('mclaren artura supercar coupe', {
    id: 'mclaren-artura-2025', badge: 'Hybrid Exotic', brand: 'McLaren', model: 'Artura', year: 2025, mileage: 700,
    location: 'Las Vegas', condition: 'Brand new', priceUsd: 289000, minimumDepositUsd: 45000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Coupe', fuelType: 'Hybrid', transmission: '8-speed dual clutch', drivetrain: 'RWD', exteriorColor: 'Flux Green', interiorColor: 'Jet Black',
    description: 'A current McLaren hybrid exotic for buyers who want newer-generation Woking design and a cleaner entry price than the more expensive halo models.',
    features: ['Plug-in hybrid V6', 'Carbon fiber architecture', 'Nose lift', 'Clubsport seats'],
    highlights: ['Las Vegas current McLaren allocation', 'Hybrid exotic now live', 'Strong entry point into true supercar stock'],
    delivery: { feeUsd: 890, eta: '3-6 business days after approval' },
  })),
  createCarRecord(withStockPhotos('chevrolet corvette z06 supercar coupe', {
    id: 'chevrolet-corvette-z06-2025', badge: 'American Track', brand: 'Chevrolet', model: 'Corvette Z06', year: 2025, mileage: 1100,
    location: 'Austin', condition: 'Brand new', priceUsd: 168000, minimumDepositUsd: 24000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Coupe', fuelType: 'Petrol', transmission: '8-speed dual clutch', drivetrain: 'RWD', exteriorColor: 'Accelerate Yellow', interiorColor: 'Jet Black',
    description: 'An American flat-plane-crank supercar added for buyers who want true exotic performance without stepping into the highest Ferrari or Lamborghini pricing tier.',
    features: ['Flat-plane V8', 'Front lift', 'Performance data recorder', 'Carbon aero package'],
    highlights: ['Austin performance lane', 'US supercar alternative', 'Aggressive value inside the exotic bracket'],
    delivery: { feeUsd: 430, eta: '2-5 business days after approval' },
  })),
  createCarRecord({
    id: 'toyota-alphard-2024', badge: 'Asia Family', brand: 'Toyota', model: 'Alphard Executive Lounge', year: 2024, mileage: 5100,
    location: 'Singapore', condition: 'Foreign used', priceUsd: 108000, minimumDepositUsd: 13000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Luxury Van', fuelType: 'Hybrid', transmission: 'CVT', drivetrain: 'FWD', exteriorColor: 'Precious Metal', interiorColor: 'Beige',
    description: 'A luxury people-mover with premium second-row comfort, ideal for family buyers or hospitality operators sourcing from Asia.',
    heroImage: 'https://images.unsplash.com/photo-1517026575980-3e1e2dedeab4?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1517026575980-3e1e2dedeab4?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=80'],
    features: ['Ottoman captain seats', 'JBL audio', 'Digital rear mirror', 'Power sliding doors'],
    highlights: ['Singapore-based vehicle history', 'Family and hotel shuttle use case', 'Installment-friendly pricing'],
    delivery: { feeUsd: 560, eta: '6-9 business days after payment confirmation' },
  }),
  createCarRecord({
    id: 'nissan-gtr-2022', badge: 'Performance Asia', brand: 'Nissan', model: 'GT-R Premium', year: 2022, mileage: 8900,
    location: 'Seoul', condition: 'Foreign used', priceUsd: 149000, minimumDepositUsd: 21000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Coupe', fuelType: 'Petrol', transmission: '6-speed dual clutch', drivetrain: 'AWD', exteriorColor: 'Gun Metallic', interiorColor: 'Black',
    description: 'A serious high-performance coupe sourced through Asia, offered with documented verification and transparent export-ready release terms.',
    heroImage: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80'],
    features: ['Brembo brakes', 'Bose audio', 'Launch control', 'Performance telemetry'],
    highlights: ['Seoul-market performance vehicle', 'Specialist inspection before release', 'Collector-grade documentation'],
    delivery: { feeUsd: 640, eta: '6-10 business days after approval' },
  }),
  createCarRecord({
    id: 'audi-rs7-2024', badge: 'US Sportback', brand: 'Audi', model: 'RS 7 Performance', year: 2024, mileage: 3900,
    location: 'Los Angeles', condition: 'Brand new', priceUsd: 158000, minimumDepositUsd: 23000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Sportback', fuelType: 'Petrol', transmission: '8-speed automatic', drivetrain: 'AWD', exteriorColor: 'Daytona Gray', interiorColor: 'Black Valcona',
    description: 'A four-door performance flagship from our California pipeline, pairing supercar pace with daily luxury and transparent finance structure.',
    heroImage: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1502161254066-6c74afbf07aa?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80'],
    features: ['RS dynamic package', 'Bang & Olufsen audio', 'Carbon optics', 'All-wheel steering'],
    highlights: ['California-based verification slot', 'Performance finance profile supported', 'Executive and enthusiast appeal'],
    delivery: { feeUsd: 575, eta: '2-5 business days after payment verification' },
  }),
  createCarRecord({
    id: 'rolls-royce-ghost-2023', badge: 'Ultra Luxury', brand: 'Rolls-Royce', model: 'Ghost Extended', year: 2023, mileage: 2800,
    location: 'Miami', condition: 'Certified used', priceUsd: 348000, minimumDepositUsd: 55000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Sedan', fuelType: 'Petrol', transmission: '8-speed automatic', drivetrain: 'AWD', exteriorColor: 'Black Diamond', interiorColor: 'Arctic White',
    description: 'A chauffeur-grade ultra-luxury sedan in our Miami collection for buyers who want top-tier provenance, concierge handling, and discreet payment workflows.',
    heroImage: 'https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1200&q=80'],
    features: ['Starlight headliner', 'Rear theatre seating', 'Bespoke audio', 'Signature umbrella doors'],
    highlights: ['Miami private inspection suite', 'Escrow preferred for premium transfers', 'Ideal for chauffeured executive ownership'],
    delivery: { feeUsd: 840, eta: '3-6 business days after release approval' },
  }),
  createCarRecord({
    id: 'ferrari-purosangue-2024', badge: 'Exotic US', brand: 'Ferrari', model: 'Purosangue', year: 2024, mileage: 1900,
    location: 'Las Vegas', condition: 'Brand new', priceUsd: 425000, minimumDepositUsd: 70000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Performance SUV', fuelType: 'Petrol', transmission: '8-speed dual clutch', drivetrain: 'AWD', exteriorColor: 'Nero Daytona', interiorColor: 'Rosso Ferrari',
    description: 'Ferrari’s four-door performance statement sourced from our US exotic network, built for collectors who still want clarity on verification and release terms.',
    heroImage: 'https://images.unsplash.com/photo-1502161254066-6c74afbf07aa?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1502161254066-6c74afbf07aa?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80'],
    features: ['Naturally aspirated V12', 'Carbon roof', 'Adaptive suspension', 'Launch telemetry'],
    highlights: ['Las Vegas specialist inspection available', 'Collector-grade documentation pack', 'High-deposit approval path supported'],
    delivery: { feeUsd: 980, eta: '4-7 business days after approval' },
  }),
  createCarRecord({
    id: 'lamborghini-urus-2024', badge: 'Super SUV', brand: 'Lamborghini', model: 'Urus S', year: 2024, mileage: 2600,
    location: 'Bangkok', condition: 'Brand new', priceUsd: 289000, minimumDepositUsd: 46000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Petrol', transmission: '8-speed automatic', drivetrain: 'AWD', exteriorColor: 'Nero Helene', interiorColor: 'Nero Ade',
    description: 'A super-SUV from our Asia luxury channel with aggressive styling, fast approval workflows, and documented handover conditions.',
    heroImage: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?auto=format&fit=crop&w=1200&q=80'],
    features: ['ANIMA drive modes', 'Panoramic roof', 'Bang & Olufsen audio', 'Carbon ceramic brakes'],
    highlights: ['Bangkok-market sourcing verified', 'Asia import paperwork shared upfront', 'Fast-track premium delivery coordination'],
    delivery: { feeUsd: 860, eta: '6-10 business days after approval' },
  }),
  createCarRecord({
    id: 'bentley-bentayga-2024', badge: 'Desert Spec', brand: 'Bentley', model: 'Bentayga Speed', year: 2024, mileage: 3200,
    location: 'Scottsdale', condition: 'Brand new', priceUsd: 274000, minimumDepositUsd: 43000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Petrol', transmission: '8-speed automatic', drivetrain: 'AWD', exteriorColor: 'Onyx', interiorColor: 'Linen and Beluga',
    description: 'A grand touring Bentley SUV secured through our Arizona exotic desk with handcrafted cabin finishes and clearly documented release terms.',
    heroImage: 'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80'],
    features: ['Naim audio', 'Rear entertainment', 'Bentley Dynamic Ride', 'Touring specification'],
    highlights: ['Scottsdale private viewing available', 'High-balance finance cases supported', 'Collector-grade ownership file included'],
    delivery: { feeUsd: 780, eta: '3-6 business days after approval' },
  }),
  createCarRecord({
    id: 'aston-martin-dbx707-2024', badge: 'Northwest Exotic', brand: 'Aston Martin', model: 'DBX707', year: 2024, mileage: 4100,
    location: 'Seattle', condition: 'Certified used', priceUsd: 239000, minimumDepositUsd: 36000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Petrol', transmission: '9-speed automatic', drivetrain: 'AWD', exteriorColor: 'Xenon Grey', interiorColor: 'Oxford Tan',
    description: 'A high-output British performance SUV routed through our Seattle exotic network, blending daily usability with super-SUV pace.',
    heroImage: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?auto=format&fit=crop&w=1200&q=80'],
    features: ['Carbon roof', 'Bowers & Wilkins audio', 'Active anti-roll control', 'Sport exhaust'],
    highlights: ['Seattle handover route available', 'Verified ownership and service documentation', 'Rapid credit review for qualified buyers'],
    delivery: { feeUsd: 760, eta: '3-6 business days after approval' },
  }),
  createCarRecord({
    id: 'lucid-air-sapphire-2024', badge: 'EV Halo', brand: 'Lucid', model: 'Air Sapphire', year: 2024, mileage: 1800,
    location: 'San Jose', condition: 'Brand new', priceUsd: 262000, minimumDepositUsd: 40000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Sedan', fuelType: 'Electric', transmission: 'Single-speed', drivetrain: 'AWD', exteriorColor: 'Infinite Black', interiorColor: 'Santa Cruz',
    description: 'A tri-motor electric flagship from Silicon Valley inventory with hyper-sedan acceleration and structured premium finance options.',
    heroImage: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1200&q=80'],
    features: ['Tri-motor powertrain', 'Glass canopy roof', 'DreamDrive Pro', 'Massaging rear seats'],
    highlights: ['San Jose EV specialist inspection', 'Premium charging and ownership briefing', 'Eligible for structured high-value financing'],
    delivery: { feeUsd: 720, eta: '3-5 business days after payment confirmation' },
  }),
  createCarRecord({
    id: 'maybach-gls-600-2024', badge: 'Beverly Hills', brand: 'Mercedes-Maybach', model: 'GLS 600', year: 2024, mileage: 2700,
    location: 'Beverly Hills', condition: 'Brand new', priceUsd: 248000, minimumDepositUsd: 39000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Petrol', transmission: '9-speed automatic', drivetrain: 'AWD', exteriorColor: 'Obsidian Black and Mojave Silver', interiorColor: 'Crystal White',
    description: 'A Maybach flagship SUV reserved through our Beverly Hills partner showroom for buyers who want rear-cabin luxury without ambiguous terms.',
    heroImage: 'https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80'],
    features: ['Executive rear seats', 'E-Active Body Control', 'Burmester high-end 3D audio', 'Champagne cooler'],
    highlights: ['Beverly Hills private suite viewing', 'White-glove paperwork handling', 'Preferred for chauffeur and owner-driver clients'],
    delivery: { feeUsd: 795, eta: '3-5 business days after approval' },
  }),
  createCarRecord({
    id: 'honda-nsx-type-s-2022', badge: 'Japan Halo', brand: 'Honda', model: 'NSX Type S', year: 2022, mileage: 5200,
    location: 'Yokohama', condition: 'Foreign used', priceUsd: 228000, minimumDepositUsd: 34000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Coupe', fuelType: 'Hybrid', transmission: '9-speed dual clutch', drivetrain: 'AWD', exteriorColor: 'Berlina Black', interiorColor: 'Red Alcantara',
    description: 'A rare Japan-market hybrid supercar sourced through Yokohama, offered with collector documentation and careful cross-border release handling.',
    heroImage: 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1489824904134-891ab64532f1?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1502161254066-6c74afbf07aa?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80'],
    features: ['Sport Hybrid SH-AWD', 'Carbon package', 'ELS Studio audio', 'Track mode telemetry'],
    highlights: ['Yokohama collector inspection offered', 'Rare allocation paperwork included', 'Ideal for enthusiast finance and escrow'],
    delivery: { feeUsd: 770, eta: '7-11 business days after approval' },
  }),
  createCarRecord({
    id: 'toyota-century-suv-2024', badge: 'Japan State Class', brand: 'Toyota', model: 'Century SUV', year: 2024, mileage: 900,
    location: 'Nagoya', condition: 'Brand new', priceUsd: 212000, minimumDepositUsd: 32000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Hybrid', transmission: 'Automatic', drivetrain: 'AWD', exteriorColor: 'Black', interiorColor: 'Wool Blend Grey',
    description: 'A formal Japan-market ultra-luxury SUV sourced through Nagoya for buyers who value privacy, rear-seat comfort, and discreet documentation.',
    heroImage: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1517026575980-3e1e2dedeab4?auto=format&fit=crop&w=1200&q=80'],
    features: ['Powered ottoman seating', 'Rear privacy suite', 'Hybrid quiet mode', 'Rear entertainment controls'],
    highlights: ['Nagoya sourcing documents reviewed', 'Discrete executive transport profile', 'Specialist concierge delivery planning'],
    delivery: { feeUsd: 810, eta: '7-12 business days after approval' },
  }),
  createCarRecord({
    id: 'ford-f150-raptor-r-2024', badge: 'Performance Truck', brand: 'Ford', model: 'F-150 Raptor R', year: 2024, mileage: 2400,
    location: 'Austin', condition: 'Certified used', priceUsd: 134000, minimumDepositUsd: 18000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Truck', fuelType: 'Petrol', transmission: '10-speed automatic', drivetrain: '4WD', exteriorColor: 'Code Orange', interiorColor: 'Black and Orange',
    description: 'A supercharged halo pickup from our Texas performance-truck allocation, built for buyers who want the correct nameplate, aggressive off-road presence, and clean release paperwork.',
    features: ['FOX Live Valve shocks', '37-inch package', 'Recaro seats', 'Trail camera system'],
    highlights: ['Austin performance truck inspection lane', 'Exterior and cabin media matched to exact model', 'Installment review available for qualified buyers'],
    delivery: { feeUsd: 420, eta: '2-5 business days after approval' },
  }),
  createCarRecord({
    id: 'ram-1500-trx-2024', badge: 'Supercharged Truck', brand: 'Ram', model: '1500 TRX Final Edition', year: 2024, mileage: 1800,
    location: 'Phoenix', condition: 'Certified used', priceUsd: 142000, minimumDepositUsd: 20000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Truck', fuelType: 'Petrol', transmission: '8-speed automatic', drivetrain: '4WD', exteriorColor: 'Diamond Black', interiorColor: 'Black and Red',
    description: 'A collector-grade TRX configuration sourced through our Southwest truck desk with matched exterior and interior catalog media and a clear high-value deposit workflow.',
    features: ['Launch control', 'Beadlock-capable wheels', 'TRX performance pages', 'Harman Kardon audio'],
    highlights: ['Phoenix off-road inspection availability', 'Correct model-matched truck imagery', 'Premium transport and enclosed delivery options'],
    delivery: { feeUsd: 460, eta: '3-6 business days after approval' },
  }),
  createCarRecord({
    id: 'gmc-hummer-ev-pickup-2025', badge: 'EV Truck', brand: 'GMC', model: 'Hummer EV Pickup 3X', year: 2025, mileage: 900,
    location: 'Los Angeles', condition: 'Certified used', priceUsd: 156000, minimumDepositUsd: 22000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Truck', fuelType: 'Electric', transmission: 'Single-speed', drivetrain: 'AWD', exteriorColor: 'Meteorite Metallic', interiorColor: 'Lunar Horizon',
    description: 'A tri-motor electric super truck from our California inventory with matched cockpit and bed-detail media for buyers who need the correct vehicle presentation before committing.',
    features: ['CrabWalk', 'Extract mode', 'Infinity roof panels', 'UltraVision cameras'],
    highlights: ['Los Angeles EV specialist desk', 'Verified pickup-specific media set', 'Structured premium payment options'],
    delivery: { feeUsd: 520, eta: '3-5 business days after payment verification' },
  }),
  createCarRecord({
    id: 'chevrolet-silverado-hd-2024', badge: 'Heavy Duty', brand: 'Chevrolet', model: 'Silverado 2500HD High Country', year: 2024, mileage: 3200,
    location: 'Houston', condition: 'Certified used', priceUsd: 119000, minimumDepositUsd: 16000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Truck', fuelType: 'Diesel', transmission: '10-speed automatic', drivetrain: '4WD', exteriorColor: 'Iridescent Pearl', interiorColor: 'Jet Black and Umber',
    description: 'A luxury heavy-duty pickup positioned for ranch, towing, and executive utility buyers who want exact truck-specific interior and exterior media before deposit approval.',
    features: ['Duramax diesel', 'Multi-Flex tailgate', 'Surround vision', 'Trailering tech package'],
    highlights: ['Houston heavy-duty inspection support', 'Cargo-bed and cabin imagery matched to model name', 'Fleet and owner-driver finance review supported'],
    delivery: { feeUsd: 430, eta: '2-4 business days after approval' },
  }),
  createCarRecord(withStockPhotos('toyota tacoma trd off road used truck', {
    id: 'toyota-tacoma-trd-off-road-2023', badge: 'Used Truck', brand: 'Toyota', model: 'Tacoma TRD Off-Road', year: 2023, mileage: 22800,
    location: 'Perth', condition: 'Certified used', priceUsd: 41800, minimumDepositUsd: 5600, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Truck', fuelType: 'Petrol', transmission: '6-speed automatic', drivetrain: '4WD', exteriorColor: 'Magnetic Grey', interiorColor: 'Black Cloth',
    description: 'A neatly used Tacoma for buyers who want a dependable midsize truck with proper off-road hardware, easy global serviceability, and cleaner pricing than the halo trucks.',
    features: ['Locking rear diff', 'Crawl control', 'Multi-terrain select', 'All-terrain tyres'],
    highlights: ['Perth export desk for global truck buyers', 'Used Tacoma with verified gallery images', 'Purchase and rental both available'],
    delivery: { feeUsd: 620, eta: '7-11 business days after approval' },
  })),
  createCarRecord(withStockPhotos('ford ranger lariat used truck', {
    id: 'ford-ranger-lariat-2023', badge: 'Global Utility', brand: 'Ford', model: 'Ranger Lariat', year: 2023, mileage: 26400,
    location: 'Cape Town', condition: 'Certified used', priceUsd: 38900, minimumDepositUsd: 5200, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Truck', fuelType: 'Diesel', transmission: '10-speed automatic', drivetrain: '4WD', exteriorColor: 'Carbonized Grey', interiorColor: 'Ebony',
    description: 'A neatly used Ranger aimed at global utility buyers who need a clean dual-cab truck for work, mixed-road travel, and export-friendly documentation.',
    features: ['Tow package', 'Leather trim', 'Lane keep assist', '360 camera'],
    highlights: ['Cape Town truck handover and export route', 'Lower-budget used truck option', 'Clean condition with gallery coverage'],
    delivery: { feeUsd: 610, eta: '7-12 business days after approval' },
  })),
  createCarRecord(withStockPhotos('nissan frontier pro 4x used truck', {
    id: 'nissan-frontier-pro-4x-2023', badge: 'Budget Truck', brand: 'Nissan', model: 'Frontier PRO-4X', year: 2023, mileage: 24100,
    location: 'Doha', condition: 'Certified used', priceUsd: 34400, minimumDepositUsd: 4700, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Truck', fuelType: 'Petrol', transmission: '9-speed automatic', drivetrain: '4WD', exteriorColor: 'Boulder Grey', interiorColor: 'Charcoal',
    description: 'A neatly used Frontier PRO-4X for buyers who want an affordable off-road-capable truck without stepping into premium American pickup pricing.',
    features: ['Bilstein dampers', 'Skid plates', 'Around-view monitor', 'Fender audio'],
    highlights: ['Doha off-road truck lane active', 'Affordable used pickup with global delivery support', 'Clean export paperwork available'],
    delivery: { feeUsd: 580, eta: '6-10 business days after approval' },
  })),
  createCarRecord(withStockPhotos('toyota hilux invincible used pickup truck', {
    id: 'toyota-hilux-invincible-2022', badge: 'Worldwide Pickup', brand: 'Toyota', model: 'Hilux Invincible', year: 2022, mileage: 31400,
    location: 'Manchester', condition: 'Foreign used', priceUsd: 33200, minimumDepositUsd: 4500, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Truck', fuelType: 'Diesel', transmission: '6-speed automatic', drivetrain: '4WD', exteriorColor: 'Attitude Black', interiorColor: 'Black Leather',
    description: 'A neatly used Hilux built for global buyers who want a durable pickup with easy parts access, real cargo utility, and trusted export appeal.',
    features: ['Rear diff lock', 'Leather seats', 'Apple CarPlay', 'Tow package'],
    highlights: ['Manchester global truck export route', 'Neatly used Hilux with correct pickup gallery', 'Popular worldwide work-and-family pickup'],
    delivery: { feeUsd: 540, eta: '5-9 business days after approval' },
  })),
  createCarRecord({
    id: 'porsche-911-turbo-s-2024', badge: 'Icon Sports Car', brand: 'Porsche', model: '911 Turbo S', year: 2024, mileage: 1400,
    location: 'Miami', condition: 'Brand new', priceUsd: 276000, minimumDepositUsd: 42000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Coupe', fuelType: 'Petrol', transmission: '8-speed PDK', drivetrain: 'AWD', exteriorColor: 'GT Silver Metallic', interiorColor: 'Black and Chalk',
    description: 'An iconic 911 specification offered through our Miami performance desk with exact-match media for the body, cabin, and wheel hardware instead of generic sports-car imagery.',
    features: ['Sport Chrono', 'Carbon roof', 'Rear axle steering', 'Burmester audio'],
    highlights: ['Miami performance-car inspection suite', 'Interior and exterior media tied to exact 911 nameplate', 'Collector-friendly documentation pack'],
    delivery: { feeUsd: 690, eta: '3-6 business days after approval' },
  }),
  createCarRecord({
    id: 'bentley-flying-spur-speed-2024', badge: 'Ultra Sedan', brand: 'Bentley', model: 'Flying Spur Speed', year: 2024, mileage: 2300,
    location: 'New York', condition: 'Brand new', priceUsd: 312000, minimumDepositUsd: 48000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Sedan', fuelType: 'Petrol', transmission: '8-speed automatic', drivetrain: 'AWD', exteriorColor: 'Beluga', interiorColor: 'Linen and Saddle',
    description: 'A flagship Bentley sports sedan for buyers who want verified rear-cabin and exterior views matched to the exact Flying Spur specification before finance or deposit decisions.',
    features: ['Naim audio', 'Touring specification', 'Rear entertainment', 'All-wheel steering'],
    highlights: ['New York private viewing lane', 'Exact-model interior and exterior media set', 'Executive chauffeur and owner-driver use cases supported'],
    delivery: { feeUsd: 760, eta: '3-5 business days after release approval' },
  }),
  createCarRecord({
    id: 'bmw-m8-gran-coupe-2024', badge: 'Grand Coupe', brand: 'BMW', model: 'M8 Competition Gran Coupe', year: 2024, mileage: 2800,
    location: 'Chicago', condition: 'Brand new', priceUsd: 214000, minimumDepositUsd: 33000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Sedan', fuelType: 'Petrol', transmission: '8-speed automatic', drivetrain: 'AWD', exteriorColor: 'Frozen Black', interiorColor: 'Silverstone and Black',
    description: 'A high-output four-door flagship from our Midwest performance stock with matched cockpit, seat, and exterior views for buyers who want the right car shown the right way.',
    features: ['M carbon package', 'Bowers & Wilkins audio', 'Adaptive M suspension', 'M drive modes'],
    highlights: ['Chicago specialist performance review', 'Exact-model image set with multiple interior views', 'Finance desk prepared for premium sport sedans'],
    delivery: { feeUsd: 610, eta: '2-5 business days after approval' },
  }),
  createCarRecord({
    id: 'land-rover-defender-130-2025', badge: 'Expedition Luxury', brand: 'Land Rover', model: 'Defender 130 Outbound', year: 2025, mileage: 1100,
    location: 'Denver', condition: 'Brand new', priceUsd: 138000, minimumDepositUsd: 19000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Petrol', transmission: '8-speed automatic', drivetrain: 'AWD', exteriorColor: 'Carpathian Grey', interiorColor: 'Ebony Resist',
    description: 'A long-wheelbase Defender built for clients who want luxury expedition capability and exact-match exterior and interior catalog views before committing to transport or finance.',
    features: ['Air suspension', 'Electronic active differential', 'Cold climate pack', 'Meridian audio'],
    highlights: ['Denver mountain-route delivery planning', 'Name-matched cabin and body media for the exact 130 trim', 'Adventure and executive use cases both supported'],
    delivery: { feeUsd: 540, eta: '3-6 business days after approval' },
  }),
  createCarRecord({
    id: 'cadillac-escalade-v-2024', badge: 'Flagship SUV', brand: 'Cadillac', model: 'Escalade-V', year: 2024, mileage: 1600,
    location: 'Miami', condition: 'Brand new', priceUsd: 214000, minimumDepositUsd: 32000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Petrol', transmission: '10-speed automatic', drivetrain: 'AWD', exteriorColor: 'Black Raven', interiorColor: 'Jet Black',
    description: 'A supercharged full-size flagship SUV with matched cabin, rear-seat, and exterior catalog views for buyers who want the correct Escalade-V presentation before approval.',
    features: ['Super Cruise', 'AKG 36-speaker audio', 'Executive second row', 'Performance exhaust'],
    highlights: ['Miami flagship SUV inspection lane', 'Trim-matched luxury gallery with rear-cabin captions', 'Structured premium financing available'],
    delivery: { feeUsd: 680, eta: '3-5 business days after approval' },
  }),
  createCarRecord({
    id: 'lincoln-navigator-black-label-2024', badge: 'Black Label', brand: 'Lincoln', model: 'Navigator Black Label', year: 2024, mileage: 2100,
    location: 'Dallas', condition: 'Brand new', priceUsd: 168000, minimumDepositUsd: 24000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Petrol', transmission: '10-speed automatic', drivetrain: '4WD', exteriorColor: 'Pristine White', interiorColor: 'Central Park Theme',
    description: 'A full-size American luxury SUV positioned for executive family buyers who need exact-model exterior and interior views, not generic SUV photography.',
    features: ['Massage seats', 'Revel Ultima 3D audio', 'BlueCruise', 'Black Label interior themes'],
    highlights: ['Dallas executive-delivery coordination', 'Theme-specific gallery captions across interior and exterior views', 'Concierge finance support for family fleets'],
    delivery: { feeUsd: 520, eta: '2-5 business days after approval' },
  }),
  createCarRecord({
    id: 'toyota-tundra-capstone-2024', badge: 'Luxury Truck', brand: 'Toyota', model: 'Tundra Capstone', year: 2024, mileage: 2600,
    location: 'Austin', condition: 'Certified used', priceUsd: 108000, minimumDepositUsd: 15000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Truck', fuelType: 'Hybrid', transmission: '10-speed automatic', drivetrain: '4WD', exteriorColor: 'Wind Chill Pearl', interiorColor: 'Black and White Leather',
    description: 'A premium hybrid pickup with exact truck-specific media covering the front stance, side profile, cabin, second row, and cargo bed before deposit review.',
    features: ['i-Force Max hybrid', 'Panoramic roof', 'Power running boards', 'Trailer backup guide'],
    highlights: ['Austin truck desk allocation', 'Correct Capstone-specific truck gallery', 'Hybrid truck finance review available'],
    delivery: { feeUsd: 410, eta: '2-4 business days after approval' },
  }),
  createCarRecord({
    id: 'rivian-r1t-quad-motor-2024', badge: 'Adventure EV', brand: 'Rivian', model: 'R1T Quad-Motor', year: 2024, mileage: 1900,
    location: 'Seattle', condition: 'Certified used', priceUsd: 126000, minimumDepositUsd: 18000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Truck', fuelType: 'Electric', transmission: 'Single-speed', drivetrain: 'AWD', exteriorColor: 'Forest Green', interiorColor: 'Ocean Coast',
    description: 'An all-electric adventure truck with exact-match gallery views for the body, gear tunnel zone, dashboard, and seat layout rather than generic EV imagery.',
    features: ['Quad-motor AWD', 'Air suspension', 'Gear tunnel', 'Camp speaker'],
    highlights: ['Seattle EV truck specialist review', 'Electric Horizon color theme applied to gallery media', 'Adventure and premium daily-use buyer profiles supported'],
    delivery: { feeUsd: 490, eta: '3-5 business days after payment verification' },
  }),
  createCarRecord({
    id: 'gmc-yukon-denali-ultimate-2024', badge: 'Executive SUV', brand: 'GMC', model: 'Yukon Denali Ultimate', year: 2024, mileage: 2400,
    location: 'Houston', condition: 'Brand new', priceUsd: 154000, minimumDepositUsd: 22000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Diesel', transmission: '10-speed automatic', drivetrain: '4WD', exteriorColor: 'Titanium Rush', interiorColor: 'Alpine Umber',
    description: 'A full-size luxury utility flagship with exact-name media showing its formal exterior, cockpit, captain chairs, and rear-cabin comfort zones.',
    features: ['Denali Ultimate interior', 'Air ride suspension', 'Super Cruise', 'Bose Performance Series'],
    highlights: ['Houston executive SUV lane', 'Executive Reserve theme used across gallery set', 'Suitable for owner-driver or chauffeured use'],
    delivery: { feeUsd: 540, eta: '2-5 business days after approval' },
  }),
  createCarRecord({
    id: 'jeep-grand-wagoneer-series-iii-2024', badge: 'American Reserve', brand: 'Jeep', model: 'Grand Wagoneer Series III', year: 2024, mileage: 2800,
    location: 'Denver', condition: 'Brand new', priceUsd: 148000, minimumDepositUsd: 21000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Petrol', transmission: '8-speed automatic', drivetrain: '4WD', exteriorColor: 'Diamond Black', interiorColor: 'Global Black and Tupelo',
    description: 'A premium three-row American luxury SUV with exact gallery labeling for front fascia, profile, rear bodywork, cockpit, and second-row executive seating.',
    features: ['McIntosh audio', 'Rear-seat monitoring', 'Night vision', 'Palermo leather'],
    highlights: ['Denver high-country delivery planning', 'Large luxury SUV media matched to exact Series III trim', 'Family and executive finance profiles supported'],
    delivery: { feeUsd: 560, eta: '3-6 business days after approval' },
  }),
]

const users = [
  createUserRecord({
    id: 'admin-user', fullName: readConfiguredValue('ADMIN_FULL_NAME', 'Prestige Admin'), email: readConfiguredValue('ADMIN_EMAIL', 'admin@prestigemotorsmiami.com'), phone: readConfiguredValue('ADMIN_PHONE', '+1 305 555 0198'),
    password: readConfiguredValue('ADMIN_PASSWORD', 'Admin@2026'), role: 'admin', country: 'US', location: 'Miami',
  }),
  createUserRecord({
    id: 'demo-user', fullName: 'Amina Yusuf', email: 'amina.yusuf@prestigemotorsmiami.com', phone: '+1 917 555 0172',
    password: 'Buyer@2026', role: 'user', country: 'US', location: 'New York',
    favoriteCarIds: ['lexus-lx-600-2023', 'toyota-land-cruiser-2021'],
    notifications: [{ id: 'note-1', title: 'Verification first', body: 'Inspection is required before vehicle release. Delivery opens after deposit or approved financing.', createdAt: '2026-04-19T10:15:00.000Z' }],
  }),
]

const financingApplications = [
  { id: 'app-1', userId: 'demo-user', carId: 'tesla-model-x-plaid-2024', fullName: 'Amina Yusuf', phone: '+234 801 555 0199', email: 'amina.yusuf@prestigemotorsmiami.com', incomeUsd: 6400, location: 'New York', depositUsd: 18000, months: 24, status: 'Approved', createdAt: '2026-04-18T12:00:00.000Z' },
  { id: 'app-2', userId: 'demo-user', carId: 'cadillac-escalade-v-2024', fullName: 'Amina Yusuf', phone: '+234 801 555 0199', email: 'amina.yusuf@prestigemotorsmiami.com', incomeUsd: 6400, location: 'Miami', depositUsd: 22000, months: 18, status: 'Pending Review', createdAt: '2026-04-20T09:30:00.000Z' },
]

const payments = [
  {
    id: 'pay-1',
    userId: 'demo-user',
    carId: 'tesla-model-x-plaid-2024',
    type: 'deposit',
    method: 'bank-transfer',
    amountUsd: 18000,
    createdAt: '2026-04-19T08:00:00.000Z',
    receiptNumber: 'RCPT-20260419-001',
    status: 'Confirmed',
    proofAttachment: {
      name: 'tesla-bank-transfer-slip.png',
      type: 'image/png',
      dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==',
    },
    proofUploadedAt: '2026-04-19T07:52:00.000Z',
  },
]

const paymentEvents = [
  {
    id: 'payment-event-1',
    paymentId: 'pay-1',
    paymentRequestId: 'payment-request-1',
    userId: 'demo-user',
    carId: 'tesla-model-x-plaid-2024',
    eventType: 'manual-confirmed',
    reference: 'TESLA-DEP-001',
    status: 'Confirmed',
    actorType: 'admin',
    actorId: 'admin-user',
    note: 'Deposit manually confirmed after transfer slip review.',
    createdAt: '2026-04-19T08:00:00.000Z',
  },
]

const paymentRequests = [
  {
    id: 'payment-request-1',
    userId: 'demo-user',
    carId: 'tesla-model-x-plaid-2024',
    type: 'deposit',
    requestedMethod: 'bank-transfer',
    approvedMethod: 'bank-transfer',
    requestedAmountUsd: 18000,
    approvedAmountUsd: 18000,
    status: 'Confirmed',
    instructionsTitle: 'Wire instructions prepared',
    bankName: 'First Atlantic Private Bank',
    accountName: 'Prestige Motors Miami LLC Client Account',
    accountNumber: '4821193048',
    referenceCode: 'TESLA-DEP-001',
    paymentLink: '',
    adminNote: 'Use the reference code in the transfer narration.',
    paymentId: 'pay-1',
    proofAttachment: {
      name: 'tesla-bank-transfer-slip.png',
      type: 'image/png',
      dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==',
    },
    proofUploadedAt: '2026-04-19T07:52:00.000Z',
    createdAt: '2026-04-18T14:00:00.000Z',
    reviewedAt: '2026-04-18T14:30:00.000Z',
    confirmedAt: '2026-04-19T08:00:00.000Z',
  },
  {
    id: 'payment-request-2',
    userId: 'demo-user',
    carId: 'cadillac-escalade-v-2024',
    type: 'deposit',
    requestedMethod: 'bank-transfer',
    approvedMethod: '',
    requestedAmountUsd: 22000,
    approvedAmountUsd: 22000,
    status: 'Pending Approval',
    instructionsTitle: '',
    bankName: '',
    accountName: '',
    accountNumber: '',
    referenceCode: '',
    paymentLink: '',
    adminNote: 'Buyer requested bank transfer instructions for the minimum deposit.',
    proofAttachment: null,
    proofUploadedAt: '',
    createdAt: '2026-04-20T09:45:00.000Z',
    reviewedAt: '',
    confirmedAt: '',
  },
]

const deliveryRequests = [
  { id: 'delivery-1', userId: 'demo-user', carId: 'tesla-model-x-plaid-2024', trigger: 'approved-loan', status: 'Scheduled', address: 'Brooklyn, New York', feeUsd: 510, eta: '3-6 business days after payment verification', createdAt: '2026-04-20T08:00:00.000Z' },
]

const serviceRequests = [
  {
    id: 'service-1',
    userId: 'demo-user',
    type: 'concierge',
    fullName: 'Amina Yusuf',
    email: 'amina.yusuf@prestigemotorsmiami.com',
    phone: '+1 917 555 0172',
    location: 'New York',
    title: 'Source a 2024 Bentley Flying Spur Speed',
    budgetUsd: 285000,
    assetDetails: 'Seeking a black-on-tan Flying Spur Speed with fewer than 5,000 miles and rear entertainment.',
    desiredOutcome: 'Open to US stock first, then Japan or GCC export stock with verified history.',
    status: 'Reviewing brief',
    createdAt: '2026-04-20T11:45:00.000Z',
  },
]

const meta = {
  brands: [],
  locations: [],
  paymentTypes: ['full', 'installment', 'rental'],
  countries: COUNTRY_OPTIONS,
  adminCredentialsHint: ADMIN_LOGIN_HINT_EMAIL ? { email: ADMIN_LOGIN_HINT_EMAIL } : null,
  testimonials: [
    { id: 'review-1', name: 'Marcus Ellison', role: 'Private banking client, Miami', quote: 'The team had the VIN file, service history, and enclosed transport options ready before I sent a deposit. It felt like a real boutique dealership, not a listing board.' },
    { id: 'review-2', name: 'Rachel Kim', role: 'Founder, Newport Coast', quote: 'I liked that the numbers were presented cleanly. Deposit, monthly cost, payoff horizon, and handover timing were all laid out before the finance desk called me.' },
    { id: 'review-3', name: 'Daniel Tan', role: 'Collector buying from Singapore', quote: 'Their Asia sourcing process was disciplined. Inspection photos, export paperwork, and the release conditions were shared in the right order without any pressure tactics.' },
  ],
  faqs: [
    { question: 'How does installment financing work?', answer: 'Choose a vehicle, review the deposit and monthly plan, submit your income and contact details, then wait for admin review. Approval decisions are shared through the user dashboard.' },
    { question: 'Can delivery happen before payment?', answer: 'No. Delivery requests are available only after a deposit is confirmed or a financing request is approved.' },
    { question: 'How do I verify the vehicle before payment?', answer: 'You can schedule an inspection or test drive. We also provide ownership and verification documents before release.' },
    { question: 'Which payment methods are supported?', answer: 'Card payment, bank transfer, and an optional escrow workflow for qualified transactions are supported. Receipts are generated automatically.' },
  ],
  company: {
    name: readConfiguredValue('COMPANY_NAME', 'Prestige Motors Miami'),
    address: readConfiguredValue('COMPANY_ADDRESS', '415 Biscayne Boulevard, Miami, Florida, United States'),
    phone: readConfiguredValue('COMPANY_PHONE', '+1 305 555 0044'),
    email: readConfiguredValue('COMPANY_EMAIL', 'clientservices@prestigemotorsmiami.com'),
    hours: readConfiguredValue('COMPANY_HOURS', 'Mon-Sat, 9:00 AM - 7:00 PM'),
  },
  policies: {
    privacy: 'Client information is used for showroom appointments, finance review, identity checks, transport coordination, and receipt records only. We do not sell client data or market guaranteed approvals.',
    terms: 'Vehicle handover begins after inspection completion and either cleared funds, a verified deposit, or formal finance approval. Delivery timing depends on route, paperwork, and final release authorization.',
    security: 'Deploy behind HTTPS with SSL enabled, store secrets in environment variables, and restrict admin access before production launch.',
  },
}

const buildMeta = (carCollection) => ({
  ...cloneValue(meta),
  brands: [...new Set(carCollection.map((car) => car.brand))],
  locations: [...new Set(carCollection.map((car) => car.location))],
  paymentTypes: [
    ...new Set([
      ...carCollection.flatMap((car) => car.paymentTypes || []),
      ...(carCollection.some((car) => car.rentable) ? ['rental'] : []),
    ]),
  ],
})

const seedData = {
  cars: cloneValue(cars),
  users: cloneValue(users),
  financingApplications: cloneValue(financingApplications),
  payments: cloneValue(payments),
  paymentEvents: cloneValue(paymentEvents),
  paymentRequests: cloneValue(paymentRequests),
  deliveryRequests: cloneValue(deliveryRequests),
  serviceRequests: cloneValue(serviceRequests),
}

const nextId = (prefix, collection) => {
  const nextValue = collection.reduce((maxValue, entry) => {
    const rawId = String(entry?.id || '')
    const pattern = new RegExp(`^${prefix}-(\\d+)$`)
    const match = rawId.match(pattern)

    if (!match) {
      return maxValue
    }

    return Math.max(maxValue, Number(match[1]))
  }, 0)

  return `${prefix}-${nextValue + 1}`
}

module.exports = {
  COUNTRY_OPTIONS,
  DEFAULT_COUNTRY_CODE,
  cars,
  users,
  financingApplications,
  payments,
  paymentEvents,
  paymentRequests,
  deliveryRequests,
  serviceRequests,
  meta,
  seedData,
  buildMeta,
  attachVehicleDisplayMedia,
  buildVehicleDisplayGallery,
  nextId,
  createCarRecord,
  createUserRecord,
  getCountrySettings,
}
