import client from './client'

export const getBins = (params) => client.get('/bins', { params })
export const getBin = (id) => client.get(`/bins/${id}`)
export const createBin = (data) => client.post('/bins', data)
export const updateBin = (id, data) => client.put(`/bins/${id}`, data)
export const deleteBin = (id) => client.delete(`/bins/${id}`)
export const patchBinStatus = (id, status) => client.patch(`/bins/${id}/status`, { status })
