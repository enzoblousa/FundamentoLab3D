# Fundamento 3D

An online store for 3D-printed toys and figures. Customers browse a catalog, add items to a cart, and place orders; admins manage the catalog and fulfill orders.

## Language

**Category**:
A named grouping that a Product may optionally belong to (e.g. "Bonecos", "Educativos"), used to let shoppers filter the catalog. Managed independently by admins (create/rename/delete), not tied to any single product's lifecycle.
_Avoid_: Tag, type, collection

**Product**:
A single 3D-printed item for sale, with a name, description, price, and an optional Category.

**Cart**:
A temporary list of products and quantities a logged-in customer is assembling before checking out. Lives only in the browser (localStorage, one key per user) — there is no Cart table or endpoint on the backend. Becomes an Order (with OrderItems and prices locked in at purchase time) only when the customer confirms checkout.
_Avoid_: confusing with Order (Cart is pre-purchase and client-side; Order is the durable record, and what admins see in `/orders`)
