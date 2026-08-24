import client from './client'

export const getTrucks = (params) => client.get('/trucks', { params })
export const getTruck = (id) => client.get(`/trucks/${id}`)
export const createTruck = (data) => client.post('/trucks', data)
export const updateTruck = (id, data) => client.put(`/trucks/${id}`, data)
export const patchTruckStatus = (id, status) => client.patch(`/trucks/${id}/status`, { status })
export const deleteTruck = (id) => client.delete(`/trucks/${id}`)
