export const organizationRoleLabels = {
  spanish_publisher: "Editorial",
  distributor: "Distribución",
  original_publisher: "Editorial original",
};

export const gameTypeLabels = {
  base_game: "Juego base",
  expansion: "Expansión",
  accessory: "Accesorio",
};

export const creditRoleLabels = {
  designer: "Diseño",
  developer: "Desarrollo",
  system_designer: "Diseño del sistema",
};

export const newsEventLabels = {
  announcement: "Anuncio",
  preorder: "Preventa",
  release: "Lanzamiento",
  restock: "Reposición",
  reprint: "Reimpresión",
  new_edition: "Nueva edición",
  crowdfunding: "Financiación colectiva",
  delay: "Retraso",
  cancellation: "Cancelación",
  date_change: "Cambio de fecha",
  content_change: "Cambio de contenido",
};

function unresolvedRelation(originCollection, originId, reference) {
  throw new Error(
    `Relación requerida no resuelta: ${originCollection}/${originId} → ${reference.collection}/${reference.id}`,
  );
}

async function requireEntry(lookup, originCollection, originId, reference) {
  const entry = await lookup(reference);
  if (!entry) {
    unresolvedRelation(originCollection, originId, reference);
  }
  return entry;
}

function isV2(news) {
  return news.data.content_model_version === 2;
}

async function resolveProduct(news, relation, position, lookup) {
  const version = await requireEntry(lookup, "news", news.id, relation.version);
  const game = await requireEntry(lookup, "versions", version.id, version.data.game);
  const organizations = await Promise.all(
    version.data.organizations.map(async ({ organization, role }) => ({
      entry: await requireEntry(lookup, "versions", version.id, organization),
      role,
    })),
  );
  const spanishPublisher = organizations.find(({ role }) => role === "spanish_publisher");

  return {
    position,
    heading: game.data.title,
    game,
    version,
    organizations,
    facts: {
      players: game.data.players,
      durationMinutes: game.data.duration_minutes,
      recommendedAgeMin: game.data.recommended_age_min,
      credits: game.data.credits,
      spanishPublisher: spanishPublisher?.entry.data.name,
      releaseDate: version.data.release_date,
      priceSnapshot: relation.price_snapshot,
    },
  };
}

async function resolveContextGameTitles(products, lookup) {
  if (products.length === 1) {
    return [products[0].heading];
  }

  const [first, ...rest] = products;
  const commonParentIds = first.game.data.relations.parents
    .map(({ id }) => id)
    .filter((id) =>
      rest.every((product) =>
        product.game.data.relations.parents.some((parent) => parent.id === id),
      ),
    );

  return Promise.all(
    commonParentIds.map(async (id) => {
      const parent = await requireEntry(lookup, "games", first.game.id, {
        collection: "games",
        id,
      });
      return parent.data.title;
    }),
  );
}

/**
 * Resolve either persisted News branch to the common public view. `lookup`
 * accepts an Astro-style `{ collection, id }` reference and returns an entry.
 */
export async function resolveNewsGraph(news, lookup) {
  const v2 = isV2(news);
  const relations = v2 ? news.data.products : [{ version: news.data.version }];
  const products = await Promise.all(
    relations.map((relation, index) => resolveProduct(news, relation, index, lookup)),
  );
  const contextGameTitles = await resolveContextGameTitles(products, lookup);
  const image =
    news.data.image ?? (products.length === 1 ? products[0].version.data.cover : undefined);

  return {
    id: news.id,
    slug: news.data.slug,
    title: news.data.title,
    summary: news.data.summary,
    publishedAt: news.data.published_at,
    effectiveDate: news.data.effective_date,
    eventType: news.data.event_type,
    image,
    bodyMarkdown: news.body ?? "",
    productCount: products.length,
    contextGameTitles,
    products,
    groupPriceSnapshot: v2 ? news.data.group_price_snapshot : undefined,
  };
}

export function formatNewsDate(date) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Madrid",
  }).format(date);
}

export function formatPartialDate(partialDate) {
  if (!partialDate?.value || partialDate.precision === "unknown") {
    return undefined;
  }

  const [year, month, day] = partialDate.value.split("-");
  if (partialDate.precision === "day") {
    return new Intl.DateTimeFormat("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${year}-${month}-${day}T00:00:00Z`));
  }
  if (partialDate.precision === "month") {
    return new Intl.DateTimeFormat("es-ES", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${year}-${month}-01T00:00:00Z`));
  }
  if (partialDate.precision === "quarter") {
    return `${partialDate.value.slice(-2)} ${year}`;
  }
  return year;
}

export function formatPlayers(players) {
  if (!players) return undefined;
  const value =
    players.max === undefined
      ? `${players.min}+`
      : players.min === players.max
        ? `${players.min}`
        : `${players.min}–${players.max}`;
  return `${value} ${players.min === 1 && players.max === 1 ? "jugador" : "jugadores"}`;
}

export function formatDuration(durationMinutes) {
  if (!durationMinutes) return undefined;
  const value =
    durationMinutes.min === durationMinutes.max
      ? `${durationMinutes.min}`
      : `${durationMinutes.min}–${durationMinutes.max}`;
  return `${value} min`;
}

export function formatPriceSnapshot(snapshot) {
  if (!snapshot) return undefined;
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: snapshot.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(snapshot.amount_minor / 100);
}

export function formatProductContext(contextGameTitles, productCount) {
  if (productCount === 1) {
    return contextGameTitles[0];
  }
  const count = `${productCount} productos`;
  return contextGameTitles.length > 0 ? `${contextGameTitles.join(" · ")} · ${count}` : count;
}
