import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'
import fs from 'node:fs'

const dbConfig = defineConfig({
  connection: 'postgres',
  connections: {
    postgres: {
      client: 'pg',
      connection: {
        // connectionString: env.get('DATABASE_URL'),
        ssl: {
          rejectUnauthorized: false,
          ca: fs.readFileSync(env.get('CA'), 'utf8'),
        },
        host: env.get('DB_HOST'),
        port: env.get('DB_PORT'),
        user: env.get('DB_USER'),
        password: env.get('DB_PASSWORD'),
        database: env.get('DB_DATABASE'),
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
    },
  },
})

export default dbConfig
