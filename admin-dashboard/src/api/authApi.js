import client from './client'

export async function login(email, password){
  const resp = await client.post('/auth/login', { email, password })
  return resp.data
}
