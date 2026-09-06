function reference(collection, id) {
  return { collection, id };
}

function entry(id, data, body = "Contenido editorial del fixture.") {
  return { id, data, body };
}

function game(id, title, options = {}) {
  return entry(id, {
    title,
    type: options.type ?? "expansion",
    relations: {
      parents: (options.parents ?? []).map((parent) => reference("games", parent)),
      reimplements: [],
    },
    ...options.facts,
  });
}

function version(id, gameId, name, organizations, options = {}) {
  return entry(id, {
    game: reference("games", gameId),
    name,
    languages: options.languages ?? ["es"],
    markets: options.markets ?? ["ES"],
    organizations: organizations.map(([organization, role]) => ({
      organization: reference("organizations", organization),
      role,
    })),
    ...(options.release_date ? { release_date: options.release_date } : {}),
    ...(options.cover ? { cover: options.cover } : {}),
  });
}

function pvpr(amountMinor, observedAt = "2026-08-28T10:00:00+02:00") {
  return {
    kind: "pvpr",
    amount_minor: amountMinor,
    currency: "EUR",
    market: "ES",
    observed_at: observedAt,
  };
}

function product(versionId, amountMinor) {
  return {
    version: reference("versions", versionId),
    ...(amountMinor === undefined ? {} : { price_snapshot: pvpr(amountMinor) }),
  };
}

const legionProducts = [
  ["star-wars-legion-agents-of-the-empire", "Agents of the Empire", 3999],
  ["star-wars-legion-galactic-bounty-hunters", "Galactic Bounty Hunters", 4199],
  ["star-wars-legion-jedi-council", "Jedi Council", 4999],
  ["star-wars-legion-leaders-of-the-republic", "Leaders of the Republic", 2999],
  ["star-wars-legion-rebel-at-rt", "Rebel AT-RT", 2499],
];

const tamrielProducts = [
  ["tes-heroes-de-tamriel", "The Elder Scrolls: Héroes de Tamriel"],
  ["tes-elsweyr", "The Elder Scrolls: Elsweyr"],
  ["tes-estivalia", "The Elder Scrolls: Estivalia"],
  ["tes-piel-y-colmillo", "The Elder Scrolls: Piel y Colmillo"],
  ["tes-sombras-del-olvido", "The Elder Scrolls: Sombras del Olvido"],
  ["tes-adventurers-cache", "The Elder Scrolls: Adventurer's Cache"],
];

