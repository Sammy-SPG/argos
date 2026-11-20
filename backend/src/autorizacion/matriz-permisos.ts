import {
  AlcancePermisoUsuario,
  RolUsuario,
  type AccionPermisoUsuario,
} from '@backend/generated/prisma/enums';

/** Permiso compartido por el guard y la generación de asignaciones por rol. */
export interface PermisoDeRol {
  readonly modulo: string;
  readonly accion: AccionPermisoUsuario;
  readonly alcance: AlcancePermisoUsuario;
}

export interface PermisoPendiente extends PermisoDeRol {
  readonly rol: RolUsuario;
  readonly motivo: string;
}

type AlcancesPorRol = Readonly<
  Partial<Record<RolUsuario, AlcancePermisoUsuario>>
>;

// Cada fila representa recurso, acción y los roles a los que se concede.
// Un rol ausente no recibe ese permiso; no hay herencia ni un comodín de administrador.
type DefinicionPermiso = readonly [
  modulo: string,
  accion: AccionPermisoUsuario,
  roles: AlcancesPorRol,
];

interface PropuestaPendiente {
  readonly modulo: string;
  readonly accion: AccionPermisoUsuario;
  readonly roles: AlcancesPorRol;
  readonly motivo: string;
}

// Son los valores de Prisma, abreviados igual que en las tablas del README.
const G = AlcancePermisoUsuario.global;
const A = AlcancePermisoUsuario.asignado;

const permisosDefinidos = [
  // Usuarios. El servicio deberá validar también el rol de la cuenta administrada.
  ['usuario_operador', 'crear', { administrador: G, gerente: A }],
  ['usuario_gerente', 'crear', { administrador: G }],
  ['usuario_administrador', 'crear', { administrador: G }],
  ['usuario', 'listar', { administrador: G, gerente: A }],
  ['usuario', 'consultar', { administrador: G, gerente: A }],
  ['usuario', 'actualizar', { administrador: G, gerente: A }],
  ['usuario_estado', 'actualizar', { administrador: G, gerente: A }],
  ['usuario_desbloqueo', 'actualizar', { administrador: G, gerente: A }],
  ['usuario_sucursal', 'actualizar', { administrador: G }],

  // Sucursales, horario, descansos y contactos.
  ['sucursal', 'crear', { administrador: G }],
  ['sucursal', 'listar', { administrador: G }],
  ['sucursal', 'consultar', { administrador: G, gerente: A }],
  ['sucursal', 'actualizar', { administrador: G, gerente: A }],
  ['sucursal_estado', 'actualizar', { administrador: G }],
  ['horario_sucursal', 'actualizar', { administrador: G, gerente: A }],
  ['descanso_sucursal', 'consultar', { administrador: G, gerente: A }],
  ['descanso_sucursal', 'actualizar', { administrador: G, gerente: A }],
  ['contacto_sucursal', 'crear', { administrador: G, gerente: A }],
  ['contacto_sucursal', 'listar', { administrador: G, gerente: A }],
  ['contacto_sucursal', 'consultar', { administrador: G, gerente: A }],
  ['contacto_sucursal', 'actualizar', { administrador: G, gerente: A }],
  ['contacto_sucursal', 'eliminar', { administrador: G, gerente: A }],

  // Configuración de la arquitectura de monitoreo.
  ['particion', 'crear', { administrador: G, gerente: A }],
  ['particion', 'listar', { administrador: G, gerente: A }],
  ['particion', 'consultar', { administrador: G, gerente: A }],
  ['particion', 'actualizar', { administrador: G, gerente: A }],
  ['zona', 'crear', { administrador: G, gerente: A }],
  ['zona', 'listar', { administrador: G, gerente: A }],
  ['zona', 'consultar', { administrador: G, gerente: A }],
  ['zona', 'actualizar', { administrador: G, gerente: A }],
  ['sensor', 'crear', { administrador: G, gerente: A }],
  ['sensor', 'listar', { administrador: G, gerente: A }],
  ['sensor', 'consultar', { administrador: G, gerente: A }],
  ['sensor', 'actualizar', { administrador: G, gerente: A }],
  ['camara', 'crear', { administrador: G, gerente: A }],
  ['camara', 'listar', { administrador: G, gerente: A }],
  ['camara', 'consultar', { administrador: G, gerente: A }],
  ['camara', 'actualizar', { administrador: G, gerente: A }],
  ['camara', 'eliminar', { administrador: G, gerente: A }],
  ['camara_prueba', 'crear', { administrador: G, gerente: A }],

  // Consultar todos los eventos de la sucursal no permite actuar sobre atenciones ajenas.
  ['evento', 'listar', { administrador: G, gerente: A, operador: A }],
  ['evento', 'consultar', { administrador: G, gerente: A, operador: A }],
  ['evento_atencion', 'crear', { administrador: G, gerente: A, operador: A }],
  [
    'evento_confirmacion',
    'crear',
    { administrador: G, gerente: A, operador: A },
  ],
  ['evento_resolucion', 'crear', { administrador: G, gerente: A, operador: A }],
  ['evento_descarte', 'crear', { administrador: G, gerente: A, operador: A }],
  [
    'evento_atencion',
    'actualizar',
    { administrador: G, gerente: A, operador: A },
  ],

  // Los acuses pertenecen al propio destinatario, incluso para el administrador.
  // El destino de avisos se gestiona desde autenticación, sin permiso CRUD.
  [
    'notificacion_estado',
    'actualizar',
    { administrador: A, gerente: A, operador: A },
  ],
  ['politica_escalamiento', 'actualizar', { administrador: G }],

  // Contexto y video de los eventos autorizados, sin acceso a configuración de cámaras.
  [
    'contexto_evento',
    'consultar',
    { administrador: G, gerente: A, operador: A },
  ],
  ['video_evento', 'consultar', { administrador: G, gerente: A, operador: A }],

  // Geografía es de solo lectura para los tres roles autenticados.
  // La futura consulta de municipios debe recibir y filtrar por estadoId.
  ['estado', 'listar', { administrador: G, gerente: G, operador: G }],
  ['municipio', 'listar', { administrador: G, gerente: G, operador: G }],

  // Diagnóstico de autorización: cada ruta de rol tiene su propio permiso.
  ['test_usuario', 'consultar', { administrador: A, gerente: A, operador: A }],
  ['test_operador', 'consultar', { operador: A }],
  ['test_gerente', 'consultar', { gerente: A }],
  ['test_administrador', 'consultar', { administrador: A }],
] as const satisfies readonly DefinicionPermiso[];

