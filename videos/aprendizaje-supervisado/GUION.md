# Guion de narración — Cómo decide una IA (aprendizaje supervisado)

Ejemplo único para todo el video (ilustrativo): un banco usa IA para decidir si aprueba un crédito.
Cada punto es una persona que pidió un crédito antes. Azul = no pagó. Cobre = sí pagó.
El «dato nuevo» es una persona que acaba de pedir un crédito.

Los números se escriben como se leen, para la voz.

---

## Intro
Una inteligencia artificial no adivina: aprende de casos pasados cuya respuesta ya conocemos. Eso es aprendizaje supervisado. Veamos ocho formas en que decide ante un caso nuevo.

## 1. Regresión lineal
La regresión lineal traza la recta que pasa lo más cerca posible de todos los casos. Con ella, la IA predice un número: por ejemplo, cuánto podría pagar alguien al mes según sus ingresos.

## 2. Regresión logística
La regresión logística no da un número, sino una probabilidad: qué tan posible es que esta persona pague. Si supera el cincuenta por ciento, la IA dice que sí. Aquí da ochenta y uno por ciento.

## 3. Árbol de decisión
Ahora cada punto es una persona: en azul, quien no pagó; en cobre, quien sí. El árbol de decisión hace preguntas de sí o no, como un cuestionario, hasta separar los dos grupos. Nuestro caso cae con los que pagan.

## 4. Random Forest
Un solo árbol puede equivocarse. Random Forest entrena varios árboles, cada uno con una parte distinta de los datos, y luego votan, como un jurado. Aquí, dos de tres dicen que pagará.

## 5. Gradient Boosting
Gradient Boosting también usa varios árboles, pero uno tras otro: cada árbol nuevo se fija en los errores del anterior y los corrige. Así, el error total baja paso a paso.

## 6. Máquinas de vectores de soporte
Esta técnica busca la calle más ancha posible entre los dos grupos. Los casos que quedan en el borde son los que la definen. El caso nuevo se clasifica según el lado de la calle en que cae.

## 7. K vecinos más cercanos
Funciona como preguntarles a los vecinos: busca los cinco casos más parecidos al nuevo y mira qué pasó con ellos. Tres pagaron y dos no: gana la mayoría.

## 8. Naive Bayes
Naive Bayes calcula a qué grupo se parece más el caso nuevo, mirando cada dato por separado, como si no tuvieran relación entre sí. Aquí, la probabilidad de que pague es de ochenta y dos por ciento.

## Cierre
Ocho modelos, ocho maneras de decidir. Ninguno adivina: todos aprenden de los datos que les damos. Por eso, una decisión de la IA solo es tan buena como esos datos.
