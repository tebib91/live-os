import axios from './index';

class ContainersApi {
  static All = () => {
    const user = JSON.parse(localStorage.getItem('user')) as any;

    return axios.get(`${base}/all`, {
      headers: { Authorization: `${user.token}` },
    });
  };

  static startContainer = (id: string) => {
    return axios.post(`${base}/${id}/start`);
  };

  static stopContainer = (id: string) => {
    return axios.post(`${base}/${id}/start`);
  };
}

let base = 'containers';

export default ContainersApi;
