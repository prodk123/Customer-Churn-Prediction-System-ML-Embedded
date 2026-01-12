import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
});

export async function uploadCsv({ file, email, columnMapping }) {
  const form = new FormData();
  form.append("file", file);
  form.append("user_email", email || "demo@example.com");

  if (columnMapping) {
    form.append("column_mapping", JSON.stringify(columnMapping));
  }

  const res = await api.post("/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data;
}

export async function fetchResults(uploadId) {
  const res = await api.get(`/results/${uploadId}`);
  return res.data;
}

export default api;
