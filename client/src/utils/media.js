export const getVehicleHeroImage = (vehicle) => {
  if (vehicle?.mediaVerified && vehicle.heroImage) {
    return vehicle.heroImage
  }

  return vehicle?.displayHeroImage || vehicle?.heroImage || ''
}

export const hasVerifiedGallery = (vehicle) =>
  Boolean(vehicle?.mediaVerified && Array.isArray(vehicle.gallery) && vehicle.gallery.length)