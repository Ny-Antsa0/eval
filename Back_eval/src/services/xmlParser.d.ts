export function extractList(
  xmlString: string,
  resource: string,
  pluralName?: string | null,
): Array<Record<string, unknown>>

export function extractDetail(
  xmlString: string,
  resource: string,
): Record<string, unknown> | null

export function generatePrestashopXML(
  resource: string,
  data: Record<string, unknown>,
): string
