/** Aisles in the order you walk a Malaysian supermarket: fresh first, cold near the end, then the non-food side. */
export const AISLES = [
  { id: "produce", label: "Fruit & veg" },
  { id: "meat", label: "Meat & fish" },
  { id: "dairy", label: "Dairy & eggs" },
  { id: "bakery", label: "Bread" },
  { id: "pantry", label: "Pantry" },
  { id: "snacks", label: "Snacks" },
  { id: "drinks", label: "Drinks" },
  { id: "frozen", label: "Frozen" },
  { id: "household", label: "Household" },
  { id: "care", label: "Personal care" },
  { id: "other", label: "Other" },
] as const;
export type Aisle = (typeof AISLES)[number]["id"];

// English and Malay words. Checked in this order, so the more specific aisle wins:
// "chicken nuggets" is frozen, "orange juice" drinks, "coconut milk" pantry, "garlic bread" bread.
const WORDS: [Aisle, string][] = [
  ["frozen", "frozen beku nugget nuggets ice-cream aiskrim sosej sausage sausages fries paratha ice"],
  ["drinks", "water mineral juice jus coffee kopi tea teh milo soda coke 100plus drink drinks minuman sirap cordial"],
  ["care", "shampoo syampu conditioner toothpaste ubat-gigi toothbrush berus floss deodorant lotion sunscreen pad pads tampon razor shaving diapers diaper lampin wipes vitamin vitamins panadol medicine ubat plaster cotton"],
  ["household", "tissue tisu toilet detergent sabun soap dishwashing pencuci softener bleach clorox trash garbage sampah bag bags plastik foil cling batteries bateri bulb mentol sponge span cleaner lantai floor insect ridsect mosquito ubat-nyamuk"],
  ["snacks", "snack snacks chips kerepek biscuit biscuits biskut chocolate coklat candy gula-gula cookies crackers popcorn"],
  ["pantry", "rice beras flour tepung sugar gula salt garam oil minyak pasta spaghetti noodle noodles mee mi meehoon bihun kuey kicap soy sauce sos ketchup mayo mayonnaise vinegar cuka spice spices rempah curry kari cereal oats oat honey madu jam peanut kacang beans canned tin santan coconut belacan cornflour serbuk stock kiub maggi"],
  ["bakery", "bread roti bun buns croissant wrap wraps tortilla"],
  ["dairy", "milk susu egg eggs telur cheese keju butter mentega yogurt yoghurt cream krim"],
  ["meat", "chicken ayam beef daging lamb kambing mutton fish ikan prawn prawns udang squid sotong crab ketam meat mince kisar salmon tuna kembung bilis"],
  ["produce", "apple apples banana bananas pisang orange oranges oren limau lime lemon mango mangga papaya betik watermelon tembikai grape grapes anggur durian fruit buah veg vegetable vegetables sayur sayur-sayuran carrot carrots lobak tomato tomatoes tomato onion onions bawang garlic potato potatoes kentang cabbage kobis kubis spinach bayam kangkung sawi brinjal terung cucumber timun chilli chili cili lettuce salad ginger halia serai lemongrass coriander ketumbar daun herbs broccoli corn jagung mushroom mushrooms cendawan avocado kailan taugeh beansprouts"],
];

/** Best guess of the aisle from the name; "other" if nothing matches. */
export function guessAisle(name: string): Aisle {
  const words = new Set(name.toLowerCase().split(/[\s,/]+/).flatMap((w) => [w, w.replace(/e?s$/, "")]));
  return WORDS.find(([, list]) => list.split(" ").some((w) => words.has(w)))?.[0] ?? "other";
}

const QTY = String.raw`\d+(?:[.,]\d+)?\s?(?:kg|g|gm|l|ml|pcs|pc|pack|packs|biji|bungkus|tin|tins|botol|bottles?|dozen|doz)?`;
const LEAD = new RegExp(String.raw`^(?:x\s?)?(${QTY})(?:\s?x)?\s+(.+)$`, "i");
const TRAIL = new RegExp(String.raw`^(.+?)\s+(?:[x×]\s?)?(${QTY})$`, "i");

/** "2 susu" / "susu x2" / "beras 5kg" → { name, qty }. Plain names come back as they are. */
export function parseItem(text: string): { name: string; qty?: string } {
  const t = text.trim().replace(/\s+/g, " ");
  const lead = t.match(LEAD);
  if (lead) return { name: lead[2], qty: lead[1].replace(/\s/g, "") };
  const trail = t.match(TRAIL);
  if (trail) return { name: trail[1], qty: trail[2].replace(/\s/g, "") };
  return { name: t };
}
