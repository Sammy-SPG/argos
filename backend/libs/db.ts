import "dotenv/config";
import { PrismaClient, type Prisma } from "../generated/prisma/client.js";
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

declare global {
    var db: PrismaClient | undefined;
}

const adapter = new PrismaMariaDb({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    connectionLimit: 5
});

const log = process.env.NODE_ENV === 'development' ? (['query'] as (Prisma.LogLevel | Prisma.LogDefinition)[]) : undefined;

const db = global.db || new PrismaClient({ adapter, log });

export default db;

if (process.env.NODE_ENV !== 'production') global.db = db;
