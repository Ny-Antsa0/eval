import { useState } from 'react'
import { RESET_GROUPS, shouldSkipDeletion } from './backOffice/constants'
import {
  parseImportFile,
  sanitizeRecord,
} from './backOffice/csv'
import {
  hasStructuredPrestashopImport,
  importStructuredPrestashopData,
} from './backOffice/importer'
import { mapOrders } from './backOffice/orders'
import { updateStatus } from '../data/repositories/OrderRepository'
import { parseZipUploads } from './backOffice/zip'
import type {
  BusyKey,
  BusyState,
  LogKey,
  LogState,
  OrderItem,
  ResetGroup,
} from './backOffice/types'
import {
  clearSessionToken,
  deleteResourceById,
  fetchResourceIdentifiers,
  fetchResourceListFromEndpoint,
  getSessionToken,
  login,
  setSessionToken,
  uploadProductImage,
  upsertResourceFromRecord,
} from '../services/backOffice'

// Etat initial des operations asynchrones par fonctionnalite.
const initialBusyState: BusyState = {
  reset: false,
  csv: false,
  zip: false,
  orders: false,
}

// Historique local par fonctionnalite pour affichage UI.
const initialLogState: LogState = {
  reset: [],
  csv: [],
  zip: [],
  orders: [],
}

