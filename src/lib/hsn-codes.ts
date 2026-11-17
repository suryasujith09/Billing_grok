export const DEFAULT_HSN_CODES = [
  { code: "7106", description: "Silver bullion" },
  { code: "7108", description: "Gold bullion" },
  { code: "7113", description: "Gold, silver and diamond jewellery" },
  { code: "7114", description: "Silver/gold articles, idols, bowls and frames" },
  { code: "7118", description: "Gold and silver coins" },
] as const;

export type HsnCode = { code: string; description: string };

export const HSN_CODE_STORAGE_KEY = "billing-grok-hsn-codes-v1";
