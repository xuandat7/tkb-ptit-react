import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import FacultiesPage from './pages/FacultiesPage'
import MajorsPage from './pages/MajorsPage'
import SubjectsPage from './pages/SubjectsPage'
import RoomsPage from './pages/RoomsPage'
import TKBPage from './pages/TKBPage'
import RoomSchedulePage from './pages/RoomSchedulePage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="faculties" element={<FacultiesPage />} />
        <Route path="majors" element={<MajorsPage />} />
        <Route path="subjects" element={<SubjectsPage />} />
        <Route path="rooms" element={<RoomsPage />} />
        <Route path="room-schedule" element={<RoomSchedulePage />} />
        <Route path="tkb" element={<TKBPage />} />
      </Route>
    </Routes>
  )
}

export default App

