import { useEffect, useState } from 'react'
import type { OrderItem, ResetGroup } from '../pages/Dashboard'
import { RESET_GROUPS } from './backOffice/constants'
import { parseCsv, sanitizeRecord } from './backOffice/csv'
import { mapOrders } from './backOffice/orders'
import { parseZipUploads } from './backOffice/zip'
import type { BusyKey, BusyState, LogKey, LogState } from './backOffice/types'
import {
  clearSessionToken,
  deleteResourceById,
  fetchResourceList,
  getSessionToken,
  login,
  setSessionToken,
  updateOrderStatus,
  uploadProductImage,
  upsertResourceFromRecord,
} from '../services/backOffice'

export const useBackOffice = () => {
  const [token, setToken] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [busy, setBusy] = useState<BusyState>({
    reset: false,
    csv: false,
    zip: false,
    orders: false,
  })
  const [logs, setLogs] = useState<LogState>({
    reset: [],
    csv: [],
    zip: [],
    orders: [],
  })
  const [orders, setOrders] = useState<OrderItem[]>([])

  useEffect(() => {
    const saved = getSessionToken()
    if (saved) {
      setToken(saved)
    }
  }, [])

  const appendLog = (key: LogKey, lines: string[]) => {
    setLogs((prev) => ({
      ...prev,
      [key]: [...lines, ...prev[key]],
    }))
  }

  const setBusyFlag = (key: BusyKey, value: boolean) => {
    setBusy((prev) => ({ ...prev, [key]: value }))
  }

  const withBusy = async (key: BusyKey, task: () => Promise<void>) => {
    setBusyFlag(key, true)
    try {
      await task()
    } finally {
      setBusyFlag(key, false)
    }
  }

  const loginUser = async (username: string, password: string) => {
    setAuthError(null)
    const tokenValue = login(username, password)
    if (!tokenValue) {
      setAuthError('Identifiants invalides. Utilisez admin/admin.')
      return
    }
    setSessionToken(tokenValue)
    setToken(tokenValue)
  }

  const logout = () => {
    clearSessionToken()
    setToken(null)
  }

  const resetGroup = async (group: ResetGroup) => {
    await withBusy('reset', async () => {
      const sessionLog: string[] = [`Demarrage du nettoyage: ${group.label}`]

      // Keep deleting even if one record fails.
      for (const resource of group.resources) {
        try {
          const items = await fetchResourceList(resource)
          if (items.length === 0) {
            sessionLog.push(`- ${resource}: aucun element trouve`)
            continue
          }

          let successCount = 0
          for (const item of items) {
            const id = String(item.id || '')
            if (!id) continue
            try {
              await deleteResourceById(resource, id)
              successCount += 1
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Erreur'
              sessionLog.push(`- ${resource} #${id}: echec (${message})`)
            }
          }

          sessionLog.push(`- ${resource}: ${successCount} suppression(s)`)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Erreur'
          sessionLog.push(`- ${resource}: echec (${message})`)
        }
      }

      sessionLog.push(`Fin du nettoyage: ${group.label}`)
      appendLog('reset', sessionLog)
    })
  }

  const importCsv = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    if (fileArray.length === 0) return

    await withBusy('csv', async () => {
      const sessionLog: string[] = []

      for (const file of fileArray) {
        const resource = file.name.split('.')[0]
        sessionLog.push(`Lecture ${file.name} -> ${resource}`)
        try {
          const text = await file.text()
          const records = parseCsv(text)
          let successCount = 0
          let failedCount = 0

          for (const record of records) {
            try {
              await upsertResourceFromRecord(resource, sanitizeRecord(record))
              successCount += 1
            } catch (error) {
              failedCount += 1
              const message = error instanceof Error ? error.message : 'Erreur'
              sessionLog.push(`- ${resource}: echec (${message})`)
            }
          }

          sessionLog.push(
            `Import ${resource}: ${successCount} OK, ${failedCount} echec(s)`,
          )
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Erreur'
          sessionLog.push(`Import ${resource}: echec (${message})`)
        }
      }

      appendLog('csv', sessionLog)
    })
  }

  const uploadZip = async (file: File) => {
    await withBusy('zip', async () => {
      const sessionLog: string[] = [`Extraction ${file.name}`]

      // Images are mapped to product IDs from the filename.
      try {
        const { uploads, warnings } = await parseZipUploads(file)
        sessionLog.push(...warnings)

        for (const upload of uploads) {
          try {
            await uploadProductImage(upload.productId, upload.file)
            sessionLog.push(
              `- ${upload.fileName}: upload OK (produit ${upload.productId})`,
            )
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Erreur'
            sessionLog.push(`- ${upload.fileName}: echec (${message})`)
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur'
        sessionLog.push(`Archive: echec (${message})`)
      }

      appendLog('zip', sessionLog)
    })
  }

  const loadOrders = async (sessionLog: string[]) => {
    try {
      const list = await fetchResourceList('orders')
      const mapped = mapOrders(list)
      setOrders(mapped)
      sessionLog.push(`Commandes chargees: ${mapped.length}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur'
      sessionLog.push(`Chargement commandes: echec (${message})`)
    }
  }

  const refreshOrders = async () => {
    await withBusy('orders', async () => {
      const sessionLog: string[] = []
      await loadOrders(sessionLog)
      appendLog('orders', sessionLog)
    })
  }

  const updateOrder = async (orderId: string, statusId: string) => {
    await withBusy('orders', async () => {
      const sessionLog: string[] = []
      try {
        await updateOrderStatus(orderId, statusId)
        sessionLog.push(`Commande ${orderId}: statut -> ${statusId}`)
        await loadOrders(sessionLog)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur'
        sessionLog.push(`Commande ${orderId}: echec (${message})`)
      }
      appendLog('orders', sessionLog)
    })
  }

  return {
    isAuthenticated: Boolean(token),
    authError,
    groups: RESET_GROUPS,
    orders,
    busy,
    logs,
    loginUser,
    logout,
    resetGroup,
    importCsv,
    uploadZip,
    refreshOrders,
    updateOrderStatus: updateOrder,
  }
}
