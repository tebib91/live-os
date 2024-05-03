import axios from "./index";

class ContainersApi {
  static All = () => {
    return axios.get(`${base}/all`);
  };

  static startContainer = (id: string) => {
    return axios.post(`${base}/${id}/start`);
  };

  static stopContainer = (id: string) => {
    return axios.post(`${base}/${id}/start`);
  };
}

let base = "containers";

export default ContainersApi;
