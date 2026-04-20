import client from './client';

export const ingestReport = (file) => {
  const form = new FormData();
  form.append('pdf', file);
  return client.post('/v1/report-extractions', form).then(r => r.data);
};

export const getReportExtraction = (id) =>
  client.get(`/v1/report-extractions/${id}`).then(r => r.data);

export const getClientExtractions = (clientId, params) =>
  client.get(`/v1/clients/${clientId}/extractions`, { params }).then(r => r.data);

export const getClientExtraction = (clientId, id) =>
  client.get(`/v1/clients/${clientId}/extractions/${id}`).then(r => r.data);

export const patchClientExtraction = (clientId, id, data) =>
  client.patch(`/v1/clients/${clientId}/extractions/${id}`, data).then(r => r.data);

export const deleteClientExtraction = (clientId, id) =>
  client.delete(`/v1/clients/${clientId}/extractions/${id}`);

export const applyTag = (clientId, extractionId, tagId) =>
  client.post(`/v1/clients/${clientId}/extractions/${extractionId}/tags`, { tag_id: tagId }).then(r => r.data);

export const removeTag = (clientId, extractionId, tagId) =>
  client.delete(`/v1/clients/${clientId}/extractions/${extractionId}/tags/${tagId}`);

export const getClientTags = (clientId) =>
  client.get(`/v1/clients/${clientId}/tags`).then(r => r.data);

export const createClientTag = (clientId, data) =>
  client.post(`/v1/clients/${clientId}/tags`, data).then(r => r.data);

export const getClient = (clientId) =>
  client.get(`/v1/clients/${clientId}`).then(r => r.data);
