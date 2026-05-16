// Base proxy pour l'API PrestaShop (configurable via VITE_API_BASE_URL).
export const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'
// Cle d'API PrestaShop (exposee ici pour le besoin d'exercice).
export const API_KEY = 'uB6mqRpBAuBBgtovR1ok6aPRwz0LMMCs'

// Helpers API: ajout du ws_key et du header Basic a chaque requete.

const buildAuthorizationHeader = () => `Basic ${btoa(`${API_KEY}:`)}`

export const buildApiUrl = (endpoint: string) => {
    // Normalise le chemin et compose l'URL finale avec ws_key.
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
    const separator = cleanEndpoint.includes('?') ? '&' : '?'

    return `${BASE_URL}/${cleanEndpoint}${separator}ws_key=${API_KEY}`
}

export const getData = async (endpoint: string): Promise<string | null> => {
    try {
        const url = buildApiUrl(endpoint)
        const response = await fetch(url, {
            headers: {
                Authorization: buildAuthorizationHeader(),
            },
        })

        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`)
        }

        return await response.text()
    } catch (error) {
        // Retourne null pour laisser le caller gerer l'absence de donnees.
        console.log('Error fetching data from API', error)
        return null
    }
}

export const request = async (endpoint: string, options: RequestInit = {}) => {
    // Fonction generique pour centraliser l'auth et la validation HTTP.
    const url = buildApiUrl(endpoint)
    const headers = new Headers(options.headers)
    headers.set('Authorization', buildAuthorizationHeader())
    let response: Response

    try {
        response = await fetch(url, { ...options, headers })
    } catch (error) {
        throw new Error(
            `Connexion API impossible (${endpoint}). Verifiez BASE_URL ou proxy /api.`,
        )
    }

    if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`)
    }

    return response
}

export const sendXml = async (
    endpoint: string,
    xml: string,
    method: 'POST' | 'PUT',
) => {
    // PrestaShop attend du XML pour POST/PUT.
    const response = await request(endpoint, {
        method,
        headers: {
            Authorization: buildAuthorizationHeader(),
            'Content-Type': 'text/xml',
        },
        body: xml,
    })

    return response.text()
}

export const deleteData = async (endpoint: string) => {
    // Delete simple, laisse les erreurs remonter.
    await request(endpoint, { method: 'DELETE' })
}

export const uploadBinary = async (endpoint: string, file: File) => {
    // Upload binaire via FormData, PrestaShop accepte 'image'.
    const formData = new FormData()
    formData.append('image', file)
    await request(endpoint, { method: 'POST', body: formData })
}

