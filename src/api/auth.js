import client from './client';

export const login = (data) => client.post('/auth/login', data).then(r => r.data);
export const register = (data) => client.post('/auth/register', data).then(r => r.data);
export const changePassword = (data) => client.post('/auth/change-password', data).then(r => r.data);
