import client from './client'

export const getAiPlanRecommendation = (payload) => client.post('/ai-planning/recommend', payload)
export const approveAiPlan = (payload) => client.post('/ai-planning/approve', payload)
