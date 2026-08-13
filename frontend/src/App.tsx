import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import AssessmentPage from './pages/AssessmentPage'
import ResultsPage from './pages/ResultsPage'
import SimulationPage from './pages/SimulationPage'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/assess" element={<AssessmentPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/simulation" element={<SimulationPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
