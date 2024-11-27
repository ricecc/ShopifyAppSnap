
//Create a QR code form
import { useState,useCallback } from "react";
import { json, redirect } from "@remix-run/node";
import { BarChart, Bar, Rectangle, CartesianGrid, Legend } from 'recharts';

import { AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { PieChart, Pie, Sector, ResponsiveContainer } from 'recharts';
import {
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
  useNavigate,
} from "@remix-run/react";
import { authenticate, MONTHLY_PLAN, ANNUAL_PLAN} from "../shopify.server";
import {
  Frame,
  Card,
  Bleed,
  Button,
  ChoiceList,
  Divider,
  Toast,
  InlineStack,
  InlineError,
  Layout,
  Page,
  Text,
  TextField,
  Thumbnail,
  BlockStack,
  PageActions,
  InlineGrid,
  Box,
  MediaCard
} from "@shopify/polaris";
import { ImageIcon,ClipboardIcon,MoneyIcon} from "@shopify/polaris-icons";


import db from "../db.server";
import { getAllVisitFromShortLink, getShortLink, validateShortLink } from "../models/ShortLink.server";
import { generate as generateShort } from "shortid";

export async function loader({ request, params }) {

  const { admin,billing } = await authenticate.admin(request);
  const shortLink = await getShortLink(Number(params.id), admin.graphql)
  const visits = await getAllVisitFromShortLink(shortLink)

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
    console.log(`Shop is on ${subscription.name} (id ${subscription.id})`);
    
    return json({
      shortLink,
      visits,
      billing,
      plan: subscription
    });
  } catch (error) {
    // If the shop does not have an active plan, return an empty plan object
    if (error.message === 'No active plan') {
      console.log('Shop does not have any active plans.');
      
      return json({
        shortLink,
        visits,
        billing,
        plan: { name: "Free" } 
      });
    }
    // If there is another error, rethrow it
    throw error;
  }

}

export async function action({ request, params }) {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  /** @type {any} */
  const data = {
    //Object.fromEntries static method transforms a list of key-value pairs into an object.
    //The formData() method of the Request interface reads the request body and returns it as a promise that resolves with a FormData object.
    ...Object.fromEntries(await request.formData()),
    shop,
  };

  if (data.action === "delete") {
    await db.shortLink.delete({ where: { id: Number(params.id) } });
    return redirect("/app");
  }

  const errors = validateShortLink(data);

  if (errors) {
    return json({ errors }, { status: 422 });
  }

  const short_link =
    params.id === "new"
      ? await db.shortLink.create({ data })
      : await db.shortLink.update({ where: { id: Number(params.id) }, data });

  return redirect(`/app/shortLink/${short_link.id}`);
}


function countVisitsByDate(data) {
  const visitCounts = {};

  data.forEach(item => {
    if (visitCounts[item.date]) {
      visitCounts[item.date]++;
    } else {
      visitCounts[item.date] = 1;
    }
  });

  return Object.keys(visitCounts).map(date => ({
    date: date,
    visits: visitCounts[date]
  }));
}

function countEventsPerDate(data) {
  // Creare una mappa per contare gli eventi per data
  const eventCounts = {};

  // Iterare attraverso data1 per popolare la mappa
  data.forEach(visit => {
    const { date, event } = visit;

    if (!eventCounts[date]) {
      eventCounts[date] = { addToCart: 0, cStarter: 0, cComplete: 0 };
    }

    if (event === 'product_added_to_cart') {
      eventCounts[date].addToCart += 1;
    } else if (event === 'checkout_started') {
      eventCounts[date].cStarter += 1;
    } else if (event === 'checkout_completed') {
      eventCounts[date].cComplete += 1;
    }
  });

  // Trasformare la mappa in un array di oggetti con la struttura desiderata
  const date2 = Object.keys(eventCounts).map(date => ({
    date,
    addToCart: eventCounts[date].addToCart,
    cStarter: eventCounts[date].cStarter,
    cComplete: eventCounts[date].cComplete,
  }));

  return date2;
}

