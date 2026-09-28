-- CreateTable
CREATE TABLE `usuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `apellido` VARCHAR(191) NOT NULL,
    `contrasena_has` VARCHAR(191) NOT NULL,
    `estado` ENUM('activo', 'inactivo', 'bloquedo', 'eliminado') NOT NULL,
    `rol` ENUM('administrador', 'gerente', 'operador') NOT NULL,
    `creado` DATETIME(3) NOT NULL,
    `actualizado` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
