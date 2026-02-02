# EasyOrders API Documentation

Welcome developers to EasyOrders API! In this documentation, you'll find comprehensive guides, reference materials, and examples to help you integrate and work seamlessly with our API.

---

## 📑 Table of Contents

1. [Quick Start Guide](#quick-start-guide)
2. [Authentication](#authentication)
3. [Webhooks](#webhooks)
4. [Products API](#products-api)
   - [Create Product](#create-product)
   - [Update Product](#update-product)
   - [Get Product](#get-product)
   - [Get All Products](#get-all-products)
   - [Update Product Stock](#update-product-stock)
5. [Shipping API](#shipping-api)
6. [Categories API](#categories-api)
   - [Create Category](#create-category)
   - [Get All Categories](#get-all-categories)
   - [Get Category](#get-category)
   - [Update Category](#update-category)
7. [Orders API](#orders-api)
   - [Get Order by ID](#get-order-by-id)
   - [Update Order Status](#update-order-status)
   - [Add Order Notes](#add-order-notes)
8. [Query Parameters](#query-parameters)
9. [Permissions](#permissions)
10. [Rate Limit Policy](#rate-limit-policy)
11. [Creating Authorized App Link](#creating-authorized-app-link)
12. [Connecting a Dropshipping Provider](#connecting-a-dropshipping-provider)

---

## 🚀 Quick Start Guide

To get started with EasyOrders API, follow these steps:

### Step 1: Sign Up
Create an account and obtain your API key from your seller dashboard.

### Step 2: Get API Key
1. Navigate to your seller dashboard account settings
2. Go to the **Public API** section
3. Click on **Create New API Key**
4. Give your API key a name and save it
5. **Important:** Copy your API key immediately as it won't be visible again

### Step 3: Authenticate Requests
Include your API key in the header of all requests:

```http
Api-Key: YOUR_API_KEY
```

### Step 4: Start Integrating
Begin integrating EasyOrders API into your applications using the endpoints documented below.

> **📝 Note:** Make sure your API key has the required permissions for the operations you want to perform. See [Permissions](#permissions) section for more details.

---

## 🔐 Authentication

To authenticate requests with EasyOrders API, you need to obtain an API key and include it in the request headers.

### Obtaining an API Key

1. Navigate to your seller dashboard account settings
2. Go to the **Public API** section
3. Click on **Create New API Key**
4. Give your API key a name and save it
5. Your API key will be displayed. **Make sure to copy it as it won't be visible again**

### Using the API Key

Once you have obtained your API key, include it in the header of your requests as follows:

```http
Api-Key: YOUR_API_KEY
```

Replace `YOUR_API_KEY` with the actual API key you obtained.

#### Example using cURL:

```bash
curl -H "Api-Key: YOUR_API_KEY" \
  https://api.easy-orders.net/api/v1/external-apps/products
```

#### Example using JavaScript (fetch):

```javascript
fetch('https://api.easy-orders.net/api/v1/external-apps/products', {
  headers: {
    'Api-Key': 'YOUR_API_KEY'
  }
});
```

> **⚠️ Security Note:**
> - Keep your API key confidential and do not share it publicly
> - If you suspect your API key has been compromised, regenerate it immediately from your account settings
> - If you encounter any issues or have questions regarding authentication, feel free to contact us for assistance

---

## 🔔 Webhooks

Webhooks allow you to receive real-time notifications when certain events occur within EasyOrders API. You can configure webhooks to send data to a specific URL whenever an event is triggered.

### Creating a Webhook

To create a webhook:

1. Log in to your seller dashboard
2. Go to the **Public API** section
3. Navigate to **Webhooks**
4. Click on **Create Webhook**
5. Enter the endpoint URL where you want to receive webhook notifications
6. Save the webhook configuration
7. After creating the webhook, a **secret key** will be generated

### Webhook Secret

When EasyOrders sends a webhook to your endpoint, it will include a `secret` header. Use this to verify the request authenticity.

#### Example Request:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "secret: GENERATED_SECRET" \
  https://your-webhook-url.com/receive
```

```javascript
fetch("https://your-webhook-url.com/receive", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "secret": "GENERATED_SECRET"
  },
  body: JSON.stringify(orderPayload)
});
```

### Webhook Payloads

When an event is triggered, EasyOrders will send a POST request to the specified webhook URL with a JSON payload.

#### Order Created Event

```json
{
  "id": "2692e31f-27f6-472d-b4cd-c0c1c168511c",
  "updated_at": "2024-04-08T03:01:02.474921+02:00",
  "created_at": "2024-04-08T03:01:02.474921+02:00",
  "store_id": "29bafd4f-5e5a-4faf-8f0f-6c4379eb65ef",
  "cost": 730,
  "shipping_cost": 20,
  "total_cost": 750,
  "status": "pending",
  "full_name": "Violet Henson",
  "phone": "01034567890",
  "government": "منطقة الرياض",
  "address": "Est est sunt in ven",
  "payment_method": "cod",
  "cart_items": [
    {
      "id": "27845040-1252-448a-a257-1118e9ff2424",
      "product_id": "fac7a724-63bd-42c8-8179-9e96f992504f",
      "variant_id": "cb0eb2b5-bf08-430e-a5bb-7a2af7c7bb31",
      "store_id": "29bafd4f-5e5a-4faf-8f0f-6c4379eb65ef",
      "price": 220,
      "quantity": 1,
      "product": {
        "id": "fac7a724-63bd-42c8-8179-9e96f992504f",
        "updated_at": "2024-03-16T10:48:02.301593+02:00",
        "created_at": "2022-12-19T17:27:53.497836+02:00",
        "store_id": "29bafd4f-5e5a-4faf-8f0f-6c4379eb65ef",
        "name": "ترينج  شبابي أندر ارمر",
        "price": 220,
        "sku": "EG010102RO5G06",
        "taager_code": "020501DR0523",
        "drop_shipping_provider": "taager"
      },
      "variant": {
        "id": "cb0eb2b5-bf08-430e-a5bb-7a2af7c7bb31",
        "product_id": "fac7a724-63bd-42c8-8179-9e96f992504f",
        "price": 220,
        "sale_price": 0,
        "quantity": 0,
        "taager_code": "020501WL0530",
        "variation_props": [
          {
            "id": "fd336249-d66f-43df-bce0-2ccc9fa42cc6",
            "variation": "color",
            "variation_prop": "#808080",
            "product_variant_id": "cb0eb2b5-bf08-430e-a5bb-7a2af7c7bb31"
          },
          {
            "id": "ab56b8cf-e670-487c-a329-f604238638e5",
            "variation": "size",
            "variation_prop": "L",
            "product_variant_id": "cb0eb2b5-bf08-430e-a5bb-7a2af7c7bb31"
          }
        ]
      }
    }
  ]
}
```

> **📝 Note:** `variant_id` and `variant` object may be `undefined` if the product has no variants.

#### Order Status Change Event

```json
{
  "event_type": "order-status-update",
  "order_id": "2692e31f-27f6-472d-b4cd-c0c1c168511c",
  "old_status": "pending",
  "new_status": "paid",
  "payment_ref_id": "TX1234567890"
}
```

### Deleting a Webhook

To delete a webhook, use the DELETE endpoint:

**Endpoint:** `DELETE /api/v1/external-apps/webhooks/delete-by-url`

**Headers:**
```http
Authorization: Bearer YOUR_API_KEY
```

**Query Parameters:**
- `url` (string, required): The webhook URL to delete

### Testing Webhooks

You can easily test webhooks using [https://webhook.site/](https://webhook.site/)

---

## 📦 Products API

### Create Product

The Create Product API endpoint allows you to add a new product to your store in EasyOrders.

> **🔑 Required Permission:** `products:create`

**Endpoint:**
```http
POST https://api.easy-orders.net/api/v1/external-apps/products
```

**Headers:**
```http
Api-Key: YOUR_API_KEY
Content-Type: application/json
```

**Request Body:**

```json
{
  "name": "ترنج أديداس",
  "price": 175,
  "sale_price": 150,
  "description": "<p>ترنج اديداس 3 الوان مقاسات لارج و اكس لارج و 2 اكس لارج</p>",
  "slug": "trnj-adydas",
  "sku": "642c99587a397366b436f46b",
  "thumb": "https://domain.com/url_to_img.png",
  "images": [
    "https://domain.com/url_to_img.png",
    "https://domain.com/url_to_img.png"
  ],
  "categories": [
    { "id": "category-id" },
    { "id": "category-id" }
  ],
  "quantity": 12,
  "track_stock": true,
  "disable_orders_for_no_stock": false,
  "buy_now_text": "اضغط هنا للشراء",
  "is_reviews_enabled": true,
  "fake_visitors_min": 20,
  "fake_visitors_max": 70,
  "fake_timer_hours": 1,
  "is_quantity_hidden": false,
  "is_header_hidden": false,
  "is_free_shipping": false,
  "taager_code": "YOUR_PRODUCT_SKU",
  "drop_shipping_provider": "YOUR_COMPANY_NAME",
  "variations": [
    {
      "id": "521a0ab9-12e0-4536-b458-47006108c39e",
      "name": "اللون",
      "product_id": "4501688d-c283-4b24-b7bb-e6406d419367",
      "type": "dropdown",
      "props": [
        {
          "id": "f803e005-69c7-4b9f-ae2d-0590703aadc9",
          "name": "أزرق",
          "variation_id": "521a0ab9-12e0-4536-b458-47006108c39e",
          "value": "أزرق"
        }
      ]
    }
  ],
  "variants": [
    {
      "id": "13aae9ed-4844-43af-b54c-ab35b4ed13da",
      "price": 175,
      "sale_price": 0,
      "quantity": 0,
      "taager_code": "642c97467a397366b436f40a",
      "variation_props": [
        {
          "variation": "اللون",
          "variation_prop": "أزرق"
        },
        {
          "variation": "المقاس",
          "variation_prop": "l"
        }
      ]
    }
  ]
}
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Product name |
| `price` | number | Yes | Original price |
| `sale_price` | number | No | Sale price |
| `description` | string | No | Product description (HTML supported) |
| `slug` | string | Yes | URL-friendly identifier (English, unique) |
| `sku` | string | No | Stock Keeping Unit |
| `thumb` | string | No | Thumbnail image URL |
| `images` | array | No | Array of image URLs |
| `categories` | array | No | Array of category objects with `id` |
| `quantity` | number | No | Stock quantity (0 if not available) |
| `track_stock` | boolean | No | Enable stock tracking |
| `disable_orders_for_no_stock` | boolean | No | Disable orders when quantity is 0 |
| `taager_code` | string | No | Your product SKU/code |
| `drop_shipping_provider` | string | No | Dropshipping provider name |
| `variations` | array | No | Product variations (color, size, etc.) |
| `variants` | array | No | Product variants with specific combinations |

> **📝 Note:** 
> - `slug` must be in English and unique
> - `variation.type` can be: `"dropdown"`, `"buttons"`, or `"color"`
> - See [Variations and Variants](#variations-and-variants) section for more details

### Update Product

The Update Product API endpoint allows you to update an existing product in your store.

> **🔑 Required Permission:** `products:update`

**Endpoint:**
```http
PATCH https://api.easy-orders.net/api/v1/external-apps/products/:product_id
```

**Headers:**
```http
Api-Key: YOUR_API_KEY
Content-Type: application/json
```

**Request Body:** Same structure as [Create Product](#create-product)

> **📝 Note:** Only include fields you want to update. Omitted fields will remain unchanged.

### Get Product

Retrieve details of a specific product by ID.

> **🔑 Required Permission:** `products:read`

**Endpoint:**
```http
GET https://api.easy-orders.net/api/v1/external-apps/products/:product_id
```

**Headers:**
```http
Api-Key: YOUR_API_KEY
```

**Response:** Returns the complete product object with all fields.

### Get All Products

Retrieve a list of all products with optional filtering, sorting, and pagination.

> **🔑 Required Permission:** `products:read`

**Endpoint:**
```http
GET https://api.easy-orders.net/api/v1/external-apps/products
```

**Headers:**
```http
Api-Key: YOUR_API_KEY
```

**Query Parameters:** See [Query Parameters](#query-parameters) section for filtering, sorting, and pagination options.

**Example with Filters:**
```http
GET https://api.easy-orders.net/api/v1/external-apps/products?filter=price||gte||100&sort=price,DESC&limit=10&page=1
```

**Variants and Variations:**

To include variant or variation data in the response, use the `join` parameter:

```http
GET https://api.easy-orders.net/api/v1/external-apps/products?join=Variations.Props,Variants.VariationProps
```

### Update Product Stock

Update the stock quantity of a specific product or variant.

> **🔑 Required Permission:** `products:update`

#### Update Product Stock by SKU

**Endpoint:**
```http
PATCH https://api.easy-orders.net/api/v1/external-apps/products/sku/:sku/quantity
```

**Headers:**
```http
Api-Key: YOUR_API_KEY
Content-Type: application/json
```

**Request Body:**
```json
{
  "quantity": 10
}
```

#### Update Product Variant Stock

**Endpoint:**
```http
PATCH https://api.easy-orders.net/api/v1/external-apps/products/variants/:product_taager_code/:variant_taager_code/quantity
```

**Headers:**
```http
Api-Key: YOUR_API_KEY
Content-Type: application/json
```

**Request Body:**
```json
{
  "quantity": 10
}
```

> **📝 Note:** `taager_code` is the code you set when creating the product or variant. Minimum quantity is 0.

---

## 🚚 Shipping API

The Update Shipping API endpoint allows you to update shipping costs for different locations.

> **🔑 Required Permission:** `shipping_areas`

**Endpoint:**
```http
PATCH https://api.easy-orders.net/api/v1/external-apps/shipping
```

**Headers:**
```http
Api-Key: YOUR_API_KEY
Content-Type: application/json
```

**Request Body:**

The `cities` field should be a comma-separated string in the format: `city:cost,city:cost`

**Example:**
```json
{
  "is_active": true,
  "cities": "cairo:30,alexandria:40,القاهرة:22,الاسكندرية:33"
}
```

**JavaScript Example:**

```javascript
const cities = [
  { name: "cairo", shipping_cost: 30 },
  { name: "alexandria", shipping_cost: 30 }
];

const updateShipping = {
  is_active: true,
  cities: cities.map(city => `${city.name}:${city.shipping_cost}`).join(",")
};

// Result: "cairo:30,alexandria:30"
```

> **⚠️ Important:** `is_active` must be `true` for the shipping configuration to be active.

---

## 📂 Categories API

### Create Category

Create a new category in your store.

> **🔑 Required Permission:** `categories:write`

**Endpoint:**
```http
POST https://api.easy-orders.net/api/v1/external-apps/categories
```

**Headers:**
```http
Api-Key: YOUR_API_KEY
Content-Type: application/json
```

**Request Body:**
```json
{
  "thumb": "example_thumb_value",
  "name": "example_category_name",
  "slug": "example_category_slug",
  "show_in_header": true,
  "hidden": false,
  "position": 1,
  "parent_id": "id-of-parent-or-null"
}
```

### Get All Categories

Retrieve all categories with optional filtering.

> **🔑 Required Permission:** `categories:read`

**Endpoint:**
```http
GET https://api.easy-orders.net/api/v1/external-apps/categories/
```

**Headers:**
```http
Api-Key: YOUR_API_KEY
```

**Query Parameters:** See [Query Parameters](#query-parameters) section.

**Example - Get Parent Categories:**
```http
GET https://api.easy-orders.net/api/v1/external-apps/categories/?filter=parent_id||isnull&filter=hidden||eq||false
```

**Response:**
```json
{
  "thumb": "example_thumb_value",
  "created_at": "2024-04-26T12:00:00Z",
  "name": "example_category_name",
  "slug": "example_category_slug",
  "show_in_header": true,
  "hidden": false,
  "position": 1,
  "parent_id": "id-of-parent-or-null",
  "children": []
}
```

### Get Category

Retrieve a specific category by ID.

> **🔑 Required Permission:** `categories:read`

**Endpoint:**
```http
GET https://api.easy-orders.net/api/v1/external-apps/categories/:category_id
```

**Headers:**
```http
Api-Key: YOUR_API_KEY
```

**Response:** Same structure as Get All Categories response.

### Update Category

Update an existing category.

> **🔑 Required Permission:** `categories:write`

**Endpoint:**
```http
PATCH https://api.easy-orders.net/api/v1/external-apps/categories/:category_id
```

**Headers:**
```http
Api-Key: YOUR_API_KEY
Content-Type: application/json
```

**Request Body:** Same structure as Create Category.

---

## 🛒 Orders API

### Get Order by ID

Retrieve details of a specific order.

> **🔑 Required Permission:** `orders:read`

**Endpoint:**
```http
GET https://api.easy-orders.net/api/v1/external-apps/orders/:order_id
```

**Headers:**
```http
Api-Key: YOUR_API_KEY
```

**Response:**
```json
{
  "id": "2692e31f-27f6-472d-b4cd-c0c1c168511c",
  "updated_at": "2024-04-08T03:01:02.474921+02:00",
  "created_at": "2024-04-08T03:01:02.474921+02:00",
  "store_id": "29bafd4f-5e5a-4faf-8f0f-6c4379eb65ef",
  "cost": 730,
  "shipping_cost": 20,
  "total_cost": 750,
  "status": "pending",
  "full_name": "Violet Henson",
  "phone": "01034567890",
  "government": "منطقة الرياض",
  "address": "Est est sunt in ven",
  "payment_method": "cod",
  "cart_items": [
    {
      "id": "27845040-1252-448a-a257-1118e9ff2424",
      "product_id": "fac7a724-63bd-42c8-8179-9e96f992504f",
      "variant_id": "cb0eb2b5-bf08-430e-a5bb-7a2af7c7bb31",
      "store_id": "29bafd4f-5e5a-4faf-8f0f-6c4379eb65ef",
      "price": 220,
      "quantity": 1,
      "product": {
        "id": "fac7a724-63bd-42c8-8179-9e96f992504f",
        "name": "ترينج  شبابي أندر ارمر",
        "price": 220,
        "sku": "EG010102RO5G06",
        "taager_code": "020501DR0523",
        "drop_shipping_provider": "taager"
      },
      "variant": {
        "id": "cb0eb2b5-bf08-430e-a5bb-7a2af7c7bb31",
        "price": 220,
        "sale_price": 0,
        "quantity": 0,
        "taager_code": "020501WL0530",
        "variation_props": [
          {
            "id": "fd336249-d66f-43df-bce0-2ccc9fa42cc6",
            "variation": "color",
            "variation_prop": "#808080",
            "product_variant_id": "cb0eb2b5-bf08-430e-a5bb-7a2af7c7bb31"
          }
        ]
      }
    }
  ]
}
```

> **📝 Note:** `variant_id` and `variant` object may be `undefined` if the product has no variants.

### Update Order Status

Change the status of a specific order.

> **🔑 Required Permission:** `orders:update`

**Endpoint:**
```http
PATCH https://api.easy-orders.net/api/v1/external-apps/orders/:order_id/status
```

**Headers:**
```http
Api-Key: YOUR_API_KEY
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "processing"
}
```

**Available Statuses:**

| Status | Description |
|--------|-------------|
| `pending` | The order has been placed but not yet processed |
| `confirmed` | The order has been confirmed and is ready to be processed |
| `pending_payment` | The order is awaiting payment confirmation |
| `paid` | The payment for the order has been received |
| `paid_failed` | The payment attempt for the order has failed |
| `processing` | The order is being prepared for shipment |
| `waiting_for_pickup` | The order has been processed and is awaiting pickup |
| `in_delivery` | The order has been shipped and is in transit |
| `delivered` | The order has been successfully delivered to the customer |
| `canceled` | The order has been canceled |
| `returning_from_delivery` | The order has been returning from delivery |
| `request_refund` | The customer has requested a refund for the order |
| `refund_in_progress` | The refund for the order is in progress |
| `refunded` | The refund for the order has been completed |

### Add Order Notes

Add notes to a specific order.

> **🔑 Required Permission:** `orders:update`

**Endpoint:**
```http
POST https://api.easy-orders.net/api/v1/external-apps/order-notes
```

**Headers:**
```http
Api-Key: YOUR_API_KEY
Content-Type: application/json
```

**Request Body:**
```json
{
  "order_id": "2692e31f-27f6-472d-b4cd-c0c1c168511c",
  "note": "Customer requested gift wrapping.",
  "store_id": "29bafd4f-5e5a-4faf-8f0f-6c4379eb65ef",
  "type": "public"
}
```

**Note Types:**
- `public`: Visible to the customer
- `private`: Only visible to store administrators

---

## 🔍 Query Parameters

Query parameters allow you to filter, sort, paginate, and customize the data returned by API endpoints.

### Filter

Filters allow you to narrow down results based on specific criteria.

**Basic Syntax:**
```
field||operator||value
```

**Operators:**

| Operator | Description | Example |
|----------|-------------|---------|
| `eq` | Equal to (=) | `filter=name||eq||iphone` |
| `ne` | Not equal to (!=) | `filter=quantity||ne||0` |
| `gt` | Greater than (>) | `filter=price||gt||100` |
| `lt` | Less than (<) | `filter=quantity||lt||10` |
| `gte` | Greater than or equal to (>=) | `filter=price||gte||175` |
| `lte` | Less than or equal to (<=) | `filter=price||lte||150` |
| `$in` | In (matches any value in list) | `filter=status||$in||active,pending` |
| `cont` | Contains (string search) | `filter=name||cont||iphone` |
| `isnull` | Is null | `filter=description||isnull` |
| `notnull` | Is not null | `filter=description||notnull` |

**Multiple Filters:**

Combine multiple filters using `&`:

```
filter=category_id||eq||category-id&filter=price||gte||100
```

This example filters for records where:
- `category_id` equals `category-id` **AND**
- `price` is greater than or equal to `100`

**Example - Get Products by Multiple IDs:**
```
filter=id||$in||id1,id2,id3
```

**Example - Get Parent Categories:**
```
filter=parent_id||isnull&filter=hidden||eq||false
```

### Sort

Sort results by a specific field.

**Basic Syntax:**
```
sort=field,direction
```

- `field`: The property name to sort by
- `direction`: `ASC` (ascending) or `DESC` (descending)

**Example:**
```
sort=price,DESC
```

This sorts products by price in descending order.

### Limit

Limit the number of records returned.

**Basic Syntax:**
```
limit=number
```

**Example:**
```
limit=10
```

This retrieves 10 records.

### Selecting Fields

Retrieve only specific fields from the response.

**Basic Syntax:**
```
fields=field1,field2,field3
```

**Example:**
```
fields=id,name,price
```

> **ℹ️ Info:** When using the `fields` parameter, certain default fields will always be retrieved regardless of whether they are explicitly specified. These default fields are essential for the proper functioning of the API.

### Joining Related Entities

Include related entities in your API response (similar to SQL JOIN operations).

**Basic Syntax:**
```
join=entity1,entity2
```

**Example:**
```
join=variations
```

This retrieves the variations and variants of the product.

**Example for Products:**
```
join=Variations.Props,Variants.VariationProps
```

### Pagination

Retrieve specific pages of results.

**Basic Syntax:**
```
page=number
```

**Example:**
```
page=1
```

This retrieves the first page of results.

**Complete Example:**
```
GET /api/v1/external-apps/products?filter=price||gte||100&sort=price,DESC&limit=10&page=1&fields=id,name,price
```

---

## 🔑 Permissions

API keys require specific permissions to perform operations. Make sure your API key has the required permissions before making requests.

### Products Permissions

| Permission | Description |
|------------|-------------|
| `products:read` | Retrieve information about products (names, descriptions, prices, availability) |
| `products:create` | Add new products to the system |
| `products:update` | Modify existing product information |
| `products:delete` | Delete existing products from the system |

### Orders Permissions

| Permission | Description |
|------------|-------------|
| `orders:read` | View information about orders (IDs, items, quantities, prices, status) |
| `orders:create` | Create new orders in the system |
| `orders:update` | Update existing order information (status, addresses, payment info) |
| `orders:delete` | Delete existing orders from the system |

### Categories Permissions

| Permission | Description |
|------------|-------------|
| `categories:read` | Retrieve information about product categories |
| `categories:create` | Add new categories to the system |
| `categories:update` | Modify existing category information |
| `categories:delete` | Delete existing categories from the system |

### Shipping Areas Permissions

| Permission | Description |
|------------|-------------|
| `shipping_areas` | Access and manage shipping areas (retrieve, add, update, delete) |

---

## ⚡ Rate Limit Policy

To ensure fair usage and maintain system performance, we enforce rate limits on API requests.

### Rate Limit Details

**Rate Limit:** 40 requests per minute

### Why a Rate Limit?

Rate limits are crucial for:
- **Fair Usage:** Ensuring fair access to our service for all users
- **Preventing Abuse:** Protecting against spamming or server overload
- **Maintaining Performance:** Ensuring optimal performance for everyone

### What Counts as a Request?

A "request" refers to any interaction with our service that requires server processing, including:
- API calls
- Page loads
- Data retrievals
- Any other actions requiring server communication

### Handling Rate Limit Exceeded Errors

If you exceed the rate limit, you will receive a **429 Too Many Requests** HTTP status code. In such cases:
1. Wait for the next minute before making additional requests
2. Implement exponential backoff in your application
3. Consider caching responses when possible

### Need More Requests?

If your use case requires more than the allotted rate limit, please contact us to discuss your requirements. We may be able to provide a custom solution tailored to your needs.

---

## 🔗 Creating Authorized App Link

The Authorized App Link allows users to install your application and grant necessary permissions automatically, eliminating the need for manual API key and webhook setup.

### Why Use Authorized App Links?

- **Automated Setup:** Users can accept and install your app with one click
- **Automatic Configuration:** Creates webhook and API key automatically
- **Better UX:** Eliminates manual steps from the dashboard
- **Seamless Integration:** Streamlines the integration process

> **📝 Note:** Users can still set up API keys and webhooks manually from the dashboard if they prefer.

### Creating the Link

Construct the URL using the following format:

```
https://app.easy-orders.net/#/install-app?
app_description=<APP_DESCRIPTION>&
app_icon=<APP_ICON_URL>&
app_name=<APP_NAME>&
callback_url=<CALLBACK_URL>&
orders_webhook=<ORDERS_WEBHOOK_URL>&
order_status_webhook=<ORDER_STATUS_WEBHOOK_URL>&
permissions=<PERMISSIONS>&
redirect_url=<REDIRECT_URL>
```

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `app_description` | Yes | Description of your application |
| `app_icon` | Yes | URL of the icon for your application |
| `app_name` | Yes | Name of your application |
| `callback_url` | Yes | URL where the authorization response will be sent |
| `orders_webhook` | Yes | URL where orders webhook notifications will be sent |
| `order_status_webhook` | No | URL where order status update webhook notifications will be sent |
| `permissions` | Yes | Comma-separated list of permissions (e.g., `products:read,products:create,shipping_areas`) |
| `redirect_url` | Yes | URL where users will be redirected after authorizing your application |

**Example:**

```
https://app.easy-orders.net/#/install-app?app_name=YOUR%20APP%20NAME&app_description=YOUR%20DESCRIPTION&permissions=products:read,products:create,shipping_areas&app_icon=https://example.com/icon.png&callback_url=https://example.com/callback&orders_webhook=https://example.com/webhook&redirect_url=https://example.com/success
```

### After User Accepts

After the user accepts and installs your app, we will send a POST request to your `callback_url` with:

```json
{
  "api_key": "generated_key",
  "store_id": "store_id"
}
```

Use this information to complete the integration setup.

---

## 🏪 Connecting a Dropshipping Provider

This guide explains how to integrate a dropshipping provider with your platform.

### Step 1: Create API Key with Permissions

**User creates API key:**
- Generate an API key with permissions to:
  - Create products (`products:create`)
  - Update shipping information (`shipping_areas`)

> **💡 Tip:** You can automate this step using [Authorized App Links](#creating-authorized-app-link).

### Step 2: Set Up Webhook Endpoint

**Create webhook endpoint:**
- Set up a webhook endpoint to receive orders from the dropshipping provider
- When a webhook is received:
  1. Extract the order ID from the payload
  2. Use the order ID to fetch complete order details using the [Get Order by ID API](#get-order-by-id)

> **📝 Note:** See [Webhooks](#webhooks) section for webhook payload structure and setup instructions.

### Step 3: List Products and Create Product Requests

**List products for customers:**
- Display available products for customers to import into their stores

**Send create product request:**
- When a user decides to import a product, send a create product request to the dropshipping provider's API
- Use the [Create Product API](#create-product) endpoint

### Step 4: Update Shipping Areas

**Update shipping areas:**
- Modify shipping areas in the customer's store to match those of the dropshipping provider
- This ensures accurate shipping calculations and options
- Use the [Update Shipping API](#shipping-api) endpoint

### Step 5: Provide Shipping Choices

**Enable free shipping option:**
- Provide the user with the choice to offer free shipping

**Add shipping cost to products:**
- When creating a product using the API, include shipping costs as part of the product details

### Step 6: Automate API Key and Webhook Creation

**Use Authorized App Link:**
- Enable users to accept installing your app and create API key and webhook automatically
- See [Creating Authorized App Link](#creating-authorized-app-link) for more information

> **⚠️ Important Note:**
> 
> Please consider your database structure to enable users to have multiple stores, where each store has its own API key and webhook. Most users will have multiple stores and want to connect each store with the same account.

---

## 📚 Additional Resources

### Support

If you encounter any issues or have questions:
- Contact our support team
- Check the [Rate Limit Policy](#rate-limit-policy) if you're experiencing 429 errors
- Review the [Permissions](#permissions) section to ensure your API key has the required permissions

### Best Practices

1. **Security:**
   - Keep your API key confidential
   - Regenerate API keys if compromised
   - Use HTTPS for all API requests

2. **Performance:**
   - Implement caching where appropriate
   - Respect rate limits
   - Use pagination for large datasets

3. **Error Handling:**
   - Implement proper error handling
   - Handle rate limit errors gracefully
   - Log errors for debugging

4. **Testing:**
   - Use [webhook.site](https://webhook.site/) to test webhooks
   - Test with sample data before production
   - Verify permissions before making requests

---

**Last Updated:** 2024

**API Base URL:** `https://api.easy-orders.net/api/v1/external-apps`
