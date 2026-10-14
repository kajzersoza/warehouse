# Security Specification

## 1. Data Invariants
- Each document in `/products/{productId}` represents a warehouse inventory item.
- The `productId` is a unique identifier string matching `^[a-zA-Z0-9_.\\-]+$` with length <= 100.
- `name` is required string with length <= 200.
- `images` is a list with size <= 20, containing image URLs.
- Anyone can read the products directory (warehouse catalog view) or authenticated warehouse workers.
- Writes (create, update, delete) are permitted for authenticated users with verified email.

## 2. Dirty Dozen Payloads & Invariant Guards
1. Unauthenticated write payload -> Denied.
2. Missing `productId` on create -> Denied.
3. Missing `name` on create -> Denied.
4. Overly long string field exceeding maxLength (> 1000 chars) -> Denied.
5. Injected non-string fields for text attributes -> Denied.
6. Malformed document ID with path traversal or illegal characters -> Denied.
7. Attempting to add unbounded array of images (> 20 items) -> Denied.
8. Non-numeric stockQuantity (e.g., string instead of number) -> Denied.
9. Ghost fields not defined in schema -> Denied.
10. Unverified user attempting write -> Denied.
11. Blanket write bypassing validation -> Denied.
12. Attempt to tamper with root catch-all collections -> Denied.
