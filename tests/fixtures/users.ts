export const adminUser = {
  id: 1,
  username: 'admin',
  email: 'admin@creencia.coffee',
  password: 'Admin123!',
  role: 'admin',
  active: true,
};

export const adminUserInactive = {
  id: 2,
  username: 'inactive',
  email: 'inactive@creencia.coffee',
  password: 'Admin123!',
  role: 'admin',
  active: false,
};

export const validCredentials = {
  username: 'admin',
  password: 'Admin123!',
};

export const invalidCredentials = {
  username: 'wrong',
  password: 'wrongpass',
};

export const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';

export const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired';