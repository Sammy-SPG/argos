/*
  Warnings:

  - You are about to drop the column `entregado` on the `notificacion_evento` table. All the data in the column will be lost.
  - You are about to drop the `direccion_sucursal` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `plantilla_permiso` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `estado_id` to the `municipio` table without a default value. This is not possible if the table is not empty.
  - Added the required column `calle` to the `sucursal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `colonia` to the `sucursal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cp` to the `sucursal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `municipio_id` to the `sucursal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `numero` to the `sucursal` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `direccion_sucursal` DROP FOREIGN KEY `direccion_sucursal_estado_id_fkey`;

-- DropForeignKey
ALTER TABLE `direccion_sucursal` DROP FOREIGN KEY `direccion_sucursal_municipio_id_fkey`;

-- DropForeignKey
ALTER TABLE `direccion_sucursal` DROP FOREIGN KEY `direccion_sucursal_sucursal_id_fkey`;

-- AlterTable
ALTER TABLE `municipio` ADD COLUMN `estado_id` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `notificacion_evento` DROP COLUMN `entregado`;

-- AlterTable
ALTER TABLE `sucursal` ADD COLUMN `calle` VARCHAR(30) NOT NULL,
    ADD COLUMN `colonia` VARCHAR(30) NOT NULL,
    ADD COLUMN `cp` VARCHAR(5) NOT NULL,
    ADD COLUMN `municipio_id` INTEGER NOT NULL,
    ADD COLUMN `numero` VARCHAR(10) NOT NULL;

-- DropTable
DROP TABLE `direccion_sucursal`;

-- DropTable
DROP TABLE `plantilla_permiso`;

-- AddForeignKey
ALTER TABLE `sucursal` ADD CONSTRAINT `sucursal_municipio_id_fkey` FOREIGN KEY (`municipio_id`) REFERENCES `municipio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `municipio` ADD CONSTRAINT `municipio_estado_id_fkey` FOREIGN KEY (`estado_id`) REFERENCES `estado`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
