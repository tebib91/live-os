export default class Container {
  id: string;
  names: string[];
  labels: ContainerLabels;
  image: string;
  status: string;
}

export interface ContainerLabels {
  project: string;
  service: string;
  version: string;
  imageName: string;
  imageVersion: string;
}
