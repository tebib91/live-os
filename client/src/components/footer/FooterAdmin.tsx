/*eslint-disable*/

import {
  Box,
  Flex,
  Icon,
  useColorModeValue,
  Image,
  useDisclosure
} from '@chakra-ui/react';
import { useHistory } from 'react-router-dom';
import MarketplaceModal from 'views/admin/marketplace';
import OverviewModal from 'views/admin/profile';

export default function Footer() {
  let menuBg = useColorModeValue('white', 'navy.800');
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const textColorBrand = useColorModeValue('brand.700', 'brand.400');
  const ethColor = useColorModeValue('gray.700', 'white');
  const borderColor = useColorModeValue('#E6ECFA', 'rgba(135, 140, 189, 0.3)');
  const ethBg = useColorModeValue('secondaryGray.300', 'navy.900');
  const ethBox = useColorModeValue('white', 'navy.800');
  const shadow = useColorModeValue(
    '14px 17px 40px 4px rgba(112, 144, 176, 0.18)',
    '14px 17px 40px 4px rgba(112, 144, 176, 0.06)'
  );
  const { isOpen: isOverviewOpen, onOpen: onOverviewOpen, onClose: onOverviewClose } = useDisclosure();
  const { isOpen: isMarketplaceOpen, onOpen: onMarketplaceOpen, onClose: onMarketplaceClose } = useDisclosure();
  const history = useHistory();

  return (
    <>
      <Box as="footer" pos="fixed" bottom="1"
        borderRadius='16px' left="0" right="0"
        p={"6px"} color="white"
        bg={menuBg}
        mx={"auto"}

        width="2xs">
        <Flex justify="space-around" align="center">
          <Image
            src="/icons/icons8-live-photos-48.png"
            boxSize="48px"
            alt="Live Photos"
            transition="0.3s"
            _hover={{ transform: 'scale(1.1)' }}
            onClick={() => history.push('/admin')}
          />
          <Image
            src="/icons/icons8-market-square-48.png"
            boxSize="48px"
            alt="Market Square"
            transition="0.3s"
            _hover={{ transform: 'scale(1.1)' }}
            onClick={onMarketplaceOpen}
          />
          <Image
            src="/icons/icons8-settings.svg"
            boxSize="48px"
            alt="Settings"
            transition="0.3s"
            _hover={{
              transform: 'scale(1.1)'
            }}
            onClick={onOverviewOpen}

          />
        </Flex>

      </Box>
      <MarketplaceModal isOpen={isMarketplaceOpen} onClose={onMarketplaceClose} />
      <OverviewModal isOpen={isOverviewOpen} onClose={onOverviewClose} />
    </>
  );
}
