import React from 'react'
import HomePage from './components/homepage'
import AboutUS from './components/aboutus'
// import ResultsPage from './components/result'  // Add this import
import ResultsPage from './components/fancyresult'
import { Routes, Route } from 'react-router-dom'
import { HashRouter } from 'react-router-dom'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutUS />} />
        <Route path="/results" element={<ResultsPage />} />  {/* Add this route */}
      </Routes>
    </HashRouter>
  )
}

export default App