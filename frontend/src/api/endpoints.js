import api from './client.js';

const unwrap = (p) => p.then((r) => r.data.data);
const unwrapFull = (p) => p.then((r) => r.data);

export const authApi = {
  register: (payload) => unwrap(api.post('/auth/register', payload)),
  login: (payload) => unwrap(api.post('/auth/login', payload)),
  logout: () => unwrap(api.post('/auth/logout')),
  logoutAll: () => unwrap(api.post('/auth/logout-all')),
  me: () => unwrap(api.get('/auth/me')),
  refresh: () => unwrap(api.post('/auth/refresh')),
  forgotPassword: (email) => unwrap(api.post('/auth/forgot-password', { email })),
  resetPassword: (payload) => unwrap(api.post('/auth/reset-password', payload)),
  changePassword: (payload) => unwrap(api.post('/auth/change-password', payload)),
};

export const userApi = {
  list: (params) => unwrapFull(api.get('/users', { params })),
  get: (id) => unwrap(api.get(`/users/${id}`)),
  updateMe: (payload) => unwrap(api.patch('/users/me', payload)),
  updateRole: (id, role) => unwrap(api.patch(`/users/${id}/role`, { role })),
  remove: (id) => unwrap(api.delete(`/users/${id}`)),
  workload: () => unwrap(api.get('/users/workload')),
};

export const projectApi = {
  list: (params) => unwrapFull(api.get('/projects', { params })),
  get: (id) => unwrap(api.get(`/projects/${id}`)),
  create: (payload) => unwrap(api.post('/projects', payload)),
  update: (id, payload) => unwrap(api.patch(`/projects/${id}`, payload)),
  remove: (id) => unwrap(api.delete(`/projects/${id}`)),
  addMember: (id, payload) => unwrap(api.post(`/projects/${id}/members`, payload)),
  removeMember: (id, userId) => unwrap(api.delete(`/projects/${id}/members/${userId}`)),
  milestones: (id) => unwrap(api.get(`/projects/${id}/milestones`)),
  createMilestone: (id, payload) => unwrap(api.post(`/projects/${id}/milestones`, payload)),
  updateMilestone: (id, mid, payload) => unwrap(api.patch(`/projects/${id}/milestones/${mid}`, payload)),
  removeMilestone: (id, mid) => unwrap(api.delete(`/projects/${id}/milestones/${mid}`)),
};

export const taskApi = {
  list: (params) => unwrapFull(api.get('/tasks', { params })),
  get: (id) => unwrap(api.get(`/tasks/${id}`)),
  create: (payload) => unwrap(api.post('/tasks', payload)),
  update: (id, payload) => unwrap(api.patch(`/tasks/${id}`, payload)),
  move: (id, payload) => unwrap(api.patch(`/tasks/${id}/move`, payload)),
  remove: (id) => unwrap(api.delete(`/tasks/${id}`)),
  addChecklistItem: (id, text) => unwrap(api.post(`/tasks/${id}/checklist`, { text })),
  toggleChecklistItem: (id, itemId) => unwrap(api.patch(`/tasks/${id}/checklist/${itemId}`)),
  removeChecklistItem: (id, itemId) => unwrap(api.delete(`/tasks/${id}/checklist/${itemId}`)),
  comments: (id) => unwrap(api.get(`/tasks/${id}/comments`)),
  addComment: (id, payload) => unwrap(api.post(`/tasks/${id}/comments`, payload)),
};

export const commentApi = {
  update: (id, body) => unwrap(api.patch(`/comments/${id}`, { body })),
  remove: (id) => unwrap(api.delete(`/comments/${id}`)),
};

export const notificationApi = {
  list: (params) => unwrap(api.get('/notifications', { params })),
  markRead: (id) => unwrap(api.patch(`/notifications/${id}/read`)),
  markAllRead: () => unwrap(api.patch('/notifications/read-all')),
  remove: (id) => unwrap(api.delete(`/notifications/${id}`)),
};

export const analyticsApi = {
  dashboard: () => unwrap(api.get('/analytics/dashboard')),
  productivity: (params) => unwrap(api.get('/analytics/productivity', { params })),
  project: (id) => unwrap(api.get(`/analytics/projects/${id}`)),
};

export const goalApi = {
  list: () => unwrap(api.get('/goals')),
  create: (payload) => unwrap(api.post('/goals', payload)),
  update: (id, payload) => unwrap(api.patch(`/goals/${id}`, payload)),
  remove: (id) => unwrap(api.delete(`/goals/${id}`)),
};

export const timeApi = {
  list: () => unwrap(api.get('/time')),
  running: () => unwrap(api.get('/time/running')),
  start: (task) => unwrap(api.post('/time/start', { task })),
  stop: () => unwrap(api.post('/time/stop')),
  manual: (payload) => unwrap(api.post('/time/manual', payload)),
};

export const systemApi = {
  health: () => unwrap(api.get('/health')),
  search: (q) => unwrap(api.get('/search', { params: { q } })),
  activity: (params) => unwrap(api.get('/activity', { params })),
  adminOverview: () => unwrap(api.get('/admin/overview')),
};
