# Auditoría final i18n

## Resultado

- 453 claves ES y 453 EN; paridad, valores no vacíos y placeholders compatibles comprobados.
- 135 formatos de UI/cuidados/colección incorporados al catálogo durante la auditoría global; otros labels existentes se reutilizaron. Es un recuento de formatos, no de ocurrencias.
- 0 hallazgos no permitidos del detector final en los 16 módulos de runtime revisados, más inspección de assets de texto y datos usados en pantalla.
- El primer barrido registró 1.430 coincidencias brutas de literales. No se guardó una instantánea clasificada al inicio; no es posible afirmar un número exacto de textos visibles iniciales. No se presenta ese número bruto como si fuera un recuento de mensajes.
- 63/63 pruebas; git diff --check OK; build estático OK; 17 fuentes comparadas byte a byte con dist.
- Preferencia local, cloud, ausencia de idioma y valores inválidos: OK. Schema de criatura intacto.
- Revisión responsive acotada: wrapping de botones, HUD y mensajes largos; validación DOM/CSS. No se hicieron capturas ni una inspección visual real en esta pasada.
- Sin commit, push ni deploy.

## Alcance y protección

El detector recorre HTML y módulos principales del runtime, omite dist/vendor, datos canónicos, binarios, backups y herramientas sin UI. Prueba textContent, innerHTML, tooltips, ARIA, toast y helpers de creación de nodos. Incluye pruebas positivas con literales deliberados para verificar que falla. La inspección manual cubre composición, arrays, mensajes de cuidados, interpolación y datos de identidad. Los canvas actuales dibujan geometría, sin frases; sus etiquetas accesibles están localizadas.

## Excepciones legítimas (29 registros agrupados por fuente/cadena)

Las repeticiones del mismo diagnóstico en un archivo se agrupan. Nombres oficiales/IDs se documentan por su punto de consumo; no se duplican catálogos de miles de datos. Comentarios, selectores, rutas internas y logs no son textos de UI.

| Archivo/línea | Cadena/dato | Motivo |
|---|---|---|
| `index.html:167` | Activa JavaScript para iniciar sesión. | Fallback sin JavaScript: el catálogo JavaScript no puede ejecutarse. Única frase visible fuera del catálogo. |
| `index.html:7` | Hatch.mon / hatch.mon | Marca propia; se conserva en título, encabezados y carcasa base. |
| `trainingActivities.js:35` | A / B / C / D | Símbolos de las teclas de memoria, independientes del idioma. |
| `index.html:332` | DisplayName de la especie/forma | Nombre oficial canónico; se conserva en identidad, rutas, colección, crianza y carcasas. |
| `assets/skins/themes.js:2` | name de cada carcasa | Nombres oficiales de especies/formas, generados por la herramienta de assets. |
| `index.html:847` | EggGroup canónico | Dato biológico canónico; se mantiene deliberadamente sin traducción. |
| `index.html:969` | nickname / email introducidos por el usuario | Contenido del usuario; se preserva literalmente, también en Memorias y Cuenta. |
| `index.html:1041` | ??? / ✕ / ✓ / ♥ / ♂ / ♀ / flechas | Símbolos gráficos; sus etiquetas accesibles sí proceden del catálogo. |
| `index.html:769` | +1 h / +3 h / +6 h / porcentajes y separadores numéricos | Notación numérica/unidades compartidas ES/EN, no frases. |
| `index.html:826` | hatchmon-qr.png | Nombre estable de archivo exportado. |
| `appBootstrap.mjs:25` | hatchmon-copia-pendiente.json | Nombre estable de archivo de backup; no se cambia para mantener compatibilidad. |
| `index.html:817` | HM1, códigos QR, IDs y sufijos de IDs | Datos de intercambio; traducirlos los corrompería. |
| `index.html:306` | Estadística desconocida: ${k} | Diagnóstico/código interno de validación. No se muestra directamente; bootstrap/presentación lo convierten en error localizado, o sólo llega a consola en uso inválido de API. |
| `index.html:310` | Objeto desconocido: ${r.objeto} | Diagnóstico/código interno de validación. No se muestra directamente; bootstrap/presentación lo convierten en error localizado, o sólo llega a consola en uso inválido de API. |
| `index.html:325` | ${field} debe ser un número entre 0 y 100 | Diagnóstico/código interno de validación. No se muestra directamente; bootstrap/presentación lo convierten en error localizado, o sólo llega a consola en uso inválido de API. |
| `index.html:337` | Destino inexistente: ${r.to} | Diagnóstico/código interno de validación. No se muestra directamente; bootstrap/presentación lo convierten en error localizado, o sólo llega a consola en uso inválido de API. |
| `index.html:338` | Condición sostenida inválida | Diagnóstico/código interno de validación. No se muestra directamente; bootstrap/presentación lo convierten en error localizado, o sólo llega a consola en uso inválido de API. |
| `index.html:713` | Modo visual no válido | Diagnóstico/código interno de validación. No se muestra directamente; bootstrap/presentación lo convierten en error localizado, o sólo llega a consola en uso inválido de API. |
| `index.html:1097` | invalid-cloud-save | Diagnóstico/código interno de validación. No se muestra directamente; bootstrap/presentación lo convierten en error localizado, o sólo llega a consola en uso inválido de API. |
| `relationship.js:23` | MinBond debe estar entre 0 y 5 corazones | Diagnóstico/código interno de validación. No se muestra directamente; bootstrap/presentación lo convierten en error localizado, o sólo llega a consola en uso inválido de API. |
| `vitalSimulation.js:45` | CareDifficulty canónico no disponible: ${id} | Diagnóstico/código interno de validación. No se muestra directamente; bootstrap/presentación lo convierten en error localizado, o sólo llega a consola en uso inválido de API. |
| `shiny.js:4` | Rareza canónica inválida | Diagnóstico/código interno de validación. No se muestra directamente; bootstrap/presentación lo convierten en error localizado, o sólo llega a consola en uso inválido de API. |
| `pokemonDataAdapter.js:7` | Se requiere hatchmonData_v2.js (schemaVersion 2). | Diagnóstico/código interno de validación. No se muestra directamente; bootstrap/presentación lo convierten en error localizado, o sólo llega a consola en uso inválido de API. |
| `pokemonDataAdapter.js:13` | No hay correspondencia canónica inequívoca para ${id}. | Diagnóstico/código interno de validación. No se muestra directamente; bootstrap/presentación lo convierten en error localizado, o sólo llega a consola en uso inválido de API. |
| `pokemonDataAdapter.js:28` | Faltan proporciones de género válidas para ${id}. | Diagnóstico/código interno de validación. No se muestra directamente; bootstrap/presentación lo convierten en error localizado, o sólo llega a consola en uso inválido de API. |
| `appBootstrap.mjs:23` | session-changed | Diagnóstico/código interno de validación. No se muestra directamente; bootstrap/presentación lo convierten en error localizado, o sólo llega a consola en uso inválido de API. |
| `appBootstrap.mjs:33` | game-start-failed | Diagnóstico/código interno de validación. No se muestra directamente; bootstrap/presentación lo convierten en error localizado, o sólo llega a consola en uso inválido de API. |
| `cloudSaveService.mjs:17` | unsupported-save | Diagnóstico/código interno de validación. No se muestra directamente; bootstrap/presentación lo convierten en error localizado, o sólo llega a consola en uso inválido de API. |
| `cloudSaveService.mjs:55` | session-changed | Diagnóstico/código interno de validación. No se muestra directamente; bootstrap/presentación lo convierten en error localizado, o sólo llega a consola en uso inválido de API. |