// Estas propuestas conservan la información de revisión, pero no generan permisos.
// El perfil efectivo nunca se construye a partir de esta lista.
const propuestasPendientes = [
  {
    modulo: 'horario_sucursal',
    accion: 'consultar',
    roles: { administrador: G, gerente: A },
    motivo:
      'Lectura auxiliar derivada de RF-2.06, todavía marcada para revisión.',
  },
  {
    modulo: 'politica_escalamiento',
    accion: 'consultar',
    roles: { administrador: G, gerente: A },
    motivo:
      'Lectura auxiliar de la configuración, todavía marcada para revisión.',
  },
  {
    modulo: 'politica_escalamiento',
    accion: 'actualizar',
    roles: { gerente: A },
    motivo: 'P4: falta definir qué configuración puede modificar el gerente.',
  },
] as const satisfies readonly PropuestaPendiente[];

/** Recurso conocido que admite el decorador RequierePermiso. */
export type ModuloPermiso =
  | (typeof permisosDefinidos)[number][0]
  | (typeof propuestasPendientes)[number]['modulo'];

/** Perfiles fijos, sin conexiones ni escrituras en Prisma o Redis al importarlos. */
export const MATRIZ_PERMISOS = construirMatriz(permisosDefinidos);

/** Asignaciones propuestas por rol; ninguna se incluye en MATRIZ_PERMISOS. */
export const PERMISOS_PENDIENTES = construirPendientes(propuestasPendientes);

const sinPermisos: readonly PermisoDeRol[] = Object.freeze([]);

/** Devuelve el perfil completo del rol; un valor desconocido no recibe permisos. */
export function obtenerPermisosPorRol(
  rol: RolUsuario,
): readonly PermisoDeRol[] {
  if (!Object.hasOwn(MATRIZ_PERMISOS, rol)) {
    return sinPermisos;
  }

  return MATRIZ_PERMISOS[rol];
}

/**
 * Devuelve únicamente el alcance definido en el perfil, o undefined si no existe.
 * No valida una sesión, la sucursal del recurso, el rol de la cuenta destinataria
 * ni el encargado del evento: esas comprobaciones corresponden al guard y al servicio.
 */
export function obtenerAlcancePorRol(
  rol: RolUsuario,
  modulo: string,
  accion: AccionPermisoUsuario,
): AlcancePermisoUsuario | undefined {
  return obtenerPermisosPorRol(rol).find(
    (permiso) => permiso.modulo === modulo && permiso.accion === accion,
  )?.alcance;
}

function construirMatriz(
  definiciones: readonly DefinicionPermiso[],
): Readonly<Record<RolUsuario, readonly PermisoDeRol[]>> {
  const perfiles: Record<RolUsuario, PermisoDeRol[]> = {
    administrador: [],
    gerente: [],
    operador: [],
  };

  for (const [modulo, accion, roles] of definiciones) {
    for (const rol of Object.values(RolUsuario)) {
      const alcance = roles[rol];

      if (alcance !== undefined) {
        perfiles[rol].push(Object.freeze({ modulo, accion, alcance }));
      }
    }
  }

  // Se congelan también los perfiles y sus entradas para impedir cambios accidentales.
  return Object.freeze({
    administrador: Object.freeze(perfiles.administrador),
    gerente: Object.freeze(perfiles.gerente),
    operador: Object.freeze(perfiles.operador),
  });
}

function construirPendientes(
  propuestas: readonly PropuestaPendiente[],
): readonly PermisoPendiente[] {
  const pendientes: PermisoPendiente[] = [];

  for (const { modulo, accion, roles, motivo } of propuestas) {
    for (const rol of Object.values(RolUsuario)) {
      const alcance = roles[rol];

      if (alcance !== undefined) {
        pendientes.push(
          Object.freeze({ rol, modulo, accion, alcance, motivo }),
        );
      }
    }
  }

  return Object.freeze(pendientes);
}
