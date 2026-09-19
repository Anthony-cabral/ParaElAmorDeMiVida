// Personaliza aquí el regalo. Este archivo es público: nunca pongas secretos.
export const config = {
  author: 'Tu Amorcito', partner: 'mi amor', title: 'Un pequeño refugio para ti',
  closingDate: '21 de septiembre', closingTitle: 'Continuará…',
  dedication: 'Un cuento, un poquito de calma y muchas historias por compartir.',
  entry: {
    eyebrow: 'ESTE RATITO ES PARA TI', title: 'Hoy no tienes que poder con todo.',
    text: 'Te hice un pequeño lugar para descansar un ratito. No tienes que explicar nada ni encontrar las palabras. Solo ven, si te apetece.',
    button: 'Empezar mi pequeña aventura'
  },
  path: {
    eyebrow: '01 / EL SENDERO', title: 'Un poquito de compañía.',
    text: 'No encontré una frase mágica para hacer que todo se sienta mejor… así que te hice un poquito de compañía.',
    button: 'Caminar un poquito más', hint: 'Estas lucecitas guardan algo para ti. Puedes tocarlas, si quieres.',
    fireflies: ['Puedes ir despacio.', 'No tienes que hablar si hoy no te apetece.', 'Te quiero también en tus días calladitos.']
  },
  lake: {
    eyebrow: '02 / EL LAGO', title: 'Sin preguntas. Sin prisa.',
    text: 'Podemos quedarnos aquí un momento. Sin preguntas. Sin prisa.',
    secondary: 'A veces, estar cerquita también es acompañarse en silencio.',
    button: 'Vamos a un lugar calentito', hint: 'Toca el agua y mira cómo respira.'
  },
  cottage: {
    eyebrow: '03 / LA CASITA', title: 'Aquí hay un lugar para ti.',
    text: 'Si pudiera, ahora mismo te acercaría una mantita y me quedaría contigo.',
    button: '¿Qué historias?', envelope: 'Una carta para ti', open: 'Abrir mi carta'
  },
  letter: [
    '{partner}:',
    'No sé exactamente cómo se siente este día para ti, y no quiero llenarte de preguntas si ahora no tienes ganas de hablar.',
    'Solo quería dejarte algo bonito y recordarte que te quiero. No tienes que estar de buen ánimo ni buscar qué decirme.',
    'Si necesitas espacio, lo respeto. Si te apetece compañía, aquí estoy.',
    'También se me ocurrió algo que me haría mucha ilusión compartir contigo. Sin fechas obligatorias, sin apuros y sin tener que decidirlo hoy.',
    'Unas cuantas noches, algo rico para comer y muchas historias por descubrir.',
    'Con cariño,', '{author}'
  ],
  cinema: {
    eyebrow: '04 / NUESTRO PEQUEÑO CINE', title: '¿Y si vemos juntos todas las películas de Studio Ghibli?',
    text: 'Una por una, a nuestro ritmo. Con mantita, algo rico y un lugarcito a tu lado. Hice esta lista para ir guardando las historias que compartamos.',
    secondary: 'No tenemos que elegir hoy. Este pequeño cine puede esperarnos.',
    button: 'Explorar nuestro catálogo', surprise: 'Primero quiero ver la sorpresa'
  },
  garden: {
    eyebrow: '05 / UN ADELANTO EN AMARILLO', title: 'Antes de que te vayas… te dejé un adelanto.',
    text: 'Hay flores que todavía tienen una fecha para llegar…',
    secondary: 'Y muchas historias que me gustaría vivir contigo.',
    lastLine: 'La próxima página de este cuento viene vestida de amarillo.'
  },
  catalog: { title: 'Nuestras noches Ghibli', subtitle: 'Un montón de mundos por descubrir contigo.', allSeen: 'Ya recorrimos todos estos mundos. Podemos volver a nuestro favorito.' }
};
export const personalize = text => text.replaceAll('{author}',config.author).replaceAll('{partner}',(config.partner || 'mi amor').replace(/^./,c=>c.toUpperCase()));
