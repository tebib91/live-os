import axios from "./index";

class SystemApi {
  static getUtilizationSystem = () => {
    const user = JSON.parse(localStorage.getItem("user")) as any;

    return axios.get(`${base}/utilization`, {
      headers: { Authorization: `${user.token}` },
    });
  };
}

let base = "system";

export default SystemApi;
