export function extractList(
  xmlString: string,
  resource: string,
  pluralName?: string | null,
): Array<Record<string, string>>

export function generatePrestashopXML(
  resource: string,
  data: Record<string, string>,
): string
