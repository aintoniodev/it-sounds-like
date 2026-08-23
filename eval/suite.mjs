// Suite de evaluación: consultas reales en español y matches esperados
// contra el catálogo seed. Los nombres son slugs de fichero (sin .md).
export const suite = [
  { q: "algo triste para llorar un desamor", expected: [
    "2026-08-21-bon-iver-skinny-love",
    "2026-09-07-c-tangana-tu-me-dejaste-de-querer",
    "2026-08-18-silvio-rodriguez-ojala",
  ]},
  { q: "una canción para empezar el día con energía", expected: [
    "2026-09-05-the-weeknd-blinding-lights",
    "2026-08-23-earth-wind-fire-september",
    "2026-08-30-nina-simone-feeling-good",
  ]},
  { q: "música tranquila para concentrarme y estudiar", expected: [
    "2026-08-26-beethoven-sonata-claro-de-luna",
    "2026-08-28-miles-davis-so-what",
    "2026-08-17-john-coltrane-naima",
  ]},
  { q: "algo para correr de noche", expected: [
    "2026-09-05-the-weeknd-blinding-lights",
    "2026-09-03-tame-impala-the-less-i-know-the-better",
  ]},
  { q: "una canción para dedicar a alguien especial", expected: [
    "2026-08-29-cafe-tacvba-eres",
    "2026-08-24-daft-punk-something-about-us",
    "2026-08-16-the-ronettes-be-my-baby",
  ]},
  { q: "flamenco de verdad, con raíz", expected: [
    "2026-09-04-camaron-de-la-isla-como-el-agua",
    "2026-08-20-rosalia-malamente",
  ]},
  { q: "algo hipnótico para la madrugada", expected: [
    "2026-08-31-massive-attack-teardrop",
    "2026-08-22-brian-eno-an-ending-ascent",
  ]},
  { q: "jazz sereno, referencia para mezclar", expected: [
    "2026-08-28-miles-davis-so-what",
    "2026-08-17-john-coltrane-naima",
  ]},
  { q: "alegría pura para una fiesta", expected: [
    "2026-08-23-earth-wind-fire-september",
    "2026-09-01-shakira-ojos-asi",
  ]},
  { q: "algo tipo Coltrane", expected: [
    "2026-08-17-john-coltrane-naima",
  ]},
  { q: "una canción para cuando algo se acaba", expected: [
    "2026-09-02-jorge-drexler-todo-se-transforma",
    "2026-08-18-silvio-rodriguez-ojala",
  ]},
  { q: "renacer, el primer día después de uno muy malo", expected: [
    "2026-08-30-nina-simone-feeling-good",
  ]},
  { q: "un groove pegadizo para cocinar un sábado", expected: [
    "2026-08-19-childish-gambino-redbone",
    "2026-09-03-tame-impala-the-less-i-know-the-better",
    "2026-08-23-earth-wind-fire-september",
  ]},
  { q: "nostalgia de verano y de mar", expected: [
    "2026-08-27-joan-manuel-serrat-mediterraneo",
  ]},
  { q: "algo épico que suba de menos a más", expected: [
    "2026-08-25-queen-bohemian-rhapsody",
  ]},
  { q: "algo para dormirme sin resistencia", expected: [
    "2026-08-22-brian-eno-an-ending-ascent",
    "2026-08-26-beethoven-sonata-claro-de-luna",
  ]},
  { q: "declarar amor sin sonrojar", expected: [
    "2026-08-29-cafe-tacvba-eres",
    "2026-08-24-daft-punk-something-about-us",
  ]},
  { q: "caminar por la ciudad de noche como un protagonista", expected: [
    "2026-08-20-rosalia-malamente",
    "2026-09-05-the-weeknd-blinding-lights",
  ]},
  { q: "algo como Miles Davis", expected: [
    "2026-08-28-miles-davis-so-what",
  ]},
];
