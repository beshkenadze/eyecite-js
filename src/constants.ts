import { type CitationBase, CitationToken, FullCaseCitation } from './models'

// Joke cite for easter egg
export const jokeCite: CitationBase[] = [
  new FullCaseCitation(
    new CitationToken(
      '1 Eyecite 1',
      0,
      11,
      { volume: '1', reporter: 'Eyecite', page: '1' },
      {
        exactEditions: [
          {
            reporter: {
              source: 'reporters',
              isScotus: false,
              name: 'Eyecite',
              cite_type: 'specialty',
              slug: 'eyecite',
              shortName: 'Eyecite',
              fullName: 'Eyecite',
            },
            reporterFound: 'Eyecite',
          },
        ],
      },
    ),
    0,
    [],
    [],
    {
      plaintiff: 'Lissner',
      defendant: 'Saveliff',
    },
  ),
]
