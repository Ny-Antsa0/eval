export const BASE_URL = '/api'
export const API_KEY = 'uB6mqRpBAuBBgtovR1ok6aPRwz0LMMCs'

const buildAuthorizationHeader = () => `Basic ${btoa(`${API_KEY}:`)}`

export const buildApiUrl = (endpoint: string) => {
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
        console.log('Error fetching data from API', error)
        return null
    }
}

export const request = async (endpoint: string, options: RequestInit = {}) => {
    const url = buildApiUrl(endpoint)
    const headers = new Headers(options.headers)
    headers.set('Authorization', buildAuthorizationHeader())
    const response = await fetch(url, { ...options, headers })

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



