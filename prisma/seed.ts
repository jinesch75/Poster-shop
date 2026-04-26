// Seed the DB with the initial cities + the 8-poster London set.
// Idempotent: run as many times as you like (upserts by slug).
//
// Storage keys here point at the public/posters/*.png files checked into
// the repo. When the admin panel uploads a new poster, it writes to the
// Railway volume via lib/storage and updates the DB with the new keys.
// These seed rows keep the legacy public-bucket paths for development.
//
// Run: npm run db:seed

import { PrismaClient, CityStatus, PosterStatus } from '@prisma/client';

const prisma = new PrismaClient();

type CitySeed = {
  slug: string;
  name: string;
  number: string;
  status: CityStatus;
  statusLabel: string | null;
  description?: string;
};

const cities: CitySeed[] = [
  {
    slug: 'london',
    name: 'London',
    number: '01',
    status: CityStatus.AVAILABLE,
    statusLabel: 'Available',
    description: 'The first city in the series. Eight posters, drawn across Westminster, the South Bank, and the City.',
  },
  { slug: 'paris', name: 'Paris', number: '02', status: CityStatus.IN_PROGRESS, statusLabel: 'Summer 2026' },
  { slug: 'rome', name: 'Rome', number: '03', status: CityStatus.PLANNED, statusLabel: 'Autumn 2026' },
  {
    slug: 'new-york',
    name: 'New York',
    number: '04',
    status: CityStatus.AVAILABLE,
    statusLabel: 'Available',
    description: 'The second city in the series. Five posters, drawn across Manhattan and the East River.',
  },
  { slug: 'tokyo', name: 'Tokyo', number: '05', status: CityStatus.PLANNED, statusLabel: '2027' },
];

type PosterSeed = {
  slug: string;
  title: string;
  number: string;
  description: string;
  file: string; // public path during development; real admin uploads replace this
};

const londonPosters: PosterSeed[] = [
  {
    slug: 'westminster-primary',
    title: 'Westminster Primary',
    number: 'N°01',
    file: '/posters/big-ben.png',
    description:
      "The Elizabeth Tower rendered in draughtsman's line and overlaid with a De Stijl composition of primary blocks.",
  },
  {
    slug: 'south-bank',
    title: 'South Bank',
    number: 'N°02',
    file: '/posters/london-eye.png',
    description:
      'The London Eye turning against the river, pinned to a composition of yellow, red, and blue planes.',
  },
  {
    slug: 'tower-bridge',
    title: 'Tower Bridge',
    number: 'N°03',
    file: '/posters/tower-bridge.png',
    description:
      'Twin Gothic towers against the Thames — architectural linework and primary-color blocks.',
  },
  {
    slug: 'st-pauls',
    title: "St Paul's",
    number: 'N°04',
    file: '/posters/st-pauls.png',
    description:
      "Wren's dome holding the centre of the composition, anchored by blocks of colour.",
  },
  {
    slug: 'the-shard',
    title: 'The Shard',
    number: 'N°05',
    file: '/posters/the-shard.png',
    description:
      "Renzo Piano's glass tower rendered as line and refracted through the Mondrian palette.",
  },
  {
    slug: 'kiosk-k2',
    title: 'Kiosk K2',
    number: 'N°06',
    file: '/posters/telephone-box.png',
    description:
      'The iconic red telephone box, framed against a quiet streetscape of Westminster.',
  },
  {
    slug: 'westminster-abbey',
    title: 'Westminster Abbey',
    number: 'N°07',
    file: '/posters/westminster-abbey.png',
    description:
      'Gothic architecture abstracted into linework and block — eight centuries of stone in four colours.',
  },
  {
    slug: 'the-riverline',
    title: 'The Riverline',
    number: 'N°08',
    file: '/posters/big-ben-london-eye.png',
    description:
      'Big Ben and the London Eye held together by the Thames — a panoramic composition in primaries.',
  },
  {
    slug: 'westminster-primary-ii',
    title: 'Westminster Primary II',
    number: 'N°14',
    file: '/posters/westminster-primary-ii.png',
    description:
      'The Elizabeth Tower from the street — red buses crossing beneath, the city in primary colour.',
  },
  {
    slug: 'south-bank-ii',
    title: 'South Bank II',
    number: 'N°15',
    file: '/posters/south-bank-ii.png',
    description:
      'The London Eye in vertical close — the wheel filling the frame against the river quarter.',
  },
  {
    slug: 'tower-bridge-ii',
    title: 'Tower Bridge II',
    number: 'N°16',
    file: '/posters/tower-bridge-ii.png',
    description:
      "The bridge's northern tower in close detail — Victorian Gothic in linework, red holding the upper deck.",
  },
  {
    slug: 'st-pauls-ii',
    title: "St Paul's II",
    number: 'N°17',
    file: '/posters/st-pauls-ii.png',
    description:
      "Wren's dome above Ludgate — the avenue funnelling the eye toward the cross.",
  },
  {
    slug: 'the-shard-ii',
    title: 'The Shard II',
    number: 'N°18',
    file: '/posters/the-shard-ii.png',
    description:
      "Renzo Piano's spire from below — glass and steel rising through the city.",
  },
  {
    slug: 'westminster-abbey-ii',
    title: 'Westminster Abbey II',
    number: 'N°19',
    file: '/posters/westminster-abbey-ii.png',
    description:
      'The west facade and rose window — gothic stone caught between primary verticals.',
  },
  {
    slug: 'battersea',
    title: 'Battersea',
    number: 'N°20',
    file: '/posters/battersea.png',
    description:
      'The four white chimneys of the power station above the Thames — industrial monument abstracted into linework and primaries.',
  },
];

