# Prácticas FUNCA

Simulador de prácticas para programas técnicos de la salud. El estudiante resuelve
**escenarios** (casos) usando un "software" que imita la herramienta real de su área, y
un motor genérico lo califica por proceso (checklist de pasos) y resultado.

> El repositorio se llamó `farmacia` porque ese fue el primer módulo. Hoy es una
> plataforma multi-módulo: **Farmacia**, **Enfermería**, **Primera Infancia** y
> **Odontología** (historia clínica con odontograma, ver `docs/odontologia.md`).

## Arquitectura: núcleo + módulos

```
src/
├── lib/
│   ├── nucleo/          Motor agnóstico de módulo:
│   │                    auth · prisma · calificacion · turnos · vidas · checklist · informePdf
│   └── modulos/
│       ├── registro.ts            Metadata de cada módulo (apto para cliente)
│       ├── contrato.ts            Interfaz ModuloSimulacion + helpers de saneo
│       ├── registroSimulacion.ts  Registro server-side de implementaciones
│       └── <slug>/                farmacia · enfermeria · primera-infancia · odontologia
│           ├── acciones.ts        Vocabulario de acciones/resultados del módulo
│           ├── reglas.ts          Reglas de dominio (peligros clínicos, checklist)
│           ├── simulacion.ts      Implementa ModuloSimulacion
│           └── ...                Extras del módulo (edad.ts, recetaOnline.ts, ...)
│
├── components/
│   ├── ui/              Primitivas compartidas
│   └── modulos/<slug>/  Componentes propios de un módulo (CedulaCard, RecetaFisicaCard, ...)
│
└── app/
    ├── admin/
    │   ├── estudiantes · matriculas · modulos · escenarios · calificaciones   (núcleo)
    │   └── modulos/<slug>/          Datos maestros de cada módulo
    │                                (el nav se arma desde registro.ts → gruposAdminModulos)
    ├── panel/
    │   └── escenario/[id]/
    │       ├── page.tsx             Shell: elige el software según el módulo del escenario
    │       └── _modulos/<slug>/Software.tsx
    └── api/
        ├── auth · escenarios · intentos · turnos      Endpoints genéricos del motor
        └── modulos/<slug>/                            Endpoints propios de cada módulo
```

**Regla de oro:** el núcleo no menciona ningún módulo. Todo lo específico de un área vive
bajo `modulos/<slug>/` en cada capa. Agregar un módulo nuevo = una carpeta por capa + una
entrada en `registro.ts` y `registroSimulacion.ts`, sin tocar el motor.

### Base de datos

`Escenario` es genérico; lo específico de cada módulo vive en una tabla de extensión 1‑a‑1
(`EscenarioFarmacia`, `EscenarioEnfermeria`, `EscenarioPrimeraInfancia`, `EscenarioOdontologia`). El vocabulario de
acciones/resultados es texto libre por módulo (no un enum de Postgres), así que un módulo
nuevo no necesita migración de schema para su vocabulario.

## Roles y modalidades

- **Coordinación (admin):** todo; crea docentes y módulos.
- **Docente:** sus módulos (matrícula) y sus grupos; crea a sus estudiantes; maneja las
  jornadas presenciales de sus grupos.
- **Estudiante:** su panel.

Dos formas de practicar (ver `docs/plan-mejoras.md`):

- **Práctica virtual:** casos en el computador, con nota al terminar. Pueden tener una
  persona animada en la ventanilla (`docs/escena.md`).
- **Jornada presencial:** turnero y ventanillas en vivo; el docente la finaliza, confirma
  quién atendió a quién y se genera el reporte (`docs/simulacion.md`).

Usuarios de demostración del seed: `admin/admin123`, `estudiante1/estudiante123`,
`docente_farmacia/docente123`, `docente_odonto/docente123`.

## Desarrollo

```bash
docker compose up -d db          # Postgres local
npx prisma migrate deploy
npm run seed                     # datos de práctica de todos los módulos
npm run seed:catalogo-real       # catálogo real de Farmacia (consulta libre)
npm run dev
npm test                         # pruebas de la lógica de calificación
```

## Pendientes de la reestructura

- La carpeta local ya se llama `practicas-funca/`. Para seguir usando el contenedor y el
  volumen de Postgres que se crearon con el nombre viejo (`farmacia_farmacia_pgdata`), el
  `.env` local define `COMPOSE_PROJECT_NAME=farmacia` (no va en `docker-compose.yml` para no
  cambiar el nombre del proyecto en el VPS). `docker-compose.yml` sigue usando
  `farmacia`/`farmacia_sim` como usuario/DB; cambiarlo implica migrar el volumen.
- Admin CRUD y endpoints propios de Enfermería y Primera Infancia (hoy solo tienen datos
  vía seed).
