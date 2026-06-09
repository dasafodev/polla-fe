// Datos mundialistas verificados (subagente Opus, fuentes reales — ver spec
// docs/superpowers/specs/2026-06-09-inicio-dashboard-redesign-design.md).
// Nada inventado: cada dato tiene fuente. Se muestran en el Inicio (estados Vacía y A medias),
// uno aleatorio en cada entrada.

export interface FunFact {
  id: number
  text: string
  source: string
  url: string
}

export const FUN_FACTS: FunFact[] = [
  { id: 1, text: 'El Mundial 2026 será el más grande de la historia: 48 selecciones y 104 partidos, en 3 países anfitriones (EE.UU., México y Canadá).', source: 'FIFA / Wikipedia', url: 'https://en.wikipedia.org/wiki/2026_FIFA_World_Cup' },
  { id: 2, text: 'Es el primer Mundial organizado por tres países a la vez. Antes solo Japón y Corea lo compartieron, en 2002.', source: 'FIFA', url: 'https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026' },
  { id: 3, text: 'El partido inaugural será el 11 de junio de 2026 en el Estadio Azteca: México vs. Sudáfrica.', source: 'FIFA', url: 'https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/estadio-azteca-mexico-city-host-opening-match-world-cup-2026' },
  { id: 4, text: 'El Estadio Azteca será el primer estadio en albergar tres Mundiales (1970, 1986 y 2026) y sus tres partidos inaugurales.', source: 'beIN Sports', url: 'https://www.beinsports.com/en-us/soccer/fifa-world-cup-2026/articles/estadio-azteca-will-make-history-at-the-2026-world-cup-as-the-first-stadium-to-host-three-fifa-world-cup-opening-matches-2026-06-02' },
  { id: 5, text: 'Con 2026, México es el primer país en organizar tres Copas del Mundo masculinas.', source: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/2026_FIFA_World_Cup' },
  { id: 6, text: 'La final del Mundial 2026 se jugará el 19 de julio en el MetLife Stadium de Nueva Jersey.', source: 'Sky Sports', url: 'https://www.skysports.com/football/news/12010/13272067/2026-world-cup-dates-venues-host-cities-and-format-for-usa-canada-and-mexico-tournament' },
  { id: 7, text: '2026 es el primero en que las seis confederaciones tienen cupo garantizado: Oceanía lo logra por primera vez (Nueva Zelanda).', source: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_qualification' },
  { id: 8, text: 'El balón oficial de 2026, «Trionda», lleva un chip con tecnología que ayuda al VAR a detectar toques y fueras de lugar.', source: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Adidas_Trionda' },
  { id: 9, text: 'Brasil es el único país que ha jugado todos los Mundiales desde 1930 y el más ganador, con cinco títulos.', source: 'Olympics.com', url: 'https://www.olympics.com/en/news/most-fifa-world-cup-football-wins' },
  { id: 10, text: 'Tras Brasil, Alemania e Italia suman cuatro títulos cada una; Argentina, tres (1978, 1986 y 2022).', source: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/List_of_FIFA_World_Cup_finals' },
  { id: 11, text: 'El máximo goleador histórico de los Mundiales es Miroslav Klose, con 16 goles en cuatro ediciones (2002–2014).', source: 'FIFA', url: 'https://www.fifa.com/en/tournaments/mens/worldcup/articles/miroslav-klose-germany-top-goalscorer' },
  { id: 12, text: 'El récord de goles en un solo Mundial es de Just Fontaine: 13 en seis partidos, en 1958. Lleva más de 65 años intacto.', source: 'FIFA', url: 'https://www.fifa.com/en/tournaments/mens/worldcup/articles/just-fontaine-france-goals-one-edition-record-1958' },
  { id: 13, text: 'Pelé es el único jugador que ha ganado tres Mundiales (1958, 1962 y 1970).', source: 'Britannica', url: 'https://www.britannica.com/biography/Pele-Brazilian-athlete' },
  { id: 14, text: 'Pelé marcó en la final de 1958 con 17 años: sigue siendo el único en anotar en un Mundial antes de cumplir los 18.', source: 'FIFA', url: 'https://www.fifa.com/en/tournaments/mens/worldcup/articles/pele-brazil-youngest-goal-final-scorer-sweden-1958' },
  { id: 15, text: 'Lionel Messi tiene el récord de más partidos en Mundiales: 26, al disputar la final de Qatar 2022.', source: 'FIFA', url: 'https://www.fifa.com/en/tournaments/mens/worldcup/articles/lionel-messi-appearances-record' },
  { id: 16, text: 'Cafú es el único que ha jugado tres finales consecutivas de un Mundial: 1994, 1998 y 2002.', source: 'FIFA', url: 'https://www.fifa.com/en/tournaments/mens/worldcup/articles/cafu-brazil-three-finals' },
  { id: 17, text: 'El gol más rápido de los Mundiales: Hakan Şükür, a los 11 segundos (Turquía-Corea, 2002).', source: 'FIFA', url: 'https://www.fifa.com/en/tournaments/mens/worldcup/articles/hakan-sukur-fastest-goal-2002' },
  { id: 18, text: 'El partido con más goles fue Austria 7-5 Suiza, en cuartos de 1954: 12 goles que nadie ha igualado.', source: 'FIFA', url: 'https://www.fifa.com/en/tournaments/mens/worldcup/articles/austria-switzerland-highest-scoring-game-1954' },
  { id: 19, text: 'En 2014, Alemania goleó 7-1 a Brasil anfitrión en semis: la peor derrota de un local. El «Mineirazo».', source: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Brazil_v_Germany_(2014_FIFA_World_Cup)' },
  { id: 20, text: 'El «Maracanazo» de 1950: Uruguay venció 2-1 a Brasil en su casa. Asistencia oficial récord: 173.850 personas.', source: 'Guinness World Records', url: 'https://www.guinnessworldrecords.com/news/2014/6/world-cup-rewind-world-cup-rewind-largest-attendance-at-a-match-in-the-1950-brazil-final' },
  { id: 21, text: 'En 1986 Maradona marcó a Inglaterra la «Mano de Dios» y, 4 minutos después, el gol elegido por FIFA como el mejor de la historia.', source: 'FIFA', url: 'https://www.fifa.com/en/articles/diego-maradona-argentina-england-hand-of-god-1986' },
  { id: 22, text: 'Geoff Hurst es el único con un hat-trick en una final: tres goles en el 4-2 de Inglaterra a Alemania en 1966.', source: 'FIFA', url: 'https://www.fifa.com/en/articles/100-great-world-cup-moments-qatar-2022-66-geoff-hurst-england-1966' },
  { id: 23, text: 'El primer Mundial fue Uruguay 1930, con 13 selecciones. Lo ganó el anfitrión, 4-2 a Argentina.', source: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/1930_FIFA_World_Cup' },
  { id: 24, text: 'El primer gol de la historia de los Mundiales lo marcó el francés Lucien Laurent, en 1930 ante México.', source: 'FIFA', url: 'https://inside.fifa.com/tournaments/mens/worldcup/1930uruguay/news/lucien-laurent-the-first-world-cup-goalscorer' },
  { id: 25, text: 'Solo dos Mundiales no se jugaron: 1942 y 1946, cancelados por la Segunda Guerra Mundial. 12 años de parón.', source: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/History_of_the_FIFA_World_Cup' },
  { id: 26, text: 'El trofeo Jules Rimet fue robado en 1966 y lo encontró un perro llamado Pickles, bajo un seto en Londres.', source: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/1966_theft_of_the_Jules_Rimet_Trophy' },
  { id: 27, text: 'El jugador más joven en un Mundial es el norirlandés Norman Whiteside: 17 años y 41 días, en 1982.', source: 'FIFA', url: 'https://www.fifa.com/en/tournaments/mens/worldcup/articles/norman-whiteside-record-1982' },
  { id: 28, text: 'Marruecos hizo historia en 2022: primer país africano y árabe en llegar a semifinales de un Mundial.', source: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Morocco_at_the_FIFA_World_Cup' },
  { id: 29, text: 'James Rodríguez fue el primer colombiano con la Bota de Oro: 6 goles en Brasil 2014, el mejor Mundial de Colombia.', source: 'Sports Illustrated', url: 'https://www.si.com/soccer/2014/07/14/james-rodriguez-golden-boot-world-cup-colombia' },
  { id: 30, text: 'Rumbo al Mundial de 1994, Colombia goleó 5-0 a Argentina en Buenos Aires. Hasta Maradona terminó aplaudiendo.', source: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Argentina_v_Colombia_(1994_FIFA_World_Cup_qualification)' },
]

export function pickRandomFact(): FunFact {
  return FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)]
}
