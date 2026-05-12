export const BASE_URL = '/api'
export const API_KEY = 'uB6mqRpBAuBBgtovR1ok6aPRwz0LMMCs'

// API helpers keep the ws_key appended consistently.

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

export const request = async (endpoint: string, options: RequestInit = {}) => {
    const url = buildApiUrl(endpoint)
    const response = await fetch(url, options)

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
    await request(endpoint, {
        method,
        headers: {
            'Content-Type': 'text/xml',
        },
        body: xml,
    })
}

export const deleteData = async (endpoint: string) => {
    await request(endpoint, { method: 'DELETE' })
}

export const uploadBinary = async (endpoint: string, file: File) => {
    const formData = new FormData()
    formData.append('image', file)
    await request(endpoint, { method: 'POST', body: formData })
}



