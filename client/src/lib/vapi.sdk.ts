import Vapi from "@vapi-ai/web";

const VAPI_WEB_TOKEN =
  import.meta.env.VITE_VAPI_WEB_TOKEN ??
  import.meta.env.NEXT_PUBLIC_VAPI_WEB_TOKEN ?? // fallback nếu muốn
  "";

if (!VAPI_WEB_TOKEN) {
  // VAPI web token is empty. Check your .env (VITE_VAPI_WEB_TOKEN or NEXT_PUBLIC_VAPI_WEB_TOKEN).
}

export const vapi = new Vapi(VAPI_WEB_TOKEN);
