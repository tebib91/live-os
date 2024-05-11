

// Chakra imports
import { Box, Grid, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody } from '@chakra-ui/react';

// Custom components
import Banner from 'views/admin/profile/components/Banner';
import General from 'views/admin/profile/components/General';
import Notifications from 'views/admin/profile/components/Notifications';
import Projects from 'views/admin/profile/components/Projects';
import Storage from 'views/admin/profile/components/Storage';
import Upload from 'views/admin/profile/components/Upload';

// Assets
import banner from 'assets/img/auth/banner.png';
import avatar from 'assets/img/avatars/avatar4.png';

interface OverviewModalProps {
	isOpen: boolean;
	onClose: () => void; // Specify that onClose is a function that returns void
}

const OverviewModal: React.FC<OverviewModalProps> = ({ isOpen, onClose }) => (
	<Modal isOpen={isOpen} onClose={onClose} size="6xl" motionPreset="scale"
		scrollBehavior={'inside'}
		blockScrollOnMount={true}>
		<ModalOverlay bg='none'
			backdropFilter='auto'
			backdropBlur='2px' />
		<ModalContent>
			<ModalHeader>Profile Overview</ModalHeader>
			<ModalCloseButton />
			<ModalBody >
				<Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
					{/* Main Fields */}
					<Grid
						templateColumns={{
							base: '1fr',
							lg: '1.34fr 1fr 1.62fr'
						}}
						templateRows={{
							base: 'repeat(3, 1fr)',
							lg: '1fr'
						}}
						gap={{ base: '20px', xl: '20px' }}>
						<Banner
							gridArea='1 / 1 / 2 / 2'
							banner={banner}
							avatar={avatar}
							name='Adela Parkson'
							job='Product Designer'
							posts='17'
							followers='9.7k'
							following='274' />
						<Storage gridArea={{ base: '2 / 1 / 3 / 2', lg: '1 / 2 / 2 / 3' }} used={25.6} total={50} />
						<Storage gridArea={{ base: '2 / 1 / 3 / 2', lg: '1 / 2 / 2 / 3' }} used={25.6} total={50} />

						{/* <Upload
							gridArea={{
								base: '3 / 1 / 4 / 2',
								lg: '1 / 3 / 2 / 4'
							}}
							minH={{ base: 'auto', lg: '420px', '2xl': '365px' }}
							pe='20px'
							pb={{ base: '100px', lg: '20px' }} /> */}
					</Grid>

				</Box>
			</ModalBody>
		</ModalContent>
	</Modal>
);
export default OverviewModal;
