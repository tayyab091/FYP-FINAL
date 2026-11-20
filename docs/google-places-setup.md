# Google Places setup for T.E.S.T.

## 1. Google Cloud

1. Open https://console.cloud.google.com/ and select or create a project for T.E.S.T.
2. Open **Billing** and link a billing account. Google Places requires billing, even when usage falls within a free allowance.
3. Open **APIs & Services → Library**, search **Places API (New)**, and enable it. The legacy Places API is not the endpoint used by this project.
4. Open **APIs & Services → Credentials → Create credentials → API key**.
5. Edit the key, give it a recognizable name, choose **API restrictions → Restrict key → Places API (New)**, and save.
6. This key is used by the server. Do not apply website/referrer restrictions to it. Vercel's default serverless outbound IPs are dynamic; an IP restriction needs a configured stable outbound IP. Keep the key server-only, API-restricted, and set Places quotas in Google Cloud. Billing budget alerts notify you; they do not impose a hard spending cap.

## 2. Vercel

1. Open https://vercel.com/sp23-bcs-099-8190s-projects/fyp-final/settings/environment-variables.
2. Add **GOOGLE_MAPS_API_KEY** and paste the server key there. Use Secret visibility. Select **Production** and **Preview** (or use a separate restricted key for Preview).
3. Do not prefix this secret with NEXT_PUBLIC_. Do not put it in Git or chat.
4. Open **Deployments → latest main deployment → … → Redeploy** so the deployment receives the new variable. Also redeploy a tayyab preview if you want to test there.
5. For local development, add the same variable to your ignored `.env.local` file and restart the dev server. The existing JWT_SECRET is also used to sign short-lived photo requests; no additional photo signing key is required.

## 3. Connect a registered gym to its actual Maps photos

1. Use Google's Place ID finder: https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder.
2. Search the exact gym and verify its address. Copy the **Place ID** (commonly starts with `ChIJ`), not the Maps sharing URL.
3. Sign in as that gym's owner. Open **My Gym → Google Place ID (optional, for original Maps photos)**.
4. Paste the ID and **Save Gym**. Existing gyms can be linked this way after registration too. Only public verified gyms expose the photos.
5. Open the gym in **Find Gyms** or its public profile. A photo available from Google replaces the cover, with author/source attribution. If the gym has no Google photo or the API fails, the existing cover remains. Stored gallery uploads are preserved.

The app does not copy Google photos into MongoDB or Cloudinary. It fetches them on demand and keeps the API key on the server. Google Place IDs are saved; Google photos and author attribution are not saved to the gym record.

## 4. Test nearby discovery

1. Open `/gyms` on HTTPS or localhost, click **Use my location**, and allow location for that site.
2. Select a radius. Results combine registered gyms with up to 20 nearest gyms returned by Google, including unregistered businesses.
3. Use **Listings** to show all, registered only, or Google-only results. Registered cards open T.E.S.T. profiles; unregistered cards open Google Maps.
4. If Google is not configured or unavailable, an explicit notice appears and registered results still work. This API cannot guarantee an exhaustive directory of every gym; use Google Maps for further exploration.

## Optional: official Maps Embed key

The photo and nearby features above only need the server key. For the official keyed map embed, enable **Maps Embed API**, create a **separate** browser key restricted to Maps Embed API and website referrers `https://fyp-final-ten.vercel.app/*` (plus your exact preview/local origins if required), then add it in Vercel as `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and redeploy. Never reuse the server key as the browser key.

## Troubleshooting

- **Google discovery is not configured:** missing server variable in the current deployment; check its environment and redeploy.
- **Google discovery unavailable:** check billing, Places API (New) enablement, API restrictions, quota, and Google Cloud API metrics. A website-restricted key will fail for these server calls.
- **No original photo:** verify Place ID and public verification status. Not every gym has photos. Existing images remain as fallback.
- **Location denied:** enable permission in the browser's site settings or use the normal city/name filters.

Official references:
- https://developers.google.com/maps/documentation/places/web-service/get-api-key
- https://developers.google.com/maps/documentation/places/web-service/nearby-search
- https://developers.google.com/maps/documentation/places/web-service/place-photos
- https://developers.google.com/maps/documentation/places/web-service/policies
