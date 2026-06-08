# AEVIUM - Especificacion completa del proyecto

Fecha de definicion inicial: 2026-05-08  
Idioma base: Espanol latinoamericano  
Nombre del producto: AEVIUM  
Ubicacion del proyecto local: `D:\Open Codex\ai-writing-assistant`

---

## 1. Vision general

AEVIUM sera una aplicacion web de asistencia de escritura impulsada por IA, pensada principalmente para escritores de ficcion, novelas, sagas, articulos u otros textos largos.

El caso de uso inicial es ayudar a terminar un libro de ficcion ya empezado, manteniendo continuidad, coherencia, tono, estilo narrativo, personajes, cronologia, heridas, secretos, reglas del mundo y desarrollo de capitulos.

La idea central no es crear un chatbot generico, sino una mesa de escritura inteligente con memoria narrativa.

AEVIUM debe ayudar al usuario a:

- Continuar capitulos sin perder el hilo.
- Reescribir escenas o fragmentos.
- Detectar contradicciones.
- Mantener consistencia de personajes, heridas, lugares, edades y eventos.
- Recordar reglas del mundo.
- Mantener tono narrativo y guia de estilo.
- Importar manuscritos existentes.
- Dividir textos largos en capitulos y escenas.
- Trabajar por escenas, pero revisar por capitulos.
- Usar diferentes proveedores de IA segun preferencia del usuario.

---

## 2. Aclaracion sobre referencias de estilo

El usuario puede mencionar autores, libros o referencias conocidas para explicar lo que busca cuando no tiene vocabulario tecnico literario.

Ejemplo:

> "Quiero algo como George R. R. Martin porque me gusta su forma de narrar, sus detalles sensoriales, el tono, la intensidad y la forma de manejar personajes."

AEVIUM no debe prometer copiar o imitar exactamente a autores vivos. En su lugar, debe convertir esas referencias en rasgos tecnicos editables, por ejemplo:

- Fantasia politica oscura.
- Narracion coral.
- Multiples puntos de vista.
- Consecuencias duras.
- Tension moral.
- Detalle sensorial.
- Ritmo de revelacion lento.
- Conflictos familiares o de poder.
- POV limitado.
- Dialogos con subtexto.
- Violencia con consecuencias.
- Mundo historico o pseudomedieval.

La app debe permitir que el usuario construya una guia de estilo propia a partir de esas referencias, sin copiar la voz exacta de un autor.

---

## 3. Objetivo del MVP

El MVP debe enfocarse en funcionar bien en local antes de pensar en SaaS.

El SaaS queda para una etapa posterior. Sin embargo, la arquitectura debe ser razonablemente preparada para crecer en esa direccion sin tener que rehacer todo.

El MVP debe incluir:

- Login y signup.
- Dashboard de proyectos.
- Soporte para multiples proyectos.
- Soporte para proyectos con uno o varios libros.
- Estructura de capitulos y escenas.
- Editor principal escena por escena.
- Vista de revision por capitulo.
- Panel lateral de IA.
- Memoria narrativa basica.
- Deteccion basica de contradicciones.
- Importacion inicial de documentos.
- Configuracion de proveedor IA.
- Soporte inicial para Gemini mediante API key cifrada.
- Arquitectura multi-IA preparada desde el inicio.
- Interfaz bilingue Espanol/Ingles.
- Modo claro y modo oscuro.

---

## 4. Nombre del producto

Nombre elegido: **AEVIUM**

Razon conceptual:

- Hace referencia al tiempo, las eras, el pasado y el futuro.
- Tiene fuerza y presencia.
- Funciona bien como nombre internacional.
- Encaja con una app de memoria narrativa, cronologia y escritura de sagas.
- Sugiere archivo vivo, continuidad, historia y destino.

Otros nombres considerados pero descartados:

- Luminaria
- Manuscrito Vivo
- Tinta Arcana
- Narrava
- Auctor
- Scriptorium AI
- Memoria de Tinta
- Forja Narrativa
- TintaLarga
- SagaMind
- Plotoria
- Continuum Writer
- Escriba
- Voz de Tinta
- Lorekeeper
- Eonforge
- Chronoscribe
- Aion
- SagaForge
- Umbral

---

## 5. Stack tecnico elegido

Stack definitivo para el MVP:

- Framework: Next.js
- Lenguaje: TypeScript
- Hosting futuro: Vercel
- Base de datos: Supabase Postgres
- Autenticacion: Supabase Auth
- Vector database: Supabase `pgvector`
- Editor avanzado: TipTap o Lexical
- Estilos: Tailwind CSS o sistema equivalente segun plantilla inicial
- Proveedor IA inicial: Gemini
- Arquitectura IA: multi-proveedor desde el inicio
- Importacion/exportacion: soporte progresivo para DOCX, TXT, Markdown, PDF y despues PDF/Word mejorado

Notas:

- Supabase Auth se usa para que los usuarios se registren dentro de la app. No significa que el usuario tenga que crear una cuenta en Supabase.
- Supabase maneja email, password, verificacion de correo y login con Google.
- `pgvector` permite guardar embeddings para busqueda semantica y memoria narrativa.
- Vercel sera el destino inicial de deploy cuando la app local funcione.

---

## 6. Estado sobre OAuth de modelos IA

El usuario aclaro que cuando hablaba de OAuth no se referia al login del usuario, sino a conectar su cuenta de Gemini Pro o cuentas de otros modelos para aprovechar beneficios existentes.

