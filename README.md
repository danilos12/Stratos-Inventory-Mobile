# Stratos Field Inventory

An Expo mobile companion for the Stratos inventory and logistics module. Employee records and offline cache stay isolated to the organization resolved from the approved account.

## Included workflows

- Google email sign-in with automatic organization resolution and Logistics registration
- Password sign-in using `/api/auth/login`
- Server-side approval and active-membership validation
- Face ID, fingerprint, or the phone's protected biometric method through `expo-local-authentication`
- Biometric quick login backed by a device-specific secret stored in SecureStore
- Inventory synchronization, search, barcode/QR scanning, stock history, and controlled stock-out requests
- Project/work-order progress and material-consumption updates already supported by the inventory system
- Employee-and-organization-scoped offline snapshots

The app does not capture, upload, or store face images or biometric templates. Apple and Android perform the biometric match inside the device security boundary. AWS is not used.

## Configure

Copy `.env.example` to `.env.local` and set:

```env
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:2588
EXPO_PUBLIC_STRATOS_AFFILIATE_ID=1
EXPO_PUBLIC_BIOMETRIC_SECURITY_LEVEL=strong
# Optional on iOS when a native Google OAuth client is configured:
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
```

The local server listens on port `2588`. For USB development, keep `127.0.0.1:2588` and run `npm run android:connect`; the helper establishes USB tunnels for the API and Metro. For Wi-Fi testing, use the development computer's reachable LAN IP. Use HTTPS outside local development.

Google OAuth is configured on the server through `/api/auth/google-config`. Keep `GOOGLE_CLIENT_ID` (or `NEXT_PUBLIC_GOOGLE_CLIENT_ID`) and `GOOGLE_CLIENT_SECRET` in the server environment only; never put the client secret in the mobile app.

## Registration and biometric access

1. Choose a work Google email, or use an approved password account.
2. Existing users are opened in the organization assigned to their account.
3. New Google emails are registered for Logistics access in the configured Stratos organization and wait for administrator approval.
4. After approval, register Face ID, fingerprint, or the phone's supported biometric method.
5. The server stores only a one-way hash of the device secret. The raw secret remains in the device's encrypted SecureStore.
6. Later sign-ins require a successful OS biometric prompt before the device secret is submitted.

Users never choose an organization. The server resolves the user's active membership, and every tenant-aware request includes that approved organization ID.

## Run

```bash
npm install
npm run android
```

After installing the native development build, use `npx expo start --dev-client` for normal JavaScript development. Biometric testing must use a physical device or an emulator configured with biometrics. Google sign-in on iOS requires the native iOS OAuth client ID and matching Google project configuration.

On Windows, start native Android builds with `npm run android`. The helper pins Gradle to the signed-in user's `.gradle` directory and automatically regenerates project-local CMake caches if the workspace was previously built by another Windows account.

## Data safety

- Online sessions are rejected when the organization is inactive or the employee membership is missing.
- Offline cache keys include both user ID and organization ID.
- Signing out clears the session and synchronized cache while retaining the encrypted biometric credential for quick login.
- A biometric credential is revoked automatically when it is replaced or when server-side access becomes invalid.
