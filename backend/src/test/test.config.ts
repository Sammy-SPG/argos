import 'dotenv/config';

/** Las rutas de diagnóstico necesitan habilitación explícita y nunca se cargan en producción. */
export function habilitarRutasTest(
  entorno: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    (entorno.NODE_ENV === 'development' || entorno.NODE_ENV === 'test') &&
    entorno.ENABLE_TEST_ROUTES === 'true'
  );
}
