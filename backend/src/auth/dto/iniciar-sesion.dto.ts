import { IsByteLength, IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Datos necesarios para iniciar una sesión con número de control y contraseña. */
export class IniciarSesionDto {
  @IsString({ message: 'El número de control debe ser texto.' })
  @IsNotEmpty({ message: 'El número de control es obligatorio.' })
  @MaxLength(191, { message: 'El número de control es demasiado largo.' })
  numeroControl!: string;

  // bcrypt admite hasta 72 bytes; el límite evita truncar contraseñas UTF-8.
  @IsString({ message: 'La contraseña debe ser texto.' })
  @IsByteLength(1, 72, {
    message: 'La contraseña debe ocupar entre 1 y 72 bytes.',
  })
  contrasena!: string;
}
