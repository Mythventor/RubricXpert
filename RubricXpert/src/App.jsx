import React from 'react'
import HomePage from './components/homepage'
import AboutUS from  './components/aboutus'
import { BrowserRouter, Routes, Route  } from 'react-router-dom'


import { HashRouter } from 'react-router-dom'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutUS/>} />

      </Routes>
      
    </HashRouter>
      
    
  )
}

export default App