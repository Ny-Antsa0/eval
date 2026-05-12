export declare function parseXML(xmlString: string): unknown
export declare function extractList(xmlString: string, resource: string, pluralName?: string | null): unknown[]
export declare function extractDetail(xmlString: string, resource: string): unknown
export declare function generatePrestashopXML(resource: string, data: Record<string, unknown>): string
export declare function objectToXML(obj: Record<string, unknown>, rootName?: string): string