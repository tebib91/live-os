import axios from './index';

const BASE_URL = 'containers';

class ContainersApi {
  static getHeaders() {
    const user = JSON.parse(localStorage.getItem('user')) as { token: string };
    return {
      headers: { Authorization: `${user.token}` },
    };
  }
  static readonly getAllContainers = async () => {
    console.log({ test: ContainersApi.getHeaders() });

    try {
      const response = await axios.get(
        `${BASE_URL}/all`,
        ContainersApi.getHeaders()
      );
      console.log('Successfully fetched all containers:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching all containers:', error);
      throw error;
    }
  };

  static readonly startContainer = async (id: string) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/${id}/start`,
        {},
        ContainersApi.getHeaders()
      );
      console.log(`Successfully started container ${id}:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Error starting container ${id}:`, error);
      throw error;
    }
  };

  static readonly stopContainer = async (id: string) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/${id}/stop`,
        {},
        ContainersApi.getHeaders()
      );
      console.log(`Successfully stopped container ${id}:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Error stopping container ${id}:`, error);
      throw error;
    }
  };
}

export default ContainersApi;
