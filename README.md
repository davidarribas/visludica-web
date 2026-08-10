# Astro Starter Kit: Minimal

## Power Ranking

La edición mensual vive en `src/data/power-ranking/YYYY-MM/`:

- `data.json`: generado desde los Excel; no se edita a mano.
- `editorial.ts`: crónica, notas de podio y citas seleccionadas.

Para importar una nueva edición:

```sh
npm run ranking:import -- \
  --main /ruta/power_ranking_mes.xlsx \
  --belica /ruta/power_ranking_vis_belica_mes.xlsx \
  --year 2026 \
  --month 7
```

El importador usa Node.js y las dependencias ya incluidas en el proyecto. La
clasificación POWER publicada se toma de su hoja final; el Palmarés se deriva de
los valores normalizados del histórico. Los juegos repetidos por diferencias de
mayúsculas o puntuación se agrupan para construir su evolución.

Después de importar, añade la edición a `src/lib/power-ranking.ts`, crea su
archivo editorial y ejecuta `npm run build`.

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
