// Chakra imports
import { Box, Button, Flex, Icon, Text, useColorModeValue } from '@chakra-ui/react';

// Custom components
import PieChart from 'components/charts/PieChart';
import { pieChartData, pieChartOptions } from 'variables/charts';
import { VSeparator } from 'components/separator/Separator';
import { useEffect, useState } from 'react';
import SystemApi from 'api/system';
import RadialChart from 'components/charts/RadialChart';

import SystemInfo, { NetworkInterface } from 'models/system'
// Custom components
import Card from 'components/card/Card';
import LineChart from 'components/charts/LineChart';
import { IoCheckmarkCircle } from 'react-icons/io5';
import { MdBarChart, MdOutlineCalendarToday } from 'react-icons/md';
// Assets
import { RiArrowUpSFill } from 'react-icons/ri';
import { lineChartDataTotalSpent, lineChartOptionsTotalSpent } from 'variables/charts';

const Conversion: React.FC<Record<string, any>> = (props) => {
    const { ...rest } = props;

    const [systemUtilization, setSystemUtilization] = useState<SystemInfo | null>(null);
    // const [lineChartData, setLineChartData] = useState<any[]>([]);
    const [RadialChartData, setRadialChartData] = useState<any[]>([]);

    useEffect(() => {
        const fetchSystemUtilization = async () => {
            try {
                const response = await SystemApi.getUtilizationSystem();
                setSystemUtilization(response.data);
            } catch (error) {
                console.error('Error fetching system utilization:', error);
            }
        };

        // Fetch system utilization data when the component mounts
        fetchSystemUtilization();

        // // Optionally, you can also set up polling to fetch data at regular intervals
        // const intervalId = setInterval(fetchSystemUtilization, 5000); // Fetch data every 5 seconds

        // return () => {
        //     // Clean up interval when the component unmounts
        //     clearInterval(intervalId);
        // };
    }, []); // No dependencies, so it runs only once on mount


    useEffect(() => {
        if (systemUtilization) {
            const cpuUsage = systemUtilization?.cpu.percent
            const memoryUsage = systemUtilization?.mem.usedPercent
            const chartData: any[] = [
                { name: 'CPU', data: cpuUsage! },
                { name: 'Memory', data: memoryUsage! },
            ];
            setRadialChartData(chartData)
        }

    }, [systemUtilization]);

    useEffect(() => {
        console.log({ RadialChartData, systemUtilization });
    }, [])

    const chartOptions = {
        labels: ['Usage'],
        plotOptions: {
            radialBar: {
                startAngle: -135,
                endAngle: 135,

            }
        }
    };

    let lineChartData = [
        {
            name: 'Wifi',
            data: [50, 64, 48, 66, 49, 68]
        },
        {
            name: 'Ethernet',
            data: [30, 40, 24, 46, 20, 46]
        }
    ];

    // Chakra Color Mode
    const textColor = useColorModeValue('secondaryGray.900', 'white');
    const cardColor = useColorModeValue('white', 'navy.700');
    const cardShadow = useColorModeValue('0px 18px 40px rgba(112, 144, 176, 0.12)', 'unset');
    const textColorSecondary = useColorModeValue('secondaryGray.600', 'white');
    const boxBg = useColorModeValue('secondaryGray.300', 'whiteAlpha.100');
    const iconColor = useColorModeValue('brand.500', 'white');
    const bgButton = useColorModeValue('secondaryGray.300', 'whiteAlpha.100');
    const bgHover = useColorModeValue({ bg: 'secondaryGray.400' }, { bg: 'whiteAlpha.50' });
    const bgFocus = useColorModeValue({ bg: 'secondaryGray.300' }, { bg: 'whiteAlpha.100' });

    return (
        <Card justifyContent='center' p='20px' alignItems='center' flexDirection='column' w='100%'>
            <Flex
                px={{ base: '0px', '2xl': '10px' }}
                justifyContent='space-between'
                alignItems='center'
                w='100%'
                mb='8px'>
                <Text color={textColor} fontSize='md' fontWeight='600' mt='4px'>
                    System status
                </Text>

            </Flex>

            <Flex align='center' justify='space-between' w='100%' pt='5px'>


                <Flex direction='column' py='5px' me='10px' w='40%'>
                    <Flex align='center'>
                        <Box h='8px' w='8px' bg='brand.500' borderRadius='50%' me='4px' />
                        <Text fontSize='xs' color='secondaryGray.600' fontWeight='700' mb='5px'>
                            CPU Usage
                        </Text>
                    </Flex>
                    <Flex align='center'>
                        {RadialChartData[0]?.data && (
                            <RadialChart
                                h='100%'
                                w='100%'
                                chartData={[RadialChartData[0]?.data]}
                                chartOptions={chartOptions}
                            />
                        )}
                    </Flex>

                </Flex>
                <Flex direction='column' py='5px' me='10px' w='40%'>
                    <Flex align='center'>
                        <Box h='8px' w='8px' bg='#6AD2FF' borderRadius='50%' me='4px' />
                        <Text fontSize='xs' color='secondaryGray.600' fontWeight='700' mb='5px'>
                            Memoire Usage
                        </Text>
                    </Flex>
                    <Flex align='center'>
                        {RadialChartData[1]?.data && (
                            <RadialChart
                                h='100%'
                                w='100%'
                                chartData={[RadialChartData[1]?.data]}
                                chartOptions={chartOptions}
                            />
                        )}
                    </Flex>
                </Flex>
            </Flex>

            <Flex
                px={{ base: '0px', '2xl': '10px' }}
                justifyContent='space-between'
                alignItems='center'
                w='100%'
                mb='8px'>
                <Text color={textColor} fontSize='md' fontWeight='600' mt='4px'>
                    Network status
                </Text>

            </Flex>


            <Flex w='100%' flexDirection={{ base: 'column', lg: 'row' }}>
                {/* <Flex flexDirection='column' me='20px' mt='28px'>
                    <Text color={textColor} fontSize='34px' textAlign='start' fontWeight='700' lineHeight='100%'>
                        $37.5K
                    </Text>
                    <Flex align='center' mb='20px'>
                        <Text color='secondaryGray.600' fontSize='sm' fontWeight='500' mt='4px' me='12px'>
                            Total Spent
                        </Text>
                        <Flex align='center'>
                            <Icon as={RiArrowUpSFill} color='green.500' me='2px' mt='2px' />
                            <Text color='green.500' fontSize='sm' fontWeight='700'>
                                +2.45%
                            </Text>
                        </Flex>
                    </Flex>

                    <Flex align='center'>
                        <Icon as={IoCheckmarkCircle} color='green.500' me='4px' />
                        <Text color='green.500' fontSize='md' fontWeight='700'>
                            On track
                        </Text>
                    </Flex>
                </Flex> */}
                <Box minH='260px' minW='100%' mt='auto'>
                    <LineChart chartData={lineChartData} chartOptions={lineChartOptionsTotalSpent} />
                </Box>
            </Flex>

        </Card >

    );
}

export default Conversion;
