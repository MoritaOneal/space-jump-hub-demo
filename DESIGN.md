# Space Jump Hub — DESIGN.md

> Sistema visual oficial de **Space Jump Hub**.
> Este archivo define cómo debe verse y sentirse la aplicación en todos los cambios futuros.
> Inspirado en principios de interfaces oscuras y precisas de Linear, claridad de interacción de PlayStation, energía deportiva de Nike y disciplina visual de BMW M, pero adaptado a una identidad propia de Space Jump.
>
> **No copiar marcas externas. No redibujar ni reinterpretar el logo original de Space Jump.**

---

## 1. Identidad visual

### Personalidad

Space Jump Hub debe sentirse:

- Deportivo
- Moderno
- Urbano
- Técnico
- Rápido de usar
- Limpio
- Profesional
- Joven, pero no infantil
- Competitivo, pero no agresivo
- Oscuro, pero siempre legible

La interfaz debe transmitir que es una herramienta real de entrenamiento y gestión deportiva, no una demo genérica ni una interfaz “hecha por IA”.

### Principio central

**La información manda.**

La interfaz no debe competir con:
- nombres de jugadores,
- asistencias,
- alertas,
- turnos,
- evaluaciones,
- sesiones de entrenamiento,
- datos importantes del staff.

Los elementos visuales sirven para ordenar y dar velocidad de uso, no para decorar.

---

## 2. Logo y marca

### Logo

El logo oficial de Space Jump:

- siempre se usa desde el archivo original,
- nunca debe ser redibujado,
- nunca debe recrearse con IA,
- nunca debe deformarse,
- nunca debe recortarse de forma que pierda elementos,
- nunca debe cambiar de color arbitrariamente,
- nunca debe llevar efectos que reduzcan su legibilidad.

Ruta actual recomendada:

`/public/logo-spacejump.png`

### Uso

En navegación:
- tamaño compacto,
- suficiente espacio alrededor,
- no competir con el contenido.

En login:
- puede tener mayor protagonismo,
- debe mantenerse centrado,
- fondo limpio y oscuro.

---

## 3. Paleta oficial

### Base

```css
--sj-bg: #070C17;
--sj-bg-deep: #050914;
--sj-sidebar: #07101E;

--sj-surface-1: #101929;
--sj-surface-2: #151F31;
--sj-surface-3: #19253A;

--sj-border: #26344A;
--sj-border-strong: #34465F;

--sj-text: #F4F7FB;
--sj-text-muted: #93A3B8;
--sj-text-subtle: #6F8197;
```

### Marca

```css
--sj-cyan: #18C8FF;
--sj-blue: #1777FF;
--sj-blue-deep: #0E5FD8;
```

El cyan y azul son los únicos colores principales de marca.

No agregar otros colores de marca sin una razón clara.

### Estados

```css
--sj-success: #35DC91;
--sj-warning: #FFCC4A;
--sj-danger: #FF5E6C;
--sj-info: #18C8FF;
```

Regla:
- verde = correcto / presente / completado,
- amarillo = atención / tardanza / revisión,
- rojo = falta / error / riesgo / eliminación,
- cyan = información / navegación / selección.

No usar colores semánticos como decoración.

---

## 4. Fondos y superficies

La app es **dark-first**.

Jerarquía:

1. fondo general,
2. sidebar,
3. panel,
4. panel elevado,
5. elemento seleccionado.

Ejemplo:

```css
body            -> #070C17
sidebar         -> #07101E
panel           -> #101929
card interna    -> #151F31
hover/selected  -> #19253A
```

### Prohibido

- fondos multicolor,
- gradientes arcoíris,
- glassmorphism excesivo,
- glow fuerte,
- neón decorativo,
- sombras grandes en cada componente.

Los gradientes se permiten solo de forma muy controlada en:
- CTA principal,
- avatar sin foto,
- algún detalle de marca.

---

## 5. Tipografía

### Familia

Usar preferentemente:

