import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

let targetUser;
let passwordUpdate;

mock.module('../src/repositories/usuario.repository.js', {
  namedExports: {
    findAllUsers: async () => [],
    findUserById: async (idUsuario) =>
      Number(idUsuario) === Number(targetUser.id_usuario) ? targetUser : null,
    createUser: async () => null,
    updateUser: async () => null,
    updateEstado: async () => null,
    updatePassword: async (...args) => {
      passwordUpdate = args;
      return { id_usuario: args[0] };
    },
    existsByUsername: async () => false,
    deleteUser: async () => null,
  },
});

mock.module('../src/repositories/rol.repository.js', {
  namedExports: { findRoleById: async () => null },
});

const { resetearPassword } = await import('../src/services/usuario.service.js');

test.beforeEach(() => {
  targetUser = { id_usuario: 1, id_rol: 1 };
  passwordUpdate = null;
});

test('allows an administrator to change their own password', async () => {
  await resetearPassword(1, 'new-password', { id_usuario: 1, id_rol: 1 });

  assert.equal(passwordUpdate[0], 1);
});

test('rejects an administrator changing another administrator password', async () => {
  targetUser = { id_usuario: 2, id_rol: 1 };

  await assert.rejects(
    resetearPassword(2, 'new-password', { id_usuario: 1, id_rol: 1 }),
    { statusCode: 403 },
  );
  assert.equal(passwordUpdate, null);
});

test('allows an administrator to change a non-administrator password', async () => {
  targetUser = { id_usuario: 2, id_rol: 3 };

  await resetearPassword(2, 'new-password', { id_usuario: 1, id_rol: 1 });

  assert.equal(passwordUpdate[0], 2);
});
