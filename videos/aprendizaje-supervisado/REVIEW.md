# Revisión — Aprendizaje supervisado (59 s, 1920x1080, 30 fps)

## Decisiones creativas
- Un solo plano cartesiano fijo (mismo lugar y escala en todas las escenas) que se reconstruye con cada modelo; un mismo «dato nuevo» (x₁ = 5.7, x₂ = 5.4) recibe la respuesta de cada clasificador.
- Regresión lineal y logística usan su propio conjunto 1D (y continua; clase 0/1), porque así se ve su mecanismo (recta MCO; sigmoide + umbral).
- Todos los números en pantalla salen de cálculos reales (`tools/models.mjs`): MCO, logística por descenso de gradiente sobre log-loss, árbol Gini de profundidad 2, bosque de 3 árboles con bootstrap (semilla fija), boosting de 3 tocones sobre residuos (η = 0.6), SVM de margen duro por búsqueda de dirección, K-NN euclidiano (K = 5), Naive Bayes gaussiano.
- Simplificaciones didácticas: el bosque usa 3 árboles y el boosting 3 rondas (en la práctica son cientos); la pérdida del boosting es error cuadrático sobre 0/1.
- Sin música: el catálogo requiere iniciar sesión en HeyGen. Efectos incluidos (licencia Pixabay): whoosh en cada corte y pop en cada decisión.

## Qué se midió y qué solo se miró
- `hyperframes check`: 0 errores. 27 avisos de contraste, todos del texto que entra en gris (#B4BFCA) y pasa a tinta en ~1 s (efecto intencional).
- Contact sheets de cada escena y de los 9 cortes revisados a ojo.
- El sonido fue medido (posición de picos), no escuchado.

## Plano más débil
- Pantalla de teléfono: los textos de 28–36 px no se leen a 360 px de ancho; es un video horizontal pensado para pantalla grande.
- SVM: el dato nuevo queda dentro de la franja del margen; se lee, pero la línea perpendicular es corta.

## Avisos mantenidos
- `contrast_aa_failure` (texto gris inicial que se oscurece): intencional.