Consideracion importante:

- Tener Gemini Pro como suscripcion en la app web de Gemini no necesariamente equivale a acceso API ilimitado para una aplicacion externa.
- Para que AEVIUM use modelos desde codigo normalmente se necesita una API key, una cuenta de Google AI Studio, Google Cloud/Vertex AI, billing, o una integracion OAuth mas compleja.

Decision para MVP:

- Dejar la arquitectura preparada para multi-IA.
- Implementar primero API keys cifradas.
- Explorar OAuth de proveedores IA como fase posterior.
- Evitar bloquear el MVP por OAuth de Gemini, porque puede requerir Google Cloud, consent screen, scopes, refresh tokens y posiblemente billing.

Proveedores IA a contemplar:

- Gemini
- OpenAI
- Anthropic
- OpenRouter
- Ollama/local en el futuro
- Otros proveedores mediante adaptadores

---

## 7. Seguridad de credenciales IA

Los usuarios podran introducir sus propias API keys para correr modelos.

Requisitos de seguridad:

- Las claves nunca deben exponerse al frontend.
- Las llamadas a proveedores IA deben hacerse desde servidor.
- Las claves deben guardarse cifradas.
- Debe existir una `ENCRYPTION_KEY` en variables de entorno.
- No guardar claves en logs.
- No imprimir prompts sensibles ni claves en consola.
- Usar RLS de Supabase para aislar datos por usuario.
- Cada usuario solo debe acceder a sus propios proyectos, libros, capitulos, escenas y credenciales.
- En Next.js, las variables privadas no deben empezar con `NEXT_PUBLIC_`.

Modelo recomendado:

- Tabla `user_ai_credentials`.
- Campos: `id`, `user_id`, `provider`, `encrypted_api_key`, `created_at`, `updated_at`, `is_default`.
- Cifrado y descifrado solo en funciones server-side.

---

## 8. Concepto de usuario y autenticacion

La app debe tener:

- Pagina de login.
- Pagina de signup.
- Registro con email y password.
- Validacion de correo electronico.
- Login con Google.
- Recuperacion de contrasena en el futuro.

Importante:

- El usuario no se registra en Supabase directamente.
- El usuario se registra en AEVIUM.
- Supabase funciona como infraestructura de autenticacion.

---

## 9. Jerarquia de contenido

AEVIUM debe manejar varios niveles:

```text
Usuario
  > Proyecto
    > Libro
      > Capitulo
        > Escena
```

### Usuario

Persona que inicia sesion en la app.

### Proyecto

Espacio narrativo grande.

Puede representar:

- Una novela individual.
- Una saga.
- Una coleccion de articulos.
- Un universo narrativo.
- Un proyecto de no ficcion.

Ejemplo:

```text
Proyecto: Saga del Reino Fragmentado
```

### Libro

Una obra especifica dentro de un proyecto.

Ejemplo:

```text
Libro 1: El Juramento de Ceniza
Libro 2: La Sangre del Invierno
Libro 3: El Trono Vacio
```

### Capitulo

Unidad narrativa que el lector percibe como capitulo.

Ejemplo:

```text
Capitulo 7: La puerta bajo la nieve
```

### Escena

Unidad de trabajo para escribir con IA.

Ejemplo:

```text
Escena 1: Llegada al pueblo
Escena 2: Discusion con la hermana
Escena 3: Hallazgo de la marca
```

Decision importante:

- Siempre se deben manejar capitulos.
- Internamente los capitulos se dividen en escenas.
- La escritura se hace por escena.
- La revision de fluidez se hace por capitulo.

---

## 10. Manejo de multiples proyectos

Al iniciar sesion, el usuario no entra directamente al editor.

Primero ve un dashboard de proyectos.

Ejemplo:

```text
AEVIUM
Tus proyectos

[Crear nuevo proyecto]

La Corona Rota        Novela     18 capitulos     Ultima edicion: hoy
Cenizas del Norte     Saga       4 libros         Ultima edicion: ayer
Ensayos Personales    Articulos  12 textos        Ultima edicion: abril
```

Cada proyecto debe mostrar:

- Nombre.
- Tipo: novela, saga, articulos, otro.
- Cantidad de libros o capitulos.
- Fecha de ultima edicion.
- Estado general.
- Idioma principal.
- Proveedor IA configurado.

Dentro de un proyecto:

```text
Proyecto
- Informacion general
- Libros / volumenes
- Capitulos
- Escenas
- Personajes
- Lugares
- Cronologia
- Reglas del mundo
- Estilo narrativo
- Memoria IA
```

Ventaja de esta estructura:

- Un usuario puede tener varios libros sin mezclar memorias.
- Una saga puede compartir mundo, personajes y cronologia global.
- Cada libro puede tener su propia estructura y estado.
- La IA puede distinguir entre memoria global del proyecto y memoria especifica del libro/capitulo/escena.

---

## 11. Flujo general de navegacion

Flujo principal:

```text
Login / Signup
  > Dashboard de proyectos
    > Proyecto
      > Libro
        > Capitulo
          > Escena / Editor
```

Pantallas MVP:

1. Login
2. Signup
3. Dashboard de proyectos
4. Crear proyecto
5. Vista de proyecto
6. Vista de libro
7. Editor de capitulo/escena
8. Importacion de documento
9. Configuracion de IA
10. Configuracion de idioma/tema

