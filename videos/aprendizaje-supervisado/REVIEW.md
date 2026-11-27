# Revisión — Aprendizaje supervisado, versión narrada (1:56, 1920x1080, 30 fps)

## Decisiones creativas
- Un solo plano cartesiano fijo que se reconstruye con cada modelo; un mismo «caso nuevo» (una solicitud de crédito) recibe la respuesta de cada clasificador.
- Ejemplo único de lenguaje común: un banco decide si aprueba un crédito. Ejes: ingresos e historial de pagos; azul = no pagó, cobre = pagó. Los datos son ilustrativos.
- Narración: guion de `GUION.md`, voz HeyGen «Rocío – Calm & Trustworthy» (es-MX), una sola toma de 113.7 s con marcas de tiempo por palabra.
- La voz es el reloj: la coreografía original (6.5 s por escena) se mapea por tramos sobre la narración (`ANCHOR_WORDS` en `tools/build.mjs`); cada gráfico aparece cuando la voz lo nombra.
- Todos los números en pantalla salen de cálculos reales (`tools/models.mjs`). Simplificaciones: 3 árboles en el bosque y 3 rondas de boosting.
- Sin música (requiere el catálogo de HeyGen; se puede añadir). Efectos incluidos a bajo volumen bajo la voz.

## Qué se midió y qué solo se miró
- `hyperframes check`: 0 errores.
- Fotogramas de cada escena revisados a ojo.
- La sincronía voz–imagen se calculó con las marcas de tiempo de HeyGen; el audio fue medido, no escuchado.

## Avisos mantenidos
- `contrast_aa_failure`: texto que entra en gris y pasa a tinta (intencional).
- `dead_stretch` 0–3.1 s: la cuadrícula se dibuja mientras la voz abre; el título está en pantalla desde el fotograma 0.

## Plano más débil
- Pantalla de teléfono: los textos no se leen a 360 px; es un video horizontal.
- Pronunciación de los nombres en inglés (Random Forest, Gradient Boosting, Naive Bayes) con voz en español: no verificada de oído.
