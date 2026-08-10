export const editorial = {
  'vis-ludica': {
    name: 'Vis Lúdica',
    eyebrow: 'La mesa de la comunidad',
    intro:
      '170 votantes, 330 juegos distintos y 1.014 puntos repartidos. Julio se deja 17 participantes respecto a junio, pero apenas cinco títulos: llega el verano y la mesa sigue teniendo fondo de armario.',
    methodology:
      'Cada votante reparte 3, 2 y 1 puntos. El índice POWER combina el mes actual con los tres anteriores para premiar la forma reciente sin borrar la inercia.',
    power: {
      headline: 'The Elder Scrolls hace doblete y refuerza el trono',
      deck: 'Gana el mes y conserva el Power Ranking. El Destino de la Comunidad salta al segundo puesto y D-Day aguanta por tercer mes consecutivo en el podio.',
      notes: {
        'the-elder-scrolls-la-traicion-de-la-segunda-era':
          'Sigue primero con un índice de 0,1855. La inercia de primavera se enfría, pero ganar julio con 27 puntos le permite mantener una ventaja cómoda sobre el perseguidor.',
        'el-senor-de-los-anillos-el-destino-de-la-comunidad':
          'Sube cuatro puestos y se coloca segundo. Sus 22 puntos de julio prolongan tres meses de presencia firme y lo convierten en la alternativa más seria al líder.',
        'd-day-at-omaha-beach':
          'Permanece tercero pese a bajar al sexto puesto mensual. Siete votantes y 16 puntos bastan para alimentar una trayectoria que sigue siendo de las más constantes del año.',
      },
      afterword:
        'Arkham Horror LCG se coloca cuarto. Vampire, Nippon: Zaibatsu y Marvel Champions protagonizan las grandes subidas; Cthulhu: Dark Providence paga su caída mensual y baja siete puestos, hasta el noveno.',
    },
    monthly: {
      headline: 'The Elder Scrolls reina también en julio',
      deck: 'Siete primeros puestos le dan una victoria clara. El Destino de la Comunidad repite diez votantes y Nippon: Zaibatsu gana el desempate por el bronce.',
      notes: {
        'the-elder-scrolls-la-traicion-de-la-segunda-era':
          '27 puntos con siete primeros y tres segundos puestos. Diez papeletas, ninguna en tercera posición y cinco puntos de margen: una victoria construida desde arriba.',
        'el-senor-de-los-anillos-el-destino-de-la-comunidad':
          'También reúne diez votantes, pero con un reparto más equilibrado: cuatro primeros, cuatro segundos y dos terceros para sumar 22 puntos.',
        'nippon-zaibatsu':
          'Empata a 17 puntos con Marvel Champions, pero sus cinco primeros puestos inclinan el desempate. Salta doce posiciones y completa el podio con solo seis votantes.',
      },
    },
    annual: {
      headline: 'The Elder Scrolls abre hueco en la carrera larga',
      deck: 'Con 1,053 de acumulado, amplía su ventaja sobre D-Day at Omaha Beach (0,975). Arkham Horror LCG conserva el tercer puesto y SETI y Arcs completan un top cinco sin cambios.',
    },
    quotes: [],
  },
  'vis-belica': {
    name: 'Vis Bélica',
    eyebrow: 'El frente de los rancios',
    intro:
      '39 votantes de guerra, 35 juegos distintos y 99 puntos repartidos. La muestra baja desde el máximo de junio, aunque sigue siendo más del doble de los 15 wargameros con los que arrancó el ranking en marzo.',
    methodology:
      'Se filtran únicamente los votos considerados wargame y el índice se normaliza sobre quienes votaron al menos un juego de guerra ese mes.',
    voterGrowth: {
      label: 'El frente toma aire',
      headline: '39 votantes: ocho menos que en junio',
      deck: 'El verano frena el máximo de junio, pero la base activa sigue siendo 2,6 veces mayor que al comienzo del histórico.',
    },
    power: {
      headline: 'D-Day resiste; Guerra del Anillo irrumpe',
      deck: 'El líder pierde algo de altura, pero conserva una ventaja enorme. Guerra del Anillo debuta segundo y Dune: War for Arrakis escala 32 puestos para cerrar el podio.',
      notes: {
        'd-day-at-omaha-beach':
          'Continúa primero con 0,4402 y vuelve a ganar el ranking mensual: 16 puntos repartidos entre siete votantes. Baja respecto a junio, pero nadie amenaza todavía su mando.',
        'guerra-del-anillo':
          'Entra directamente en el segundo puesto del Power con 0,2156. Sus 12 puntos y cinco votantes hacen de julio una ofensiva concentrada, sin apoyo de meses anteriores.',
        'dune-war-for-arrakis':
          'Sube 32 posiciones y alcanza el tercer puesto. Un primero, dos segundos y un tercero le dan ocho puntos y consolidan su presencia en el Palmarés anual.',
      },
      afterword:
        'Struggle of Empires queda cuarto. Quartermaster General: South Front sube 17 puestos; Skies Above Britain, Stonewall in the Valley y Paths of Glory también aprovechan un mes especialmente móvil.',
    },
    monthly: {
      headline: 'D-Day repite victoria en un podio de grandes campañas',
      deck: 'D-Day at Omaha Beach encabeza julio con 16 puntos. Guerra del Anillo suma 12 y Dune: War for Arrakis completa el podio con ocho.',
      notes: {
        'd-day-at-omaha-beach':
          'Tres primeros, tres segundos y un tercer puesto: siete votantes y 16 puntos que vuelven a situarlo como referencia mensual de Vis Bélica.',
        'guerra-del-anillo':
          'Cinco votantes lo colocan segundo con 12 puntos. Tres de ellos lo eligieron como el mejor juego que llevaron a mesa durante julio.',
        'dune-war-for-arrakis':
          'Cuatro votantes y ocho puntos. No domina las primeras posiciones, pero su reparto estable le basta para asegurar el bronce.',
      },
    },
    annual: {
      headline: 'D-Day continúa en otra liga',
      deck: 'Acumula 2,7013, más de cuatro veces el valor de Dune: War for Arrakis, que sube al segundo puesto. Twilight Struggle cae al tercero tras cinco meses de presencia.',
    },
    quotes: [],
  },
} as const;
