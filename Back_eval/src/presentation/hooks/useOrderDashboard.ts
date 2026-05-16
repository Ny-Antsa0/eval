import { useState, useMemo, useEffect } from "react";
import { prestaClient } from "../../data/repositories/prestaClient"; // Infrastructure
import { mapOrders } from "../../hooks/backOffice/orders"; // Core/Mappers
import { calculateTotalOrders, calculateTotalRevenue } from "../../core/use-cases/CalculateMetrics"; // Core/UseCases
import { extractList } from "../../services/xmlParser"; // Utils

/**
 * Hook de présentation pour le tableau de bord des commandes.
 * Centralise l'état de la vue et délègue la logique métier au Core.
 */
export const useOrderDashboard = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // 1. Récupération de la donnée brute (XML) via le client API
      const xml = await prestaClient.get("orders?display=full");

      // 2. Utilisation du mapper centralisé pour transformer le XML en modèle UI
      // On utilise extractList pour isoler les objets "order" du XML PrestaShop
      const rawList = extractList(xml, "order") as any[];
      setOrders(mapOrders(rawList));

    } catch (e) {
      console.error("[UI_ERROR] Erreur lors du chargement des commandes :", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  // 3. Calcul des KPI délégué aux Use Cases du Core
  const metrics = useMemo(() => {
    return {
      total: calculateTotalOrders(orders),
      revenue: calculateTotalRevenue(orders)
    };
  }, [orders]);

  const updateStatus = async (orderId: string, statusId: string) => {
    // Rappel : Utiliser order_histories pour changer l'état
    const xml = `<prestashop><order_history><id_order>${orderId}</id_order><id_order_state>${statusId}</id_order_state></order_history></prestashop>`;
    await prestaClient.post("order_histories", xml);
    await fetchOrders(); // Rafraîchissement
  };

  return { orders, metrics, loading, updateStatus };
};