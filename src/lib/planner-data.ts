import type { PlaceCategory } from "./types";

export type CuratedItem = {
  title: string;
  kind: PlaceCategory | "travel" | "stay";
  slot: "morning" | "afternoon" | "evening";
  time: string;
  note?: string;
};

export type CuratedCity = {
  name: string;
  country: string;
  blurb: string;
  items: CuratedItem[];
};

/**
 * Small curated dataset powering the offline planner. Not meant to replace real
 * travel data — it guarantees the demo always produces a sensible, pretty plan
 * with zero API keys. The LLM path (src/lib/llm.ts) replaces it when configured.
 */
export const CURATED_CITIES: CuratedCity[] = [
  {
    name: "Lisbon",
    country: "Portugal",
    blurb: "Tiled streets, trams uphill, pastéis down the hill.",
    items: [
      { title: "Pastéis de Belém + Torre de Belém", kind: "food", slot: "morning", time: "09:30", note: "Warm custard tarts, then the riverfront tower" },
      { title: "Tram 28 through Alfama", kind: "activity", slot: "morning", time: "11:00", note: "The classic rattly ride — buy tickets in advance" },
      { title: "Time Out Market lunch", kind: "food", slot: "afternoon", time: "13:00", note: "Everyone picks their own stall, one table" },
      { title: "Miradouro da Senhora do Monte", kind: "sight", slot: "afternoon", time: "16:30", note: "Best sunset viewpoint, get there early" },
      { title: "Dinner in Cais do Sodré", kind: "food", slot: "evening", time: "20:00" },
      { title: "Pensão Amor bar", kind: "nightlife", slot: "evening", time: "22:30", note: "Kitsch pink bar, great for the group photo" },
      { title: "LX Factory brunch", kind: "food", slot: "morning", time: "10:00", note: "Bookstores and coffee under the bridge" },
      { title: "Kayaking on the Tagus", kind: "activity", slot: "afternoon", time: "15:00" },
      { title: "Fado night in Alfama", kind: "activity", slot: "evening", time: "21:00", note: "Book a table dinner + show" },
    ],
  },
  {
    name: "Barcelona",
    country: "Spain",
    blurb: "Beach mornings, Gaudí afternoons, very late dinners.",
    items: [
      { title: "Boqueria market breakfast", kind: "food", slot: "morning", time: "09:30" },
      { title: "Park Güell", kind: "sight", slot: "morning", time: "11:00", note: "Timed entry — book the 9:30 slot" },
      { title: "Barceloneta beach + chiringuito", kind: "activity", slot: "afternoon", time: "14:00" },
      { title: "Sagrada Família", kind: "sight", slot: "afternoon", time: "17:00", note: "Go late afternoon for the stained glass" },
      { title: "Tapas crawl in El Born", kind: "food", slot: "evening", time: "21:00", note: "3 bars, 2 dishes each, keep moving" },
      { title: "Bunkers del Carmel sunset", kind: "sight", slot: "evening", time: "19:30" },
      { title: "Casual paella lunch", kind: "food", slot: "afternoon", time: "14:00", note: "Fideuà for the seafood skeptics" },
      { title: "Picasso Museum", kind: "sight", slot: "morning", time: "10:00" },
      { title: "Flamenco night", kind: "nightlife", slot: "evening", time: "22:00" },
    ],
  },
  {
    name: "Porto",
    country: "Portugal",
    blurb: "Port wine, dramatic bridges, Francesinha challenges.",
    items: [
      { title: "Majestic Café breakfast", kind: "food", slot: "morning", time: "09:30" },
      { title: "Livraria Lello", kind: "sight", slot: "morning", time: "10:30", note: "Book the first slot to dodge crowds" },
      { title: "Port tasting in Gaia", kind: "drink", slot: "afternoon", time: "16:00", note: "Taylor's terrace is the group favorite" },
      { title: "Francesinha lunch", kind: "food", slot: "afternoon", time: "13:30", note: "Split one — they are huge" },
      { title: "Dom Luís I bridge at golden hour", kind: "sight", slot: "evening", time: "19:30" },
      { title: "Dinner in Ribeira", kind: "food", slot: "evening", time: "20:30" },
      { title: "Douro valley boat ride", kind: "activity", slot: "morning", time: "10:00" },
      { title: "Graham's port lodge tour", kind: "activity", slot: "afternoon", time: "15:00" },
      { title: "Gin bar crawl", kind: "nightlife", slot: "evening", time: "23:00" },
    ],
  },
  {
    name: "Rome",
    country: "Italy",
    blurb: "Every corner is a postcard; every meal is a debate.",
    items: [
      { title: "Cornetto + espresso standing bar", kind: "food", slot: "morning", time: "09:00" },
      { title: "Colosseum + Roman Forum", kind: "sight", slot: "morning", time: "10:00", note: "First entry slot, beat the queue" },
      { title: "Trastevere lunch", kind: "food", slot: "afternoon", time: "13:30" },
      { title: "Vatican Museums", kind: "sight", slot: "afternoon", time: "15:30", note: "Book skip-the-line weeks ahead" },
      { title: "Gelato at Fatamorgana", kind: "food", slot: "evening", time: "19:00" },
      { title: "Pasta dinner in Monti", kind: "food", slot: "evening", time: "20:30" },
      { title: "Villa Borghese bike ride", kind: "activity", slot: "morning", time: "10:00" },
      { title: "Pantheon + piazza hopping", kind: "sight", slot: "afternoon", time: "16:00" },
      { title: "Aperitivo in Campo de' Fiori", kind: "drink", slot: "evening", time: "18:30" },
    ],
  },
  {
    name: "Amsterdam",
    country: "Netherlands",
    blurb: "Canals, bikes, and museums when it rains.",
    items: [
      { title: "Stroopwafels at Albert Cuyp", kind: "food", slot: "morning", time: "09:30" },
      { title: "Canal bike ride", kind: "activity", slot: "morning", time: "10:30" },
      { title: "Rijksmuseum", kind: "sight", slot: "afternoon", time: "13:30", note: "Split up, meet at the coffee shop" },
      { title: "Vondelpark picnic", kind: "activity", slot: "afternoon", time: "16:00" },
      { title: "Dutch pancakes dinner", kind: "food", slot: "evening", time: "19:00" },
      { title: "Brown café crawl", kind: "drink", slot: "evening", time: "21:30" },
      { title: "Zaanse Schans windmills", kind: "sight", slot: "morning", time: "10:00", note: "40 min train, worth it" },
      { title: "Anne Frank House", kind: "sight", slot: "afternoon", time: "14:30", note: "Tickets sell out — book day one" },
      { title: "A'DAM Lookout swing", kind: "activity", slot: "evening", time: "18:00" },
    ],
  },
  {
    name: "Prague",
    country: "Czechia",
    blurb: "Fairytale square, cheap beer, uphill castle.",
    items: [
      { title: "Old Town Square + astronomical clock", kind: "sight", slot: "morning", time: "09:30" },
      { title: "Prague Castle walk", kind: "sight", slot: "morning", time: "10:30", note: "Go early, the crowds double by noon" },
      { title: "Lokál lunch", kind: "food", slot: "afternoon", time: "13:00", note: "Pilsner poured the slow way" },
      { title: "Vltava river kayak", kind: "activity", slot: "afternoon", time: "15:30" },
      { title: "Letná beer garden", kind: "drink", slot: "evening", time: "18:30" },
      { title: "Old town dinner", kind: "food", slot: "evening", time: "20:30" },
      { title: "Vyšehrad fortress", kind: "sight", slot: "morning", time: "10:00", note: "Locals' castle, empty and lovely" },
      { title: "Petrín tower + funicular", kind: "sight", slot: "afternoon", time: "16:00" },
      { title: "Cross Club night", kind: "nightlife", slot: "evening", time: "22:00" },
    ],
  },
  {
    name: "Athens",
    country: "Greece",
    blurb: "Ancient mornings, island-day trips, rooftop nights.",
    items: [
      { title: "Acropolis at opening", kind: "sight", slot: "morning", time: "08:30", note: "Beat both crowds and heat" },
      { title: "Monastiraki brunch", kind: "food", slot: "morning", time: "10:30" },
      { title: "Aegina island day trip", kind: "activity", slot: "afternoon", time: "12:00", note: "Ferry 40 min, pistachio everything" },
      { title: "Plaka walk", kind: "sight", slot: "afternoon", time: "17:00" },
      { title: "Souvlaki dinner", kind: "food", slot: "evening", time: "20:30" },
      { title: "Rooftop bar with Acropolis view", kind: "drink", slot: "evening", time: "22:30" },
      { title: "National Archaeological Museum", kind: "sight", slot: "morning", time: "10:00" },
      { title: "Riviera beach afternoon", kind: "activity", slot: "afternoon", time: "15:00" },
      { title: "Bouzoukia night", kind: "nightlife", slot: "evening", time: "23:00" },
    ],
  },
  {
    name: "Budapest",
    country: "Hungary",
    blurb: "Thermal baths, ruin bars, dumplings the size of fists.",
    items: [
      { title: "Széchenyi baths", kind: "activity", slot: "morning", time: "09:30", note: "Chess in the water is mandatory" },
      { title: "Central Market Hall", kind: "food", slot: "morning", time: "11:30" },
      { title: "Castle Hill walk", kind: "sight", slot: "afternoon", time: "14:30" },
      { title: "Danube cruise", kind: "activity", slot: "afternoon", time: "17:00" },
      { title: "Goulash dinner", kind: "food", slot: "evening", time: "19:30" },
      { title: "Szimpla Kert ruin bar", kind: "nightlife", slot: "evening", time: "21:30" },
      { title: "Fisherman's Bastion", kind: "sight", slot: "morning", time: "09:00" },
      { title: "Hospital in the Rock museum", kind: "sight", slot: "afternoon", time: "15:00" },
      { title: "Langos food crawl", kind: "food", slot: "evening", time: "18:00" },
    ],
  },
  {
    name: "Paris",
    country: "France",
    blurb: "Picnics by the Seine beat any restaurant with a QR menu.",
    items: [
      { title: "Croissants + café crème", kind: "food", slot: "morning", time: "09:00" },
      { title: "Louvre highlights tour", kind: "sight", slot: "morning", time: "10:00", note: "2 hours max, then out" },
      { title: "Seine picnic", kind: "food", slot: "afternoon", time: "13:30", note: "Cheese run first, then the riverbank" },
      { title: "Montmartre walk", kind: "sight", slot: "afternoon", time: "16:00" },
      { title: "Bistro dinner", kind: "food", slot: "evening", time: "20:00" },
      { title: "Eiffel Tower sparkle at 22:00", kind: "sight", slot: "evening", time: "22:00" },
      { title: "Versailles gardens", kind: "sight", slot: "morning", time: "09:30", note: "Rent bikes inside the park" },
      { title: "Musée d'Orsay", kind: "sight", slot: "afternoon", time: "14:30" },
      { title: "Wine bar in Le Marais", kind: "drink", slot: "evening", time: "21:30" },
    ],
  },
  {
    name: "Berlin",
    country: "Germany",
    blurb: "History by day, Bergham-adjacent decisions by night.",
    items: [
      { title: "Bergmannstraße brunch", kind: "food", slot: "morning", time: "10:00" },
      { title: "East Side Gallery walk", kind: "sight", slot: "morning", time: "11:30" },
      { title: "Tempelhof field picnic", kind: "activity", slot: "afternoon", time: "14:30", note: "Airport-turned-park, rent rollerblades" },
      { title: "Museum Island", kind: "sight", slot: "afternoon", time: "16:00" },
      { title: "Döner dinner", kind: "food", slot: "evening", time: "20:00" },
      { title: "Klunkerkranich rooftop", kind: "drink", slot: "evening", time: "22:00" },
      { title: "Reichstag dome", kind: "sight", slot: "morning", time: "09:00", note: "Free but registration required" },
      { title: "Mauerpark Sunday flea market", kind: "activity", slot: "afternoon", time: "13:00" },
      { title: "Späti + canal hangout", kind: "drink", slot: "evening", time: "21:00" },
    ],
  },
];

/** Generic pools for destinations that aren't curated (keeps the planner total). */
export const GENERIC_ITEMS: CuratedItem[] = [
  { title: "Local bakery breakfast", kind: "food", slot: "morning", time: "09:30" },
  { title: "Old town walking loop", kind: "sight", slot: "morning", time: "11:00", note: "Free walking tour if the group is split" },
  { title: "Market lunch", kind: "food", slot: "afternoon", time: "13:00" },
  { title: "Main viewpoint / landmark", kind: "sight", slot: "afternoon", time: "15:30" },
  { title: "Park or waterfront hangout", kind: "activity", slot: "afternoon", time: "17:00" },
  { title: "Group dinner at a local classic", kind: "food", slot: "evening", time: "20:00" },
  { title: "Bar with a terrace", kind: "drink", slot: "evening", time: "22:00" },
  { title: "Day trip to the nearest nature spot", kind: "activity", slot: "morning", time: "10:00" },
  { title: "Museum pick of the group", kind: "sight", slot: "afternoon", time: "14:30" },
  { title: "Nightlife street crawl", kind: "nightlife", slot: "evening", time: "23:00" },
];
