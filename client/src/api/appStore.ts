import axios from "./index";

class AppStoreApi {
  static All = () => {
    const user = JSON.parse(localStorage.getItem("user")) as any;

    return axios.get(`${base}/all`, {
      headers: { Authorization: `${user.token}` },
    });
  };
}

let base = "apps";

export default AppStoreApi;
