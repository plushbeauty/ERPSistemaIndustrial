import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function VendasTablet() {
  const navigate = useNavigate()
  useEffect(() => {
    navigate('/vendas?tablet=1', { replace: true })
  }, [navigate])
  return null
}
