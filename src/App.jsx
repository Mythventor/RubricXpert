import React from 'react'
import HomePage from './components/homepage'
import ResultsPage from './components/fancyresult'
import { Routes, Route } from 'react-router-dom'
import { HashRouter } from 'react-router-dom'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/results" element={<ResultsPage />} /> 
      </Routes>
    </HashRouter>
  )
}

export default App