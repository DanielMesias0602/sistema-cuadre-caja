import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

try {
  await client.connect();

  const result = await client.query('SELECT current_database(), current_user;');

  console.log('CONEXION EXITOSA');
  console.log('Base de datos:', result.rows[0].current_database);
  console.log('Usuario:', result.rows[0].current_user);

  await client.end();
} catch (error) {
  console.error('ERROR DE CONEXION');
  console.error(error.message);
  process.exit(1);
}