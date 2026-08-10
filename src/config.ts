// Configuración global del sitio.
// Cambia aquí sin tocar componentes.
export const SITE = {
  name: 'Vis Lúdica',

  // Propuesta de valor que aparece en el hero de la home.
  tagline: 'Un podcast dedicado a los juegos de mesa modernos',

  description:
    'Podcast sobre juegos de mesa. Eurogames, análisis, estrategia y conversaciones profundas sobre el hobby.',

  url: 'https://visludica.com',
  rss: 'https://feeds.captivate.fm/visludica/',
};

// Plataformas donde se puede escuchar el podcast.
// Usado en: Footer, podcast/[slug], pages/escuchar.
export const LISTEN_PLATFORMS = [
  {
    href: 'https://open.spotify.com/show/3EPdLM7Ozd1U5kq5iYhN43',
    label: 'Spotify',
    color: '#1DB954',
    icon: 'spotify',
  },
  {
    href: 'https://podcasts.apple.com/es/podcast/vis-ludica/id395259239',
    label: 'Apple Podcasts',
    color: '#B150E2',
    icon: 'apple',
  },
  {
    href: 'https://www.ivoox.com/podcast-vis-ludica_sq_f1792_1.html',
    label: 'iVoox',
    color: '#00AAFF',
    icon: 'ivoox',
  },
  {
    href: 'https://youtube.com/visludica',
    label: 'YouTube',
    color: '#FF0000',
    icon: 'youtube',
  },
  {
    href: 'https://feeds.captivate.fm/visludica/',
    label: 'Feed RSS',
    color: '#FF6B35',
    icon: 'rss',
  },
] as const;

// Redes y espacios de comunidad.
// Usado en: Footer, pages/comunidad, pages/index (tarjetas de comunidad).
export const COMMUNITY_LINKS = [
  {
    href: 'https://t.me/visludicaarmy',
    label: 'Telegram',
    icon: 'telegram',
    accent: '#0088cc',
  },
  {
    href: 'https://youtube.com/visludica',
    label: 'YouTube',
    icon: 'youtube',
    accent: '#FF0000',
  },
  {
    href: 'https://twitch.tv/visludica',
    label: 'Twitch',
    icon: 'twitch',
    accent: '#9146FF',
  },
  {
    href: 'https://visludica.substack.com',
    label: 'Destroquelar',
    icon: 'substack',
    accent: '#FF6719',
  },
] as const;

// Sitios hermanos del proyecto Vis Lúdica.
// Usado en: Footer, Header (menú "Más").
export const SISTER_SITES = [
  { href: 'https://visbelica.com', label: 'Vis Bélica' },
  { href: 'https://academiavisbelica.com', label: 'Academia' },
  { href: 'https://campamentobarton.com', label: 'Barton' },
  { href: 'https://visludica.substack.com', label: 'Destroquelar' },
] as const;
