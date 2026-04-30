export function FilterPanel({ filters, onChange, brands, locations, bodyStyles }) {
  return (
    <aside className="filter-panel surface-card">
      <div>
        <label htmlFor="brand">Brand</label>
        <select id="brand" value={filters.brand} onChange={(event) => onChange('brand', event.target.value)}>
          <option value="All">All</option>
          {brands.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="location">Location</label>
        <select
          id="location"
          value={filters.location}
          onChange={(event) => onChange('location', event.target.value)}
        >
          <option value="All">All</option>
          {locations.map((location) => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="paymentType">Payment type</label>
        <select
          id="paymentType"
          value={filters.paymentType}
          onChange={(event) => onChange('paymentType', event.target.value)}
        >
          <option value="All">All</option>
          <option value="full">Full payment</option>
          <option value="installment">Installment</option>
          <option value="rental">Rental</option>
        </select>
      </div>
      <div>
        <label htmlFor="bodyStyle">Body style</label>
        <select
          id="bodyStyle"
          value={filters.bodyStyle}
          onChange={(event) => onChange('bodyStyle', event.target.value)}
        >
          <option value="All">All</option>
          {bodyStyles.map((bodyStyle) => (
            <option key={bodyStyle} value={bodyStyle}>
              {bodyStyle}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="maxPrice">Max price</label>
        <input
          id="maxPrice"
          type="range"
          min="50000"
          max="800000"
          step="5000"
          value={filters.maxPrice}
          onChange={(event) => onChange('maxPrice', event.target.value)}
        />
        <strong>${Number(filters.maxPrice).toLocaleString()}</strong>
      </div>
      <div>
        <label htmlFor="minPrice">Min price</label>
        <input
          id="minPrice"
          type="number"
          min="0"
          step="5000"
          value={filters.minPrice}
          onChange={(event) => onChange('minPrice', event.target.value)}
        />
      </div>
    </aside>
  )
}
