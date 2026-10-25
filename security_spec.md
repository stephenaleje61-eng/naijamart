# NaijaMart Firestore Security Specification

## 1. Data Invariants
1. Products must have a valid non-empty title, price (> 0), categoryId, sellerId, and at least one image URL.
2. Only the seller who owns a product (`sellerId == request.auth.uid`) or an authorized administrator can edit or delete a product.
3. Anyone can read active, approved products in the marketplace.
4. Users can only update their own profile document (`/users/{userId}` where `userId == request.auth.uid`).
5. Seller profiles can only be written by the authenticated owner (`userId == request.auth.uid`).
6. Categories are publicly readable by all shoppers; modification is restricted to administrators.

## 2. The "Dirty Dozen" Threat Payloads
1. **Unauthenticated Product Creation**: An unauthenticated request attempts to create a product document. (Must be REJECTED)
2. **Identity Spoofing on Product Creation**: Authenticated user 'attacker' attempts to create a product setting `sellerId: 'victim'`. (Must be REJECTED)
3. **Price Tampering by Non-Owner**: Authenticated user 'attacker' attempts to update the price of a product owned by 'seller1'. (Must be REJECTED)
4. **Product Deletion by Third-Party**: Authenticated user 'attacker' attempts to delete a product owned by 'seller1'. (Must be REJECTED)
5. **Negative Price Exploit**: Seller attempts to create a product with `price: -5000`. (Must be REJECTED)
6. **Zero Image Listing Attack**: Seller attempts to create a product with an empty images array `images: []`. (Must be REJECTED)
7. **Junk ID Poisoning**: Attacker attempts to target single-document operations using a 10KB junk-character document ID. (Must be REJECTED)
8. **Role Escalation in User Profile**: Authenticated user attempts to set `role: 'admin'` in their profile. (Must be REJECTED)
9. **Profile Hijacking**: Authenticated user attempts to overwrite another user's profile document (`/users/{otherUserId}`). (Must be REJECTED)
10. **Seller Profile Spoofing**: Authenticated user attempts to create a seller profile pointing to a different `userId`. (Must be REJECTED)
11. **Category Defacement**: Non-admin attempts to create, update, or delete category documents. (Must be REJECTED)
12. **Status Lock Bypass**: Non-owner attempts to mark another seller's listing as 'sold' or 'unavailable'. (Must be REJECTED)