const newYorkPosters: PosterSeed[] = [
  {
    slug: 'brooklyn-bridge',
    title: 'Brooklyn Bridge',
    number: 'N°09',
    file: '/posters/brooklyn-bridge.png',
    description:
      'The granite towers and gothic arches of the East River crossing — engineering as cathedral, drawn in line and pinned to a band of red.',
  },
  {
    slug: 'one-world',
    title: 'One World',
    number: 'N°10',
    file: '/posters/one-world.png',
    description:
      "Lower Manhattan's faceted glass tower, drawn against a foundation of red and yellow planes.",
  },
  {
    slug: 'flatiron',
    title: 'Flatiron',
    number: 'N°11',
    file: '/posters/flatiron.png',
    description:
      "Daniel Burnham's wedge of 1902 at the corner of Fifth and Broadway — Beaux-Arts geometry held by yellow.",
  },
  {
    slug: 'empire-state',
    title: 'Empire State',
    number: 'N°12',
    file: '/posters/empire-state.png',
    description:
      'The 1931 art deco icon rendered as line, the streetscape descending into red and blue planes.',
  },
  {
    slug: 'chrysler',
    title: 'Chrysler',
    number: 'N°13',
    file: '/posters/chrysler.png',
    description:
      "Van Alen's stainless crown of 1930, drawn at street level with the avenue stretching beneath in primary colour.",
  },
  {
    slug: 'statue-of-liberty',
    title: 'Statue of Liberty',
    number: 'N°21',
    file: '/posters/statue-of-liberty.png',
    description:
      'Bartholdi’s copper figure on Liberty Island — torch raised against the harbour, drawn in line and held by primary blocks.',
  },
];

async function main() {
  console.log('Seeding cities...');
  for (const c of cities) {
    await prisma.city.upsert({
      where: { slug: c.slug },
      create: {
        slug: c.slug,
        name: c.name,
        number: c.number,
        status: c.status,
        statusLabel: c.statusLabel,
        description: c.description,
      },
      update: {
        name: c.name,
        number: c.number,
        status: c.status,
        statusLabel: c.statusLabel,
        description: c.description,
      },
    });
  }

  const london = await prisma.city.findUniqueOrThrow({ where: { slug: 'london' } });

  console.log('Seeding London posters...');
  for (const p of londonPosters) {
    await prisma.poster.upsert({
      where: { slug: p.slug },
      create: {
        slug: p.slug,
        title: p.title,
        number: p.number,
        description: p.description,
        // Point all three keys at the public file during development.
        // The admin upload flow replaces these with volume-backed keys.
        masterKey: `public:${p.file}`,
        previewKey: `public:${p.file}`,
        thumbnailKey: `public:${p.file}`,
        masterWidthPx: 1856,
        masterHeightPx: 2464,
        priceDigitalCents: 500,
        status: PosterStatus.PUBLISHED,
        cityId: london.id,
      },
      update: {
        title: p.title,
        number: p.number,
        description: p.description,
      },
    });
  }

  const newYork = await prisma.city.findUniqueOrThrow({ where: { slug: 'new-york' } });

  console.log('Seeding New York posters...');
  for (const p of newYorkPosters) {
    await prisma.poster.upsert({
      where: { slug: p.slug },
      create: {
        slug: p.slug,
        title: p.title,
        number: p.number,
        description: p.description,
        masterKey: `public:${p.file}`,
        previewKey: `public:${p.file}`,
        thumbnailKey: `public:${p.file}`,
        masterWidthPx: 1856,
        masterHeightPx: 2464,
        priceDigitalCents: 500,
        status: PosterStatus.PUBLISHED,
        cityId: newYork.id,
      },
      update: {
        title: p.title,
        number: p.number,
        description: p.description,
      },
    });
  }

  console.log('Seed complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
