import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";

const extra = [
  ["crunch-polea", "Crunch en polea alta", "abdomen", ["Oblicuos"], "Polea alta con cuerda", "weight_reps", "De rodillas bajo la polea, sujeta la cuerda junto a la cara y lleva los codos hacia los muslos redondeando la espalda. Sube lento.", "Tirar con los brazos o sentarse sobre los talones.", ["crunch-maquina", "crunch"]],
  ["crunch-oblicuo-polea", "Crunch oblicuo en polea", "abdomen", ["Oblicuos"], "Polea alta con cuerda", "weight_reps", "De rodillas bajo la polea, baja girando el tronco hacia una rodilla y alterna el lado en cada repetición.", "Girar solo los hombros sin flexionar el abdomen.", ["crunch-polea", "crunch-oblicuo"]],
  ["elevaciones-colgado", "Elevación de piernas colgado", "abdomen", ["Flexores de cadera"], "Barra fija", "reps", "Cuélgate de la barra con los hombros activos. Sube las piernas hasta la altura de la cadera sin balancearte y baja lento.", "Balancearse o arquear la espalda al bajar.", ["elevaciones-rodillas", "elevaciones-piernas"]],
  ["crunch-declinado", "Crunch en banco declinado", "abdomen", [], "Banco declinado", "reps", "Engancha los pies bajo el rodillo, cruza los brazos en el pecho y sube redondeando la espalda hasta la mitad del recorrido.", "Tirar del cuello con las manos o bajar de golpe.", ["crunch", "crunch-maquina"]],
  ["crunch-inverso-declinado", "Crunch inverso en banco declinado", "abdomen", [], "Banco declinado", "reps", "Sujétate del banco sobre la cabeza y lleva las rodillas hacia el pecho levantando un poco la cadera.", "Usar impulso de las piernas en vez del abdomen.", ["crunch-inverso", "elevaciones-piernas"]],
  ["crunch-inverso", "Crunch inverso", "abdomen", [], "Piso", "reps", "Acostado, con las rodillas dobladas, lleva las rodillas al pecho despegando la pelvis del suelo y baja controlando.", "Balancear las piernas y dejar caer la lumbar.", ["crunch-inverso-declinado", "elevaciones-piernas"]],
  ["rueda-abdominal", "Rueda abdominal", "abdomen", ["Hombros", "Espalda baja"], "Rueda abdominal", "reps", "De rodillas, rueda hacia adelante con el abdomen apretado hasta donde la lumbar no se hunda y vuelve.", "Dejar caer la cadera y arquear la espalda.", ["plancha", "dead-bug"]],
  ["giro-ruso", "Giro ruso", "abdomen", ["Oblicuos"], "Disco o balón", "reps", "Sentado con el tronco inclinado, gira llevando el peso a cada lado de la cadera. Cuenta cada lado como una repetición.", "Mover solo los brazos sin girar el tronco.", ["crunch-oblicuo", "pallof"]],
  ["crunch-oblicuo", "Crunch oblicuo", "abdomen", ["Oblicuos"], "Piso", "reps", "De lado, con las rodillas dobladas, sube el hombro hacia la cadera contrayendo el costado. Haz todas de un lado y cambia.", "Tirar de la cabeza con la mano.", ["giro-ruso", "crunch-oblicuo-polea"]],
  ["plancha-lateral", "Plancha lateral", "abdomen", ["Oblicuos", "Glúteo medio"], "Piso", "time", "Apoya un antebrazo bajo el hombro y los pies juntos. Sube la cadera hasta formar una línea recta y mantén.", "Dejar caer la cadera o girar el pecho hacia el suelo.", ["plancha", "pallof"]],
  ["pallof", "Press Pallof", "abdomen", ["Oblicuos"], "Polea a media altura", "weight_reps", "De lado a la polea, lleva el agarre al pecho y empújalo al frente sin dejar que el cuerpo gire. Vuelve lento.", "Girar el tronco hacia la polea o soltar el abdomen.", ["plancha-lateral", "giro-ruso"]],
  ["dead-bug", "Dead bug", "abdomen", [], "Piso", "reps", "Boca arriba con brazos y rodillas arriba, estira el brazo y la pierna contrarios sin despegar la lumbar del suelo.", "Arquear la espalda al estirar.", ["plancha", "rueda-abdominal"]],
  ["escaladores", "Escaladores", "abdomen", ["Hombros", "Cardio"], "Piso", "time", "En posición de flexión, lleva una rodilla y luego la otra hacia el pecho a ritmo constante.", "Subir la cadera o apoyar el peso atrás.", ["plancha", "elevaciones-rodillas"]],
  ["inclinacion-lateral", "Inclinación lateral con mancuerna", "abdomen", ["Oblicuos"], "Mancuerna", "weight_reps", "De pie con una mancuerna a un lado, inclina el tronco hacia ella y sube contrayendo el lado contrario.", "Girar el tronco o usar dos mancuernas a la vez.", ["crunch-oblicuo", "pallof"]],
  ["crunch-balon", "Crunch en balón suizo", "abdomen", [], "Balón suizo", "reps", "Apoya la espalda baja en el balón y los pies firmes. Sube el pecho contrayendo el abdomen y baja estirando.", "Rebotar sobre el balón.", ["crunch", "crunch-declinado"]],
  ["navaja", "Navaja", "abdomen", ["Flexores de cadera"], "Piso", "reps", "Acostado con brazos estirados atrás, sube a la vez piernas y tronco intentando tocar los pies, y baja lento.", "Hacerlo con impulso y caer de golpe.", ["crunch", "elevaciones-piernas"]],
  ["hiperextensiones", "Hiperextensiones", "espalda", ["Glúteos", "Isquiotibiales"], "Banco romano", "reps", "Apoya la cadera en el banco, baja el tronco con la espalda recta y sube hasta alinear el cuerpo, sin pasarte.", "Subir de más arqueando la lumbar.", ["peso-muerto-rumano", "puente-gluteo"]],
  ["press-banca-mancuernas", "Press banca con mancuernas", "pecho", ["Hombros", "Tríceps"], "Mancuernas y banco plano", "weight_reps", "Acostado en banco plano, baja las mancuernas a los costados del pecho con los codos a 45 grados y empuja.", "Bajar con los codos totalmente abiertos o rebotar.", ["press-banca", "press-pecho-maquina"]],
  ["aperturas-inclinadas", "Aperturas inclinadas con mancuernas", "pecho", ["Hombros"], "Mancuernas y banco inclinado", "weight_reps", "Con el banco a unos 30 grados, abre los brazos con los codos un poco flexionados y ciérralos sobre el pecho alto.", "Doblar de más los codos y convertirlo en un press.", ["aperturas-mancuernas", "cruce-poleas"]],
  ["press-inclinado-maquina", "Press inclinado en máquina", "pecho", ["Hombros", "Tríceps"], "Máquina de press inclinado", "weight_reps", "Ajusta el asiento para que las empuñaduras queden en el pecho alto. Empuja hacia arriba y adelante y vuelve lento.", "Despegar la espalda del respaldo.", ["press-inclinado-mancuernas", "press-inclinado-barra"]],
  ["pullover-mancuerna", "Pullover con mancuerna", "pecho", ["Espalda", "Tríceps"], "Mancuerna y banco plano", "weight_reps", "Acostado, sujeta una mancuerna sobre el pecho con los brazos casi estirados y llévala detrás de la cabeza hasta sentir el estiramiento.", "Doblar mucho los codos o bajar más de lo que el hombro permite.", ["pullover-polea", "aperturas-mancuernas"]],
  ["curl-inclinado", "Curl inclinado con mancuernas", "biceps", ["Antebrazo"], "Mancuernas y banco inclinado", "weight_reps", "Sentado en un banco inclinado, deja los brazos colgando atrás y sube las mancuernas sin adelantar los codos.", "Mover los hombros hacia adelante al subir.", ["curl-mancuernas", "curl-predicador"]],
  ["remo-pecho-apoyado", "Remo con pecho apoyado", "espalda", ["Bíceps", "Hombros"], "Mancuernas y banco inclinado", "weight_reps", "Boca abajo en el banco inclinado, tira de las mancuernas llevando los codos hacia atrás y aprieta las escápulas.", "Despegar el pecho del banco para tirar.", ["remo-mancuerna", "remo-maquina"]],
  ["jalon-agarre-cerrado", "Jalón con agarre cerrado", "espalda", ["Bíceps"], "Polea alta con triángulo", "weight_reps", "Con el triángulo, tira hacia la parte alta del pecho inclinando apenas el tronco y sube estirando los brazos.", "Echarse muy atrás o tirar con los brazos.", ["jalon-pecho", "remo-sentado"]],
  ["triceps-sentado", "Extensión de tríceps sentado", "triceps", [], "Mancuerna y banco", "weight_reps", "Sentado con respaldo, sujeta una mancuerna con ambas manos detrás de la cabeza y extiende los codos hacia arriba.", "Abrir los codos hacia los lados.", ["extension-overhead", "press-frances"]],
  ["extension-polea-overhead", "Extensión sobre la cabeza en polea", "triceps", [], "Polea con cuerda", "weight_reps", "De espaldas a la polea, con la cuerda detrás de la cabeza, extiende los codos hacia adelante y arriba.", "Mover los codos en vez de los antebrazos.", ["extension-overhead", "extension-polea"]],
];

function idFor(slug) {
  const hex = createHash("sha256").update(`forma-exercise:${slug}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

const stamp = "2026-10-27T15:00:00.000Z";
const rows = extra.map(([slug, name, group, secondary, equipment, tracking, instructions, mistakes, alternatives]) => {
  const id = idFor(slug);
  return {
    id,
    user_id: null,
    client_id: id,
    slug,
    name,
    muscle_group: group,
    secondary_muscles: secondary,
    equipment,
    machine_name: null,
    instructions,
    common_mistakes: mistakes,
    alternative_slugs: alternatives,
    tracking_type: tracking,
    created_at: stamp,
    updated_at: stamp,
  };
});

writeFileSync(
  new URL("../src/data/extra-exercises.ts", import.meta.url),
  `import type { Exercise } from "@/lib/types";\n\nexport const EXTRA_EXERCISES: Exercise[] = ${JSON.stringify(rows, null, 2)};\n`,
);
console.log(`${rows.length} ejercicios`);
