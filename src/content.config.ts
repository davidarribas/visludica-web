import { defineCollection, reference, z } from "astro:content";
import { glob } from "astro/loaders";

function contentLoader(base: string) {
  return glob({
    pattern: "**/*.md",
    base,
    // The filename is the stable internal ID. In particular, News.slug must not
    // silently replace the entry ID through glob()'s default generateId logic.
    generateId: ({ entry }) => entry.replace(/\.md$/, ""),
  });
}

// Tests can build a non-public fixture corpus without copying it into src/content.
const contentRoot = process.env.ASTRO_NEWS_CONTENT_ROOT ?? "./src/content";

const partialDate = z
  .object({
    value: z
      .preprocess(
        (value) => (value instanceof Date ? value.toISOString().slice(0, 10) : value),
        z.string(),
      )
      .optional(),
    precision: z.enum(["day", "month", "quarter", "year", "unknown"]),
  })
  .strict()
  .superRefine(({ value, precision }, context) => {
    const patterns = {
      day: /^\d{4}-\d{2}-\d{2}$/,
      month: /^\d{4}-\d{2}$/,
      quarter: /^\d{4}-Q[1-4]$/,
      year: /^\d{4}$/,
    } as const;

    if (precision === "unknown") {
      if (value !== undefined) {
        context.addIssue({ code: "custom", message: "unknown no admite value" });
      }
      return;
    }

    if (!value || !patterns[precision].test(value)) {
      context.addIssue({
        code: "custom",
        message: `value debe respetar la precisión ${precision}`,
      });
    }
  });

const sources = z.array(
  z.discriminatedUnion("type", [
    z.object({
      url: z.string().url(),
      type: z.enum(["primary", "secondary", "community"]),
    }).strict(),
    z.object({
      type: z.literal("editorial_input"),
      url: z.string().url().optional(),
    }).strict(),
  ]),
);

const positiveInteger = z.number().int().positive();

const players = z
  .object({
    min: positiveInteger,
    max: positiveInteger.optional(),
  })
  .strict()
  .superRefine(({ min, max }, context) => {
    if (max !== undefined && max < min) {
      context.addIssue({ code: "custom", path: ["max"], message: "max debe ser >= min" });
    }
  });

const durationMinutes = z
  .object({
    min: positiveInteger,
    max: positiveInteger,
  })
  .strict()
  .superRefine(({ min, max }, context) => {
    if (max < min) {
      context.addIssue({ code: "custom", path: ["max"], message: "max debe ser >= min" });
    }
  });

const credit = z
  .object({
    name: z.string().trim().min(1),
    role: z.enum(["designer", "developer", "system_designer"]),
  })
  .strict();

const marketCode = z.string().regex(/^[A-Z]{2}$/, "market debe ser ISO 3166-1 alpha-2");

const priceSnapshot = z
  .object({
    kind: z.enum(["pvpr", "reservation_deposit"]),
    amount_minor: z.number().int().nonnegative(),
    currency: z.string().regex(/^[A-Z]{3}$/, "currency debe ser ISO 4217"),
    market: marketCode,
    observed_at: z.preprocess(
      (value) => (value instanceof Date ? value.toISOString() : value),
      z
        .string()
        .datetime({ offset: true })
        .regex(/(?:Z|[+-]\d{2}:\d{2})$/, "observed_at debe incluir zona horaria"),
    ),
  })
  .strict();

const games = defineCollection({
  loader: contentLoader(`${contentRoot}/games`),
  schema: z.object({
    title: z.string().trim().min(1),
    bgg_id: z.number().int().positive().optional(),
    type: z.enum(["base_game", "expansion", "accessory"]),
    relations: z
      .object({
        parents: z.array(reference("games")).default([]),
        reimplements: z.array(reference("games")).default([]),
      })
      .strict()
      .default({}),
    players: players.optional(),
    duration_minutes: durationMinutes.optional(),
    recommended_age_min: positiveInteger.optional(),
    credits: z.array(credit).min(1).optional(),
  }).strict(),
});

const organizations = defineCollection({
  loader: contentLoader(`${contentRoot}/organizations`),
  schema: z.object({
    name: z.string().trim().min(1),
  }).strict(),
});

const versions = defineCollection({
  loader: contentLoader(`${contentRoot}/versions`),
  schema: z.object({
    game: reference("games"),
    name: z.string().trim().min(1),
    bgg_version_id: z.number().int().positive().optional(),
    languages: z.array(z.string()),
    markets: z.array(marketCode).default([]),
    organizations: z.array(
      z.object({
        organization: reference("organizations"),
        role: z.enum(["spanish_publisher", "distributor", "original_publisher"]),
      }).strict(),
    ),
    release_date: partialDate.optional(),
    cover: z.string().optional(),
  }).strict(),
});

const commonNewsFields = {
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  // Corpus entries can be preserved before the original Vis Ludica date is
  // recovered. Published entries continue to provide it when available.
  published_at: z.coerce.date().optional(),
  effective_date: partialDate.optional(),
  image: z.string().trim().min(1).optional(),
};

const newsV1 = z
  .object({
    ...commonNewsFields,
    content_model_version: z.undefined().optional(),
    version: reference("versions"),
    event_type: z.enum([
      "announcement",
      "preorder",
      "release",
      "restock",
      "reprint",
      "new_edition",
      "crowdfunding",
      "delay",
      "cancellation",
      "date_change",
    ]),
    sources,
  })
  .strict();

const newsV2 = z
  .object({
    ...commonNewsFields,
    content_model_version: z.literal(2),
    event_type: z.enum([
      "announcement",
      "preorder",
      "release",
      "restock",
      "new_edition",
      "crowdfunding",
      "delay",
      "cancellation",
      "date_change",
      "content_change",
    ]),
    products: z
      .array(
        z
          .object({
            version: reference("versions"),
            price_snapshot: priceSnapshot.optional(),
          })
          .strict(),
      )
      .min(1),
    group_price_snapshot: priceSnapshot.optional(),
  })
  .strict()
  .superRefine(({ products, group_price_snapshot: groupPriceSnapshot }, context) => {
    const seen = new Set<string>();
    products.forEach((product, index) => {
      if (seen.has(product.version.id)) {
        context.addIssue({
          code: "custom",
          path: ["products", index, "version"],
          message: `Version duplicada: ${product.version.id}`,
        });
      }
      seen.add(product.version.id);
    });

    if (groupPriceSnapshot && products.length < 2) {
      context.addIssue({
        code: "custom",
        path: ["group_price_snapshot"],
        message: "group_price_snapshot requiere al menos dos productos",
      });
    }
  });

const news = defineCollection({
  loader: contentLoader(`${contentRoot}/news`),
  schema: z.union([newsV1, newsV2]),
});

export const collections = { games, versions, organizations, news };
