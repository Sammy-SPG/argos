import { Injectable } from '@nestjs/common';
import db from '../libs/db';

@Injectable()
export class AppService {
  async getHellos(): Promise<string> {
    const usuarios = await db.usuario.findMany({});

    console.log('Usuarios:', usuarios);
    return 'Hello Pilar!';
  }
}
