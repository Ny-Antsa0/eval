
const BASE_URL = "/api";
const API_KEY = "3LZMBGoR1vUMORTAAMRRfyswjsLC9Res";
export const getData = async (endpoint: string) : Promise<string | null> => {

    try {

        const url = BASE_URL + "/" + endpoint + "?ws_key=" + API_KEY   ;
        const valiny = await fetch(url);

         if(!valiny.ok){
            throw new Error('Erreur HTTP: ${valiny.status}');
        }

        const xmlTest = await valiny.text();
       
        return xmlTest;        
    }

    catch (error) {
        console.log("Error fetching data from API", error) ;
        console.log("tsy metyyyyyyyyyy");
        return null ;
    }
}



