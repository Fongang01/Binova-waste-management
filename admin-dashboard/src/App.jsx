import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Bins from './pages/Bins'
import BinDetails from './pages/BinDetails'
import Drivers from './pages/Drivers'
import Trucks from './pages/Trucks'
import Collections from './pages/Collections'
import AiPlanning from './pages/AiPlanning'
import MapPage from './pages/MapPage'
import Settings from './pages/Settings'
import ProtectedRoute from './components/ProtectedRoute'

export default function App(){
  return (
    <Routes>
      <Route path="/login" element={<Login/>} />
      <Route path="/" element={<Navigate to="/dashboard" replace/>} />

      <Route element={<ProtectedRoute/>}>
        <Route path="/dashboard" element={<Dashboard/>} />
        <Route path="/bins" element={<Bins/>} />
        <Route path="/bins/:id" element={<BinDetails/>} />
        <Route path="/drivers" element={<Drivers/>} />
        <Route path="/trucks" element={<Trucks/>} />
        <Route path="/collections" element={<Collections/>} />
        <Route path="/ai-planning" element={<AiPlanning/>} />
        <Route path="/planning" element={<Navigate to="/ai-planning" replace/>} />
        <Route path="/map" element={<MapPage/>} />
        <Route path="/settings" element={<Settings/>} />
      </Route>

      <Route path="*" element={<div style={{padding:40}}>Not Found</div>} />
    </Routes>
  )
}
