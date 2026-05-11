import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './Login'
import RRHH from './RRHH'
import Vehiculos from './Vehiculos'
import Pedidos from './Pedidos'
import Seguimiento from './Seguimiento'
import CambiarPassword from './CambiarPassword'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"            element={<div className="page"><Login /></div>} />
        <Route path="/cambiar-password" element={<CambiarPassword />} />
        <Route path="/rrhh"             element={<RRHH />} />
        <Route path="/vehiculos"        element={<Vehiculos />} />
        <Route path="/pedidos"          element={<Pedidos />} />
        <Route path="/seguimiento"      element={<Seguimiento />} />
        <Route path="*"                 element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
