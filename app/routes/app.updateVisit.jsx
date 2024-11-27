
import { json,redirect } from "@remix-run/node";
import db from '../db.server'
export async function loader({request,params}){
        return request;
}
export async function action({ request,params }) {
  
  
     if (request.method === 'POST') {
      const body = await request.json();
      const id = parseInt(body.visitId);
      //const shortLink = await db.visit.findFirst({ where: { id } });
      const eventName = body.eventName;
      const amount = body.amount;
      const userAgent = body.userAgent;

      console.log("body",body)
      
      
      // Aggiorna la visita con gli eventi aggiornati
      return await db.visit.update({
        where: { id },
        data: { event: eventName, userAgent: userAgent, amount: amount },
      });
         
    } else {
      // Se la richiesta non è di tipo POST, restituisci una risposta con uno stato non consentito
      return json({ error: 'Richiesta non consentita' }, { status: 405 });
    }
    //return redirect("/app/prova");
  }