---

## 12. Interfaz principal tipo Scrivener

Se eligio una interfaz inspirada en Scrivener, no una interfaz tipo Google Docs pura.

Razon:

- Scrivener es mejor para escribir libros largos.
- Permite organizar capitulos, escenas, notas, personajes y material de apoyo.
- Encaja mejor con memoria narrativa y continuidad.
- Un editor tipo documento unico se vuelve dificil para IA y para cronologia.

Layout principal:

```text
---------------------------------------------------------
| Barra superior: proyecto, buscador, idioma, IA, estado |
---------------------------------------------------------
| Panel izquierdo | Editor central | Panel derecho IA    |
| Estructura      | Escena actual  | Memoria/continuidad |
---------------------------------------------------------
| Barra inferior: palabras, capitulo, version, alertas   |
---------------------------------------------------------
```

---

## 13. Panel izquierdo

El panel izquierdo es la estructura del proyecto.

Debe permitir navegar por:

- Proyectos
- Libros
- Partes
- Capitulos
- Escenas
- POV/personaje narrador
- Estado de cada escena
- Importar documento
- Exportar

Estados posibles:

- Borrador
- En revision
- Listo
- Bloqueado
- Necesita continuidad
- Necesita reescritura

Debe permitir:

- Crear libro.
- Crear capitulo.
- Crear escena.
- Reordenar escenas.
- Duplicar escena.
- Renombrar.
- Ver conteo de palabras.
- Ver alertas por escena.

---

## 14. Editor central

El editor central es donde se escribe.

Decision:

- Trabajar escena por escena.
- Permitir vista de capitulo completo para revision.

El editor debe incluir:

- Titulo de escena.
- Titulo de capitulo.
- Selector de POV.
- Ubicacion.
- Fecha o posicion cronologica.
- Estado temporal.
- Area de escritura limpia.
- Comentarios/instrucciones sobre fragmentos.
- Seleccion de texto para reescribir.
- Historial de versiones.
- Comparacion original vs propuesta IA.
- Botones aceptar/rechazar cambios.
- Conteo de palabras.
- Guardado automatico.

Modo de escritura recomendado:

- Generar escenas o bloques de 800 a 1.500 palabras.
- Capitulo promedio de 3.000 a 4.500 palabras.
- Un capitulo puede tener 3 a 5 escenas.

Decision del flujo:

- Escritura por escena.
- Revision por capitulo.
- Exportacion por libro.

---

## 15. Panel derecho

El panel derecho sera fijo y colapsable.

Razon:

- No interrumpe la escritura.
- Siempre esta disponible.
- Puede cambiar de modo segun el contexto.
- Si el usuario selecciona texto, muestra acciones sobre seleccion.

Pestanas del panel derecho:

- IA
- Continuidad
- Memoria
- Cronologia
- Estilo
- Notas

### Pestana IA

Acciones:

- Continuar escena
- Reescribir seleccion
- Expandir descripcion
- Aumentar tension
- Mejorar dialogo
- Reducir exposicion
- Corregir incoherencia
- Detectar repeticiones
- Resumir escena
- Actualizar memoria
- Generar siguiente bloque
- Proponer alternativas

Tambien debe haber una caja libre:

```text
Dile a AEVIUM que quieres cambiar...
```

### Pestana Continuidad

Muestra:

- Contradicciones detectadas.
- Riesgos de coherencia.
- Alertas de heridas, ubicaciones, secretos, edades.
- Recomendaciones antes de aplicar cambios.

### Pestana Memoria

Muestra y permite editar:

- Personajes.
- Lugares.
- Reglas del mundo.
- Facciones.
- Objetos importantes.
- Heridas.
- Secretos.
- Relaciones.
- Promesas narrativas.

### Pestana Cronologia

Muestra:

- Eventos.
- Fechas.
- Edades.
- Viajes.
- Cambios de ubicacion.
- Heridas y recuperaciones.
- Orden de acciones por personaje.

### Pestana Estilo

Muestra:

- Guia de tono.
- Tipo de narrador.
- Nivel de detalle sensorial.
- Ritmo.
- Palabras frecuentes.
- Palabras prohibidas.
- Frases repetidas.
- Reglas de voz por POV.

### Pestana Notas

Para ideas sueltas:

- Ideas de escenas.
- Dialogos pendientes.
- Giros posibles.
- Preguntas del autor.
- Inspiraciones.

---

## 16. Manejo de memoria

La memoria debe ser mixta:

- Automatica.
- Manual.

### Memoria automatica

Despues de cada escena, AEVIUM debe extraer:

- Eventos nuevos.
- Cambios de ubicacion.
- Heridas.
- Objetos importantes.
- Secretos revelados.
- Cambios de relacion.
- Nuevas motivaciones.
- Muertes.
- Promesas narrativas.
- Misterios abiertos.
- Fechas.
- Edades.
- Reglas del mundo.
- Informacion que un personaje sabe o no sabe.

Pero no debe guardar todo sin control.

Flujo recomendado:

```text
AEVIUM detecto estos cambios:

1. Marcus tiene fractura en el brazo derecho.
2. Elena descubrio que su hermano mintio.
3. La ciudad de Velkar fue incendiada.

[Guardar] [Editar] [Descartar]
```

Esto evita contaminar la memoria con inferencias incorrectas.

### Memoria manual

