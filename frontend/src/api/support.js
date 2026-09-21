import client from './client.js';

export const createTicket = (payload) => client.post('/support', payload).then((res) => res.data);
