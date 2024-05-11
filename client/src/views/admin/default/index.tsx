// Chakra imports
import {
  Box,
  Flex,
  Grid,
  Icon,
  SimpleGrid,
  useColorModeValue,
  Text,
} from '@chakra-ui/react';
// Assets
// Custom components
import MiniStatistics from 'components/card/MiniStatistics';
import IconBox from 'components/icons/IconBox';
import {
  MdAddTask,
} from 'react-icons/md';
import ContainersApi from 'api/containers';
import Container from 'models/containers';
import { useEffect, useState } from 'react';
import Banner from '../marketplace/components/Banner';
import Card from 'components/card/Card';
import UtilizationCard from './components/UtilizationCard';

export default function UserReports() {
  // Chakra Color Mode
  const brandColor = useColorModeValue('brand.500', 'white');
  const boxBg = useColorModeValue('secondaryGray.300', 'whiteAlpha.100');
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const textColorBrand = useColorModeValue('brand.500', 'white');

  const [containers, setContainers] = useState([]);

  useEffect(() => {
    // Fetch containers when the component mounts
    const fetchContainers = async () => {
      try {
        const response = await ContainersApi.All();
        console.log({ res: response.data });

        setContainers(response.data); // Assuming the response data is an array of container objects
      } catch (error) {
        console.error('Error fetching containers:', error);
      }
    };

    fetchContainers();
  }, []);

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Grid
        mb="20px"
        gridTemplateColumns={{ xl: 'repeat(3, 1fr)', '2xl': '1fr 0.46fr' }}
        gap={{ base: '20px', xl: '20px' }}
        display={{ base: 'block', xl: 'grid' }}
      >
        <Flex
          flexDirection="column"
          gridArea={{ xl: '1 / 1 / 2 / 3', '2xl': '1 / 1 / 2 / 2' }}
        >
          <Banner />
          <Flex direction="column">
            <Flex
              mt="45px"
              mb="20px"
              justifyContent="space-between"
              direction={{ base: 'column', md: 'row' }}
              align={{ base: 'start', md: 'center' }}
            >
              <Text color={textColor} fontSize="2xl" ms="24px" fontWeight="700">
                Apps
              </Text>
            </Flex>
            <SimpleGrid
              columns={{ base: 1, md: 2, lg: 3 }}
              gap="20px"
              mb="20px"
            >
              {containers.map((container: Container) => (
                <MiniStatistics
                  key={container.id}
                  startContent={
                    <IconBox
                      w="42px"
                      h="42px"
                      bg="linear-gradient(90deg, #4481EB 0%, #04BEFE 100%)"
                      icon={
                        <Icon w="28px" h="28px" as={MdAddTask} color="white" />
                      }
                    />
                  }
                  name={`${container.labels.service}:${container.labels.project}`}
                  value={container.status}
                />
              ))}
            </SimpleGrid>
          </Flex>
        </Flex>
        <Flex
          flexDirection="column"
          gridArea={{ xl: '1 / 3 / 2 / 4', '2xl': '1 / 2 / 2 / 3' }}
        >
          <Card px="0px" mb="20px">
            <UtilizationCard />
          </Card>
        </Flex>
      </Grid>
    </Box >
  );
}
