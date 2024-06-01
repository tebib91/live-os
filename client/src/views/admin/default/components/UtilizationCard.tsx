// Chakra imports
import { Box, Flex, Progress, Text, useColorModeValue } from '@chakra-ui/react';

// Custom components
import { useEffect, useState } from 'react';
import SystemApi from 'api/system';
import SystemInfo from 'models/system'
import Card from 'components/card/Card';

const Conversion: React.FC<Record<string, any>> = (props) => {
    const { ...rest } = props;

    const [systemUtilization, setSystemUtilization] = useState<SystemInfo | null>(null);

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

    }, []); // No dependencies, so it runs only once on mount

    const textColor = useColorModeValue('secondaryGray.900', 'white');
    const textColorSecondary = useColorModeValue('secondaryGray.600', 'white');

    const renderProgress = (label: string, value: number, color: string) => (
        <Flex direction='column' py='5px' w='100%' mb='20px'>
            <Flex align='center' mb='10px'>
                <Box h='8px' w='8px' bg={color} borderRadius='50%' me='4px' />
                <Text fontSize='xs' color={textColorSecondary} fontWeight='700'>
                    {label}
                </Text>
            </Flex>
            <Flex align='center' w='100%' position='relative'>
                <Progress
                    colorScheme='brandScheme'
                    value={value}
                    w='100%'
                    hasStripe
                    isAnimated
                />
                <Text position='absolute' right='10px' fontSize='xs' color={textColorSecondary} fontWeight='700'>
                    {value}%
                </Text>
            </Flex>
        </Flex>
    );

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

            <Flex direction='column' w='100%' pt='5px'>
                {systemUtilization?.cpu.percent !== undefined &&
                    renderProgress('CPU Usage', systemUtilization.cpu.percent, 'brand.500')}
                {systemUtilization?.mem.usedPercent !== undefined &&
                    renderProgress('Memory Usage', systemUtilization.mem.usedPercent, '#6AD2FF')}
                {systemUtilization?.sys_disk && systemUtilization.sys_disk.used !== undefined &&
                    renderProgress('Storage Usage', +((systemUtilization.sys_disk.used / systemUtilization.sys_disk.size) * 100).toFixed(1), '#FF6A6A')}
            </Flex>
        </Card >
    );
}

export default Conversion;