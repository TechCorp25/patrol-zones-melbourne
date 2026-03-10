import { Platform } from "react-native";

const IS_WEB = Platform.OS === "web";

export function getApiBaseUrl(): string | null {
  if (IS_WEB) return "";
  const domain = process.env.EXPO_PUBLIC_DOMAIN?.trim();
  if (!domain) return null;
  return `https://${domain}`;
}
