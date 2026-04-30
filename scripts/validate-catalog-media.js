const { seedData } = require('../server/data/store')

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

const findings = []

for (const car of seedData.cars) {
  const gallery = (car.gallery || []).filter(Boolean)
  const images = [car.heroImage, ...gallery].filter(Boolean)
  const duplicates = gallery.length - new Set(gallery).size

  if (duplicates > 0) {
    findings.push({
      type: 'duplicate-gallery-images',
      id: car.id,
      brand: car.brand,
      model: car.model,
      images,
    })
  }

  const crossBrandImages = images.filter((image) => !imageMatchesVehicleBrand(car.brand, image))

  if (crossBrandImages.length) {
    findings.push({
      type: 'cross-brand-image',
      id: car.id,
      brand: car.brand,
      model: car.model,
      images: crossBrandImages,
    })
  }
}

if (findings.length) {
  console.error(JSON.stringify({ valid: false, findings }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({ valid: true, checkedCars: seedData.cars.length }, null, 2))