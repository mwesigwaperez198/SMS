/// <reference types="vite/client" />

interface NovaAdminRuntimeConfig {
  apiBaseUrl?: string;
  appName?: string;
  portalSubtitle?: string;
  defaultIdentifier?: string;
  loginPlaceholder?: string;
  allowedRoles?: string[];
  forbiddenRoleMessage?: string;
  storageKey?: string;
}

interface Window {
  NovaAdminConfig?: NovaAdminRuntimeConfig;
  __NOVAADMIN_CONFIG__?: NovaAdminRuntimeConfig;
}
