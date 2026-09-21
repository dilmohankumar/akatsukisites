import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Every backend error follows { success:false, message, errors } — surface `message` consistently.
client.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message = err.response?.data?.message || 'Something went wrong. Please try again.';
    const errors = err.response?.data?.errors || [];
    return Promise.reject({ message, errors, status: err.response?.status });
  }
);

export default client;
