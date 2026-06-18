# LINE Push Notification Implementation

- [x] Create `netlify/functions/line-broadcast.ts` for the serverless endpoint.
- [x] Implement LINE Messaging API broadcast logic inside the function (Flex Message for images, Text for no images).
- [x] Update `src/components/AdminView.tsx` `handleCreateCircular` to call the Netlify function instead of showing a simulation alert.
- [x] Update `src/components/AdminView.tsx` `handleUpdateCircular` to call the Netlify function when `is_pushed` is true.
- [ ] Verify build and deploy.
