# Security Specification (Phase 0 TDD)

## 1. Data Invariants
- **Flyers**:
  - Valid `id`, `marketId`, `cityName`, `startDate`, `endDate`, `imageUrl`, and `status`.
  - Only authenticated, verified users (`request.auth.token.email_verified == true`) are permitted to write.
  - Public `read` access is granted so that visitors can view market indicators without logging in.
- **Offers**:
  - Valid `id`, `flyerId`, `marketId`, `originalName`, `price`, and `status`.
  - Only authenticated, verified users can write.
  - Price must be a positive number.
  - Public `read` access is granted.

---

## 2. The "Dirty Dozen" Payloads (Denial Vectors)

### Entity: Flyers

#### Payload 1: Identity Spoofing (Unauthenticated Create)
- **Path**: `/flyers/f-spoof`
- **Payload**:
  ```json
  {
    "id": "f-spoof",
    "marketId": "m-lopes",
    "cityName": "São Gotardo",
    "startDate": "2026-07-16",
    "endDate": "2026-07-22",
    "imageUrl": "https://foo.bar",
    "numPages": 1,
    "status": "processed",
    "createdAt": "2026-07-15T20:03:43Z"
  }
  ```
- **Expectation**: `PERMISSION_DENIED` (No auth).

#### Payload 2: Unverified User Write
- **Path**: `/flyers/f-unverified`
- **Auth**: `{ "uid": "user123", "token": { "email_verified": false } }`
- **Payload**: Same as above.
- **Expectation**: `PERMISSION_DENIED` (Email not verified).

#### Payload 3: Invalid ID Pattern (Poison ID)
- **Path**: `/flyers/f-$$$invalid$$$`
- **Auth**: `{ "uid": "user123", "token": { "email_verified": true } }`
- **Payload**: Same as above, but `id` set to `f-$$$invalid$$$`.
- **Expectation**: `PERMISSION_DENIED` (ID must be alphanumeric with dashes/underscores).

#### Payload 4: Invalid Status Enum (State Shortcutting)
- **Path**: `/flyers/f-invalid-state`
- **Auth**: `{ "uid": "user123", "token": { "email_verified": true } }`
- **Payload**: Same as above, but `"status": "ultra_processed"`.
- **Expectation**: `PERMISSION_DENIED` (Invalid status enum).

#### Payload 5: Shadow Keys (Ghost Fields)
- **Path**: `/flyers/f-shadow`
- **Auth**: `{ "uid": "user123", "token": { "email_verified": true } }`
- **Payload**:
  ```json
  {
    "id": "f-shadow",
    "marketId": "m-lopes",
    "cityName": "São Gotardo",
    "startDate": "2026-07-16",
    "endDate": "2026-07-22",
    "imageUrl": "https://foo.bar",
    "numPages": 1,
    "status": "processed",
    "createdAt": "2026-07-15T20:03:43Z",
    "isAdminModified": true
  }
  ```
- **Expectation**: `PERMISSION_DENIED` (Size mismatch or key not allowed).

---

### Entity: Offers

#### Payload 6: Unauthenticated Create Offer
- **Path**: `/offers/o-spoof`
- **Payload**:
  ```json
  {
    "id": "o-spoof",
    "flyerId": "f-123",
    "pageNum": 1,
    "marketId": "m-lopes",
    "originalName": "Café Moído",
    "price": 15.90,
    "unit": "un",
    "confidence": 95,
    "boundingBox": { "x": 10, "y": 10, "width": 10, "height": 10 },
    "status": "valid"
  }
  ```
- **Expectation**: `PERMISSION_DENIED` (No auth).

#### Payload 7: Negative Price Poisoning
- **Path**: `/offers/o-neg-price`
- **Auth**: `{ "uid": "user123", "token": { "email_verified": true } }`
- **Payload**: Same as above, but `"price": -20.50`.
- **Expectation**: `PERMISSION_DENIED` (Price must be > 0).

#### Payload 8: Excessive Size Text Injection (Denial of Wallet)
- **Path**: `/offers/o-huge-text`
- **Auth**: `{ "uid": "user123", "token": { "email_verified": true } }`
- **Payload**: Same as above, but `"originalName"` is a string of 1000 characters.
- **Expectation**: `PERMISSION_DENIED` (originalName must be <= 500 characters).

#### Payload 9: Invalid Status Enum in Offer
- **Path**: `/offers/o-invalid-state`
- **Auth**: `{ "uid": "user123", "token": { "email_verified": true } }`
- **Payload**: Same as above, but `"status": "deleted_by_bot"`.
- **Expectation**: `PERMISSION_DENIED` (Invalid status enum).

#### Payload 10: Parent Orphan Write (Referencing non-existent flyer)
- **Path**: `/offers/o-orphan`
- **Auth**: `{ "uid": "user123", "token": { "email_verified": true } }`
- **Payload**: Same as above, but `"flyerId": "f-nonexistent-999"`.
- **Expectation**: `PERMISSION_DENIED` (Parent flyer must exist).

#### Payload 11: Immutable Field Modification (Changing flyerId on update)
- **Path**: `/offers/o-123`
- **Auth**: `{ "uid": "user123", "token": { "email_verified": true } }`
- **Payload**: Same as existing, but modifying `"flyerId"` from `"f-123"` to `"f-456"`.
- **Expectation**: `PERMISSION_DENIED` (flyerId is immutable).

#### Payload 12: Value Poisoning (Updating price with Boolean)
- **Path**: `/offers/o-123`
- **Auth**: `{ "uid": "user123", "token": { "email_verified": true } }`
- **Payload**: Same as existing, but modifying `"price"` to `true`.
- **Expectation**: `PERMISSION_DENIED` (Type check fails).

---

## 3. Security Test Runner Strategy
We verify these rules by using standard Firebase emulators or deploying and validating rules using ESLint for static syntax correctness, as well as handling errors correctly inside the client application wrapper.
