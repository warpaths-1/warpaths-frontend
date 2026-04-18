import client from './client';

export const getUser = (id) =>
  client.get(`/v1/users/${id}`).then(r => r.data);
export const patchUser = (id, data) => client.patch(`/v1/users/${id}`, data).then(r => r.data);
export const deleteUser = (id) => client.delete(`/v1/users/${id}`);
