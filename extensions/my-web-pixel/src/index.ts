import {register} from '@shopify/web-pixels-extension';
import db from 'app/db.server'
import { env } from 'process';



export function getVisitId(url: string){
  var queryString = url.split('?')[1];
    
  var params = queryString.split('&');
  
  for (var i = 0; i < params.length; i++) {
      var coppia = params[i].split('=');
      if (coppia[0] === 'handle') {
         return coppia[1];
      }
  }
  return null;
}





register(({analytics}) => {

  analytics.subscribe('checkout_completed', (event) => {
    // Example for accessing event data
    const checkout = event.data.checkout;

    const temp = {
      eventName: event.name,
      amount: checkout.totalPrice.amount,
      visitId:getVisitId(event.context.document.referrer)
    }
    console.log("ciao",temp)
    fetch("https://msn-biographies-both-canon.trycloudflare.com/app/updateVisit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(temp),
  })
    .then((response) => response.json())
    .then((temp) => {
      console.log(temp);
    });
  });

  analytics.subscribe('product_viewed', (event) => {
    console.log("product_viewed",event)
    const id = getVisitId(event.context.document.location.href)
    const referrer = event.context.document.referrer;
    
    let stringa = event.context.navigator.userAgent;

    let agent = stringa.match(/\bWindows\b/i) || 
                stringa.match(/\bMacintosh\b/i) ||
                stringa.match(/\biPhone\b/i) ||
                stringa.match(/\biPad\b/i) ||
                stringa.match(/\bAndroid\b/i);


 
        const temp = {
          eventName:event.name,
          userAgent:agent?.toString(),
          visitId: id,
        }
    
    
      fetch("https://msn-biographies-both-canon.trycloudflare.com/app/updateVisit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(temp),
    })
      .then((response) => response.json())
      .then((temp) => {
        console.log(temp);
      });
  });



  analytics.subscribe('product_added_to_cart', (event) => {
    console.log("product_added_to_cart",event)
    const id = getVisitId(event.context.document.location.href)
    const referrer = event.context.document.referrer;
    
    let stringa = event.context.navigator.userAgent;

    let agent = stringa.match(/\bWindows\b/i) || 
                stringa.match(/\bMacintosh\b/i) ||
                stringa.match(/\biPhone\b/i) ||
                stringa.match(/\biPad\b/i) ||
                stringa.match(/\bAndroid\b/i);


 
        const temp = {
          eventName:event.name,
          userAgent:agent?.toString(),
          visitId: id,
        }
    
    
      fetch("https://msn-biographies-both-canon.trycloudflare.com/app/updateVisit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(temp),
    })
      .then((response) => response.json())
      .then((temp) => {
        console.log(temp);
      });
  });


    analytics.subscribe('checkout_started', (event) => {
      // Example for accessing event data
      console.log("checkout_started", event)
      let stringa = event.context.navigator.userAgent;

      let agent = stringa.match(/\bWindows\b/i) || 
                  stringa.match(/\bMacintosh\b/i) ||
                  stringa.match(/\biPhone\b/i) ||
                  stringa.match(/\biPad\b/i) ||
                  stringa.match(/\bAndroid\b/i);
      const temp={
        
        eventName: event.name,
        userAgent:agent?.toString(),
        visitId:getVisitId(event.context.document.referrer)
      }
      // Example for sending event data to third party servers
      fetch("https://msn-biographies-both-canon.trycloudflare.com/app/updateVisit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(temp),
    })
      .then((response) => response.json())
      .then((temp) => {
        console.log(temp);
      });
    });




});


  
