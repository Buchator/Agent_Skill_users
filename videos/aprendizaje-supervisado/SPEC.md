GOAL:    El espectador entiende, en el plano cartesiano, cómo decide cada uno de los 8 modelos supervisados ante un mismo dato nuevo.
OUTPUT:  HyperFrames, 1920 x 1080, 30 fps
TIME:    intro 3.5 s + 8 escenas x 6.5 s + cierre 3.5 s = 59 s = 1770 frames. Sin música (no hay catálogo sin inicio de sesión en HeyGen); efectos sueltos de la librería incluida.
LOOK:    medio = papel milimetrado técnico (informe de ingeniería).
         fondo #EEF1F4 sólido; cuadrícula #D3DAE2 1 px cada unidad; ejes #16232F 2.5 px.
         tinta #16232F; texto secundario #556677.
         clase A = #2B5D8C (azul acero, círculos r 11 px); clase B = #B8642A (cobre, cuadrados 20 px).
         acento #0F7B6C (verde petróleo): SOLO la decisión final de cada escena (etiqueta y trazo del dato nuevo).
         regiones de decisión: color de la clase al 16 % de opacidad.
         display: Montserrat 700, 56 px, tracking -1 %; cuerpo: Lato 400, 34 px; fórmulas: EB Garamond itálica 40 px.
         sin sombras, sin brillo, sin degradados.
OBJECTS: el plano (mismo lugar y escala 80 px/unidad en todas las escenas: x 150-950, y 140-940);
         los datos etiquetados (círculos azules = A, cuadrados cobre = B);
         el dato nuevo (anillo de tinta con «?»), que en cada escena recibe la respuesta del modelo.
MOTION:  entrada expo.out 0.13-0.6 s; trazos de modelo power2.inOut 0.8-1.4 s; salidas power3.in 0.2 s (blur 8 px).
         nombre: palabra por palabra blur 6->0 en 0.13 s, 0.067 s entre palabras; frase: de gris a tinta palabra por palabra 0.08 s.
SHOTS:   0-3.5 intro: plano se dibuja, título, aparece el dato nuevo «?».
         3.5-10 regresión lineal: recta horizontal gira al ajuste MCO, residuos se acortan, SSE 39.8 -> 4.2; x = 7.2 -> ŷ = 6.22.
         10-16.5 regresión logística: datos en 0/1, sigmoide, umbral 0.5; x = 6.2 -> p = 0.81 -> clase B.
         16.5-23 árbol: corte x1 < 5.65 (Gini 0.50 -> 0.07), corte x2 < 6.6; el dato cae en hoja B.
         23-29.5 random forest: 3 árboles con muestras bootstrap; votos B, A, B -> moda B.
         29.5-36 gradient boosting: 3 rondas sobre residuos, pérdida 6.50 -> 1.82 -> 1.01 -> 0.68; F = 0.84 -> B.
         36-42.5 SVM: la frontera gira hasta el margen máximo; vectores de soporte marcados; f = +0.29 -> B.
         42.5-49 K-NN (K = 5): distancias a todos, círculo con 5 vecinos, 3 B vs 2 A -> B.
         49-55.5 Naive Bayes: elipses alineadas a los ejes (independencia), P(B|x) = 0.82 -> B.
         55.5-59 cierre: una línea, mantenida 3 s.
BANNED:  fondo oscuro con elementos flotando; brillos y partículas; degradados morados/azules; papel crema + serif + etiquetas mono «01/02»;
         todo centrado; todo entrando a la vez; tarjetas en fila; logo en esquina; viñetas; números de diapositiva.
QA:      t = 1, 8, 14, 21, 28, 34, 41, 47, 54, 57.5: cada frame muestra el plano con el mecanismo del modelo y la decisión legible.
