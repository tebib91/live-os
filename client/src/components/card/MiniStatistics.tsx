// Chakra imports
import { Flex, Stat, StatLabel, useColorModeValue, Badge, Menu, MenuButton, MenuItem, MenuList, IconButton, Image } from '@chakra-ui/react';
import { MdMoreVert } from 'react-icons/md'; // Import an icon for the dropdown button
// Custom components
import Card from 'components/card/Card';

export default function MiniStatistics(props: {
	image: string;
	name: string;
	value: string | number;
	onStart: () => void;  // Function to handle starting the container
	onStop: () => void;   // Function to handle stopping the container
}) {
	const { image, name, value, onStart, onStop } = props;
	const textColor = useColorModeValue('secondaryGray.900', 'white');
	const textColorSecondary = 'secondaryGray.600';
	const statusColorMap: Record<string | number, { color: string, label: string }> = {
		exited: { color: 'red', label: 'Exited' },
		running: { color: 'green', label: 'Running' }
	};
	const status = statusColorMap[value] ?? { color: 'gray', label: 'Unknown' };
	let navbarBg = useColorModeValue(
		'rgba(244, 247, 254, 0.2)',
		'rgba(11,20,55,0.5)'
	);
	return (
		<Card py='15px' px='20px' bg={navbarBg} position='relative'>
			<Flex justify='center' align='center' position="relative" h="100px">
				<Image src={image} boxSize='42px' borderRadius='full' />
			</Flex>
			<Stat textAlign="center">
				<StatLabel
					lineHeight='100%'
					color={textColor}
					fontSize={{ base: 'xl' }}
					fontWeight='700'
					textTransform='capitalize'
				>
					{name}
				</StatLabel>
			</Stat>
			<Menu>
				<MenuButton as={IconButton} icon={<MdMoreVert />} variant="outline" size='sm' position="absolute" top="2px" right="2px" />
				<MenuList>
					{value === 'running' ? (
						<MenuItem onClick={onStop}>Stop</MenuItem>
					) : (
						<MenuItem onClick={onStart}>Start</MenuItem>
					)}
				</MenuList>
			</Menu>
			<Badge
				colorScheme={status.color}
				borderRadius='full'
				px='2'
				py='1'
				position="absolute"
				bottom="2px"
				right="2px"
			>
				{status.label}
			</Badge>
		</Card>
	);
}