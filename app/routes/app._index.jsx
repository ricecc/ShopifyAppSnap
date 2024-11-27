import { json } from "@remix-run/node";
import { useLoaderData, Link, useNavigate } from "@remix-run/react";
import { authenticate, MONTHLY_PLAN,ANNUAL_PLAN } from "../shopify.server";
import React from 'react';
import { useState,useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';


import {
  Card,
  Layout,
  Page,
  IndexTable,
  Thumbnail,
  Text,
  Icon,
  InlineStack,
  BlockStack,
 InlineGrid, 
 TextField,
 MediaCard,
 Button
} from "@shopify/polaris";

import {   getAllVisitFromShortLinks, getShortLinks } from '../models/ShortLink.server'
import { AlertDiamondIcon, ImageIcon } from "@shopify/polaris-icons";




export async function loader({ request }) {
  const { admin, session,billing } = await authenticate.admin(request);
  const shortLinks = await getShortLinks(session.shop, admin.graphql);
  const visits = await getAllVisitFromShortLinks(shortLinks)

 
  try {
    // Attempt to check if the shop has an active payment for any plan
    const billingCheck = await billing.require({
      plans: [MONTHLY_PLAN, ANNUAL_PLAN],
      isTest: true,
      // Instead of redirecting on failure, just catch the error
      onFailure: () => {
        throw new Error('No active plan');
      },
    });

    // If the shop has an active subscription, log and return the details
    const subscription = billingCheck.appSubscriptions[0];
    //console.log(`Shop is on ${subscription.name} (id ${subscription.id})`);
    
    return json({
      shortLinks,
      visits,
      billing,
      plan: subscription
    });
  } catch (error) {
    // If the shop does not have an active plan, return an empty plan object
    if (error.message === 'No active plan') {
      //console.log('Shop does not have any active plans.');
      
      return json({
        shortLinks,
        visits,
        billing,
        plan: { name: "Free" } 
      });
    }
    // If there is another error, rethrow it
    throw error;
  }
}





function truncate(str, { length = 25 } = {}) {
  if (!str) return "";
  if (str.length <= length) return str;
  return str.slice(0, length) + "…";
}

const SingleQRTable = () => (
  <IndexTable
    background='bg-surface-critical-hover'
    resourceName={{
      singular: "QR code",
      plural: "QR codes",
    }}
    itemCount={1}
    headings={[
      { title: "Thumbnail", hidden: true },
      { title: "Title" },
      { title: "Product" },
      { title: "Short link"},
      { title: "Views" },
      { title: " " },
    ]}
    selectable={false}
  >
    <QRTableRow key="1" shortLink={sampleShortLink} />
  </IndexTable>
);

const sampleShortLink = {
  id: "1",
  productImage: '',
  title:"First",
  productTitle: "Sample Product",
  productDeleted: false,
  createdAt: Date.now(),
  shop: "yourstore.com",
  shortId: "abc123",
  scans: 2565,
};

const QRTable = ({ shortLinks }) => (


  <IndexTable background='bg-surface-critical-hover'
    resourceName={{
      singular: "QR code",
      plural: "QR codes",
    }}
    itemCount={shortLinks.length}
    headings={[
      { title: "Thumbnail", hidden: true },
      { title: "Title" },
      { title: "Product" },
      { title: "Short link"},
      { title: "" },
      { title: "Views" },
    ]}
    selectable={false}
  >

    {shortLinks.map((shortLink) => (
      <QRTableRow key={shortLink.id} shortLink={shortLink} />
    ))}
  </IndexTable>
  
);



const QRTableRow = ({ shortLink }) => {
  const [active, setActive] = useState(false);

  const toggleActive = useCallback((id) => {
    setActive((prevActive) => !prevActive);
    
    const copyText = document.getElementById(`toCopy-${id}`);

    if (copyText) {
      // Select the text field
      copyText.select();
      copyText.setSelectionRange(0, 99999); // For mobile devices

      // Copy the text inside the text field
      navigator.clipboard.writeText(copyText.value);
    }
  }, []);



  return (
    <IndexTable.Row id={shortLink.id} position={shortLink.id}>
      <IndexTable.Cell>
        <Thumbnail
          source={shortLink.productImage || ImageIcon}
          alt={shortLink.productTitle}
          size="small"
        />
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Link to={`shortLink/${shortLink.id}`}>{truncate(shortLink.title)}</Link>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {shortLink.productDeleted ? (
          <InlineStack align="start" gap="200">
            <span style={{ width: "20px" }}>
              <Icon source={AlertDiamondIcon} tone="critical" />
            </span>
            <Text tone="critical" as="span">
              product has been deleted
            </Text>
          </InlineStack>
        ) : (
          truncate(shortLink.productTitle)
        )}
      </IndexTable.Cell>
      <IndexTable.Cell>
        <TextField 
          value={`https://${shortLink.shop}/${shortLink.shortId}`}
          autoComplete="off"
          id={`toCopy-${shortLink.id}`}
        />
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Button fullWidth onClick={() => toggleActive(shortLink.id)}>Copy</Button>
      </IndexTable.Cell>
      <IndexTable.Cell>{shortLink.scans}</IndexTable.Cell>
    </IndexTable.Row>
  );
};






export default function Index() {
  const { shortLinks,visits,plan } = useLoaderData();
  const navigate = useNavigate();
  let totalScans = 0;
 
  

  const checkoutCompletedEvents  = visits.filter(event => event.event === "checkout_completed");
  const totalSpent = checkoutCompletedEvents.reduce((total, event) => {
    return total + parseFloat(event.amount);
}, 0);


  

  // Itera attraverso l'array dei shortLinks e somma il valore di 'scans'
  shortLinks.forEach(link => {
    totalScans += link.scans;
  });

  const groupByDate = (visits) => {
    return visits.reduce((acc, visit) => {
      // Estrai solo la parte della data (YYYY-MM-DD)
      const date = visit.createdAt.split('T')[0];
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date]++;
      return acc;
    }, {});
  };
  
  // Raggruppa le visite per data
  const visitsByDate = groupByDate(visits);
  
  // Trasforma l'oggetto risultante in un array nel formato desiderato
  const data = Object.keys(visitsByDate).map(date => {
    return {
      date,
      visit: visitsByDate[date]
    };
  });
  const EmptyData = ({}) =>{
    return(
     
   
      <MediaCard
      title="Data not yet available"
      description="You will be able to monitor the traffic from your links in the graph as soon as it starts generating."
      popoverActions={[{content: 'More', onAction: () => {}}]}
    >
      <img
        alt=""
        width="100%"
        height="100%"
        style={{objectFit: 'cover', objectPosition: 'center'}}
        src='/app/image/search.png'
      />
    </MediaCard>
      
      );
      
  }

  return (
    <Page>
      <ui-title-bar title="Dashboard overview">
          <button variant="primary" onClick={() => navigate("/app/shortLinkNew/new")}>
            Create new
          </button>
      </ui-title-bar>
      
      <Layout>
  
        <Layout.Section>
          
          <InlineGrid columns={['twoThirds','oneThird']} gap="400">
          {data.length!==0?(
            <div style={{backgroundColor:'white', borderRadius:'10px', color:'BLACK'}}>
              <h2 style={{padding:'20px'}}>All visits</h2>
                <ResponsiveContainer width="100%" height={250}>
                    <AreaChart
                    data={data}
                    margin={{
                      top: 10,
                      right: 5,
                      left: 0,
                      bottom: 0,
                    }}
                  >
                        <XAxis style={{color:'#8CA0BE'}} dataKey="date" allowDecimals={false} axisLine={true} tickLine={false} />
                        <YAxis tickLine={false} axisLine={true}/>
                      
                        <Tooltip  />
                        <Area type="monotone" dataKey="visit" stroke="#0D6F68" fill="#CCE1D5" />
                  </AreaChart></ResponsiveContainer>
                
            </div>
            ):(
              <EmptyData></EmptyData>
          )}
              
             
            <div>
              <BlockStack gap="300">
              <div style={{backgroundImage: 'url(/app/image/tre.png)',backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', height:"120px",borderRadius:'10px', color:'white', fontStyle:"p"}}>
                  <BlockStack gap="600" >
                  <div style={{paddingLeft:"35px", paddingTop: "10px"}}>
                      <InlineStack blockAlign="start">
                        <Text variant="bodyMd" as="h4">
                          Total views 
                        </Text>
                      </InlineStack>
                      </div>
                            <div style={{paddingLeft:"35px"}}>
                              <InlineStack  align="start">
                              <Text variant="heading2xl" as="h2" fontWeight="bold">
                                {totalScans}
                              </Text>
                            </InlineStack>
                            </div>
                  </BlockStack>
              </div>
              <div style={{backgroundColor: 'white',backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', height:"120px",borderRadius:'10px', color:'#00ae65'}}>
                  <BlockStack gap="600" >
                  <div style={{paddingLeft:"35px", paddingTop: "10px"}}>
                      <InlineStack blockAlign="start">
                        <Text variant="bodyMd" as="h4">
                          Total sales 
                        </Text>
                      </InlineStack>
                      </div>
                            <div style={{paddingLeft:"35px"}}>
                              <InlineStack  align="start">
                            
                                {plan.name == "Free" ?(
                                    <Text variant="headinglg" as="h3" fontWeight="bold">Upgrade to pro</Text>
                                ):(
                                  <Text variant="heading2xl" as="h2" fontWeight="bold">€ {totalSpent.toFixed(2)}</Text>
                                )
                                }
                                
                              
                            </InlineStack>
                            </div>
                  </BlockStack>
              </div>
              </BlockStack>
           </div>

        </InlineGrid> 
      </Layout.Section>
         
         <Layout.Section></Layout.Section>

          <Layout.Section>
            <Card padding="0">
              {shortLinks.length === 0 ? (
               <SingleQRTable  />
              ) : (
                <QRTable shortLinks={shortLinks} />
              )}
            </Card>
          </Layout.Section>
       
        </Layout>

    </Page>
  );
}
