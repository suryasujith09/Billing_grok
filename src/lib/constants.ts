export const CATEGORIES = [
  "RING",
  "EARRING",
  "NECKLACE",
  "CHAIN",
  "BANGLE",
  "BRACELET",
  "PENDANT",
  "NOSEPIN",
  "MANGALSUTRA",
  "SET",
  "COIN",
  "OTHER",
] as const;

export const METALS = ["GOLD", "SILVER", "PLATINUM"] as const;

export const PURITIES: Record<string, string[]> = {
  GOLD: ["24K", "22K", "18K", "14K"],
  SILVER: ["999", "925"],
  PLATINUM: ["950", "900"],
};

export const ALL_PURITIES = ["24K", "22K", "18K", "14K", "999", "925", "950", "900"];

export const MAKING_TYPES = [
  { value: "PER_GRAM", label: "Per gram" },
  { value: "PERCENT", label: "% of gold" },
  { value: "FLAT", label: "Flat amount" },
] as const;

export const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "CARD", label: "Card" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "BANK", label: "Bank transfer" },
  { value: "CREDIT", label: "Credit / later" },
] as const;

export const MAKING_GST_MODES = [
  {
    value: "SEPARATE_5",
    label: "3% on gold + 5% on making",
    hint: "Gold, wastage, stones and hallmark at 3%. Making charges at 5%.",
  },
  {
    value: "COMBINED_3",
    label: "3% on full bill value",
    hint: "Gold, making, wastage and other charges all at 3% GST.",
  },
] as const;

export const INDIAN_STATES = [
  { name: "Andhra Pradesh", code: "37" },
  { name: "Arunachal Pradesh", code: "12" },
  { name: "Assam", code: "18" },
  { name: "Bihar", code: "10" },
  { name: "Chhattisgarh", code: "22" },
  { name: "Goa", code: "30" },
  { name: "Gujarat", code: "24" },
  { name: "Haryana", code: "06" },
  { name: "Himachal Pradesh", code: "02" },
  { name: "Jharkhand", code: "20" },
  { name: "Karnataka", code: "29" },
  { name: "Kerala", code: "32" },
  { name: "Madhya Pradesh", code: "23" },
  { name: "Maharashtra", code: "27" },
  { name: "Manipur", code: "14" },
  { name: "Meghalaya", code: "17" },
  { name: "Mizoram", code: "15" },
  { name: "Nagaland", code: "13" },
  { name: "Odisha", code: "21" },
  { name: "Punjab", code: "03" },
  { name: "Rajasthan", code: "08" },
  { name: "Sikkim", code: "11" },
  { name: "Tamil Nadu", code: "33" },
  { name: "Telangana", code: "36" },
  { name: "Tripura", code: "16" },
  { name: "Uttar Pradesh", code: "09" },
  { name: "Uttarakhand", code: "05" },
  { name: "West Bengal", code: "19" },
  { name: "Delhi", code: "07" },
  { name: "Jammu and Kashmir", code: "01" },
  { name: "Ladakh", code: "38" },
  { name: "Puducherry", code: "34" },
  { name: "Chandigarh", code: "04" },
  { name: "Andaman and Nicobar Islands", code: "35" },
  { name: "Dadra and Nagar Haveli and Daman and Diu", code: "26" },
  { name: "Lakshadweep", code: "31" },
] as const;

export function labelize(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
