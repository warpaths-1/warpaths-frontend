import client from './client';

export const getScenarios = (params) => client.get('/v1/scenarios', { params }).then(r => r.data);
export const getScenario = (id) => client.get(`/v1/scenarios/${id}`).then(r => r.data);
