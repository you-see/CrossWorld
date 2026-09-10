import { useState } from 'react'

import './App.css'

import WorldGlobe from './components/WorldGlobe'
import CountryList from './components/CountryList'
import CountryInfoPanel from './components/CountryInfoPanel'

import type { CountryInfo } from './data/countries'

function App() {
  const [
    selectedCountry,
    setSelectedCountry,
  ] = useState<CountryInfo | null>(null)

  return (
    <main className="app">
      {/* =========================================
          GLOBE AREA
      ========================================= */}

      <section className="globe-section">
        <WorldGlobe
          selectedCountry={selectedCountry}
        />

        {/* =========================================
            COUNTRY INFO PANEL
        ========================================= */}

        <CountryInfoPanel
          country={selectedCountry}
        />
      </section>

      {/* =========================================
          COUNTRY LIST
      ========================================= */}

      <section className="country-list-section">
        <CountryList
          selectedCountry={selectedCountry}
          onCountrySelect={setSelectedCountry}
        />
      </section>
    </main>
  )
}

export default App