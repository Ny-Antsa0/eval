import {useEffect , useState} from 'react';

import { getData } from '../services/api';

import { getDeliveries ,type  Delivery } from '../services/apitest';

export const ListeDeliveries = () => {

    const [deliveries  , setDeliveries] = useState<Delivery[]>([]);


    useEffect(() => {
        const Data = async () =>{
            const xmlData = await getData("deliveries") ;
            if(xmlData){
                const reponse = await getDeliveries(xmlData);

                setDeliveries(reponse);

            }
         }
         Data();
    }, []) ;

    return (
        <ul>
            {deliveries.map(deliver => (
                <li key={deliver.id}>livreaib { deliver.id}  lien : {deliver.link} </li>
            ))}
        </ul>
    );
    


};
























