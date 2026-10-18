/*
  Warnings:

  - You are about to alter the column `estado` on the `evento_sucursal` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(11))` to `Enum(EnumId(19))`.
  - You are about to drop the column `dispositivo_usuario_id` on the `notificacion_evento` table. All the data in the column will be lost.
  - The values [ignorado,escalado] on the enum `resolucion_evento_accion` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `dispositivo_usuario` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[clave_deduplicacion]` on the table `evento_sucursal` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[evento_sucursal_id,dispositivo_sesion_usuario_id,destinatario_id]` on the table `notificacion_evento` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[numero_control]` on the table `usuario` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `vencimiento_previsto` to the `bloqueo_usuario` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clave_deduplicacion` to the `evento_sucursal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `destinatario_id` to the `notificacion_evento` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dispositivo_sesion_usuario_id` to the `notificacion_evento` table without a default value. This is not possible if the table is not empty.
  - Added the required column `zona_horaria` to the `sucursal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `numero_control` to the `usuario` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `dispositivo_usuario` DROP FOREIGN KEY `dispositivo_usuario_usuario_id_fkey`;

-- DropForeignKey
ALTER TABLE `notificacion_evento` DROP FOREIGN KEY `notificacion_evento_dispositivo_usuario_id_fkey`;

-- DropForeignKey
ALTER TABLE `zona_particion` DROP FOREIGN KEY `zona_particion_particion_id_fkey`;

-- DropIndex
DROP INDEX `notificacion_evento_dispositivo_usuario_id_fkey` ON `notificacion_evento`;

-- DropIndex
DROP INDEX `zona_particion_particion_id_fkey` ON `zona_particion`;

-- AlterTable
ALTER TABLE `bloqueo_usuario` ADD COLUMN `desbloqueado_por` INTEGER NULL,
    ADD COLUMN `finalizacion_efectiva` DATETIME(0) NULL,
    ADD COLUMN `forma_finalizacion` ENUM('manual', 'automatica') NULL,
    ADD COLUMN `motivo` TEXT NULL,
    ADD COLUMN `vencimiento_previsto` DATETIME(0) NOT NULL;

-- AlterTable
ALTER TABLE `evento_sucursal` ADD COLUMN `clave_deduplicacion` VARCHAR(191) NOT NULL,
    MODIFY `estado` ENUM('pendiente', 'en_atencion', 'confirmado', 'resuelto', 'descartado') NOT NULL DEFAULT 'pendiente';

-- AlterTable
ALTER TABLE `notificacion_evento` DROP COLUMN `dispositivo_usuario_id`,
    ADD COLUMN `creado` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    ADD COLUMN `destinatario_id` INTEGER NOT NULL,
    ADD COLUMN `dispositivo_sesion_usuario_id` INTEGER NOT NULL,
    ADD COLUMN `entregado` DATETIME(0) NULL,
    ADD COLUMN `escalamiento_evento_id` INTEGER NULL,
    ADD COLUMN `estado` ENUM('pendiente', 'enviada', 'entregada', 'recibida', 'abierta', 'fallida', 'cancelada') NOT NULL DEFAULT 'pendiente',
    MODIFY `enviado` DATETIME(0) NULL,
    MODIFY `recibido` DATETIME(0) NULL,
    MODIFY `abierto` DATETIME(0) NULL;

-- AlterTable
ALTER TABLE `resolucion_evento` MODIFY `accion` ENUM('resuelto', 'descartado') NOT NULL;

-- AlterTable
ALTER TABLE `sucursal` ADD COLUMN `zona_horaria` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `usuario` ADD COLUMN `intentos_fallidos` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `numero_control` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `zona_particion` MODIFY `particion_id` INTEGER NULL;

-- DropTable
DROP TABLE `dispositivo_usuario`;

-- CreateTable
CREATE TABLE `sesion_usuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `token_hash` VARCHAR(191) NOT NULL,
    `inicio` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `vencimiento` DATETIME(0) NOT NULL,
    `finalizada` DATETIME(0) NULL,
    `motivo_finalizacion` VARCHAR(191) NULL,

    UNIQUE INDEX `sesion_usuario_token_hash_key`(`token_hash`),
    INDEX `sesion_usuario_usuario_id_finalizada_vencimiento_idx`(`usuario_id`, `finalizada`, `vencimiento`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dispositivo_sesion_usuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sesion_usuario_id` INTEGER NOT NULL,
    `tipo` ENUM('android', 'ios', 'escritorio') NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `creado` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `desactivado` DATETIME(0) NULL,

    INDEX `dispositivo_sesion_usuario_sesion_usuario_id_desactivado_idx`(`sesion_usuario_id`, `desactivado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recepcion_evento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `evento_sucursal_id` INTEGER NULL,
    `origen` VARCHAR(191) NOT NULL,
    `codigo_externo` VARCHAR(191) NULL,
    `clave_deduplicacion` VARCHAR(191) NULL,
    `contenido` JSON NOT NULL,
    `ocurrido` DATETIME(0) NULL,
    `recibido` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `procesado` DATETIME(0) NULL,
    `estado` ENUM('pendiente', 'procesada', 'duplicada', 'error') NOT NULL DEFAULT 'pendiente',
    `error` TEXT NULL,

    INDEX `recepcion_evento_clave_deduplicacion_idx`(`clave_deduplicacion`),
    INDEX `recepcion_evento_estado_recibido_idx`(`estado`, `recibido`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `atencion_evento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `evento_sucursal_id` INTEGER NOT NULL,
    `usuario_id` INTEGER NOT NULL,
    `sesion_usuario_id` INTEGER NOT NULL,
    `inicio` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `finalizada` DATETIME(0) NULL,
    `forma_finalizacion` ENUM('liberada', 'abandono_sesion', 'cierre_evento', 'cuenta_desactivada') NULL,
    `motivo` TEXT NULL,
    `vigente` BOOLEAN NULL DEFAULT true,

    INDEX `atencion_evento_sesion_usuario_id_vigente_idx`(`sesion_usuario_id`, `vigente`),
    UNIQUE INDEX `atencion_evento_evento_sucursal_id_vigente_key`(`evento_sucursal_id`, `vigente`),
    UNIQUE INDEX `atencion_evento_usuario_id_vigente_key`(`usuario_id`, `vigente`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `historial_evento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `evento_sucursal_id` INTEGER NOT NULL,
    `atencion_evento_id` INTEGER NULL,
    `usuario_id` INTEGER NULL,
    `accion` ENUM('registrado', 'atencion_iniciada', 'atencion_liberada', 'atencion_abandonada', 'confirmado', 'descartado', 'resuelto', 'escalado') NOT NULL,
    `estado_anterior` ENUM('pendiente', 'en_atencion', 'confirmado', 'resuelto', 'descartado') NULL,
    `estado` ENUM('pendiente', 'en_atencion', 'confirmado', 'resuelto', 'descartado') NULL,
    `observacion` TEXT NULL,
    `fecha` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `historial_evento_evento_sucursal_id_fecha_id_idx`(`evento_sucursal_id`, `fecha`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `escalamiento_evento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `evento_sucursal_id` INTEGER NOT NULL,
    `rol_origen` ENUM('administrador', 'gerente', 'operador') NOT NULL,
    `rol_destino` ENUM('administrador', 'gerente', 'operador') NOT NULL,
    `fecha` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `escalamiento_evento_evento_sucursal_id_fecha_idx`(`evento_sucursal_id`, `fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `intento_notificacion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `notificacion_evento_id` INTEGER NOT NULL,
    `numero` INTEGER NOT NULL,
    `estado` ENUM('en_proceso', 'aceptado', 'fallido') NOT NULL DEFAULT 'en_proceso',
    `inicio` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `finalizado` DATETIME(0) NULL,
    `identificador_externo` VARCHAR(191) NULL,
    `error` TEXT NULL,

    UNIQUE INDEX `intento_notificacion_notificacion_evento_id_numero_key`(`notificacion_evento_id`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `bloqueo_usuario_usuario_id_vencimiento_previsto_idx` ON `bloqueo_usuario`(`usuario_id`, `vencimiento_previsto`);

-- CreateIndex
CREATE UNIQUE INDEX `evento_sucursal_clave_deduplicacion_key` ON `evento_sucursal`(`clave_deduplicacion`);

-- CreateIndex
CREATE INDEX `evento_sucursal_sucursal_id_estado_creado_idx` ON `evento_sucursal`(`sucursal_id`, `estado`, `creado`);

-- CreateIndex
CREATE INDEX `evento_sucursal_sucursal_id_creado_idx` ON `evento_sucursal`(`sucursal_id`, `creado`);

-- CreateIndex
CREATE INDEX `notificacion_evento_evento_sucursal_id_estado_idx` ON `notificacion_evento`(`evento_sucursal_id`, `estado`);

-- CreateIndex
CREATE INDEX `notificacion_evento_destinatario_id_creado_idx` ON `notificacion_evento`(`destinatario_id`, `creado`);

-- CreateIndex
CREATE UNIQUE INDEX `notificacion_evento_evento_sucursal_id_dispositivo_sesion_us_key` ON `notificacion_evento`(`evento_sucursal_id`, `dispositivo_sesion_usuario_id`, `destinatario_id`);

-- CreateIndex
CREATE UNIQUE INDEX `usuario_numero_control_key` ON `usuario`(`numero_control`);

-- AddForeignKey
ALTER TABLE `sesion_usuario` ADD CONSTRAINT `sesion_usuario_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispositivo_sesion_usuario` ADD CONSTRAINT `dispositivo_sesion_usuario_sesion_usuario_id_fkey` FOREIGN KEY (`sesion_usuario_id`) REFERENCES `sesion_usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bloqueo_usuario` ADD CONSTRAINT `bloqueo_usuario_desbloqueado_por_fkey` FOREIGN KEY (`desbloqueado_por`) REFERENCES `usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `zona_particion` ADD CONSTRAINT `zona_particion_particion_id_fkey` FOREIGN KEY (`particion_id`) REFERENCES `particion_sucursal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recepcion_evento` ADD CONSTRAINT `recepcion_evento_evento_sucursal_id_fkey` FOREIGN KEY (`evento_sucursal_id`) REFERENCES `evento_sucursal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `atencion_evento` ADD CONSTRAINT `atencion_evento_evento_sucursal_id_fkey` FOREIGN KEY (`evento_sucursal_id`) REFERENCES `evento_sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `atencion_evento` ADD CONSTRAINT `atencion_evento_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `atencion_evento` ADD CONSTRAINT `atencion_evento_sesion_usuario_id_fkey` FOREIGN KEY (`sesion_usuario_id`) REFERENCES `sesion_usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historial_evento` ADD CONSTRAINT `historial_evento_evento_sucursal_id_fkey` FOREIGN KEY (`evento_sucursal_id`) REFERENCES `evento_sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historial_evento` ADD CONSTRAINT `historial_evento_atencion_evento_id_fkey` FOREIGN KEY (`atencion_evento_id`) REFERENCES `atencion_evento`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historial_evento` ADD CONSTRAINT `historial_evento_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `escalamiento_evento` ADD CONSTRAINT `escalamiento_evento_evento_sucursal_id_fkey` FOREIGN KEY (`evento_sucursal_id`) REFERENCES `evento_sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notificacion_evento` ADD CONSTRAINT `notificacion_evento_dispositivo_sesion_usuario_id_fkey` FOREIGN KEY (`dispositivo_sesion_usuario_id`) REFERENCES `dispositivo_sesion_usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notificacion_evento` ADD CONSTRAINT `notificacion_evento_destinatario_id_fkey` FOREIGN KEY (`destinatario_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notificacion_evento` ADD CONSTRAINT `notificacion_evento_escalamiento_evento_id_fkey` FOREIGN KEY (`escalamiento_evento_id`) REFERENCES `escalamiento_evento`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `intento_notificacion` ADD CONSTRAINT `intento_notificacion_notificacion_evento_id_fkey` FOREIGN KEY (`notificacion_evento_id`) REFERENCES `notificacion_evento`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