El usuario puede crear o editar:

- Personajes.
- Descripciones fisicas.
- Personalidad.
- Motivaciones.
- Relaciones.
- Heridas.
- Lugares.
- Reglas del mundo.
- Cronologia.
- Secretos.
- Estilo.

### Memoria silenciosa

La memoria no debe estar siempre visible para no abrumar.

Niveles:

1. Memoria silenciosa: AEVIUM la usa por detras.
2. Alertas: aparecen cuando hay riesgo real.
3. Panel de memoria: visible cuando el usuario lo abre.

---

## 17. Vector database y memoria semantica

La base vectorial se usara para que AEVIUM pueda encontrar fragmentos relevantes de manuscritos anteriores sin tener que cargar todo el libro en el prompt.

Concepto:

- Cada escena, resumen, personaje, evento o regla se convierte en embedding.
- Ese embedding se guarda en Supabase `pgvector`.
- Cuando el usuario pide continuar una escena, AEVIUM busca recuerdos relacionados.
- El sistema arma un paquete de contexto con lo mas relevante.

Ejemplo:

El usuario pide:

> "Escribe una escena donde Marcus se enfrente a su padre."

AEVIUM busca:

- Escenas anteriores con Marcus.
- Relacion Marcus-padre.
- Heridas actuales.
- Secretos entre ambos.
- Tono del libro.
- Eventos recientes.
- Lugar actual.

Luego genera texto con contexto filtrado.

Tablas posibles:

- `memory_items`
- `memory_embeddings`
- `scene_embeddings`
- `character_embeddings`

---

## 18. Deteccion de contradicciones

AEVIUM debe detectar contradicciones antes o despues de generar texto.

Ejemplo:

Instruccion del usuario:

```text
Que Marcus golpee la puerta con el brazo derecho.
```

Alerta:

```text
Posible contradiccion:
En el capitulo 5, escena 2, Marcus sufrio una fractura en el brazo derecho y aun no se ha registrado recuperacion.

Opciones:
[Cambiar al brazo izquierdo]
[Escribirlo mostrando dolor/consecuencia]
[Ignorar contradiccion]
[Actualizar memoria]
```

Tipos de contradicciones:

- Heridas incompatibles con acciones.
- Ubicaciones imposibles.
- Edades incorrectas.
- Secretos conocidos por personajes equivocados.
- Objetos que aparecen sin explicacion.
- Personajes que actuan contra motivaciones establecidas.
- Eventos fuera de orden cronologico.
- Cambios de nombre.
- Repeticion excesiva de frases.
- Tono inconsistente.

Comportamiento deseado:

- No interrumpir por detalles menores.
- Alertar claramente en contradicciones importantes.
- Permitir que el usuario decida.

---

## 19. Importacion de documentos

AEVIUM debe permitir importar:

- Word / DOCX
- TXT
- Markdown
- PDF

Prioridad:

1. DOCX
2. TXT
3. Markdown
4. PDF

Nota sobre PDF:

- Puede ser mas imperfecto porque los PDF suelen romper parrafos, titulos y saltos de linea.

Flujo de importacion:

1. Usuario sube documento.
2. AEVIUM extrae texto.
3. Detecta capitulos.
4. Divide en capitulos.
5. Propone division en escenas.
6. Genera resumen por capitulo.
7. Extrae personajes, lugares, eventos y cronologia.
8. Muestra memoria detectada para confirmar.
9. Guarda estructura.

Si el usuario sube un unico documento con todos los capitulos juntos, AEVIUM debe intentar dividirlo por capitulos automaticamente.

Debe permitir correccion manual si la division falla.

---

## 20. Escritura con IA

El usuario quiere trabajar parecido a su metodo actual:

- Capitulo dividido en 3 partes.
- Cada parte de unas 1.500 palabras.
- Capitulos promedio de 3.500 palabras.
- El usuario revisa, ajusta, pide cambios y reescrituras.

Recomendacion AEVIUM:

- Manejar cada parte como una escena o bloque.
- Generar 800 a 1.500 palabras por bloque.
- Mantener control de desarrollo.
- Evitar generaciones demasiado largas que pierdan coherencia.
- Usar revision de continuidad despues de cada bloque.

Flujo recomendado:

1. Usuario define objetivo de escena.
2. AEVIUM arma contexto.
3. AEVIUM propone mini plan.
4. Usuario aprueba o modifica.
5. AEVIUM escribe escena.
6. AEVIUM revisa continuidad.
7. Usuario acepta, edita o pide cambios.
8. AEVIUM actualiza memoria con confirmacion.

---

## 21. Cambios sobre texto ya escrito

No se debe regenerar todo el capitulo cada vez.

Debe haber tres modos:

### 1. Editar seleccion

El usuario selecciona un fragmento y pide:

- Hazlo mas tenso.
- Agrega detalle sensorial.
- Quita repeticion.
- Manteniendo significado, cambia el tono.
- Haz el dialogo mas natural.
- Reduce exposicion.

AEVIUM propone reemplazo.

### 2. Comentarios en margen

El usuario marca una parte y deja una instruccion.

Ejemplo:

```text
Aqui falta intensidad. Ella deberia sonar mas dolida, pero sin decirlo directamente.
```

AEVIUM propone una version.

### 3. Reescritura de escena completa

Solo cuando la escena completa esta mal:

