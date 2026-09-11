# Trabajo sobre Hatch.mon

- Prioridad: corrección > seguridad de cambios > claridad > ahorro de contexto.
- Usa las secciones «Arquitectura actual» y «Reglas canónicas clave» de README.md como mapa. Lee otras secciones solo cuando sean relevantes; no dupliques aquí sus reglas.
- Localiza funciones, selectores y constantes con `rg`; abre rangos concretos. Si bastan uno o dos archivos, limita el trabajo a ellos y sus pruebas pertinentes.
- No vuelques `hatchmonData_v2.js`: es un catálogo grande en una línea. Consulta registros/campos específicos mediante el adapter o un script con salida acotada. No copies datos canónicos a otros módulos.
- Conserva las responsabilidades del mapa. Evita refactorizaciones masivas; propone extracciones solo si reducen un acoplamiento o una dificultad real de edición.
- Antes de añadir una constante, mapping, regla, mensaje o validación, busca su fuente existente y reutilízala. Usa nombres descriptivos y comentarios solo para lógica no obvia.
- Prefiere fixtures mínimos y representativos. Ejecuta las pruebas afectadas; amplía la verificación si hay cambios transversales, fallos o riesgos concretos. No repitas pruebas aprobadas sin motivo nuevo.
- En auditorías, muestra primero cantidades y anomalías. Guarda inventarios largos en un artefacto; no vuelques catálogos ni cientos de rutas al contexto.
- README describe el estado vigente, sin cronología redundante ni copias de configuraciones completas. Actualiza la sección existente antes de añadir otra.
- Responde con cambios, decisiones relevantes, pruebas y pendientes. No repitas decisiones consolidadas. Distingue pruebas DOM/CSS de inspección visual real.
