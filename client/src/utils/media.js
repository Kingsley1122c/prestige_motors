export const getVehicleHeroImage = (vehicle) => {
  if (vehicle?.mediaVerified && vehicle.heroImage) {
    return vehicle.heroImage
  }

  return vehicle?.displayHeroImage || vehicle?.heroImage || ''
}

export const hasVerifiedGallery = (vehicle) =>
  Boolean(vehicle?.mediaVerified && Array.isArray(vehicle.gallery) && vehicle.gallery.length)

const MERCHANDISING_PRIORITY = [
  'ferrari-purosangue-2024',
  'rolls-royce-ghost-2023',
  'lamborghini-urus-2024',
  'porsche-911-turbo-s-2024',
  'bentley-flying-spur-speed-2024',
  'aston-martin-dbx707-2024',
  'maybach-gls-600-2024',
  'mercedes-g63-2023',
  'cadillac-escalade-v-2024',
  'lexus-lx-600-2023',
  'lincoln-navigator-black-label-2024',
  'land-rover-defender-130-2025',
  'tesla-model-x-plaid-2024',
  'rivian-r1t-quad-motor-2024',
]

const merchandisingPriorityIndex = new Map(MERCHANDISING_PRIORITY.map((id, index) => [id, index]))

const getVehicleMerchandisingScore = (vehicle) => {
  const priorityIndex = merchandisingPriorityIndex.get(vehicle?.id)
  const verifiedGalleryCount = Array.isArray(vehicle?.gallery) ? vehicle.gallery.length : 0

  return [
    priorityIndex == null ? 0 : MERCHANDISING_PRIORITY.length - priorityIndex,
    vehicle?.mediaVerified ? 1 : 0,
    Math.min(verifiedGalleryCount, 4),
    Number(vehicle?.priceUsd || 0),
  ]
}

export const sortVehiclesForMerchandising = (vehicles = []) =>
  [...vehicles].sort((first, second) => {
    const firstScore = getVehicleMerchandisingScore(first)
    const secondScore = getVehicleMerchandisingScore(second)

    for (let index = 0; index < firstScore.length; index += 1) {
      if (firstScore[index] !== secondScore[index]) {
        return secondScore[index] - firstScore[index]
      }
    }

    return String(first?.model || '').localeCompare(String(second?.model || ''))
  })