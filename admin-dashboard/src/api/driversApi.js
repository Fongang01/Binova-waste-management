import client from './client'

export const getDrivers = (params) => client.get('/drivers', { params })
export const getDriver = (id) => client.get(`/drivers/${id}`)
export const createDriver = (data) => client.post('/drivers', data)
export const updateDriver = (id, data) => client.put(`/drivers/${id}`, data)
export const patchDriverStatus = (id, status) => client.patch(`/drivers/${id}/status`, { status })
export const deleteDriver = (id) => client.delete(`/drivers/${id}`)
