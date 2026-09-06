import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const contentRoot = process.env.ASTRO_NEWS_CONTENT_ROOT ?? "./src/content";
const positiveInteger = z.number().int().positive();
const isoDate = z.preprocess(
  (value) => value instanceof Date ? value.toISOString().slice(0, 10) : value,
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "debe usar YYYY-MM-DD"),
);

const image = z.object({
  src: z.string().regex(/^\/images\/news\/[a-z0-9][a-z0-9._/-]*$/),
  alt: z.string().trim().min(1),
}).strict();

const product = z.object({
  name: z.string().trim().min(1),
  type: z.enum(["base_game", "expansion", "accessory"]),
  parent: z.string().trim().min(1).optional(),
  bgg_id: positiveInteger.optional(),
  designers: z.array(z.string().trim().min(1)).min(1).optional(),
  publisher_es: z.string().trim().min(1).optional(),
  distributor_es: z.string().trim().min(1).optional(),
  players_min: positiveInteger.optional(),
  players_max: positiveInteger.optional(),
  duration_min: positiveInteger.optional(),
  duration_max: positiveInteger.optional(),
  age_min: positiveInteger.optional(),
  price_eur: z.number().positive().optional(),
  release_date: isoDate.optional(),
  language: z.string().trim().min(1).optional(),
}).strict().superRefine((value, context) => {
  if (value.players_max !== undefined && value.players_min === undefined) {
    context.addIssue({ code: "custom", path: ["players_min"], message: "es obligatorio si existe players_max" });
  }
  if (value.players_max !== undefined && value.players_min !== undefined && value.players_max < value.players_min) {
    context.addIssue({ code: "custom", path: ["players_max"], message: "debe ser >= players_min" });
  }
  if (value.duration_max !== undefined && value.duration_min === undefined) {
    context.addIssue({ code: "custom", path: ["duration_min"], message: "es obligatorio si existe duration_max" });
  }
  if (value.duration_max !== undefined && value.duration_min !== undefined && value.duration_max < value.duration_min) {
    context.addIssue({ code: "custom", path: ["duration_max"], message: "debe ser >= duration_min" });
  }
});

const news = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: `${contentRoot}/news`,
    generateId: ({ entry }) => entry.replace(/\.md$/, ""),
  }),
  schema: z.object({
    schema: z.literal("visludica-news-v1"),
    title: z.string().trim().min(1),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    summary: z.string().trim().min(1),
    date: z.coerce.date().optional(),
    event: z.enum([
      "announcement", "preorder", "release", "restock", "reprint", "new_edition",
      "crowdfunding", "delay", "cancellation", "date_change", "price_change", "content_change",
    ]),
    image: image.optional(),
    products: z.array(product).min(1),
    tags: z.array(z.string().trim().min(1)).min(1).optional(),
  }).strict(),
});

export const collections = { news };
