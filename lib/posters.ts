// Seed data for the London series.
// In Session 2 this will move into Postgres via Prisma and be managed
// through the admin panel. For now it's a static TypeScript module so
// the homepage and product pages have something real to render.

export type Poster = {
  slug: string;
  title: string;
  city: string;
  citySlug: string;
  number: string;
  file: string;
  description: string;
  priceEur: number;
  masterWidthPx: number;
  masterHeightPx: number;
};

export const posters: Poster[] = [
  {
    slug: 'westminster-primary',
    title: 'Westminster Primary',
    city: 'London',
    citySlug: 'london',
    number: 'N°01',
    file: '/posters/big-ben.png',
    description:
      "The Elizabeth Tower rendered in draughtsman's line and overlaid with a De Stijl composition of primary blocks.",
    priceEur: 5,
    masterWidthPx: 1856,
    masterHeightPx: 2464,
  },
  {
    slug: 'south-bank',
    title: 'South Bank',
    city: 'London',
    citySlug: 'london',
    number: 'N°02',
    file: '/posters/london-eye.png',
    description:
      'The London Eye turning against the river, pinned to a composition of yellow, red, and blue planes.',
    priceEur: 5,
    masterWidthPx: 1856,
    masterHeightPx: 2464,
  },
  {
    slug: 'tower-bridge',
    title: 'Tower Bridge',
    city: 'London',
    citySlug: 'london',
    number: 'N°03',
    file: '/posters/tower-bridge.png',
    description:
      'Twin Gothic towers against the Thames — architectural linework and primary-color blocks.',
    priceEur: 5,
    masterWidthPx: 1856,
    masterHeightPx: 2464,
  },
  {
    slug: 'st-pauls',
    title: "St Paul's",
    city: 'London',
    citySlug: 'london',
    number: 'N°04',
    file: '/posters/st-pauls.png',
    description:
      "Wren's dome holding the centre of the composition, anchored by blocks of colour.",
    priceEur: 5,
    masterWidthPx: 1856,
    masterHeightPx: 2464,
  },
  {
    slug: 'the-shard',
    title: 'The Shard',
    city: 'London',
    citySlug: 'london',
    number: 'N°05',
    file: '/posters/the-shard.png',
    description:
      "Renzo Piano's glass tower rendered as line and refracted through the Mondrian palette.",
    priceEur: 5,
    masterWidthPx: 1856,
    masterHeightPx: 2464,
  },
  {
    slug: 'kiosk-k2',
    title: 'Kiosk K2',
    city: 'London',
    citySlug: 'london',
    number: 'N°06',
    file: '/posters/telephone-box.png',
    description:
      'The iconic red telephone box, framed against a quiet streetscape of Westminster.',
    priceEur: 5,
    masterWidthPx: 1856,
    masterHeightPx: 2464,
  },
  {
    slug: 'westminster-abbey',
    title: 'Westminster Abbey',
    city: 'London',
    citySlug: 'london',
    number: 'N°07',
    file: '/posters/westminster-abbey.png',
    description:
      'Gothic architecture abstracted into linework and block — eight centuries of stone in four colours.',
    priceEur: 5,
    masterWidthPx: 1856,
    masterHeightPx: 2464,
  },
  {
    slug: 'the-riverline',
    title: 'The Riverline',
    city: 'London',
    citySlug: 'london',
    number: 'N°08',
    file: '/posters/big-ben-london-eye.png',
    description:
      'Big Ben and the London Eye held together by the Thames — a panoramic composition in primaries.',
    priceEur: 5,
    masterWidthPx: 1856,
    masterHeightPx: 2464,
  },
];

export const featuredPoster = posters[7]; // "The Riverline" — widest composition, best hero

export function getPoster(slug: string): Poster | undefined {
  return posters.find((p) => p.slug === slug);
}

export function getPostersByCity(citySlug: string): Poster[] {
  return posters.filter((p) => p.citySlug === citySlug);
}

export type City = {
  slug: string;
  name: string;
  number: string;
  posterCount: number;
  status: 'available' | 'in-progress' | 'planned';
  statusLabel: string;
};

export const cities: City[] = [
  { slug: 'london', name: 'London', number: '01', posterCount: 8, status: 'available', statusLabel: 'Available' },
  { slug: 'paris', name: 'Paris', number: '02', posterCount: 0, status: 'in-progress', statusLabel: 'Summer 2026' },
  { slug: 'rome', name: 'Rome', number: '03', posterCount: 0, status: 'planned', statusLabel: 'Autumn 2026' },
  { slug: 'new-york', name: 'New York', number: '04', posterCount: 0, status: 'planned', statusLabel: 'Winter 2026' },
  { slug: 'tokyo', name: 'Tokyo', number: '05', posterCount: 0, status: 'planned', statusLabel: '2027' },
];
