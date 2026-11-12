import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { PrismaClient } from '@backend/generated/prisma/client';

interface EstadoSemilla {
  id: number;
  nombre: string;
}

interface MunicipioSemilla extends EstadoSemilla {
  estadoId: number;
}

export interface CatalogosGeograficos {
  estados: EstadoSemilla[];
  municipios: MunicipioSemilla[];
}

interface RutasCatalogos {
  estados: string;
  municipios: string;
}

// Las rutas parten de este script, para no depender del directorio de ejecución.
const rutasPredeterminadas: RutasCatalogos = {
  estados: resolve(__dirname, '../../db/estados.json'),
  municipios: resolve(__dirname, '../../db/municipios.json'),
};

/** Lee y valida ambos archivos antes de abrir la conexión o escribir datos. */
export async function leerCatalogosGeograficos(
  rutas: RutasCatalogos = rutasPredeterminadas,
): Promise<CatalogosGeograficos> {
  const [estadosJson, municipiosJson] = await Promise.all([
    leerJson(rutas.estados),
    leerJson(rutas.municipios),
  ]);

  const estados = registros(estadosJson, 'estados.json').map(
    (registro, indice) => {
      const contexto = `estados.json, registro ${indice + 1}`;
      return {
        id: identificador(registro.id, `${contexto}, id`),
        nombre: nombre(registro.nombre, contexto),
      };
    },
  );

  const municipios = registros(municipiosJson, 'municipios.json').map(
    (registro, indice) => {
      const contexto = `municipios.json, registro ${indice + 1}`;
      return {
        id: identificador(registro.id, `${contexto}, id`),
        nombre: nombre(registro.nombre, contexto),
        estadoId: identificador(registro.estado_id, `${contexto}, estado_id`),
      };
    },
  );

  comprobarIdsUnicos(estados, 'estados.json');
  comprobarIdsUnicos(municipios, 'municipios.json');

  const estadosDisponibles = new Set(estados.map((estado) => estado.id));

  for (const municipio of municipios) {
    if (!estadosDisponibles.has(municipio.estadoId)) {
      throw new Error(
        `El municipio ${municipio.id} referencia el estado ${municipio.estadoId}, que no existe en estados.json.`,
      );
    }
  }

  return { estados, municipios };
}

/**
 * Crea únicamente los registros ausentes, primero estados y después municipios.
 * Conserva los IDs del JSON y los datos de registros existentes, incluidas sus claves.
 * La transacción evita una importación parcial si falla cualquiera de los catálogos.
 */
export async function importarCatalogosGeograficos(
  cliente: PrismaClient,
  catalogos: CatalogosGeograficos,
) {
  return cliente.$transaction(
    async (tx) => {
      const estadosExistentes = await tx.estado.findMany({
        where: { id: { in: catalogos.estados.map((estado) => estado.id) } },
        select: { id: true },
      });
      const municipiosExistentes = await tx.municipio.findMany({
        where: {
          id: { in: catalogos.municipios.map((municipio) => municipio.id) },
        },
        select: { id: true, estadoId: true },
      });

      const idsEstadosExistentes = new Set(
        estadosExistentes.map((estado) => estado.id),
      );
      const municipiosPorId = new Map(
        municipiosExistentes.map((municipio) => [municipio.id, municipio]),
      );

      // Un ID existente no se reasigna silenciosamente a otro estado, porque puede
      // estar utilizado por sucursales. La inconsistencia requiere corregir el origen.
      for (const municipio of catalogos.municipios) {
        const existente = municipiosPorId.get(municipio.id);

        if (existente && existente.estadoId !== municipio.estadoId) {
          throw new Error(
            `El municipio ${municipio.id} ya pertenece al estado ${existente.estadoId} en la base de datos, pero el JSON indica ${municipio.estadoId}. No se importó el catálogo.`,
          );
        }
      }

      const estadosNuevos = catalogos.estados
        .filter((estado) => !idsEstadosExistentes.has(estado.id))
        .map((estado) => ({ ...estado, clave: null }));
      const municipiosNuevos = catalogos.municipios
        .filter((municipio) => !municipiosPorId.has(municipio.id))
        .map((municipio) => ({ ...municipio, clave: null }));

      // Inserciones por catálogo en lugar de una consulta por cada municipio.
      // No usamos skipDuplicates: los errores de integridad deben cancelar la carga.
      const estadosCreados = estadosNuevos.length
        ? (await tx.estado.createMany({ data: estadosNuevos })).count
        : 0;
      const municipiosCreados = municipiosNuevos.length
        ? (await tx.municipio.createMany({ data: municipiosNuevos })).count
        : 0;

      return [
        {
          catalogo: 'Estados',
          totalArchivo: catalogos.estados.length,
          creados: estadosCreados,
          existentes: estadosExistentes.length,
        },
        {
          catalogo: 'Municipios',
          totalArchivo: catalogos.municipios.length,
          creados: municipiosCreados,
          existentes: municipiosExistentes.length,
        },
      ];
    },
    { maxWait: 10_000, timeout: 30_000 },
  );
}

