/*
  Warnings:

  - You are about to drop the column `controlador` on the `permiso_usuario` table. All the data in the column will be lost.
  - Added the required column `accion` to the `permiso_usuario` table without a default value. This is not possible if the table is not empty.
  - Added the required column `alcance` to the `permiso_usuario` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `permiso_usuario` DROP COLUMN `controlador`,
    ADD COLUMN `accion` ENUM('crear', 'listar', 'consultar', 'actualizar', 'eliminar') NOT NULL,
    ADD COLUMN `alcance` ENUM('global', 'asignado') NOT NULL;
