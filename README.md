# Prácticas FUNCA

Simulador de prácticas para programas técnicos de la salud. El estudiante resuelve
**escenarios** (casos) usando un "software" que imita la herramienta real de su área, y
un motor genérico lo califica por proceso (checklist de pasos) y resultado.

> El repositorio se llamó `farmacia` porque ese fue el primer módulo. Hoy es una
> plataforma multi-módulo: **Farmacia**, **Enfermería** y **Primera Infancia**.

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
│       └── <slug>/                farmacia · enfermeria · primera-infancia
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
    │                                (el nav se arma desde registro.ts → seccionesAdminModulos)
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
(`EscenarioFarmacia`, `EscenarioEnfermeria`, `EscenarioPrimeraInfancia`). El vocabulario de
acciones/resultados es texto libre por módulo (no un enum de Postgres), así que un módulo
nuevo no necesita migración de schema para su vocabulario.

## Desarrollo

```bash
docker compose up -d db          # Postgres local
npx prisma migrate deploy
npm run seed                     # datos de práctica de los 3 módulos
npm run seed:catalogo-real       # catálogo real de Farmacia (consulta libre)
npm run dev
```

## Pendientes de la reestructura

- Renombrar la carpeta raíz del repo (`farmacia/` → `practicas-funca/`) y el repositorio
  remoto. Es un cambio de entorno, no de código; hacerlo cuando no haya ramas abiertas.
- `docker-compose.yml` sigue usando `farmacia`/`farmacia_sim` como usuario/DB. Cambiarlo
  implica migrar el volumen `farmacia_pgdata`; se dejó como está para no romper datos locales.
- Admin CRUD y endpoints propios de Enfermería y Primera Infancia (hoy solo tienen datos
  vía seed).
