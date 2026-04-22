export const getVehicleHeroImage = (vehicle) => {
  if (vehicle?.mediaVerified && vehicle.heroImage) {
    return vehicle.heroImage
  }

  return vehicle?.displayHeroImage || vehicle?.heroImage || ''
}

export const hasVerifiedGallery = (vehicle) =>
  Boolean(vehicle?.mediaVerified && Array.isArray(vehicle.gallery) && vehicle.gallery.length)

export const getVehicleGalleryItems = (vehicle, maxItems = 4) => {
  const hasRealGallery = hasVerifiedGallery(vehicle)
  const verifiedGalleryImages = hasRealGallery ? vehicle.gallery.filter(Boolean) : []
  const verifiedGalleryItems = hasRealGallery
    ? verifiedGalleryImages.map((image, index) => ({
        id: `${vehicle.id}-gallery-${index + 1}`,
        scene: vehicle.displayGalleryItems?.[index]?.scene || (index < 3 ? 'exterior' : index < 6 ? 'interior' : 'detail'),
        label: vehicle.displayGalleryItems?.[index]?.label || `Verified view ${index + 1}`,
        detail: vehicle.displayGalleryItems?.[index]?.detail || 'Matched gallery view',
        themeName: vehicle.displayTheme?.name || 'Verified catalog media',
        src: image,
      }))
    : []
  const displayGalleryItems = vehicle.displayGalleryItems?.length
    ? vehicle.displayGalleryItems
    : (vehicle.displayGallery || []).map((image, index) => ({
        id: `${vehicle.id}-gallery-${index + 1}`,
        scene: index < 3 ? 'exterior' : index < 6 ? 'interior' : 'detail',
        label: `Verified view ${index + 1}`,
        detail: 'Matched gallery view',
        themeName: vehicle.displayTheme?.name || 'Verified catalog media',
        src: image,
      }))

  const galleryItems = hasRealGallery
    ? [
        ...verifiedGalleryItems,
        ...displayGalleryItems
          .filter((item) => !verifiedGalleryImages.includes(item.src))
          .slice(0, Math.max(0, maxItems - verifiedGalleryItems.length)),
      ]
    : displayGalleryItems

  return galleryItems.slice(0, maxItems)
}

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