/** Non-public V2 graph based on the frozen design fixtures. */
export function createV2TechnicalFixtureCollections() {
  const games = new Map([
    [
      "king-of-tokyo-godzilla",
      game("king-of-tokyo-godzilla", "King of Tokyo: Godzilla", {
        type: "base_game",
        facts: {
          bgg_id: 463297,
          players: { min: 2, max: 6 },
          duration_minutes: { min: 30, max: 30 },
          recommended_age_min: 8,
          credits: [{ name: "Richard Garfield", role: "designer" }],
        },
      }),
    ],
    ["star-wars-legion", game("star-wars-legion", "Star Wars: Legión", { type: "base_game" })],
    ...legionProducts.map(([id, title], index) => [
      id,
      game(id, `Star Wars: Legión — ${title}`, {
        parents: ["star-wars-legion"],
        facts: {
          players: { min: 2 },
          duration_minutes: { min: 60, max: 120 },
          recommended_age_min: 14,
          ...(index === 0
            ? {
                credits: [
                  { name: "Fixture Developer", role: "developer" },
                  { name: "Fixture System Designer", role: "system_designer" },
                ],
              }
            : {}),
        },
      }),
    ]),
    [
      "tes-betrayal-second-era",
      game(
        "tes-betrayal-second-era",
        "The Elder Scrolls: La traición de la Segunda Era",
        {
          type: "base_game",
          facts: {
            players: { min: 1, max: 4 },
            duration_minutes: { min: 120, max: 240 },
            recommended_age_min: 14,
          },
        },
      ),
    ],
    ...tamrielProducts.map(([id, title]) => [
      id,
      game(id, title, {
        type: id === "tes-adventurers-cache" ? "accessory" : "expansion",
        parents: ["tes-betrayal-second-era"],
        facts:
          id === "tes-heroes-de-tamriel"
            ? {
                players: { min: 1, max: 4 },
                duration_minutes: { min: 120, max: 240 },
                recommended_age_min: 14,
              }
            : undefined,
      }),
    ]),
  ]);

  const organizations = new Map([
    ["devir", entry("devir", { name: "Devir" })],
    ["iello", entry("iello", { name: "IELLO" })],
    ["asmodee-espana", entry("asmodee-espana", { name: "Asmodee España" })],
    ["atomic-mass-games", entry("atomic-mass-games", { name: "Atomic Mass Games" })],
    ["chip-theory-games", entry("chip-theory-games", { name: "Chip Theory Games" })],
    ["ediciones-masqueoca", entry("ediciones-masqueoca", { name: "Ediciones MasQueOca" })],
  ]);

  const versions = new Map([
    [
      "king-of-tokyo-godzilla-es",
      version(
        "king-of-tokyo-godzilla-es",
        "king-of-tokyo-godzilla",
        "King of Tokyo: Godzilla — edición española",
        [
          ["devir", "spanish_publisher"],
          ["iello", "original_publisher"],
        ],
        {
          release_date: { value: "2026-08-24", precision: "day" },
          cover: "/images/versions/king-of-tokyo-godzilla-es.webp",
        },
      ),
    ],
    ...legionProducts.map(([id, title]) => {
      const versionId = `${id}-es`;
      return [
        versionId,
        version(versionId, id, `SW Legión: ${title}`, [
          ["asmodee-espana", "distributor"],
          ["atomic-mass-games", "original_publisher"],
        ], {
          languages: ["de", "en", "es", "fr"],
          release_date: { value: "2026-08-28", precision: "day" },
          cover: `/images/versions/${id}.webp`,
        }),
      ];
    }),
    ...tamrielProducts.map(([id, title]) => {
      const versionId = `${id}-es`;
      return [
        versionId,
        version(versionId, id, `${title} — edición española`, [
          ["chip-theory-games", "original_publisher"],
          ["ediciones-masqueoca", "spanish_publisher"],
        ], {
          release_date: { value: "2027-Q1", precision: "quarter" },
          ...(id === "tes-heroes-de-tamriel"
            ? { cover: "/images/versions/tes-heroes-de-tamriel-es.webp" }
            : {}),
        }),
      ];
    }),
    [
      "tes-betrayal-second-era-es-first",
      version(
        "tes-betrayal-second-era-es-first",
        "tes-betrayal-second-era",
        "The Elder Scrolls: La traición de la Segunda Era — primera edición española",
        [
          ["chip-theory-games", "original_publisher"],
          ["ediciones-masqueoca", "spanish_publisher"],
        ],
        { cover: "/images/versions/tes-betrayal-second-era-es-first.webp" },
      ),
    ],
  ]);

  const news = new Map([
    [
      "king-of-tokyo-godzilla-release",
      entry("king-of-tokyo-godzilla-release", {
        content_model_version: 2,
        title: "King of Tokyo: Godzilla se publica en español",
        summary: "Fixture uniproducto con facts completos y PVPR histórico.",
        slug: "king-of-tokyo-godzilla-se-publica-en-espanol",
        published_at: new Date("2026-08-24T08:00:00Z"),
        event_type: "release",
        products: [
          {
            version: reference("versions", "king-of-tokyo-godzilla-es"),
            price_snapshot: pvpr(4999, "2026-08-24T10:00:00+02:00"),
          },
        ],
      }),
    ],
    [
      "star-wars-legion-wave-2026-08-28",
      entry("star-wars-legion-wave-2026-08-28", {
        content_model_version: 2,
        title: "Cinco expansiones de Star Wars: Legión llegan en la misma oleada",
        summary: "Fixture multiproducto coigual con cinco PVPR distintos.",
        slug: "cinco-expansiones-star-wars-legion-agosto-2026",
        published_at: new Date("2026-08-28T08:00:00Z"),
        event_type: "release",
        products: legionProducts.map(([id, , amountMinor]) => product(`${id}-es`, amountMinor)),
        image: "/images/news/star-wars-legion-wave-2026-08-28.webp",
      }),
    ],
    [
      "tes-heroes-tamriel-reservation-process",
      entry("tes-heroes-tamriel-reservation-process", {
        content_model_version: 2,
        title: "Los productos de Héroes de Tamriel cierran reservas antes de abrir su compra",
        summary: "Fixture de seis productos y depósito conjunto.",
        slug: "heroes-tamriel-cierra-reservas-y-prepara-compras",
        published_at: new Date("2026-07-16T08:00:00Z"),
        event_type: "preorder",
        products: tamrielProducts.map(([id]) => product(`${id}-es`)),
        group_price_snapshot: {
          kind: "reservation_deposit",
          amount_minor: 2000,
          currency: "EUR",
          market: "ES",
          observed_at: "2026-07-16T10:00:00+02:00",
        },
        image: "/images/news/tes-heroes-tamriel-reservations.webp",
      }),
    ],
    [
      "tes-spanish-first-edition-errata-corrections",
      entry("tes-spanish-first-edition-errata-corrections", {
        content_model_version: 2,
        title: "La edición española de The Elder Scrolls detalla sus primeras correcciones",
        summary: "Fixture de cambio material de contenido.",
        slug: "elder-scrolls-edicion-espanola-correcciones-erratas",
        published_at: new Date("2026-04-22T08:00:00Z"),
        event_type: "content_change",
        products: [product("tes-betrayal-second-era-es-first")],
      }),
    ],
  ]);

  return new Map([
    ["games", games],
    ["organizations", organizations],
    ["versions", versions],
    ["news", news],
  ]);
}

export function fixtureLookup(collections) {
  return ({ collection, id }) => collections.get(collection)?.get(id);
}
