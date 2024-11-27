import { json, redirect } from "@remix-run/node";
import invariant from "tiny-invariant";
import db from "../db.server";

import { getDestinationUrl } from "../models/ShortLink.server";
import { Page } from "@shopify/polaris";
import { useLoaderData } from "@remix-run/react";
import { timeStamp } from "console";

export const loader = async ({ params }) => {
  invariant(params.id, "Could not find Short Link destination");

  const id = Number(params.id);
  const shortLink = await db.shortLink.findFirst({ where: { id } });
  //console.log("ViSITOR",visitorInfo())



  invariant(shortLink, "Could not find Short Link destination");


  const newVisit = await db.visit.create({
    data: {
      shortLinkId: shortLink.id, // Collega la visita al link abbreviato
    }
  });

  await db.shortLink.update({
    where: { id },
    data: { scans: { increment: 1 } },
  });


  return redirect(getDestinationUrl(shortLink, newVisit.id));
  
};




