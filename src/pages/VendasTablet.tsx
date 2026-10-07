import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function VendasTablet() {
  const navigate = useNavigate()
  useEffect(() => {
    navigate('/tablet/dashboard', { replace: true })
  }, [navigate])
  return null
}
