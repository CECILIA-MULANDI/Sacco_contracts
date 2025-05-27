import { createThirdwebClient } from "thirdweb";

export const client = createThirdwebClient({
  clientId: import.meta.env.VITE_TEMPLATE_CLIENT_ID,
  secretKey: import.meta.env.THIRDWEB_API_KEY,
});