- Mal ritmo.
- Falta coherencia.
- Mal tono.
- Exceso de exposicion.
- Dialogo debil.
- Escena sin tension.

AEVIUM debe guardar versiones:

- Original.
- Propuesta IA.
- Version aceptada.

Debe permitir comparar y volver atras.

---

## 22. Guia de estilo

Cada proyecto debe tener una guia de estilo.

Campos posibles:

- Idioma principal.
- Variante regional: espanol latinoamericano, ingles, etc.
- Narrador: primera persona, tercera limitada, tercera omnisciente.
- Tiempo verbal: pasado, presente.
- POV: unico o multiple.
- Nivel de detalle sensorial.
- Nivel de violencia.
- Nivel de introspeccion.
- Ritmo: lento, medio, rapido.
- Tono: oscuro, epico, intimo, politico, poetico, seco, etc.
- Palabras frecuentes a evitar.
- Frases prohibidas.
- Reglas de dialogo.
- Reglas por personaje POV.

Caso inicial del usuario:

- El libro esta en espanol.
- La interfaz debe estar en espanol latinoamericano.
- Tambien debe soportar ingles.
- El usuario narra en primera persona.
- Intercala personajes y mundos.
- Hay varios personajes que muestran la historia.
- El estilo debe poder ser configurado por cada usuario/proyecto.

---

## 23. POV y narracion

La app debe permitir:

- Varios personajes narradores.
- Definir voz por personaje.
- Definir conocimientos de cada personaje.
- Evitar que un personaje sepa algo que no deberia saber.
- Marcar capitulo/escena por POV.
- Intercalar mundos, personajes o lineas narrativas.

Ejemplo de metadata de escena:

```text
Capitulo: 8
Escena: 2
POV: Elena
Ubicacion: Fortaleza de Veyra
Fecha interna: Dia 42
Objetivo: Elena descubre una traicion parcial, pero no la verdad completa.
```

---

## 24. Cronologia

La cronologia es una de las partes mas importantes.

Debe recordar:

- Edades.
- Fechas.
- Ubicaciones.
- Acciones.
- Viajes.
- Heridas.
- Recuperaciones.
- Muertes.
- Distancias.
- Orden de eventos.
- Que personaje sabe que informacion en que momento.

Caso de contradiccion:

- Un personaje tiene el brazo roto, pero el texto lo muestra golpeando con ese brazo sin dolor.

AEVIUM debe detectar y advertir.

---

## 25. Idiomas

La app debe ser bilingue desde el inicio:

- Espanol latinoamericano.
- Ingles.

Recomendacion:

- Usar sistema de i18n desde el comienzo.
- No hardcodear textos directamente.
- Estructura de traducciones:

```text
locales/es/common.json
locales/en/common.json
```

Idioma de interfaz y idioma del proyecto pueden ser distintos.

Ejemplo:

- Interfaz en espanol.
- Libro escrito en ingles.

---

## 26. Estetica visual

El usuario quiere:

- Modo claro y oscuro.
- Mezcla entre profesional y literario.
- Interfaz de densidad media.
- Solo informacion necesaria.
- Colores base propuestos por el usuario:
  - `#A935EB`
  - `#87DB20`
  - `#FFFFFF`
  - `#000000`

Interpretacion:

- `#A935EB`: violeta intenso.
- `#87DB20`: verde acido.
- `#FFFFFF`: blanco.
- `#000000`: negro.

Estos colores son fuertes y memorables, pero pueden sentirse demasiado neon si se usan en exceso.

Decision recomendada:

- Usarlos como identidad/acento.
- No llenar toda la interfaz con ellos.
- Crear bases mas comodas para lectura y escritura.

### Paleta oscura recomendada

- Fondo principal: `#08080A`
- Paneles: `#111116`
- Panel secundario: `#17171E`
- Texto principal: `#FFFFFF`
- Texto secundario: `#B8B8C0`
- Texto apagado: `#777782`
- Borde: `#2A2A32`
- Acento violeta: `#A935EB`
- Acento verde: `#87DB20`
- Error: `#FF4D6D`
- Advertencia: `#F7B955`

### Paleta clara recomendada

- Fondo principal: `#FFFFFF`
- Paneles: `#F5F5F7`
- Panel secundario: `#ECECF1`
- Texto principal: `#000000`
- Texto secundario: `#55555F`
- Texto apagado: `#797984`
- Borde: `#DADAE2`
- Acento violeta: `#A935EB`
- Acento verde controlado: `#65A914`
- Error: `#C92045`
- Advertencia: `#B7791F`

### Uso de color

- Violeta: acciones IA, seleccion activa, botones primarios.
- Verde: exito, memoria actualizada, continuidad correcta.
- Blanco/negro: contraste principal.
- Amarillo/ambar: advertencias de continuidad.
- Rojo: contradicciones fuertes o errores.

### Sensacion visual

La app debe sentirse:

- Profesional.
- Literaria.
- Moderna.
- Clara.
- No recargada.
- Como un archivo vivo del tiempo.

No debe sentirse:

- Como landing page.
- Como un chatbot generico.
- Como una base de datos fria.
- Como una interfaz neon saturada.
- Como fantasia decorativa excesiva.

---

## 27. Densidad de interfaz

Preferencia del usuario:

- Termino medio.
- Solo informacion necesaria.

Decision:

- Editor central limpio.
- Paneles colapsables.
- Informacion contextual solo cuando aporte.
- Alertas visibles pero no invasivas.
- Memoria no siempre abierta.
- Barra inferior discreta.

