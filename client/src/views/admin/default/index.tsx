/*!
  _   _  ___  ____  ___ ________  _   _   _   _ ___   
 | | | |/ _ \|  _ \|_ _|__  / _ \| \ | | | | | |_ _| 
 | |_| | | | | |_) || |  / / | | |  \| | | | | || | 
 |  _  | |_| |  _ < | | / /| |_| | |\  | | |_| || |
 |_| |_|\___/|_| \_\___/____\___/|_| \_|  \___/|___|
                                                                                                                                                                                                                                                                                                                                       
=========================================================
* Horizon UI - v1.1.0
=========================================================

* Product Page: https://www.horizon-ui.com/
* Copyright 2022 Horizon UI (https://www.horizon-ui.com/)

* Designed and Coded by Simmmple

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/

// Chakra imports
import {
  Avatar,
  Box,
  Flex,
  FormLabel,
  Grid,
  Icon,
  Select,
  SimpleGrid,
  useColorModeValue,
  Text,
} from '@chakra-ui/react';
// Assets
import Usa from 'assets/img/dashboards/usa.png';
// Custom components
import MiniCalendar from 'components/calendar/MiniCalendar';
import MiniStatistics from 'components/card/MiniStatistics';
import IconBox from 'components/icons/IconBox';
import {
  MdAddTask,
  MdAttachMoney,
  MdBarChart,
  MdFileCopy,
} from 'react-icons/md';
import CheckTable from 'views/admin/rtl/components/CheckTable';
import ComplexTable from 'views/admin/default/components/ComplexTable';
import DailyTraffic from 'views/admin/default/components/DailyTraffic';
import PieCard from 'views/admin/default/components/PieCard';
import Tasks from 'views/admin/default/components/Tasks';
import TotalSpent from 'views/admin/default/components/TotalSpent';
import WeeklyRevenue from 'views/admin/default/components/WeeklyRevenue';
import tableDataCheck from 'views/admin/default/variables/tableDataCheck';
import tableDataComplex from 'views/admin/default/variables/tableDataComplex';
import ContainersApi from 'api/containers';
import Container from 'models/containers';
import { useEffect, useState } from 'react';
import Banner from '../marketplace/components/Banner';
import Card from 'components/card/Card';

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
                  name={container.names}
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
          <Card px="0px" mb="20px"></Card>
        </Flex>
      </Grid>
    </Box>
  );
}
// <SimpleGrid
//   columns={{ base: 1, md: 2, lg: 3, '2xl': 6 }}
//   gap="20px"
//   mb="20px"
// >
//   {containers.map((container: Container) => (
//     <MiniStatistics
//       key={container.id}
//       startContent={
//         <IconBox
//           w="42px"
//           h="42px"
//           bg="linear-gradient(90deg, #4481EB 0%, #04BEFE 100%)"
//           icon={<Icon w="28px" h="28px" as={MdAddTask} color="white" />}
//         />
//       }
//       name={container.names}
//       value={container.status}
//     />
//   ))}
// </SimpleGrid>;
