/** Public company details. Add only information approved for publication. */
export const websiteContent = {
  companyName: "Twinklestar Gold & Diamonds LLP",
  shortName: "Twinklestar",
  domain: "https://twinklestargd.com",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "",
  address: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS ?? "",
};

export const collections = [
  { name: "Gold", description: "Discover pieces in gold, selected for moments both everyday and exceptional.", image: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=1000&q=85", alt: "Gold jewellery displayed in warm light" },
  { name: "Diamonds", description: "Explore the enduring brilliance of diamond jewellery.", image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1000&q=85", alt: "Diamond jewellery detail" },
  { name: "Silver", description: "A considered selection of silver jewellery for a softer shine.", image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=1000&q=85", alt: "Silver jewellery and accessories" },
];

export const services = [
  { number: "01", title: "Find your piece", description: "Tell us what you have in mind. Our team can help you explore the collection and discuss the details that matter to you." },
  { number: "02", title: "A thoughtful conversation", description: "Whether you are choosing for yourself or someone special, we welcome your questions before you decide." },
  { number: "03", title: "Stay in touch", description: "Get in touch with an enquiry about jewellery, availability or your visit. We will be glad to hear from you." },
];