function countUserAgent(data) {
  const userAgentCount = {};

  // Iterare attraverso data per popolare la mappa
  data.forEach(entry => {
    const { userAgent } = entry;

    if (!userAgentCount[userAgent]) {
      userAgentCount[userAgent] = 0;
    }

    userAgentCount[userAgent] += 1;
  });

  // Trasformare la mappa in un array di oggetti con la struttura desiderata
  const data2 = Object.keys(userAgentCount).map(userAgent => ({
    name: userAgent,
    value: userAgentCount[userAgent]
  }));

  return data2;
}

const renderActiveShape = (props) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill}>
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333">{`All ${value}`}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999">
        {`(Rate ${(percent * 100).toFixed(2)}%)`}
      </text>
    </g>
  );
};


export default function QRCodeForm() {
 
    /**
     * If the app user doesn't fill all of the QR code form fields, then the action returns errors to display. This is the return value of validateQRCode, which is accessed through the Remix useActionData hook.
     */
  const errors = useActionData()?.errors || {};

  const {shortLink, visits,plan} = useLoaderData();

  


  const checkoutCompletedEvents  = visits.filter(event => event.event === "checkout_completed");
  const addToCartEvents = visits.filter(event => event.event === "product_added_to_cart");
  const checkoutStarted = visits.filter(event => event.event === "checkout_started");
  const productView = visits.filter(event => event.event === "product_viewed");

  const conversionRate = (checkoutCompletedEvents.length / visits.length) * 100;
  const addToCartRate = (addToCartEvents.length /visits.length)*100;
  const checkoutStartedRate = (checkoutStarted.length / visits.length) *100;
  const reboundRate = (productView.length / visits.length) *100;


// Calcola il totale speso
const totalSpent = checkoutCompletedEvents.reduce((total, event) => {
    return total + parseFloat(event.amount);
}, 0);



  const data = visits.map(visit => ({
    date: new Date(visit.createdAt).toLocaleDateString('it-IT'), // Converte la data in formato 'gg/mm/aaaa'
    event: visit.event,
    amount: visit.amount,
    userAgent: visit.userAgent
  }));
  
  /**
   * When the user changes the title, selects a product, or changes the destination, this state is updated. This state is copied from useLoaderData into React state
   */
  const [formState, setFormState] = useState(shortLink);
 
  /**
   * The initial state of the form. This only changes when the user submits the form. This state is copied from useLoaderData into React state.
   */
  const [cleanFormState, setCleanFormState] = useState(shortLink);

  /**
   * Determines if the form has changed. This is used to enable save buttons when the app user has changed the form contents, or disable them when the form contents haven't changed.
   */
  const isDirty = JSON.stringify(formState) !== JSON.stringify(cleanFormState);

  const nav = useNavigation();
  /**
   * Keeps track of the network state using useNavigation. This state is used to disable buttons and show loading states.
   */
  const isSaving =
    nav.state === "submitting" && nav.formData?.get("action") !== "delete";
  const isDeleting =
    nav.state === "submitting" && nav.formData?.get("action") === "delete";

  const navigate = useNavigate();



  async function selectProduct() {
    const products = await window.shopify.resourcePicker({
      type: "product",
      action: "select", // customized action verb, either 'select' or 'add',
    });

    if (products) {
      const { images, id, variants, title, handle } = products[0];
      const shortId = generateShort.generate();
      setFormState({
        ...formState,
        productId: id,
        productVariantId: variants[0].id,
        productTitle: title,
        productHandle: handle,
        productAlt: images[0]?.altText,
        productImage: images[0]?.originalSrc,
        shortId: shortId
      });
    }

  }

  /**
   * Use the useSubmit Remix hook to save the form data.
     Copy the data that Prisma needs from formState and set the cleanFormState to the current formState.
   */
  const submit = useSubmit();
  function handleSave() {
    const data = {
      title: formState.title,
      productId: formState.productId || "",
      productVariantId: formState.productVariantId || "",
      productHandle: formState.productHandle || "",
      destination: formState.destination,
      shortId: formState.shortId
    };

    setCleanFormState({ ...formState });
    submit(data, { method: "post" });
  }

  const [active, setActive] = useState(false);

  const toggleActive = useCallback(() => {
    setActive((active) => !active);
  
    var copyText = document.getElementById("toCopy");
    
  
    // Select the text field
    copyText.select();
    copyText.setSelectionRange(0, 99999); // For mobile devices
  
    // Copy the text inside the text field
    navigator.clipboard.writeText(copyText.value);
  }, []);

  const toastMarkup = active ? (
    <Toast content="Link copied!"  tone="magic" onDismiss={toggleActive} duration={4500} />
  ) : null;

  const [activeIndex, setActiveIndex] = useState(0);
  const onPieEnter = useCallback(
    (_, index) => {
      setActiveIndex(index);
    },
    [setActiveIndex]
  );
  

  
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
    <Frame>
    <Page>
      <ui-title-bar title={shortLink.id ? "Edit Short link" : "Create new Short link"}>
        <button variant="breadcrumb" onClick={() => navigate("/app")}>
          Short Links
        </button>
      </ui-title-bar>
      <Layout>
      
        <Layout.Section>
          <BlockStack gap="500">
            <Card>
              <BlockStack gap="500">
              <Text variant="heading2xl" as="h2">{shortLink.title}</Text>
              
                {countVisitsByDate(data).length!==0?(
                   <ResponsiveContainer width="100%" height={250}>
                  <AreaChart
               
                  data={countVisitsByDate(data)}
                  margin={{
                    top: 10,
                    right: 5,
                    left: 0,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                      <XAxis  dataKey="date" allowDecimals={false} axisLine={true} tickLine={false} />
                      <YAxis tickLine={false} axisLine={true} domain={[1, 'dataMax']} 
      interval={0}
      tickFormatter={(value) => (Number.isInteger(value) ? value : '')}/>
                    
                      <Tooltip  />
                      <Area type="monotone" dataKey="visits" stroke="#0D6F68" fill="#CCE1D5" />
                  </AreaChart></ResponsiveContainer>):(
                    <EmptyData></EmptyData>
                  )}
              </BlockStack>
            </Card>
       </BlockStack>
        </Layout.Section>
      
        <Layout.Section variant="oneThird">
          <BlockStack gap="300" >
          <div style={{backgroundColor:'#005157', borderRadius:"10px", color:"white"}}>
              <Card background="bg-fill-transparent">      
                  <BlockStack gap="200" >
                    <Text as={"h2"} variant="headingLg">
                      Your short link
                    </Text>
                    
                    {shortLink.shortId? (
                        <BlockStack gap="300">
                          <TextField
                          value={`https://${shortLink.shop}/${shortLink.shortId}`}
                            autoComplete="off"
                            id="toCopy"
            />
                        </BlockStack>
                    ) : (
                      <BlockStack gap="300">
                        <Text>
                        Your short link will appear here after you save
                        </Text>
                      </BlockStack>
                    )}
                        
                        <div style={{backgroundColor:'#d04900', borderRadius:'10px', display: 'flex', justifyContent: 'center', alignItems: 'center', padding:'5px'}}>
                            <Button
                              icon={ClipboardIcon}
                              disabled={!shortLink?.shortId}
                              onClick={toggleActive}
                              variant="monochromePlain"
                              fullWidth
                            >
                              Copy short link
                            </Button>
                         </div>
                         
                  </BlockStack>      
              </Card>
          </div>
          <div style={{backgroundColor:'white', borderRadius:"10px", color:"#00ae65"}}>
              <Card background="bg-fill-transparent">      
              <InlineStack align="start">
                            <BlockStack gap="200">
                            <InlineGrid columns="1fr auto">
                            <Text as="h2" variant="headingSm">
                              Total sales
                            </Text>
                          </InlineGrid>
                          {plan.name=='Free'?(
                              <Text icon={MoneyIcon} as="p" variant='heading2xl' fontWeight="regular" >
                              Upgrade
                            </Text>
                          ):(
                              <Text icon={MoneyIcon} as="p" variant='heading2xl' fontWeight="regular" >
                                € {totalSpent.toFixed(2)}
                              </Text>
                          )}
                            </BlockStack>   
              </InlineStack>
              </Card>
                </div>
          </BlockStack>
        </Layout.Section>
       
      <Layout.Section>
       
          <div style={{backgroundColor:'#005157', borderRadius:"15px"}}>
         <Box padding="600">
            <InlineGrid  gap="600" columns={4}>
              <Card>
                <BlockStack gap="200">
                    <InlineGrid columns="1fr auto">
                      <Text as="h3" variant="headingSm">
                      Conversion rate
                      </Text>
                    </InlineGrid>
                    {plan.name=='Free'?(
                      <Text as="p" variant='headingMd' fontWeight='bold' >
                          Upgrade to pro
                    </Text>
                    ):(
                    <Text as="p" variant='heading2xl' fontWeight='bold' >
                          {isNaN(conversionRate) ? 0 : conversionRate.toFixed(2)}%
                    </Text>)}
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                    <InlineGrid columns="1fr auto">
                      <Text as="h3" variant="headingSm">
                        Add to cart rate
                      </Text>
                    </InlineGrid>
                    {plan.name=='Free'?(
                      <Text as="p" variant='headingMd' fontWeight='bold' >
                          Upgrade to pro
                    </Text>
                    ):(
                    <Text as="p" variant='heading2xl' fontWeight='bold' >
                    {isNaN(addToCartRate) ? 0 : addToCartRate.toFixed(2)}%
                    </Text>
                    )}
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                    <InlineGrid columns="1fr auto">
                      <Text as="h3" variant="headingSm">
                      Checkout completion rate
                      </Text>
                    </InlineGrid>
                        
                    
                    {plan.name=='Free'?(
                      <Text as="p" variant='headingMd' fontWeight='bold' >
                          Upgrade to pro
                    </Text>
                    ):(
                      <Text as="p" variant='heading2xl' fontWeight='bold' >
                        {isNaN(checkoutStartedRate) ? 0 : checkoutStartedRate.toFixed(2)}%
                    </Text>
                    )}
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                    <InlineGrid columns="1fr auto">
                      <Text as="h3" variant="headingSm">
                      Rebound rate
                      </Text>
                    </InlineGrid>
                    {plan.name=='Free'?(
                      <Text as="p" variant='headingMd' fontWeight='bold' >
                          Upgrade to pro 
                       </Text>
                    ):(
                    <Text as="p" variant='heading2xl' fontWeight='bold' >
                    {isNaN(reboundRate) ? 0 : reboundRate.toFixed(2)}%
                    </Text>
                    )}
                </BlockStack>
              </Card>

            </InlineGrid>
            </Box>
            </div>
            </Layout.Section>
        
        <Layout.Section>
          <Box height="400px" >
          <InlineGrid gap="400"  columns={['oneHalf', 'oneHalf']}>
            <Card>
              <InlineStack align="start">
              {plan.name=='Free'?(
                      <Text as="p" variant='headingMd' fontWeight='bold' >
                          Upgrade to pro to see Bar chart
                    </Text>
                    ):(
              <> 
              <p>Users actions</p>    
              <p>Here you can see the number of users who add the product to their cart, start the checkout process, or complete the purchase.</p> 
              <BarChart
          width={500}
          height={400}
          data={countEventsPerDate(data)}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="addToCart" fill="#005157" activeBar={<Rectangle fill="#0C766F" stroke="#0C766F" />} />
          <Bar dataKey="cStarter" fill="#FBCD6D" activeBar={<Rectangle fill="#FFE2A4" stroke="#FFE2A4" />} />
          <Bar dataKey="cComplete" fill="#82ca9d" activeBar={<Rectangle fill="#82ca9d" stroke="#82ca9d" />} />
              </BarChart></>)}
           
             </InlineStack>
            </Card>
            <Card>
            {plan.name=='Free'?(
                      <Text as="p" variant='headingMd' fontWeight='bold' >
                          Upgrade to pro to see pie chart
                    </Text>
                    ):(
                      <>
                      <p>Users device</p>
              <PieChart width={600} height={400}>
                  <Pie
                    activeIndex={activeIndex}
                    activeShape={renderActiveShape}
                    data={countUserAgent(data)}
                    cx={200}
                    cy={200}
                    innerRadius={60}
                    outerRadius={80}
                    fill="#D04900"
                    dataKey="value"
                    onMouseEnter={onPieEnter}
                  />
              </PieChart></>)}
            </Card>      
          </InlineGrid>
          </Box>
        </Layout.Section>
       

        <Layout.Section>
          <Card>
                <BlockStack gap="500">
                  <InlineStack align="space-between">
                    <Text as={"h2"} variant="headingLg">
                      Product
                    </Text>
                  </InlineStack>
                  {formState.productId ? (
                    <InlineStack blockAlign="center" gap="500">
                      <Thumbnail
                        source={formState.productImage || ImageIcon}
                        alt={formState.productAlt}
                      />
                      <Text as="span" variant="headingMd" fontWeight="semibold">
                        {formState.productTitle}
                      </Text>
                    </InlineStack>
                  ) : (
                    <BlockStack gap="200">
                      <Button onClick={selectProduct} id="select-product">
                        Select product
                      </Button>
                      {errors.productId ? (
                        <InlineError
                          message={errors.productId}
                          fieldID="myFieldID"
                        />
                      ) : null}
                    </BlockStack>
                  )}
                  <Bleed marginInlineStart="200" marginInlineEnd="200">
                    <Divider />
                  </Bleed>
                  {/**
                   * Add destination options
                      Use ChoiceList to render different destinations. It should setFormState when the selection changes.
                      If the user is editing a QR code, use a Button to link to the destination URL in a new tab.
                  */}
                  <InlineStack gap="500" align="space-between" blockAlign="start">
                    <ChoiceList
                      title="Scan destination"
                      choices={[
                        { label: "Link to product page", value: "product" },
                        {
                          label: "Link to checkout page with product in the cart",
                          value: "cart",
                        },
                      ]}
                      selected={[formState.destination]}
                      onChange={(destination) =>
                        setFormState({
                          ...formState,
                          destination: destination[0],
                        })
                      }
                      error={errors.destination}
                    />
                    {shortLink.destinationUrl ? (
                      <Button
                        variant="plain"
                        url={shortLink.destinationUrl}
                        target="_blank"
                      >
                        Go to destination URL
                      </Button>
                    ) : null}
                  </InlineStack>
                </BlockStack>
          </Card>
        </Layout.Section>


        <Layout.Section>
          <PageActions
            secondaryActions={[
              {
                content: "Delete",
                loading: isDeleting,
                disabled: !shortLink.id || !shortLink || isSaving || isDeleting,
                destructive: true,
                outline: true,
                onAction: () =>
                  submit({ action: "delete" }, { method: "post" }),
              },
            ]}
            primaryAction={{
              content: "Save",
              loading: isSaving,
              disabled: !isDirty || isSaving || isDeleting,
              onAction: handleSave,
            }}
          />
        </Layout.Section>

       
      </Layout>
      {toastMarkup}
    </Page>
    </Frame>
  );
}