---

## 28. Modo claro y oscuro

Debe haber ambos desde el inicio.

Modo oscuro:

- Recomendado como experiencia principal.
- Comodo para sesiones largas de escritura.
- Debe usar violetas y verdes como acentos.

Modo claro:

- Debe ser igual de cuidado.
- Fondo blanco o gris muy suave.
- Acentos menos agresivos.

Debe haber selector:

- Claro.
- Oscuro.
- Sistema.

---

## 29. Pantalla de login/signup

Debe incluir:

- Logo/nombre AEVIUM.
- Email.
- Password.
- Confirmar password en signup.
- Boton login.
- Boton signup.
- Login con Google.
- Mensaje de verificacion de correo.
- Link recuperar contrasena despues.
- Selector de idioma si es posible.
- Modo claro/oscuro si es posible.

No debe parecer una landing page.

Debe sentirse como entrada a una herramienta de escritura.

---

## 30. Dashboard de proyectos

Elementos:

- Nombre AEVIUM.
- Boton crear proyecto.
- Lista/grid de proyectos.
- Busqueda.
- Filtro por tipo.
- Ultima edicion.
- Estado.
- Idioma.
- Cantidad de libros/capitulos.
- Proveedor IA configurado o pendiente.

Acciones:

- Abrir proyecto.
- Crear proyecto.
- Duplicar proyecto futuro.
- Archivar proyecto futuro.
- Importar proyecto futuro.

---

## 31. Vista de proyecto

Debe mostrar:

- Nombre del proyecto.
- Tipo.
- Idioma principal.
- Libros.
- Personajes.
- Cronologia.
- Reglas del mundo.
- Estilo.
- Configuracion IA.
- Importar documentos.

Acciones:

- Crear libro.
- Importar manuscrito.
- Editar memoria global.
- Configurar estilo.
- Configurar proveedor IA.

---

## 32. Vista de libro/editor

Debe mostrar:

- Panel izquierdo con capitulos y escenas.
- Editor central.
- Panel derecho IA/memoria/continuidad.
- Barra superior.
- Barra inferior.

El usuario debe poder:

- Crear capitulos.
- Crear escenas.
- Trabajar escena actual.
- Cambiar POV.
- Ver capitulo completo.
- Pedir continuacion.
- Reescribir fragmentos.
- Aceptar/rechazar cambios.
- Revisar inconsistencias.
- Actualizar memoria.

---

## 33. Configuracion IA

Debe permitir:

- Elegir proveedor.
- Agregar API key.
- Probar conexion.
- Elegir modelo.
- Marcar proveedor por defecto.
- Ver estado: conectado/no conectado.

Proveedores iniciales:

- Gemini.

Arquitectura preparada para:

- OpenAI.
- Anthropic.
- OpenRouter.
- Ollama/local.

Debe haber advertencia clara:

- Las API keys se cifran.
- La app no debe mostrar la key completa despues de guardarla.

---

## 34. Arquitectura IA conceptual

Debe existir una capa de adaptadores:

```text
AIProvider
  - generateText()
  - generateStructured()
  - embedText()
  - validateConfig()
```

Adaptadores:

```text
GeminiProvider
OpenAIProvider
AnthropicProvider
OpenRouterProvider
LocalProvider
```

El sistema de escritura no debe depender directamente de Gemini.

Flujo:

```text
Comando del usuario
  > Orquestador AEVIUM
    > Recuperar memoria relevante
    > Armar contexto
    > Llamar proveedor IA
    > Revisar continuidad
    > Proponer resultado
    > Actualizar memoria
```

---

## 35. Prompting y contexto

AEVIUM debe armar paquetes de contexto, no simplemente enviar todo el libro.

Paquete de contexto para continuar escena:

- Proyecto actual.
- Libro actual.
- Capitulo actual.
- Escena actual.
- Resumen del capitulo anterior.
- Resumen de escenas previas.
- Personajes relevantes.
- Estado fisico/emocional.
- Cronologia relevante.
- Reglas del mundo relevantes.
- Guia de estilo.
- Instrucciones del usuario.
- Fragmentos recuperados por vector search.

Debe evitar:

- Mandar informacion irrelevante.
- Sobrecargar el prompt.
- Mezclar memoria de otro proyecto.
- Mezclar eventos de otro libro si no corresponde.

---

## 36. Estructura de base de datos inicial sugerida

Tablas posibles:

- `profiles`
- `projects`
- `books`
- `chapters`
- `scenes`
- `characters`
- `locations`
- `world_rules`
- `timeline_events`
- `memory_items`
- `scene_versions`
- `ai_credentials`
- `ai_requests`
- `style_guides`
- `imports`
- `continuity_alerts`

### `profiles`

- `id`
- `user_id`
- `display_name`
- `preferred_language`
- `theme`
- `created_at`
- `updated_at`

### `projects`

- `id`
- `user_id`
- `name`
- `description`
- `type`
- `primary_language`
- `created_at`
- `updated_at`

### `books`

- `id`
- `project_id`
- `title`
- `subtitle`
- `position`
- `status`
- `created_at`
- `updated_at`

### `chapters`

- `id`
- `book_id`
- `title`
- `position`
- `summary`
- `status`
- `created_at`
- `updated_at`

### `scenes`

