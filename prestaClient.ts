/**
 * Client API pour PrestaShop avec authentification Basic
 */
const API_URL = "http://localhost/eval/api/";
const API_KEY = "VOTRE_CLE_API"; // À sécuriser via env

const headers = {
  "Authorization": `Basic ${btoa(API_KEY + ":")}`,
  "Content-Type": "application/xml",
};

export const prestaClient = {
  async get(endpoint: string) {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, { method: "GET", headers });
      if (!response.ok) throw new Error(`Erreur GET ${endpoint}: ${response.statusText}`);
      return await response.text();
    } catch (error) {
      console.error("[API_ERROR_GET]", error);
      throw error;
    }
  },

  async post(endpoint: string, xmlData: string) {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers,
        body: xmlData,
      });
      if (!response.ok) throw new Error(`Erreur POST ${endpoint}: ${response.statusText}`);
      return await response.text();
    } catch (error) {
      console.error("[API_ERROR_POST]", error);
      throw error;
    }
  },

  async delete(endpoint: string) {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "DELETE",
        headers,
      });
      if (!response.ok) throw new Error(`Erreur DELETE ${endpoint}: ${response.statusText}`);
      return true;
    } catch (error) {
      console.error("[API_ERROR_DELETE]", error);
      return false; // On retourne false pour le rapport d'échec
    }
  }
};