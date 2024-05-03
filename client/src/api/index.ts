import Axios from "axios";
import { API_SERVER } from "../config/constant";

const axios = Axios.create({
  baseURL: `${API_SERVER}`,
  headers: { "Content-Type": "application/json" },
});

axios.interceptors.request.use(
  (config: any) => {
    return Promise.resolve(config);
  },
  (error: any) => Promise.reject(error)
);

axios.interceptors.response.use(
  (response: any) => Promise.resolve(response),
  (error: any) => {
    return Promise.reject(error);
  }
);

export default axios;
