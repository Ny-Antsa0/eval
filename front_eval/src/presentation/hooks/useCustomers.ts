import { useEffect, useState } from 'react'
import type { Customer } from '../../core/models/customer'
import { listCustomers } from '../../data/repositories/CustomerRepository'

export const useCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isActive = true

    const run = async () => {
      setLoading(true)

      try {
        const list = await listCustomers()
        if (isActive) {
          setCustomers(list)
        }
      } catch (err) {
        if (isActive) {
          setError('Impossible de charger les clients.')
        }
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    run()

    return () => {
      isActive = false
    }
  }, [])

  return { customers, loading, error }
}