- `id`
- `chapter_id`
- `title`
- `position`
- `content`
- `summary`
- `pov_character_id`
- `location_id`
- `timeline_position`
- `word_count`
- `status`
- `created_at`
- `updated_at`

### `characters`

- `id`
- `project_id`
- `name`
- `role`
- `physical_description`
- `personality`
- `motivations`
- `current_state`
- `knowledge_state`
- `created_at`
- `updated_at`

### `timeline_events`

- `id`
- `project_id`
- `book_id`
- `chapter_id`
- `scene_id`
- `character_id`
- `event_type`
- `description`
- `date_label`
- `order_index`
- `created_at`

### `memory_items`

- `id`
- `project_id`
- `scope`
- `type`
- `title`
- `content`
- `source_scene_id`
- `confidence`
- `status`
- `created_at`
- `updated_at`

### `ai_credentials`

- `id`
- `user_id`
- `provider`
- `encrypted_secret`
- `is_default`
- `created_at`
- `updated_at`

---

## 37. Exportacion

Formatos deseados:

- DOCX
- PDF
- Markdown
- TXT

Prioridad:

1. Markdown/TXT por facilidad.
2. DOCX por flujo real de escritores.
3. PDF para lectura/entrega.

---

## 38. Local primero, deploy despues

El usuario quiere:

- Trabajar primero en local.
- Desplegar luego en Vercel.

Decision:

- Crear proyecto local en `D:\Open Codex\ai-writing-assistant`.
- Desarrollar y probar localmente.
- Cuando el MVP funcione, preparar deploy en Vercel.
- Variables de entorno para Vercel:
  - Supabase URL.
  - Supabase anon key.
  - Supabase service role si hace falta solo server-side.
  - Encryption key.
  - Configuracion de proveedores IA.

---

## 39. Lo que queda para despues

Dejar para fases futuras:

- SaaS completo.
- Billing.
- Planes de pago.
- Multi-tenant avanzado.
- Organizaciones/equipos.
- OAuth avanzado para proveedores IA.
- Marketplace de prompts.
- Colaboracion entre usuarios.
- Comentarios compartidos.
- Publicacion directa.
- Versionado estilo Git.
- App movil.

---

## 40. Primer plan de implementacion recomendado

Fase 1 - Fundacion:

- Crear proyecto Next.js.
- Configurar TypeScript.
- Configurar Tailwind.
- Configurar rutas.
- Configurar tema claro/oscuro.
- Configurar i18n ES/EN.
- Crear layout base AEVIUM.

Fase 2 - Auth:

- Login.
- Signup.
- Google login.
- Verificacion de correo.
- Perfil basico.

Fase 3 - Dashboard:

- Crear proyecto.
- Listar proyectos.
- Abrir proyecto.

Fase 4 - Estructura narrativa:

- Crear libros.
- Crear capitulos.
- Crear escenas.
- Navegacion tipo Scrivener.

Fase 5 - Editor:

- Editor de escena.
- Guardado automatico.
- Conteo de palabras.
- Vista de capitulo.

Fase 6 - IA basica:

- Configurar Gemini API key cifrada.
- Probar conexion.
- Continuar escena.
- Reescribir seleccion.

Fase 7 - Memoria:

- Extraer resumen de escena.
- Extraer personajes/eventos.
- Confirmar memoria antes de guardar.
- Buscar memoria relevante.

Fase 8 - Continuidad:

- Alertas basicas.
- Contradicciones de heridas, ubicaciones, conocimiento y cronologia.

Fase 9 - Importacion:

- DOCX.
- TXT/Markdown.
- Division automatica en capitulos.
- Propuesta de escenas.

Fase 10 - Deploy:

- Preparar Vercel.
- Variables de entorno.
- Supabase remoto.
- Prueba end-to-end.

---

## 41. MVP v0.1 definitivo

El MVP v0.1 debe ser una version funcional, pequena y enfocada. No debe intentar resolver todo AEVIUM desde el primer ciclo.

Objetivo del MVP:

> Permitir que un usuario cree un proyecto narrativo, organice su libro por capitulos y escenas, escriba en un editor comodo, configure Gemini mediante API key cifrada y use IA para continuar o reescribir escenas con una memoria narrativa basica.

### Incluido en MVP v0.1

- Proyecto Next.js con TypeScript.
- Interfaz base de AEVIUM.
- Modo claro y oscuro.
- Sistema de idioma ES/EN preparado.
- Login y signup con Supabase Auth.
- Dashboard de proyectos.
- Crear, listar y abrir proyectos.
- Crear libros dentro de un proyecto.
- Crear capitulos dentro de un libro.
- Crear escenas dentro de un capitulo.
- Navegacion tipo Scrivener con panel izquierdo.
- Editor central de escena.
- Conteo de palabras.
- Guardado automatico o guardado persistente confiable.
- Panel derecho colapsable.
- Pestaña IA inicial.
- Pestaña Continuidad inicial.
- Pestaña Memoria inicial.
- Configuracion de proveedor IA.
- Guardado cifrado de API key de Gemini.
- Prueba de conexion con Gemini.
- Comando IA: continuar escena.
- Comando IA: reescribir seleccion.
- Comando IA: revisar coherencia basica.
- Memoria sugerida despues de generar o editar escena.
- Confirmacion manual antes de convertir memoria sugerida en memoria canonica.
- Versionado basico de cambios IA.

### No incluido en MVP v0.1

