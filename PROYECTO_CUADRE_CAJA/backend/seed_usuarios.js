import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { createUser } from './src/repositories/usuario.repository.js';
import { query } from './src/repositories/base.repository.js';

const usuarios = [
  // ADMINISTRADORES
  { nombres: 'Andrea', apellidos: 'Martínez Flores', usuario: 'andrea', rol: 'ADMINISTRADOR', condicion: 'PRAC.' },
  { nombres: 'María del Rocío', apellidos: 'Astocaza Flores', usuario: 'rocio', rol: 'ADMINISTRADOR', condicion: 'Administrativo' },
  { nombres: 'Jefferson', apellidos: 'Barraza Garay', usuario: 'jefferson', rol: 'ADMINISTRADOR', condicion: 'Administrativo' },

  // USUARIOS DE REGISTRO
  { nombres: 'Angely Massiel', apellidos: 'Moreyra Vásquez', usuario: 'angely', rol: 'USUARIO DE REGISTRO', condicion: 'Personal' },
  { nombres: 'Grettel Yanet', apellidos: 'Siguas Henríquez', usuario: 'grettel', rol: 'USUARIO DE REGISTRO', condicion: 'PRAC.' },
  { nombres: 'Zooe Fiorella', apellidos: 'Quispe Tasayco', usuario: 'zooe', rol: 'USUARIO DE REGISTRO', condicion: 'PRAC.' }
];

const run = async () => {
  try {
    const seedPassword = process.env.SEED_PASSWORD;
    if (!seedPassword) {
      throw new Error('La variable de entorno SEED_PASSWORD es obligatoria');
    }

    const rolesRes = await query(`SELECT id_rol, nombre FROM rol`);
    const rolesMap = {};
    rolesRes.rows.forEach(r => rolesMap[r.nombre] = r.id_rol);

    const passwordHash = await bcrypt.hash(seedPassword, 10);

    for (const u of usuarios) {
      const idRol = rolesMap[u.rol];
      if (!idRol) {
        console.error(`Rol no encontrado en la BD: ${u.rol}`);
        continue;
      }
      
      try {
        await createUser({
          id_rol: idRol,
          nombres: u.nombres,
          apellidos: u.apellidos,
          usuario: u.usuario,
          password_hash: passwordHash,
          condicion_personal: u.condicion
        });
        console.log(`Usuario creado: ${u.usuario} -> ${u.rol}`);
      } catch (err) {
        if (err.code === '23505') {
          console.log(`El usuario '${u.usuario}' ya existe.`);
        } else {
          console.error(`Error creando a ${u.usuario}:`, err.message);
        }
      }
    }
    console.log('\nProceso de creación de usuarios terminado.');
    process.exit(0);
  } catch (error) {
    console.error('Error general:', error);
    process.exit(1);
  }
};

run();