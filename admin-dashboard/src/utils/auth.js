export function saveSession(token, user){
  sessionStorage.setItem('binova_token', token)
  sessionStorage.setItem('binova_user', JSON.stringify(user))
}

export function clearSession(){
  sessionStorage.removeItem('binova_token')
  sessionStorage.removeItem('binova_user')
}

export function getSession(){
  const token = sessionStorage.getItem('binova_token')
  const user = sessionStorage.getItem('binova_user')
  return { token, user: user ? JSON.parse(user) : null }
}
