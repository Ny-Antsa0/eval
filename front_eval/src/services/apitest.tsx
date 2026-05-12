
import { extractList } from './xmlParser'

export type Delivery = {
	id: string
	link: string
}

export const getDeliveries = async (xmlData: string): Promise<Delivery[]> => {
	const deliveries = extractList(xmlData, 'delivery') as Array<Record<string, unknown>>

	return deliveries
		.map((delivery) => ({
			id: readValue(delivery.id),
			link: readValue(delivery.link),
		}))
		.filter((delivery) => delivery.id)
}

function readValue(value: unknown): string {
	if (value === null || value === undefined) {
		return ''
	}

	if (typeof value === 'string' || typeof value === 'number') {
		return String(value)
	}

	if (Array.isArray(value)) {
		return value.map((item) => readValue(item)).filter(Boolean).join(', ')
	}

	if (typeof value === 'object') {
		const nested = value as Record<string, unknown>

		if (typeof nested['#text'] === 'string' || typeof nested['#text'] === 'number') {
			return String(nested['#text'])
		}

		for (const child of Object.values(nested)) {
			const text: string = readValue(child)
			if (text) {
				return text
			}
		}
	}

	return ''
}












