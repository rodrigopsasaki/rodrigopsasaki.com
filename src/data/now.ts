// Single source of truth for the /now snapshot.
// Both /now (structured page) and the home sidebar "Now · live" widget
// import from here — edit once, both stay in sync.
//
// Labels are free-form. Swap "watching" for "reading" for "walking"
// whenever the honest verb changes.

export type Entry = { name: string; detail: string; href?: string };
export type Accent = 'green' | 'amber' | 'blue' | null;
export type Block  = { label: string; accent: Accent; items: Entry[] };

export interface NowSnapshot {
  timestamp: string;
  location: string;
  status: string;
  blocks: Block[];
}

export const snap: NowSnapshot = {
  timestamp: '2026-04-23T22:00:00-03:00',
  location: 'São Paulo, BR',
  status: 'building · studying',

  blocks: [
    {
      label: 'building', accent: 'green',
      items: [
        { name: 'phyxius',   detail: 'composable primitives for resilient Node.js systems', href: '/projects/phyxius/' },
        { name: 'runic',     detail: 'the filesystem-as-CLI, getting sharper',              href: '/projects/runic/' },
        { name: 'this site', detail: 'redesign in flight, mono-forward' },
      ],
    },
    {
      label: 'writing', accent: 'amber',
      items: [],
    },
    {
      label: 'watching', accent: 'blue',
      items: [
        {
          name: 'Project Hail Mary',
          detail: 'last movie, reviewed on Letterboxd',
          href: 'https://letterboxd.com/rodrigopsasaki/film/project-hail-mary/',
        },
      ],
    },
    {
      label: 'elsewhere', accent: null,
      items: [
        { name: 'at work', detail: 'studying how to optimize context prompts by evaluating language semantics' },
      ],
    },
  ],
};