- SaaS con billing.
- Planes de pago.
- Equipos u organizaciones.
- OAuth avanzado para proveedores IA.
- Integracion completa con Gemini Pro de cuenta personal.
- Todos los proveedores IA implementados.
- Exportacion profesional a DOCX/PDF.
- Importacion perfecta de PDF.
- Colaboracion en tiempo real.
- App movil.
- Marketplace de prompts.
- Analisis literario avanzado.
- Vector search completamente optimizado.

### Proveedores IA en MVP v0.1

Implementar:

- Gemini mediante API key cifrada.

Preparar arquitectura para:

- OpenAI.
- Anthropic.
- OpenRouter.
- Ollama/local.

### Memoria en MVP v0.1

La memoria inicial debe tener dos estados:

- Memoria sugerida.
- Memoria canonica.

La IA puede sugerir cambios de memoria, pero no debe modificar automaticamente la memoria canonica sin confirmacion del usuario.

Ejemplo:

```text
AEVIUM detecto:
"Marcus sufrio una fractura en el brazo derecho."

[Guardar en memoria] [Editar] [Descartar]
```

### Versionado en MVP v0.1

Cada cambio generado por IA debe guardar como minimo:

- Texto original.
- Instruccion del usuario.
- Texto propuesto.
- Fecha.
- Estado: pendiente, aceptado, rechazado.

Esto permite comparar y recuperar versiones.

### Contexto visible en MVP v0.1

Antes de generar texto largo, AEVIUM debe poder mostrar un resumen del contexto que usara:

- Escena actual.
- Resumen anterior.
- Personajes relevantes.
- Reglas relevantes.
- Memoria canonica relevante.
- Instruccion del usuario.

No necesita ser perfecto en la primera version, pero el concepto debe existir desde el diseno.

---

## 42. Reglas de producto no negociables

Estas reglas deben guiar el desarrollo de AEVIUM.

### 1. El usuario conserva control creativo

AEVIUM propone, sugiere, advierte y ayuda. No debe imponer cambios permanentes sin confirmacion.

### 2. La memoria canonica no se actualiza sola

La IA puede equivocarse. Toda memoria importante debe pasar por aprobacion o edicion del usuario antes de quedar como verdad del proyecto.

### 3. La historia no debe olvidar su pasado

La promesa principal de AEVIUM es continuidad. Las funciones de IA deben priorizar coherencia, cronologia, personajes, heridas, ubicaciones y conocimiento disponible.

### 4. Escribir por escena, revisar por capitulo

La unidad de trabajo debe ser la escena. La unidad de lectura y revision debe ser el capitulo.

### 5. No imitar autores vivos

AEVIUM puede transformar referencias de estilo en rasgos tecnicos y guias propias, pero no debe prometer copiar exactamente la voz de autores vivos.

### 6. La interfaz no debe sentirse como chatbot generico

El chat puede existir como herramienta, pero la experiencia principal debe ser una mesa de escritura con editor, estructura, memoria y continuidad.

### 7. La IA debe explicar contradicciones importantes

Si una instruccion del usuario contradice la memoria canonica, AEVIUM debe avisar y ofrecer alternativas.

### 8. Las credenciales del usuario deben protegerse

API keys y tokens deben cifrarse, mantenerse en servidor y nunca exponerse en cliente o logs.

### 9. La informacion debe aparecer cuando ayuda

La interfaz debe mantener densidad media. Memoria, continuidad y notas deben estar disponibles sin abrumar el area de escritura.

### 10. Multi-IA por arquitectura, no por improvisacion

Aunque Gemini sea el primer proveedor, el sistema debe construirse con adaptadores para poder sumar otros modelos sin reescribir la app.

### 11. Local primero, deploy despues

AEVIUM debe funcionar localmente antes de desplegarse en Vercel.

### 12. Bilingue desde la base

La app debe prepararse para Espanol latinoamericano e Ingles desde el inicio, evitando textos hardcodeados siempre que sea razonable.

---

## 43. Resumen de decisiones definitivas

- Nombre: AEVIUM.
- App web.
- Primero local, despues Vercel.
- Next.js + TypeScript.
- Supabase Auth + Supabase Postgres.
- `pgvector` para memoria semantica.
- Login/signup con email y Google.
- Interfaz bilingue ES/EN.
- Modo claro y oscuro.
- Interfaz tipo Scrivener.
- Dashboard para multiples proyectos.
- Proyecto > libro > capitulo > escena.
- Escritura por escena.
- Revision por capitulo.
- Panel derecho fijo y colapsable para IA/memoria/continuidad.
- Memoria mixta: automatica + manual.
- Contradicciones con alertas y opciones.
- Importacion de DOCX/TXT/Markdown/PDF.
- API keys cifradas.
- Multi-IA preparado desde el inicio.
- Gemini como primer proveedor practico.
- OAuth IA queda como investigacion/fase posterior.
- SaaS queda para despues.

---

## 44. Principio rector del producto

AEVIUM no debe ser solo una IA que escribe texto.

Debe ser un sistema que entiende una obra como una continuidad viva:

- quien es cada personaje,
- donde esta,
- que sabe,
- que le duele,
- que quiere,
- que ha ocurrido,
- que no puede contradecirse,
- que tono sostiene la historia,
- y hacia donde se dirige.

La promesa principal:

> AEVIUM ayuda a escribir sin que la historia olvide su propio pasado.
