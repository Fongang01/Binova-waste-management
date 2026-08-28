import client from './client'

export const getCollectionTasks = (params) => client.get('/collection-tasks', { params })
export const getCollectionTask = (id) => client.get(`/collection-tasks/${id}`)
export const createCollectionTask = (data) => client.post('/collection-tasks', data)
export const updateCollectionTask = (id, data) => client.put(`/collection-tasks/${id}`, data)
export const patchCollectionTaskStatus = (id, status) => client.patch(`/collection-tasks/${id}/status`, { status })
export const deleteCollectionTask = (id) => client.delete(`/collection-tasks/${id}`)

