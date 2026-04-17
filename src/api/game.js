import client from './client';

export const getGame = (id) => client.get(`/v1/games/${id}`).then(r => r.data);
export const getContentItems = (gameId) => client.get(`/v1/games/${gameId}/content-items`).then(r => r.data);
export const consultAdvisor = (gameId, data) => client.post(`/v1/games/${gameId}/advisor`, data).then(r => r.data);
export const submitAction = (gameId, data) => client.post(`/v1/games/${gameId}/actions`, data).then(r => r.data);
export const getEval = (gameId) => client.get(`/v1/games/${gameId}/eval`).then(r => r.data);