```css
font-family:
  Inter,
  ui-sans-serif,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

No depender de tipografías propietarias de Nike, BMW, PlayStation, Linear u otras marcas.

### Jerarquía

#### Título de página
- 30–40 px desktop
- 27–32 px móvil
- 700–850
- tracking ligeramente negativo
- blanco

#### Título de panel
- 17–20 px
- 700–800

#### Texto normal
- 14–16 px
- 400–600

#### Texto auxiliar
- 11–13 px
- color muted

#### Eyebrow / etiqueta superior
- 10–12 px
- 800–900
- uppercase
- cyan
- tracking amplio

Ejemplo:

```
PANEL PRINCIPAL
Hola, Luis 👋
Miércoles, 7 de octubre
```

---

## 6. Geometría

### Radios

Space Jump no debe ser completamente cuadrado ni excesivamente redondo.

```css
--radius-xs: 8px;
--radius-sm: 11px;
--radius-md: 14px;
--radius-lg: 20px;
--radius-xl: 24px;
--radius-pill: 999px;
```

Uso recomendado:

- inputs: 10–12 px
- botones: 10–12 px
- tarjetas pequeñas: 12–15 px
- paneles: 18–20 px
- modales: 22–24 px
- badges: pill

### Regla

No usar esquinas redondas de 30–40 px en todo.

---

## 7. Espaciado

Usar una escala consistente:

```
4
8
12
16
20
24
32
40
48
```

Regla:
- componentes internos: 8–16 px,
- tarjetas: 12–20 px,
- paneles: 16–24 px,
- separación de secciones: 24–40 px.

No llenar páginas de aire innecesario: es una herramienta operativa.

---

## 8. Navegación

### Desktop

Sidebar fija a la izquierda.

Debe incluir:
- logo,
- Inicio,
- Alumnos,
- Asistencia,
- Entrenamientos,
- Alertas,
- Reportes,
- Configuración.

Características:
- navegación compacta,
- icono + texto,
- selección con fondo sutil cyan/azul,
- no usar botones enormes.

### Móvil

Bottom navigation fija.

Priorizar:
- Inicio,
- Alumnos,
- Asistencia,
- Entrenamientos,
- Alertas.

Configuración y módulos secundarios pueden quedar dentro de un menú o sección menos prioritaria.

### Touch targets

Todo elemento táctil importante:
- mínimo 44 px de alto recomendado.

---

## 9. Botones

### Principal

Usar para una acción importante por zona:

```
Tomar asistencia
Guardar ficha
Guardar asistencia
Nuevo alumno
```

Estilo:
- cyan/azul,
- texto oscuro o blanco según contraste,
- fuerte,
- limpio,
- sin glow exagerado.

### Secundario

- fondo surface-2,
- borde fino,
- texto blanco.

### Destructivo

- rojo solo cuando sea realmente destructivo,
- nunca usar rojo para una acción normal.

### Regla

Una pantalla no debe tener cinco CTA principales compitiendo entre sí.

---

## 10. Tarjetas y paneles

### Panel

```css
background: #101929;
border: 1px solid #26344A;
border-radius: 20px;
```

Sombras:
- muy suaves,
- solo para separación,
- no hacer “tarjetas flotantes” exageradas.

### Stat cards

Para:
- alumnos activos,
- asistencia mensual,
- alertas,
- en prueba,
- métricas.

Deben:
- ser fáciles de escanear,
- mostrar un número grande,
- tener etiqueta pequeña,
- evitar gráficos innecesarios.

---

## 11. Tablas y listas

Space Jump tiene mucha información operacional.

Reglas:
- desktop: tablas compactas,
- móvil: convertir filas en tarjetas,
- no forzar scroll horizontal si puede evitarse,
- la primera columna debe identificar claramente al jugador,
- estados siempre visibles,
- acciones secundarias no deben dominar.

### Datos de jugador

Orden visual recomendado:
1. foto / iniciales,
2. nombre completo,
3. edad/categoría,
4. turno,
5. nivel,
6. estado.

---

## 12. Asistencia

Este es uno de los módulos más importantes.

Prioridades:
- velocidad,
- claridad,
- evitar errores.

Cada jugador debe tener botones claros:
- Presente,
- Tardanza,
- Falta,
- Justificado.

Colores:
- Presente → verde,
- Tardanza → cyan/amarillo suave,
- Justificado → amarillo,
- Falta → rojo.

### Reglas UX

- nunca asumir “Presente” si no fue marcado,
- avisar cuántos alumnos faltan por marcar,
- conservar fecha y turno al guardar,
- evitar recargar toda la app,
- confirmar guardado sin bloquear el flujo.

---

## 13. Ficha del jugador

Debe sentirse como una ficha deportiva profesional.

Cabecera:
- foto,
- nombre,
- categoría,
- turno,
- nivel,
- estado.

Después:
- edad,
- asistencia,
- fecha de ingreso,
- contacto,
- observaciones,
- historial,
- evaluaciones futuras.

No mostrar datos sensibles de forma innecesariamente grande.

---

## 14. Entrenamientos

El módulo de entrenamientos debe tener una estética más deportiva que administrativa, pero seguir el mismo sistema.

Jerarquía:
1. Sesión de hoy
2. Turno
3. Categoría
4. Objetivo
5. Bloques / tareas
6. Duración
7. Observaciones

### Tarjeta de sesión

Debe mostrar:
- U categoría,
- número de sesión,
- fecha,
- bloque,
- tema,
- CTA “Abrir ficha”.

No llenar las tarjetas con descripciones largas.

---

## 15. Evaluaciones futuras

Cuando se agreguen evaluaciones:

### Semáforo

- verde = consolidado,
- amarillo = en desarrollo,
- rojo = necesita atención.

No usar color como único indicador:
- acompañar con texto o icono.

Ejemplo:

```
Finalización con contacto
● En desarrollo
```

---

## 16. Alertas

Las alertas deben ser útiles, no alarmistas.

Ejemplos:
- 3 faltas consecutivas,
- cumpleaños,
- posible cambio de turno por edad,
- alumno en prueba,
- datos incompletos.

Rojo solo para:
- faltas críticas,
- error,
- eliminación,
- atención inmediata.

El resto usa amarillo o cyan.

---

## 17. Formularios

### Inputs

- fondo oscuro,
- borde discreto,
- foco cyan,
- label siempre visible,
- placeholder secundario.

### Formularios largos

Dividir por bloques:
- datos personales,
- contacto,
- datos deportivos,
- observaciones.

No crear formularios de 30 campos sin organización.

### Validaciones

Mensajes:
- claros,
- humanos,
- cortos.

Evitar mensajes técnicos de Supabase al usuario final cuando puedan traducirse.

---

## 18. Modales

Usar modal solo cuando:
- editar ficha,
- crear alumno,
- abrir una acción puntual.

No usar modal para una pantalla completa compleja si puede ser una vista normal.

En móvil:
- modal casi full screen,
- botón cerrar visible,
- acciones accesibles al pulgar.

---

## 19. Responsive

### Breakpoints de referencia

```
Desktop grande: > 1200
Desktop/tablet: 900–1200
Tablet: 720–900
Móvil: < 720
```

### Móvil primero

La academia se usará muchas veces desde cancha.

Priorizar:
- botones grandes,
- scroll simple,
- una columna,
- lectura rápida,
- acciones principales siempre accesibles.

En móvil evitar:
- tablas horizontales,
- textos pequeños,
- hover como única interacción.

---

## 20. Movimiento

Animaciones:
- cortas,
- discretas,
- funcionales.

Permitido:
- 120–220 ms,
- hover leve,
- aparición suave,
- progreso de carga.

No usar:
- partículas,
- rebotes,
- parallax,
- animaciones de entrada largas,
- transiciones “gaming”.

---

## 21. Iconografía

Usar iconos simples y consistentes.

Evitar:
- emojis como iconos principales permanentes,
- mezclar 3 estilos de iconos,
- iconos demasiado detallados.

Los emojis pueden aparecer en copy humano puntual, por ejemplo:
`Hola, Luis 👋`

---

## 22. Accesibilidad

Obligatorio:
- contraste suficiente,
- estados no definidos solo por color,
- labels visibles,
- focus states,
- botones con área táctil suficiente,
- texto legible en móvil,
- navegación usable sin hover.

---

## 23. Privacidad visual

La app contiene datos de menores.

Por diseño:
- evitar mostrar teléfonos en dashboards generales,
- contactos solo dentro de ficha o vista autorizada,
- no poner información sensible en notificaciones visibles públicamente,
- fotos no deben aparecer en superficies donde no aportan valor.

---

## 24. Do

- Mantener identidad Space Jump.
- Priorizar velocidad de uso.
- Mantener fondos oscuros consistentes.
- Usar cyan/azul con intención.
- Usar tipografía fuerte en títulos.
- Mantener paneles compactos.
- Diseñar primero para cancha/celular.
- Conservar coherencia entre módulos.
- Usar estados semánticos.
- Mantener el logo original.

---

## 25. Don't

- No copiar literalmente Nike, BMW, PlayStation, Linear u otra marca.
- No introducir colores aleatorios.
- No cambiar el logo.
- No crear UI “cyberpunk”.
- No abusar de glassmorphism.
- No usar sombras pesadas.
- No usar gradientes en cada tarjeta.
- No convertir todo en pills.
- No poner animaciones innecesarias.
- No esconder acciones críticas.
- No sacrificar legibilidad por estética.
- No introducir patrones visuales nuevos sin integrarlos al sistema.

---

## 26. Regla para agentes de IA

Cuando un agente modifique Space Jump Hub:

1. Leer este `DESIGN.md` antes de cambiar UI.
2. Mantener los tokens y principios existentes.
3. Reutilizar componentes antes de inventar nuevos.
4. No modificar el logo.
5. No cambiar la paleta principal sin aprobación explícita.
6. No alterar flujos críticos de asistencia por razones estéticas.
7. Priorizar móvil y uso en cancha.
8. Probar que el nuevo módulo se sienta parte de la misma app.
9. Mantener accesibilidad y contraste.
10. Si una idea visual contradice estas reglas, prevalece este archivo.

---

## 27. Prompt de referencia

Para cualquier agente de diseño o código:

> Diseña esta pantalla como parte de Space Jump Hub. Sigue DESIGN.md. Usa una interfaz dark-first, deportiva, urbana y profesional. Mantén el logo original, fondo navy/negro, superficies oscuras, cyan y azul como acentos principales, bordes finos y jerarquía clara. Prioriza uso rápido desde celular durante un entrenamiento. Evita efectos decorativos, gradientes excesivos, glassmorphism y apariencia genérica de IA. La información y la velocidad operativa son más importantes que la decoración.

---

## 28. Norte visual

Space Jump Hub debe sentirse como:

**“Una herramienta de alto rendimiento para entrenadores de baloncesto.”**

No como:
- una plantilla SaaS genérica,
- un videojuego,
- una página promocional,
- un panel empresarial aburrido.

La meta es combinar:

**precisión + deporte + velocidad + identidad Space Jump.**
