import bcrypt from 'bcryptjs';
import db from '@backend/libs/db';
import { EstadoUsuario, RolUsuario } from '@backend/generated/prisma/enums';

/**
 * Array de dos usuarios iniciales.
 */
const usuariosIniciales = [
  { numeroControl: '16102026-1', rol: RolUsuario.administrador },
  { numeroControl: '16102026-2', rol: RolUsuario.operador },
];

/**
 * Contraseña inicial para los usuarios.
 */
const contrasenaInicial = 'unpasswordmuyseguro123!';

/**
 * Número de rondas para el hash de bcrypt.
 */
const rondasBcrypt = 12;

/**
 * Crea las cuentas iniciales que no existen en la base de datos.
 * @returns El número de control, rol y estado de las cuentas creadas o existentes.
 */
export async function crearUsuariosIniciales(): Promise<
  Array<{ numeroControl: string; rol: RolUsuario; estado: EstadoUsuario }>
> {
  // Arreglo de datos de usuario para la base de datos.
  const usuarios = [];

  // Se recorre el arreglo de usuarios iniciales establecidos en usuariosIniciales.
  for (const usuario of usuariosIniciales) {
    // Se genera el hash de la contraseña inicial usando bcrypt.
    const contrasenaHash = await bcrypt.hash(contrasenaInicial, rondasBcrypt);

    // Se obtiene la fecha actual para los campos creado y actualizado.
    const fecha = new Date();

    usuarios.push({
      // Se copian el número de control y el rol del usuario inicial.
      ...usuario,
      nombre: 'john',
      apellido: 'doe',
      contrasenaHash,
      estado: EstadoUsuario.activo,
      intentosFallidos: 0,
      creado: fecha,
      actualizado: fecha,
    });
  }

  // La transacción crea las cuentas ausentes de forma atómica.
  return db.$transaction(
    usuarios.map((usuario) =>
      db.usuario.upsert({
        where: { numeroControl: usuario.numeroControl },
        // Las cuentas existentes conservan sus datos, contraseña, rol y estado.
        update: {},
        create: usuario,
        select: { numeroControl: true, rol: true, estado: true },
      }),
    ),
  );
}

// La carga se ejecuta únicamente cuando el archivo se inicia directamente. PARA PODER IMPORTARLO EN OTROS LUGARES SIN EJECUTARLO AUTOMÁTICAMENTE.
if (require.main === module) {
  crearUsuariosIniciales()
    .then((usuarios) => {
      console.info('Usuarios iniciales disponibles:');
      console.table(usuarios);
    })
    // Se cierra la conexión tanto si la carga termina correctamente como si falla.
    .finally(async () => {
      await db.$disconnect();
    })
    // Se maneja cualquier error que ocurra durante la carga de usuarios iniciales.
    .catch((error: unknown) => {
      console.error(
        'No se pudo completar la carga de usuarios iniciales:',
        error,
      );
      process.exitCode = 1;
    });
}
