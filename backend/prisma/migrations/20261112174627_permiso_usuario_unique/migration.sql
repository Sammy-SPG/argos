/*
  Warnings:

  - A unique constraint covering the columns `[usuario_id,modulo,accion]` on the table `permiso_usuario` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `permiso_usuario_usuario_id_modulo_accion_key` ON `permiso_usuario`(`usuario_id`, `modulo`, `accion`);
