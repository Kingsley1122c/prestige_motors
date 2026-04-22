const fs = require('fs')
const path = require('path')
const Database = require('better-sqlite3')
const { seedData, buildMeta } = require('./store')

const DATABASE_FILE_PATH = process.env.DATABASE_FILE_PATH || path.join(__dirname, 'database.sqlite')
const LEGACY_DATABASE_FILE_PATH = path.join(__dirname, 'database.json')
const COLLECTION_NAMES = [
  'cars',
  'users',
  'financingApplications',
  'payments',
  'paymentRequests',
  'deliveryRequests',
  'serviceRequests',
]

const cloneValue = (value) => JSON.parse(JSON.stringify(value))
const cars = []
const users = []
const financingApplications = []
const payments = []
const paymentRequests = []
const deliveryRequests = []
const serviceRequests = []
const meta = buildMeta([])

fs.mkdirSync(path.dirname(DATABASE_FILE_PATH), { recursive: true })

const sqlite = new Database(DATABASE_FILE_PATH)
sqlite.pragma('journal_mode = WAL')
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS collections (
    name TEXT PRIMARY KEY,
    payload TEXT NOT NULL
  )
`)

const replaceCollection = (target, entries) => {
  target.splice(0, target.length, ...cloneValue(entries || []))
}

const refreshMetaCollections = () => {
  Object.assign(meta, buildMeta(cars))
}

const createSnapshot = () => ({
  cars,
  users,
  financingApplications,
  payments,
  paymentRequests,
  deliveryRequests,
  serviceRequests,
})

const applySnapshot = (snapshot) => {
  replaceCollection(cars, snapshot.cars)
  replaceCollection(users, snapshot.users)
  replaceCollection(financingApplications, snapshot.financingApplications)
  replaceCollection(payments, snapshot.payments)
  replaceCollection(paymentRequests, snapshot.paymentRequests)
  replaceCollection(deliveryRequests, snapshot.deliveryRequests)
  replaceCollection(serviceRequests, snapshot.serviceRequests)
  refreshMetaCollections()
}

const syncSeedCars = () => {
  let didChange = false
  const existingById = new Map(cars.map((car) => [car.id, car]))

  seedData.cars.forEach((seedCar) => {
    const existingCar = existingById.get(seedCar.id)

    if (!existingCar) {
      return
    }

    if (existingCar.mediaVerified !== seedCar.mediaVerified) {
      existingCar.mediaVerified = seedCar.mediaVerified
      didChange = true
    }

    if (!existingCar.displayHeroImage && seedCar.displayHeroImage) {
      existingCar.displayHeroImage = seedCar.displayHeroImage
      didChange = true
    }

    if ((!Array.isArray(existingCar.displayGallery) || !existingCar.displayGallery.length) && Array.isArray(seedCar.displayGallery) && seedCar.displayGallery.length) {
      existingCar.displayGallery = cloneValue(seedCar.displayGallery)
      didChange = true
    }

    if ((!Array.isArray(existingCar.displayGalleryItems) || !existingCar.displayGalleryItems.length) && Array.isArray(seedCar.displayGalleryItems) && seedCar.displayGalleryItems.length) {
      existingCar.displayGalleryItems = cloneValue(seedCar.displayGalleryItems)
      didChange = true
    }

    if (!existingCar.displayTheme && seedCar.displayTheme) {
      existingCar.displayTheme = cloneValue(seedCar.displayTheme)
      didChange = true
    }

    if (!existingCar.heroImage && seedCar.heroImage) {
      existingCar.heroImage = seedCar.heroImage
      didChange = true
    }

    if ((!Array.isArray(existingCar.gallery) || !existingCar.gallery.length) && Array.isArray(seedCar.gallery) && seedCar.gallery.length) {
      existingCar.gallery = cloneValue(seedCar.gallery)
      didChange = true
    }
  })

  const existingIds = new Set(cars.map((car) => car.id))
  const missingSeedCars = seedData.cars.filter((car) => !existingIds.has(car.id))

  if (missingSeedCars.length) {
    cars.push(...cloneValue(missingSeedCars))
    didChange = true
  }

  if (didChange) {
    refreshMetaCollections()
  }

  return didChange
}

const readCollectionsSnapshot = () => {
  const rows = sqlite.prepare('SELECT name, payload FROM collections').all()

  if (!rows.length) {
    return null
  }

  return COLLECTION_NAMES.reduce((snapshot, name) => {
    const row = rows.find((entry) => entry.name === name)
    snapshot[name] = row ? JSON.parse(row.payload) : []
    return snapshot
  }, {})
}

const writeCollectionStatement = sqlite.prepare(`
  INSERT INTO collections (name, payload)
  VALUES (@name, @payload)
  ON CONFLICT(name) DO UPDATE SET payload = excluded.payload
`)

const saveDatabase = () => {
  const snapshot = createSnapshot()

  sqlite.transaction(() => {
    COLLECTION_NAMES.forEach((name) => {
      writeCollectionStatement.run({
        name,
        payload: JSON.stringify(cloneValue(snapshot[name])),
      })
    })
  })()
}

const getDatabaseSnapshot = () => ({
  ...cloneValue(createSnapshot()),
  meta: cloneValue(buildMeta(cars)),
})

const initializeDatabase = () => {
  const sqliteSnapshot = readCollectionsSnapshot()

  if (sqliteSnapshot) {
    applySnapshot(sqliteSnapshot)
    if (syncSeedCars()) {
      saveDatabase()
    }
    return
  }

  if (fs.existsSync(LEGACY_DATABASE_FILE_PATH)) {
    const legacySnapshot = JSON.parse(fs.readFileSync(LEGACY_DATABASE_FILE_PATH, 'utf8'))
    applySnapshot(legacySnapshot)
    syncSeedCars()
    saveDatabase()
    return
  }

  applySnapshot(seedData)
  saveDatabase()
}

initializeDatabase()

module.exports = {
  DATABASE_FILE_PATH,
  cars,
  users,
  financingApplications,
  payments,
  paymentRequests,
  deliveryRequests,
  serviceRequests,
  meta,
  refreshMetaCollections,
  getDatabaseSnapshot,
  saveDatabase,
}
