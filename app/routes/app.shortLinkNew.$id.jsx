
//Create a QR code form
import { useState,useCallback } from "react";
import { json, redirect } from "@remix-run/node";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import {
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
  useNavigate,
} from "@remix-run/react";
import { authenticate } from "../shopify.server";
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
} from "@shopify/polaris";
import { ImageIcon,ClipboardIcon } from "@shopify/polaris-icons";


import db from "../db.server";
import {  validateShortLink } from "../models/ShortLink.server";
import { generate as generateShort } from "shortid";

export async function loader({ request, params }) {
  console.log("request", request)
  const { admin } = await authenticate.admin(request);


  if (params.id === "new") {
    return json({
      destination: "product",
      title: "",
    });
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

export default function QRCodeForm() {
    /**
     * If the app user doesn't fill all of the QR code form fields, then the action returns errors to display. This is the return value of validateQRCode, which is accessed through the Remix useActionData hook.
     */
  const errors = useActionData()?.errors || {};

  const shortLink = useLoaderData();
  
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
                <Text as={"h2"} variant="headingLg">
                  Title
                </Text>
                <TextField
                  id="title"
                  helpText="Only store staff can see this title"
                  label="title"
                  labelHidden
                  autoComplete="off"
                  value={formState.title}
                  onChange={(title) => setFormState({ ...formState, title })}
                  error={errors.title}
                />
              </BlockStack>
            </Card>
            {/*Add a way to select the product
               If the user hasn't selected a product, then display a Button that triggers selectProduct.
               If the user has selected a product, use Thumbnail to display the product image. Make sure to handle the case where a product has no image.
               Use inlineError to display an error from useActionData if the user submits the form without selecting a product. */}
            <Card>
              <BlockStack gap="500">
                <InlineStack align="space-between">
                  <Text as={"h2"} variant="headingLg">
                    Product
                  </Text>
                  {formState.productId ? (
                    <Button variant="plain" onClick={selectProduct}>
                      Change product
                    </Button>
                  ) : null}
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
          </BlockStack>
        </Layout.Section>
        <Layout.Section variant="oneThird">
            {/**
             * Display a preview of the QR code

                After saving a QR code, or when editing an existing QR code, provide ways to preview the QR code that the app user created.
                If a QR code is available, then use EmptyState to render the QR code. If no QR code is available, then use an EmptyState component with a different configuration.
                Add buttons to download the QR code, and to preview the public URL
             */}
        
        
          <Card>
          <BlockStack gap="300">
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
            <BlockStack gap="300">
              
              <Button
              icon={ClipboardIcon}
                disabled={!shortLink?.shortId}
                variant="primary"
                onClick={toggleActive}
               
              >
                Copy short link
              </Button>
              
            </BlockStack>
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
