
import invariant from "tiny-invariant";
import db from "../db.server";
import { json } from "@remix-run/node";

export async function getShortLink(id, graphql){
    const short_link = await db.shortLink.findFirst({where : {id}});
    if(!short_link){
        return null;
    }

    return supplementShortLink(short_link, graphql);
}

export async function getShortLinks(shop, graphql) {
    const short_links = await db.shortLink.findMany({
      where: { shop },
      orderBy: { id: "desc" },
    });
  
    if (short_links.length === 0) return [];
  
    return Promise.all(
      short_links.map((short) => supplementShortLink(short, graphql))
    );
}

export function getDestinationUrl(short_link, visitId) {
    if (short_link.destination === "product") {
      return `https://${short_link.shop}/products/${short_link.productHandle}?handle=${visitId}`;
    }
  
    const match = /gid:\/\/shopify\/ProductVariant\/([0-9]+)/.exec(short_link.productVariantId);
    invariant(match, "Unrecognized product variant ID");
  
    return `https://${short_link.shop}/cart/${match[1]}:1?handle=${visitId}`;
  }

  async function supplementShortLink(short_link, graphql) {
    const response = await graphql(
      `
        query supplementShortLink($id: ID!) {
          product(id: $id) {
            title
            images(first: 1) {
              nodes {
                altText
                url
              }
            }
          }
        }
      `,
      {
        variables: {
          id: short_link.productId,
        },
      }
    );
  
    const {
      data: { product },
    } = await response.json();
  
    return {
      ...short_link,
      productDeleted: !product?.title,
      productTitle: product?.title,
      productImage: product?.images?.nodes[0]?.url,
      productAlt: product?.images?.nodes[0]?.altText,
      //destinationUrl: getDestinationUrl(short_link),
      shortCreated: createShortLink(short_link, graphql)  
    };
  }

  async function createShortLink(short_link, graphql){

    const response = await graphql(
      `
      mutation urlRedirectCreate($urlRedirect: UrlRedirectInput!) {
        urlRedirectCreate(urlRedirect: $urlRedirect) {
          urlRedirect {
            path
            target
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
        urlRedirect: {
          path: short_link.shortId,
          target: getScanLink(short_link.id)
        }
      }
      }
    );
    const data = await response.json();
      return json(data)
    }



    export function getScanLink(id) {
      const url = new URL(`/shortlink/${id}/scan`, process.env.SHOPIFY_APP_URL);
      return url.href;
    }

    export function validateShortLink(data) {
        const errors = {};
      
        if (!data.title) {
          errors.title = "Title is required";
        }
      
        if (!data.productId) {
          errors.productId = "Product is required";
        }
      
        if (!data.destination) {
          errors.destination = "Destination is required";
        }
        if (!data.shortId) {
            errors.shortId = "shortId is required";
          }
      
        if (Object.keys(errors).length) {
          return errors;
        }
      }

export async function getAllVisitFromShortLinks(shortLinks){

  const visitsPromises = shortLinks.map(shortLink => {
    return db.visit.findMany({
      where: {
        shortLinkId: shortLink.id
      }
    });
  });

  // Attendi che tutte le promesse siano risolte
  const visitsArray = await Promise.all(visitsPromises);

  // Combina tutti i risultati in un singolo array
  const allVisits = visitsArray.flat();

  return allVisits;
}

export async function getAllVisitFromShortLink(shortLink){
    const visits =  db.visit.findMany({
      where: {
        shortLinkId: shortLink.id
      }
    });
    return visits

}

