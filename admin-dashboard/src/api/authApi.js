import client from './client'

export async function login(email, password){
  const resp = await client.post('/auth/login', { email, password })
  return resp.data
}

export async function getProfile(){
  const resp = await client.get('/auth/me')
  return resp.data
}

export async function updateProfile(data){
  const resp = await client.put('/auth/profile', data)
  return resp.data
}

export async function changePassword(currentPassword, newPassword){
  const resp = await client.put('/auth/change-password', { currentPassword, newPassword })
  return resp.data
}