async function leerJson(ruta: string): Promise<unknown> {
  const contenido = await readFile(ruta, 'utf8');

  try {
    return JSON.parse(contenido) as unknown;
  } catch {
    throw new Error(`El archivo ${ruta} no contiene JSON válido.`);
  }
}

function registros(valor: unknown, archivo: string): Record<string, unknown>[] {
  if (!Array.isArray(valor) || valor.length === 0) {
    throw new Error(
      `${archivo} debe contener un arreglo con al menos un registro.`,
    );
  }

  return valor.map((registro: unknown, indice) => {
    if (!registro || typeof registro !== 'object' || Array.isArray(registro)) {
      throw new Error(
        `${archivo}, registro ${indice + 1}: se esperaba un objeto.`,
      );
    }

    return registro as Record<string, unknown>;
  });
}

function identificador(valor: unknown, contexto: string): number {
  // No se acepta parseInt("1abc"): el identificador completo debe ser válido.
  const texto = typeof valor === 'string' ? valor.trim() : valor;
  const id =
    typeof texto === 'string' && /^\d+$/.test(texto) ? Number(texto) : texto;

  if (
    typeof id !== 'number' ||
    !Number.isInteger(id) ||
    id <= 0 ||
    id > 2_147_483_647
  ) {
    throw new Error(
      `${contexto}: se esperaba un entero positivo válido para Prisma Int.`,
    );
  }

  return id;
}

function nombre(valor: unknown, contexto: string): string {
  if (
    typeof valor !== 'string' ||
    !valor.trim() ||
    Array.from(valor.trim()).length > 191
  ) {
    throw new Error(
      `${contexto}: nombre debe contener entre 1 y 191 caracteres.`,
    );
  }

  return valor.trim();
}

function comprobarIdsUnicos(registros: EstadoSemilla[], archivo: string): void {
  const ids = new Set<number>();

  for (const registro of registros) {
    if (ids.has(registro.id)) {
      throw new Error(`${archivo} contiene el id duplicado ${registro.id}.`);
    }

    ids.add(registro.id);
  }
}

async function ejecutarSemilla(): Promise<void> {
  const argumentos = process.argv.slice(2);

  if (
    argumentos.length > 1 ||
    argumentos.some((argumento) => argumento !== '--validar')
  ) {
    throw new Error('Uso: npm run seed:geografia [-- --validar]');
  }

  const catalogos = await leerCatalogosGeograficos();

  if (argumentos.includes('--validar')) {
    console.info(
      'Archivos válidos. No se abrió la conexión a la base de datos.',
    );
    console.table({
      estados: { registros: catalogos.estados.length },
      municipios: { registros: catalogos.municipios.length },
    });
    return;
  }

  // La carga diferida de CommonJS evita inicializar Prisma al usar --validar.
  // El alias se resuelve con tsx, igual que en los demás scripts del backend.
  const { default: cliente } = require('@backend/libs/db') as {
    default: PrismaClient;
  };

  try {
    console.table(await importarCatalogosGeograficos(cliente, catalogos));
  } finally {
    await cliente.$disconnect();
  }
}

// Importar las funciones en pruebas u otros scripts no ejecuta automáticamente la carga.
if (require.main === module) {
  void ejecutarSemilla().catch((error: unknown) => {
    console.error(
      'No se pudo importar el catálogo geográfico:',
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  });
}