export const useBackOffice = () => {
  // Session token stocke en sessionStorage pour proteger les routes.
  const [token, setToken] = useState<string | null>(() => getSessionToken())
  const [authError, setAuthError] = useState<string | null>(null)
  const [busy, setBusy] = useState<BusyState>(initialBusyState)
  const [logs, setLogs] = useState<LogState>(initialLogState)
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const appendLog = (logKey: LogKey, lines: string[]) => {
    // Prepend pour afficher les dernieres actions en haut.
    setLogs((currentLogs) => ({
      ...currentLogs,
      [logKey]: [...lines, ...currentLogs[logKey]],
    }))
  }

  const setBusyFlag = (busyKey: BusyKey, value: boolean) => {
    // Mecanisme unique pour activer/desactiver les loaders.
    setBusy((currentBusyState) => ({
      ...currentBusyState,
      [busyKey]: value,
    }))
  }

  const withBusy = async (busyKey: BusyKey, task: () => Promise<void>) => {
    // Wrap standard pour garantir le reset du flag meme en erreur.
    setBusyFlag(busyKey, true)
    try {
      await task()
    } finally {
      setBusyFlag(busyKey, false)
    }
  }

  const loadOrders = async (sessionLog: string[]) => {
    // Charge les commandes depuis l'API et normalise le format UI.
    try {
      const orderList = await fetchResourceListFromEndpoint(
        'orders?display=full',
        'orders',
      )
      const mappedOrders = mapOrders(orderList)
      setOrders(mappedOrders)
      sessionLog.push(`Commandes chargees: ${mappedOrders.length}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur'
      sessionLog.push(`Chargement commandes: echec (${message})`)
    }
  }

  const loginUser = async (username: string, password: string) => {
    // Login local: retourne un token fixe si admin/admin.
    setAuthError(null)
    const tokenValue = login(username, password)

    if (!tokenValue) {
      setAuthError('Identifiants invalides. Utilisez admin/admin.')
      return false
    }

    setSessionToken(tokenValue)
    setToken(tokenValue)
    return true
  }

  const logout = () => {
    // Nettoie la session et les donnees chargees.
    clearSessionToken()
    setToken(null)
    setOrders([])
  }

  const resetGroup = async (group: ResetGroup) => {
    await withBusy('reset', async () => {
      // Log local pour conserver le detail du nettoyage.
      const sessionLog: string[] = [`Demarrage du nettoyage: ${group.label}`]

      for (const resourceName of group.resources) {
        try {
          const resourceIds = await fetchResourceIdentifiers(resourceName)

          if (resourceIds.length === 0) {
            sessionLog.push(`- ${resourceName}: aucun element trouve`)
            continue
          }

          let successCount = 0
          let skippedCount = 0

          for (const resourceId of resourceIds) {
            // Evite de supprimer les categories racine protegees.
            if (shouldSkipDeletion(resourceName, resourceId)) {
              skippedCount += 1
              sessionLog.push(
                `- ${resourceName} #${resourceId}: ignore (racine protegee)`,
              )
              continue
            }

            try {
              // Continuer meme si une suppression echoue.
              await deleteResourceById(resourceName, resourceId)
              successCount += 1
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Erreur'
              sessionLog.push(`- ${resourceName} #${resourceId}: echec (${message})`)
            }
          }

          sessionLog.push(
            `- ${resourceName}: ${successCount} suppression(s), ${skippedCount} ignore(s)`,
          )
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Erreur'
          sessionLog.push(`- ${resourceName}: echec (${message})`)
        }
      }

      sessionLog.push(`Fin du nettoyage: ${group.label}`)
      appendLog('reset', sessionLog)
    })
  }

  const importCsv = async (files: FileList | File[]) => {
    // Support FileList (input) et tableau (tests / reuse).
    const fileArray = Array.from(files)
    if (fileArray.length === 0) {
      return
    }

    await withBusy('csv', async () => {
      const sessionLog: string[] = []

      for (const file of fileArray) {
        sessionLog.push(`Lecture ${file.name}`)

        try {
          const importTables = await parseImportFile(file)

          if (importTables.length === 0) {
            sessionLog.push(`Import ${file.name}: aucune feuille exploitable`)
            continue
          }

          if (hasStructuredPrestashopImport(importTables)) {
            try {
              const structuredLogs =
                await importStructuredPrestashopData(importTables)
              sessionLog.push(...structuredLogs)
              continue
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Erreur'
              sessionLog.push(`Import structure: echec (${message})`)

              const shouldFallback =
                message.includes('Reponse API non XML') ||
                message.includes('Reponse API vide')

              if (!shouldFallback) {
                continue
              }

              sessionLog.push(
                "Import structure indisponible, bascule sur l'import simple.",
              )
            }
          }

          for (const importTable of importTables) {
            const { records, resourceName, sourceName } = importTable
            sessionLog.push(`- ${sourceName} -> ${resourceName}`)

            let successCount = 0
            let failedCount = 0

            for (const record of records) {
              try {
                // Nettoie les champs avant conversion XML.
                const sanitizedRecord = sanitizeRecord(resourceName, record)
                await upsertResourceFromRecord(resourceName, sanitizedRecord)
                successCount += 1
              } catch (error) {
                failedCount += 1
                const message = error instanceof Error ? error.message : 'Erreur'
                sessionLog.push(`- ${resourceName}: echec (${message})`)
              }
            }

            sessionLog.push(
              `Import ${resourceName}: ${successCount} OK, ${failedCount} echec(s)`,
            )
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Erreur'
          sessionLog.push(`Import ${file.name}: echec (${message})`)
        }
      }

      appendLog('csv', sessionLog)
    })
  }

  const uploadZip = async (files: FileList | File[]) => {
    // L'UI selectionne un ZIP contenant un dossier d'images.
    const archives = Array.from(files)
    if (archives.length === 0) {
      return
    }

    await withBusy('zip', async () => {
      const sessionLog: string[] = []

      for (const archive of archives) {
        sessionLog.push(`Extraction ${archive.name}`)

        try {
          const { uploads, warnings } = await parseZipUploads(archive)
          sessionLog.push(...warnings)

          for (const upload of uploads) {
            try {
              // Upload unitaire pour isoler les erreurs par image.
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
          sessionLog.push(`Archive ${archive.name}: echec (${message})`)
        }
      }

      appendLog('zip', sessionLog)
    })
  }

  const refreshOrders = async () => {
    // Rafraichit l'etat des commandes et historise le resultat.
    await withBusy('orders', async () => {
      const sessionLog: string[] = []
      await loadOrders(sessionLog)
      appendLog('orders', sessionLog)
    })
  }

  const updateOrder = async (orderId: string, statusId: string) => {
    // Change le statut et relit la liste pour garder l'UI en phase.
    await withBusy('orders', async () => {
      const sessionLog: string[] = []

      try {
        await updateStatus(orderId, statusId)
        sessionLog.push(`Commande ${orderId}: statut -> ${statusId}`)
        await loadOrders(sessionLog)
        setToast({ tone: 'success', message: 'Statut commande mis a jour.' })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur'
        sessionLog.push(`Commande ${orderId}: echec (${message})`)
        setToast({ tone: 'error', message: 'Echec de mise a jour du statut.' })
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
    toast,
    clearToast: () => setToast(null),
  }
}
