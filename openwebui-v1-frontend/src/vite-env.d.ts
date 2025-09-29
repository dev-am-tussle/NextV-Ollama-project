/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MICROSOFT_CLIENT_ID?: string;
  readonly VITE_MICROSOFT_REDIRECT_URI?: string;
  readonly VITE_MICROSOFT_TENANT_ID?: string;
  readonly VITE_API_URL?: string;
  // add other VITE_ vars your app uses here
  readonly [key: `VITE_${string}`]: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
