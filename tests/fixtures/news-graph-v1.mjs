function reference(collection, id) {
  return { collection, id };
}

function entry(data) {
  return { data };
}

/** Non-public fixture graph. It is intentionally outside src/content. */
export function createTechnicalFixtureCollections() {
  return new Map([
    [
      "games",
      new Map([
        [
          "fixture-base",
          entry({
            title: "Fixture Base",
            type: "base_game",
            relations: { parents: [], reimplements: [] },
          }),
        ],
        [
          "fixture-expansion",
          entry({
            title: "Fixture Expansion",
            type: "expansion",
            relations: { parents: [reference("games", "fixture-base")], reimplements: [] },
          }),
        ],
        [
          "fixture-reimplementation",
          entry({
            title: "Fixture Reimplementation",
            type: "base_game",
            relations: { parents: [], reimplements: [reference("games", "fixture-base")] },
          }),
        ],
      ]),
    ],
    [
      "organizations",
      new Map([
        ["fixture-publisher", entry({ name: "Fixture Publisher" })],
        ["fixture-distributor", entry({ name: "Fixture Distributor" })],
      ]),
    ],
    [
      "versions",
      new Map([
        [
          "fixture-version",
          entry({
            game: reference("games", "fixture-base"),
            name: "Fixture commercial edition",
            languages: ["es"],
            markets: ["ES"],
            organizations: [
              { organization: reference("organizations", "fixture-publisher"), role: "spanish_publisher" },
              { organization: reference("organizations", "fixture-distributor"), role: "distributor" },
            ],
            cover: "/images/versions/fixture-cover.svg",
          }),
        ],
        [
          "fixture-version-without-bgg-id",
          entry({
            game: reference("games", "fixture-expansion"),
            name: "Fixture announced expansion",
            languages: [],
            markets: [],
            organizations: [],
          }),
        ],
      ]),
    ],
    [
      "news",
      new Map([
        [
          "fixture-announcement",
          entry({
            title: "Fixture announcement",
            summary: "Fixture V1 announcement summary.",
            event_type: "announcement",
            slug: "fixture-announcement-slug",
            version: reference("versions", "fixture-version"),
            sources: [{ type: "primary", url: "https://example.com/fixture-announcement" }],
          }),
        ],
        [
          "fixture-preorder",
          entry({
            title: "Fixture preorder",
            summary: "Fixture V1 preorder summary.",
            event_type: "preorder",
            slug: "fixture-preorder-slug",
            version: reference("versions", "fixture-version"),
            image: "/images/news/fixture-own-image.svg",
            sources: [{ type: "primary", url: "https://example.com/fixture-preorder" }],
          }),
        ],
        [
          "fixture-without-image",
          entry({
            title: "Fixture without image",
            summary: "Fixture V1 without image summary.",
            event_type: "announcement",
            slug: "fixture-without-image-slug",
            version: reference("versions", "fixture-version-without-bgg-id"),
            sources: [{ type: "primary", url: "https://example.com/fixture-without-image" }],
          }),
        ],
      ]),
    ],
  ]);
}
