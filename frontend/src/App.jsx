import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import ResponsiveLayout from './layout/Layout'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <ResponsiveLayout/>
    </>
  )
}

export default App
