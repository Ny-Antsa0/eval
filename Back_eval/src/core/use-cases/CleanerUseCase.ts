import { prestaClient } from "../../data/api/prestaClient";

/**
 * Gère la purge ordonnée de la base de données
 */
export class CleanerUseCase {
  // Ordre strict pour respecter les contraintes d'intégrité
  private tablesToDelete = [
    "order_details", "order_histories", "order_invoices", "orders", // Ventes
    "carts", "customers", // Clients
    "combinations", "products", "categories" // Catalogue
  ];

  async purgeAll() {
    const report: Record<string, string> = {};

    for (const table of this.tablesToDelete) {
      try {
        // 1. Lister les IDs
        const listXml = await prestaClient.get(`${table}?display=[id]&limit=1000`);
        const ids = this.extractIds(listXml);

        // 2. Supprimer chaque ID
        let successCount = 0;
        for (const id of ids) {
          // Ne pas supprimer la catégorie racine (souvent ID 1 ou 2)
          if (table === "categories" && (id === "1" || id === "2")) continue;
          
          const success = await prestaClient.delete(`${table}/${id}`);
          if (success) successCount++;
        }
        
        report[table] = `${successCount}/${ids.length} supprimés`;
      } catch (err) {
        console.error(`[CLEANER_FAILURE] Table: ${table}`, err);
        report[table] = "Échec total";
      }
    }
    return report;
  }

  private extractIds(xml: string): string[] {
    // Parser XML léger (en attendant un parser robuste)
    const regex = /<id><!\[CDATA\[(\d+)\]\]><\/id>/g;
    const ids = [];
    let match;
    while ((match = regex.exec(xml)) !== null) {
      ids.push(match[1]);
    }
    return ids;
  }
}