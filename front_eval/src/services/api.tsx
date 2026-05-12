export const BASE_URL = '/api'
export const API_KEY = 'uB6mqRpBAuBBgtovR1ok6aPRwz0LMMCs'

export const buildApiUrl = (endpoint: string) => {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
    const separator = cleanEndpoint.includes('?') ? '&' : '?'

    return `${BASE_URL}/${cleanEndpoint}${separator}ws_key=${API_KEY}`
}

export const getData = async (endpoint: string): Promise<string | null> => {
    try {
        const url = buildApiUrl(endpoint)
        const response = await fetch(url)

        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`)
        }

        return await response.text()
    } catch (error) {
        console.log('Error fetching data from API', error)
        return null
    }
}



