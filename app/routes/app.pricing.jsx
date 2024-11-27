import {
    Page,
    Box,
    Button,
    Card,
    CalloutCard,
    Text,
    Grid,
    Divider,
    BlockStack,
    ExceptionList,
    MediaCard
  } from "@shopify/polaris";
  import { json } from "@remix-run/node";
  import { useLoaderData,useSubmit } from "@remix-run/react";
  import { authenticate, MONTHLY_PLAN, ANNUAL_PLAN } from "../shopify.server";

  
  export async function loader({ request }) {
    const { billing } = await authenticate.admin(request);
  
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
      return json({ billing, plan: subscription });
  
    } catch (error) {
      // If the shop does not have an active plan, return an empty plan object
      if (error.message === 'No active plan') {
        console.log('Shop does not have any active plans.');
        return json({ billing, plan: { name: "Free" } });
      }
      // If there is another error, rethrow it
      throw error;
    }
  }
  
  export const action = async ({ request }) => {
    const { billing, session } = await authenticate.admin(request);
    const { shop } = session;
    const data = {
      ...Object.fromEntries(await request.formData()),
    };
    const action = data.action;
    const isTest = true;
  
    if (!action) {
      return null;
    }
  
    const PLAN = action === "ANNUAL" ? ANNUAL_PLAN : MONTHLY_PLAN;
  
    if (data.cancel) {
      const billingCheck = await billing.require({
        plans: [PLAN],
        onFailure: async () => billing.request({ plan: PLAN }),
      });
      const subscription = billingCheck.appSubscriptions[0];
      await billing.cancel({
        subscriptionId: subscription.id,
        isTest: isTest,
        prorate: true,
      });
    } else {
      
      await billing.require({
        plans: [PLAN],
        isTest: isTest,
        onFailure: async () => billing.request({ plan: PLAN, isTest: isTest }),
        returnUrl: `https://${shop}/admin/apps/short-link-app/app`,
      });
    }
  
    return null;
  }
  
  let planData = [
    {
      title: "Free",
      description: "Free plan with basic features",
      price: "0",
      action: "Upgrade to pro",
      name: "Free",
      features: [
        "100 wishlist per day",
        "500 Products",
        "Basic customization",
        "Basic support",
        "Basic analytics"
      ]
    },
    {
      title: "Annual",
      description: "Annual plan with advanced features",
      price: "12.99",
      name: "Annual subscription",
      action: "Upgrade to pro",
      features: [
        "Unlimted wishlist per day",
        "10000 Products",
        "Advanced customization",
        "Priority support",
        "Advanced analytics"
      ]
    },
  ]
  
  export default function PricingPage() {
    const { plan } = useLoaderData();
    const submit = useSubmit();
    const handlePurchaseAction = (subscription) => {
        console.log("ciao")
        // This sends a subscription request to our action function
        submit({ action: subscription }, { method: "post" });
      };

      const handleCancelAction = (subscription) => {
        submit({ action: subscription, cancel: true }, { method: "post" });
      };
      
    console.log('plan', plan);
    return (
      <Page>
        <ui-title-bar title="Pricing" />
        {plan.name == "Annual subscription" ?(
            <CalloutCard
            title="Change your plan"
            illustration='/app/image/team.png'
            primaryAction={{
              content: 'Cancel Plan',
              onClick: () => handleCancelAction("ANNUAL"),
            }}
          >
              <p>
                You're currently on pro plan. All features are unlocked.
              </p>
        </CalloutCard>):(
    <CalloutCard
    title="Change your plan"
    illustration='/app/image/curve.png'
    primaryAction={{
      content: 'Upgrade',
      onClick: () => handlePurchaseAction("ANNUAL"),
    }}
  >
      <p>
        You're currently on FREE plan. All features are locked.
      </p>
</CalloutCard>
          )
        }

  
        <div style={{ margin: "0.5rem 0"}}>
          <Divider />
        </div>
  
        <Grid>
  
          {planData.map((plan_item, index) => (
            <Grid.Cell key={index} columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
              <Card background={ plan_item.name == plan.name ? "bg-surface-success" : "bg-surface" } sectioned>
                <Box padding="400">
                  <Text as="h3" variant="headingMd">
                    {plan_item.title}
                  </Text>
                  <Box as="p" variant="bodyMd">
                    {plan_item.description}
                    {/* If plan_item is 0, display nothing */}
                    <br />
                    <Text as="p" variant="headingLg" fontWeight="bold">
                      {plan_item.price === "0" ? "" : "$" + plan_item.price}
                    </Text>
                  </Box>
  
                  <div style={{ margin: "0.5rem 0"}}>
                    <Divider />
                  </div>
  
                  <BlockStack gap={100}>
                    {plan_item.features.map((feature, index) => (
                      <ExceptionList
                        key={index}
                        items={[
                          {
                          
                            description: feature,
                          },
                        ]}
                      />
                    ))}
                  </BlockStack>
                  <div style={{ margin: "0.5rem 0"}}>
                    <Divider />
                  </div>
  
                  { plan_item.name == "Annual subscription" ?
                    plan.name != "Annual subscription" ? (
                      <Button primary onClick={() => handlePurchaseAction("ANNUAL")}>
                        {plan_item.action}
                      </Button>
                    ) : (
                      <Text as="p" variant="bodyMd">
                        You're currently on this plan
                      </Text>
                    )
                  : null }
                </Box>
              </Card>
            </Grid.Cell>
          ))}
  
        </Grid>
  
      </Page>
    );
  }