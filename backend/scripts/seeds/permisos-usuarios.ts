import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';
import type { PrismaClient } from '@backend/generated/prisma/client';
import type { RolUsuario } from '@backend/generated/prisma/enums';
import db from '@backend/libs/db';
import { AutorizacionModule } from '@src/autorizacion/autorizacion.module';
import { obtenerPermisosPorRol } from '@src/autorizacion/matriz-permisos';
import { PermisosService } from '@src/autorizacion/permisos.service';

interface ResumenPermisosUsuario {
  usuarioId: number;
  rol: RolUsuario;
  eliminados: number;
  asignados: number;
}

/** Reemplaza los permisos por el perfil confirmado del rol; no modifica cuentas ni roles. */
export async function actualizarPermisosUsuarios(
  cliente: PrismaClient,
  invalidarUsuario: (usuarioId: number) => Promise<void>,
  usuariosIds?: readonly number[],
): Promise<ResumenPermisosUsuario[]> {
  const usuarios = await cliente.usuario.findMany({
    where: usuariosIds ? { id: { in: [...usuariosIds] } } : {},
    select: { id: true },
    orderBy: { id: 'asc' },
  });
  const resumen: ResumenPermisosUsuario[] = [];
  for (const { id } of usuarios) {
    const resultado = await cliente.$transaction(
      async (tx) => {
        // El mismo bloqueo que usa login mantiene estable el rol durante el reemplazo.
        await tx.$queryRaw`SELECT id FROM usuario WHERE id = ${id} FOR UPDATE`;
        const usuario = await tx.usuario.findUnique({
          where: { id },
          select: { rol: true },
        });
        if (!usuario) {
          return null;
        }
        // El perfil confirmado del rol reemplaza cualquier asignación previa.
        const perfil = obtenerPermisosPorRol(usuario.rol);
        const eliminados = await tx.permisoUsuario.deleteMany({
          where: { usuarioId: id },
        });
        const fecha = new Date();
        if (perfil.length > 0) {
          await tx.permisoUsuario.createMany({
            data: perfil.map((permiso) => ({
              ...permiso,
              usuarioId: id,
              creado: fecha,
              actualizado: fecha,
            })),
          });
        }
        return {
          usuarioId: id,
          rol: usuario.rol,
          eliminados: eliminados.count,
          asignados: perfil.length,
        };
      },
      { isolationLevel: 'ReadCommitted' },
    );
    if (!resultado) {
      continue;
    }
    // Invalidar antes del commit permitiría que otra petición volviera a cachear filas viejas.
    try {
      await invalidarUsuario(id);
    } catch {
      throw new Error(
        `Los permisos del usuario ${id} se actualizaron en MySQL, pero no se pudo invalidar su caché. Restablezca Redis y repita la semilla.`,
      );
    }
    resumen.push(resultado);
  }
  return resumen;
}

async function ejecutar(): Promise<void> {
  let aplicacion: INestApplicationContext | undefined;
  try {
    aplicacion = await NestFactory.createApplicationContext(
      AutorizacionModule,
      { logger: ['error', 'warn'], abortOnError: false },
    );
    const permisos = aplicacion.get(PermisosService);
    const resumen = await actualizarPermisosUsuarios(db, (id) =>
      permisos.invalidarUsuario(id),
    );
    console.info('Permisos reemplazados según la matriz confirmada:');
    console.table(resumen);
  } finally {
    await aplicacion?.close();
    await db.$disconnect();
  }
}

if (require.main === module) {
  ejecutar().catch((error: unknown) => {
    // Evita volcar detalles internos de conexión o credenciales en la salida de la CLI.
    if (
      error instanceof Error &&
      error.message.startsWith('Los permisos del usuario ')
    ) {
      console.error(error.message);
    } else {
      console.error(
        'No se completó la semilla de permisos. Verifique MySQL y Redis y repita la operación; el reemplazo es idempotente.',
      );
    }
    process.exitCode = 1;
  });
}
