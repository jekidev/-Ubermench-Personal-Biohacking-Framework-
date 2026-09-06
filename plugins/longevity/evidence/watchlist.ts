export type WatchlistTier = 'resource' | 'clock' | 'organization' | 'reading'

export type LongevityWatchlistItem = {
  id: string
  title: string
  url: string
  tier: WatchlistTier
  notes: string
  source: 'atilatech/awesome-longevity'
}

export const LONGEVITY_WATCHLIST: LongevityWatchlistItem[] = [
  {
    id: 'lifespan-io',
    title: 'Lifespan.io news',
    url: 'https://www.lifespan.io/news-main/',
    tier: 'resource',
    notes: 'Curated longevity news for the geroscience watchlist.',
    source: 'atilatech/awesome-longevity',
  },
  {
    id: 'fight-aging',
    title: 'Fight Aging',
    url: 'https://www.fightaging.org/',
    tier: 'resource',
    notes: 'Long-running commentary on aging research and interventions.',
    source: 'atilatech/awesome-longevity',
  },
  {
    id: 'longevity-technology',
    title: 'Longevity.technology',
    url: 'https://longevity.technology/',
    tier: 'resource',
    notes: 'Industry and trial coverage. Treat as news, not evidence grade.',
    source: 'atilatech/awesome-longevity',
  },
  {
    id: 'methylclock',
    title: 'Methyl Clock',
    url: 'https://github.com/isglobal-brge/methylclock',
    tier: 'clock',
    notes: 'DNAm age clocks for research comparison against phenotypic age.',
    source: 'atilatech/awesome-longevity',
  },
  {
    id: 'aging-clock-papers',
    title: 'Aging clock papers and data',
    url: 'https://github.com/mdozmorov/Aging_clock',
    tier: 'clock',
    notes: 'Bibliography for epigenetic clocks. Do not treat as a clinical calculator.',
    source: 'atilatech/awesome-longevity',
  },
  {
    id: 'altum-age',
    title: 'AltumAge',
    url: 'https://github.com/rsinghlab/AltumAge',
    tier: 'clock',
    notes: 'Deep-learning pan-tissue methylation clock. Research only.',
    source: 'atilatech/awesome-longevity',
  },
  {
    id: 'vitadao',
    title: 'VitaDAO',
    url: 'https://www.vitadao.com/',
    tier: 'organization',
    notes: 'Community-funded longevity research. Not an intervention.',
    source: 'atilatech/awesome-longevity',
  },
  {
    id: 'ending-aging',
    title: 'Ending Aging (de Grey)',
    url: 'https://www.amazon.com/Ending-Aging-Rejuvenation-Breakthroughs-Lifetime/dp/0312367066/',
    tier: 'reading',
    notes: 'Background reading. Claims require independent evidence review.',
    source: 'atilatech/awesome-longevity',
  },
  {
    id: 'lifespan-sinclair',
    title: 'Lifespan (Sinclair)',
    url: 'https://www.amazon.com/Lifespan-Why-Age-Dont-Have-ebook/dp/B07N4C6LGR/',
    tier: 'reading',
    notes: 'Popular science. Separate mechanistic claims from human-outcome evidence.',
    source: 'atilatech/awesome-longevity',
  },
]

export function listWatchlistByTier(tier: WatchlistTier): LongevityWatchlistItem[] {
  return LONGEVITY_WATCHLIST.filter((item) => item.tier === tier)
}

export function getWatchlistItem(id: string): LongevityWatchlistItem | undefined {
  const trimmed = id.trim()
  if (!trimmed) throw new Error('Watchlist id is required')
  return LONGEVITY_WATCHLIST.find((item) => item.id === trimmed)
}
