/*
  Warnings:

  - The values [bloquedo] on the enum `usuario_estado` will be removed. If these variants are still used in the database, this will fail.
  - You are about to alter the column `creado` on the `usuario` table. The data in that column could be lost. The data in that column will be cast from `DateTime(3)` to `DateTime(0)`.
  - You are about to alter the column `actualizado` on the `usuario` table. The data in that column could be lost. The data in that column will be cast from `DateTime(3)` to `DateTime(0)`.

*/
-- AlterTable
ALTER TABLE `usuario` MODIFY `estado` ENUM('activo', 'inactivo', 'bloqueado', 'eliminado') NOT NULL,
    MODIFY `creado` DATETIME(0) NOT NULL,
    MODIFY `actualizado` DATETIME(0) NOT NULL;

-- CreateTable
CREATE TABLE `dispositivo_usuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `tipo` ENUM('android', 'ios', 'escritorio') NOT NULL,
    `token` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permiso_usuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `modulo` VARCHAR(191) NOT NULL,
    `controlador` VARCHAR(191) NOT NULL,
    `creado` DATETIME(0) NOT NULL,
    `actualizado` DATETIME(0) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plantilla_permiso` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rol` ENUM('administrador', 'gerente', 'operador') NOT NULL,
    `modulo` VARCHAR(191) NOT NULL,
    `controlador` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bloqueo_usuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `fecha` DATETIME(0) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuario_sucursal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sucursal_id` INTEGER NOT NULL,
    `usuario_id` INTEGER NOT NULL,
    `creado` DATETIME(0) NOT NULL,
    `actualizado` DATETIME(0) NOT NULL,

    UNIQUE INDEX `usuario_sucursal_usuario_id_key`(`usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sucursal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `estado` ENUM('activa', 'inactiva') NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `estado` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `clave` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `municipio` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `clave` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `direccion_sucursal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `estado_id` INTEGER NOT NULL,
    `municipio_id` INTEGER NOT NULL,
    `sucursal_id` INTEGER NOT NULL,
    `cp` VARCHAR(5) NOT NULL,
    `colonia` VARCHAR(30) NOT NULL,
    `calle` VARCHAR(30) NOT NULL,
    `numero` VARCHAR(10) NOT NULL,

    UNIQUE INDEX `direccion_sucursal_sucursal_id_key`(`sucursal_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `descanso_sucursal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sucursal_id` INTEGER NOT NULL,
    `dia` INTEGER NOT NULL,
    `mes` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `horario_semanal_sucursal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sucursal_id` INTEGER NOT NULL,
    `dia` ENUM('lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo') NOT NULL,
    `entrada` TIME(0) NOT NULL,
    `salida` TIME(0) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contacto_sucursal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sucursal_id` INTEGER NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `telefono` VARCHAR(10) NOT NULL,
    `correo` VARCHAR(60) NOT NULL,
    `rol` ENUM('emergencia', 'seguridad', 'administrativo') NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `particion_sucursal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sucursal_id` INTEGER NOT NULL,
    `codigo_cuenta` VARCHAR(191) NOT NULL,
    `estado` ENUM('activa', 'inactiva') NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `zona_particion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `particion_id` INTEGER NOT NULL,
    `sucursal_id` INTEGER NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NOT NULL,
    `estado` ENUM('activa', 'inactiva') NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sensor_zona` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `zona_particion_id` INTEGER NOT NULL,
    `numero_serie` VARCHAR(191) NOT NULL,
    `etiqueta` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NOT NULL,
    `estado` ENUM('activo', 'inactivo', 'mantenimiento', 'eliminado') NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `camara_zona` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `zonas_particion_id` INTEGER NOT NULL,
    `prioridad` INTEGER NOT NULL,
    `ip` VARCHAR(191) NOT NULL,
    `url_stream` VARCHAR(191) NOT NULL,
    `estado` ENUM('activa', 'inactiva', 'mantenimiento', 'eliminada') NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `evento_sucursal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sucursal_id` INTEGER NOT NULL,
    `zona_particion_id` INTEGER NOT NULL,
    `tipo` ENUM('alerta', 'incidente', 'emergencia') NOT NULL,
    `anomalia` ENUM('intrusión', 'incendio', 'falla_sistema') NOT NULL,
    `estado` ENUM('activo', 'inactivo', 'en_resolución', 'resuelto') NOT NULL,
    `creado` DATETIME(0) NOT NULL,
    `actualizado` DATETIME(0) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notificacion_evento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `evento_sucursal_id` INTEGER NOT NULL,
    `dispositivo_usuario_id` INTEGER NOT NULL,
    `enviado` DATETIME(0) NOT NULL,
    `recibido` DATETIME(0) NOT NULL,
    `abierto` DATETIME(0) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `resolucion_evento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `evento_sucursal_id` INTEGER NOT NULL,
    `usuario_id` INTEGER NOT NULL,
    `accion` ENUM('resuelto', 'ignorado', 'escalado') NOT NULL,
    `comentarios` TEXT NOT NULL,
    `creado` DATETIME(0) NOT NULL,
    `actualizado` DATETIME(0) NOT NULL,

    UNIQUE INDEX `resolucion_evento_evento_sucursal_id_key`(`evento_sucursal_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `dispositivo_usuario` ADD CONSTRAINT `dispositivo_usuario_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `permiso_usuario` ADD CONSTRAINT `permiso_usuario_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bloqueo_usuario` ADD CONSTRAINT `bloqueo_usuario_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuario_sucursal` ADD CONSTRAINT `usuario_sucursal_sucursal_id_fkey` FOREIGN KEY (`sucursal_id`) REFERENCES `sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuario_sucursal` ADD CONSTRAINT `usuario_sucursal_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `direccion_sucursal` ADD CONSTRAINT `direccion_sucursal_estado_id_fkey` FOREIGN KEY (`estado_id`) REFERENCES `estado`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `direccion_sucursal` ADD CONSTRAINT `direccion_sucursal_municipio_id_fkey` FOREIGN KEY (`municipio_id`) REFERENCES `municipio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `direccion_sucursal` ADD CONSTRAINT `direccion_sucursal_sucursal_id_fkey` FOREIGN KEY (`sucursal_id`) REFERENCES `sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `descanso_sucursal` ADD CONSTRAINT `descanso_sucursal_sucursal_id_fkey` FOREIGN KEY (`sucursal_id`) REFERENCES `sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `horario_semanal_sucursal` ADD CONSTRAINT `horario_semanal_sucursal_sucursal_id_fkey` FOREIGN KEY (`sucursal_id`) REFERENCES `sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contacto_sucursal` ADD CONSTRAINT `contacto_sucursal_sucursal_id_fkey` FOREIGN KEY (`sucursal_id`) REFERENCES `sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `particion_sucursal` ADD CONSTRAINT `particion_sucursal_sucursal_id_fkey` FOREIGN KEY (`sucursal_id`) REFERENCES `sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `zona_particion` ADD CONSTRAINT `zona_particion_particion_id_fkey` FOREIGN KEY (`particion_id`) REFERENCES `particion_sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `zona_particion` ADD CONSTRAINT `zona_particion_sucursal_id_fkey` FOREIGN KEY (`sucursal_id`) REFERENCES `sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sensor_zona` ADD CONSTRAINT `sensor_zona_zona_particion_id_fkey` FOREIGN KEY (`zona_particion_id`) REFERENCES `zona_particion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `camara_zona` ADD CONSTRAINT `camara_zona_zonas_particion_id_fkey` FOREIGN KEY (`zonas_particion_id`) REFERENCES `zona_particion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evento_sucursal` ADD CONSTRAINT `evento_sucursal_sucursal_id_fkey` FOREIGN KEY (`sucursal_id`) REFERENCES `sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evento_sucursal` ADD CONSTRAINT `evento_sucursal_zona_particion_id_fkey` FOREIGN KEY (`zona_particion_id`) REFERENCES `zona_particion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notificacion_evento` ADD CONSTRAINT `notificacion_evento_evento_sucursal_id_fkey` FOREIGN KEY (`evento_sucursal_id`) REFERENCES `evento_sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notificacion_evento` ADD CONSTRAINT `notificacion_evento_dispositivo_usuario_id_fkey` FOREIGN KEY (`dispositivo_usuario_id`) REFERENCES `dispositivo_usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resolucion_evento` ADD CONSTRAINT `resolucion_evento_evento_sucursal_id_fkey` FOREIGN KEY (`evento_sucursal_id`) REFERENCES `evento_sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resolucion_evento` ADD CONSTRAINT `resolucion_evento_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
