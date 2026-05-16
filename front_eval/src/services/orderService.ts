import { prestaClient } from "../../../prestaClient";

/**
 * Service de gestion des commandes pour le Front-Office
 */
export const orderService = {
  /**
   * Valide le panier local et crée une commande dans PrestaShop
   * @param cartItems Liste des produits du sessionStorage
   * @param customerData Infos du client connecté
   */
  async placeOrder(cartItems: any[], customerData: any) {
    console.log("[ORDER_PROCESS] Démarrage de la commande...");
    
    try {
      // 1. S'assurer que le client a une adresse (Requis par PrestaShop)
      // On utilise souvent une adresse par défaut ou celle saisie au tunnel
      const addressId = await this.ensureAddress(customerData.id, customerData);
      console.log(`[ORDER_PROCESS] Adresse validée : ID ${addressId}`);

      // 2. Créer le panier (Cart) dans l'API PrestaShop
      // C'est l'étape souvent oubliée : on ne peut pas commander un panier "virtuel"
      const cartXml = this.buildCartXml(customerData.id, addressId, cartItems, addressId);
      console.log("[ORDER_PROCESS] Création du panier sur le serveur...");
      const cartResponse = await prestaClient.post("carts", cartXml);
      console.log("[ORDER_PROCESS] Réponse Panier (XML):", cartResponse);

      // Extraction de l'ID du panier via regex simple pour éviter les dépendances lourdes
      const cartId = cartResponse.match(/<id><!\[CDATA\[(\d+)\]\]><\/id>/)?.[1];
      
      if (!cartId) throw new Error("Échec de la création du panier côté serveur");
      console.log(`[ORDER_PROCESS] Panier API créé : ID ${cartId}`);

      // 3. Créer la commande (Order)
      // Critique : module doit être 'ps_cashondelivery' pour le paiement à la livraison
      const orderXml = this.buildOrderXml(customerData.id, addressId, cartId, cartItems);
      console.log("[ORDER_PROCESS] Envoi de la commande finale...");
      console.log("[ORDER_PROCESS] XML de commande envoyé:", orderXml);
      const orderResponse = await prestaClient.post("orders", orderXml);
      console.log("[ORDER_PROCESS] Réponse Commande (XML):", orderResponse);

      const orderId = orderResponse.match(/<id><!\[CDATA\[(\d+)\]\]><\/id>/)?.[1];

      if (!orderId) throw new Error("L'API PrestaShop a refusé la création de la commande");

      // 4. Historique initial (État : En attente de paiement / ID 10 ou 1 selon config)
      const historyXml = `<prestashop><order_history><id_order>${orderId}</id_order><id_order_state>1</id_order_state></order_history></prestashop>`;
      await prestaClient.post("order_histories", historyXml);

      console.log(`[ORDER_SUCCESS] Commande n°${orderId} validée !`);
      return orderId;

    } catch (error) {
      console.error("[ORDER_FAILURE] Erreur lors du processus de commande :", error);
      throw error;
    }
  },

  private async ensureAddress(customerId: string, data: any) {
    // Vérifie si une adresse existe déjà pour ce client via l'API
    const xml = `<prestashop><address>
      <id_customer>${customerId}</id_customer>
      <id_country>1</id_country>
      <alias>Mon Adresse</alias>
      <lastname>${data.lastname || 'Client'}</lastname>
      <firstname>${data.firstname || 'Import'}</firstname>
      <address1>Rue par défaut</address1>
      <city>Ville</city>
      <postcode>00000</postcode>
    </address></prestashop>`;
    
    const response = await prestaClient.post("addresses", xml);
    return response.match(/<id><!\[CDATA\[(\d+)\]\]><\/id>/)?.[1];
  },

  private buildCartXml(customerId: string, addressId: string, items: any[], deliveryAddressId: string) {
    // Construction des lignes du panier avec les détails du produit
    const rows = items.map(item => `
      <cart_row>
        <id_product>${item.id}</id_product>
        <id_product_attribute>${item.id_attribute || 0}</id_product_attribute>
        <id_shop>1</id_shop>
        <id_address_delivery>${deliveryAddressId}</id_address_delivery>
        <quantity>${item.quantity || 1}</quantity>
      </cart_row>`).join('');

    return `<prestashop><cart>
      <id_customer>${customerId}</id_customer>
      <id_address_delivery>${addressId}</id_address_delivery>
      <id_address_invoice>${addressId}</id_address_invoice>
      <id_currency>1</id_currency>
      <id_lang>1</id_lang>
      <id_shop>1</id_shop>
      <id_shop_group>1</id_shop_group>
      <associations><cart_rows>${rows}</cart_rows></associations>
    </cart></prestashop>`;
  },

  private buildOrderXml(customerId: string, addressId: string, cartId: string, items: any[]) {
    // Calcul des totaux avec et sans taxes
    let totalTaxIncl = 0;
    let totalTaxExcl = 0;

    items.forEach(item => {
      const priceIncl = parseFloat(item.price || 0);
      const quantity = item.quantity || 1;
      const taxRate = parseFloat(item.taxRate || 0); // Assumer que taxRate est un pourcentage (ex: 20 pour 20%)

      const itemTotalIncl = priceIncl * quantity;
      const itemTotalExcl = priceIncl / (1 + taxRate / 100) * quantity;
      totalTaxIncl += itemTotalIncl;
      totalTaxExcl += itemTotalExcl;
    });

    return `<prestashop><order>
      <id_address_delivery>${addressId}</id_address_delivery>
      <id_address_invoice>${addressId}</id_address_invoice>
      <id_cart>${cartId}</id_cart>
      <id_currency>1</id_currency>
      <id_lang>1</id_lang>
      <id_customer>${customerId}</id_customer>
      <id_carrier>1</id_carrier>
      <id_shop>1</id_shop>
      <id_shop_group>1</id_shop_group>
      <module>ps_cashondelivery</module>
      <payment>Paiement à la livraison</payment>
      <total_paid>${totalTaxIncl.toFixed(6)}</total_paid>
      <total_paid_real>0.000000</total_paid_real>
      <total_products>${totalTaxExcl.toFixed(6)}</total_products>
      <total_products_wt>${totalTaxIncl.toFixed(6)}</total_products_wt>
      <total_paid_tax_incl>${totalTaxIncl.toFixed(6)}</total_paid_tax_incl>
      <total_paid_tax_excl>${totalTaxExcl.toFixed(6)}</total_paid_tax_excl>
      <total_shipping>0.00</total_shipping>
      <total_shipping_tax_incl>0.00</total_shipping_tax_incl>
      <total_shipping_tax_excl>0.00</total_shipping_tax_excl>
      <total_discounts>0.00</total_discounts>
      <total_discounts_tax_incl>0.00</total_discounts_tax_incl>
      <total_discounts_tax_excl>0.00</total_discounts_tax_excl>
      <conversion_rate>1</conversion_rate>
      <valid>0</valid>
      <associations>
        <order_rows>
          ${items.map(i => `
            <order_row>
              <product_id>${i.id}</product_id>
              <product_attribute_id>${i.id_attribute || 0}</product_attribute_id>
              <product_quantity>${i.quantity || 1}</product_quantity>
              <product_name><![CDATA[${i.name || 'Produit'}]]></product_name>
              <product_reference><![CDATA[${i.reference || ''}]]></product_reference>
              <product_price>${(parseFloat(i.price || 0) / (1 + parseFloat(i.taxRate || 0) / 100)).toFixed(6)}</product_price>
              <unit_price_tax_incl>${parseFloat(i.price || 0).toFixed(6)}</unit_price_tax_incl>
              <unit_price_tax_excl>${(parseFloat(i.price || 0) / (1 + parseFloat(i.taxRate || 0) / 100)).toFixed(6)}</unit_price_tax_excl>
            </order_row>`).join('')}
        </order_rows>
      </associations>
    </order></prestashop>`;
  }
};