import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useNavigation } from '@react-navigation/core';
import { BigNumber } from 'bignumber.js';
import { Column, Row } from 'native-base';
import { useIntl } from 'react-intl';

import {
  Box,
  CustomSkeleton,
  Divider,
  Icon,
  Input,
  Modal,
  NetImage,
  Pressable,
  Skeleton,
  Text,
} from '@onekeyhq/components';
import type { Collection, MarketPlace } from '@onekeyhq/engine/src/types/nft';
import { OnekeyNetwork } from '@onekeyhq/shared/src/config/networkIds';

import backgroundApiProxy from '../../../../background/instance/backgroundApiProxy';
import { useDebounce } from '../../../../hooks';
import { NFTMarketRoutes } from '../type';

import type { NFTMarketRoutesParams } from '../type';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type NavigationProps = NativeStackNavigationProp<
  NFTMarketRoutesParams,
  NFTMarketRoutes.MarketPlaceScreen
>;

const CalculatorModal: FC = () => {
  const intl = useIntl();
  const [network, setNetWork] = useState<string>(OnekeyNetwork.eth);

  const { serviceNFT } = backgroundApiProxy;
  const navigation = useNavigation<NavigationProps>();
  const [buyInput, setBuyInput] = useState('');
  const [sellInput, setSellInput] = useState('');
  const buyText = useDebounce(buyInput, 500);
  const sellText = useDebounce(sellInput, 500);

  const allMarketPlace = useRef<MarketPlace[]>();
  const [selectedMarketPlace, setSelectedMarketPlace] = useState<
    MarketPlace | undefined
  >();

  const [selectedProject, setSelectedProject] = useState<
    Collection | undefined
  >();

  const platformFee = useMemo(() => {
    if (selectedMarketPlace) {
      const keys = Object.keys(selectedMarketPlace.networks);
      if (keys.includes(network)) {
        const { handlingFee } = selectedMarketPlace.networks[network];
        if (handlingFee) {
          return Number(handlingFee.replace('%', ''));
        }
      }
    }
    return 0;
  }, [network, selectedMarketPlace]);

  const creatorFee = useMemo(() => {
    if (selectedProject) {
      return selectedProject.royalty ?? 0;
    }
    return 0;
  }, [selectedProject]);

  const selectPlatformAction = useCallback(() => {
    navigation.navigate(NFTMarketRoutes.MarketPlaceScreen, {
      selectMarket: selectedMarketPlace,
      onSelect: setSelectedMarketPlace,
    });
  }, [navigation, selectedMarketPlace]);

  const getCollectionDetail = useCallback(
    async (networkId: string, contractAddress: string) => {
      const data = await serviceNFT.getCollection({
        chain: networkId,
        contractAddress,
      });
      return data;
    },
    [serviceNFT],
  );
  const selectProjectAction = useCallback(() => {
    navigation.navigate(NFTMarketRoutes.SearchModal, {
      ethOnly: true,
      onSelectCollection: ({ networkId, contractAddress, collection }) => {
        navigation.goBack();
        setNetWork(networkId);
        if (collection) {
          setSelectedProject(collection);
        } else {
          getCollectionDetail(networkId, contractAddress).then((data) => {
            setSelectedProject(data);
          });
        }
      },
    });
  }, [getCollectionDetail, navigation]);

  const [gasFee, setGasFee] = useState<number>(0);

  useEffect(() => {
    (async () => {
      if (selectedProject?.contractAddress) {
        const data = await serviceNFT.getCollectionTransactions({
          chain: network,
          contractAddress: selectedProject?.contractAddress,
          limit: 1,
          showAsset: false,
          eventTypes: 'Sale',
        });
        if (data?.content && data?.content.length > 0) {
          const tx = data.content[0];
          setGasFee(tx.gasFee ?? 0);
        }
      }
    })();
  }, [network, selectedProject?.contractAddress, serviceNFT]);

  useEffect(() => {
    (async () => {
      const data = await serviceNFT.getMarketPlaces();
      if (data) {
        allMarketPlace.current = data;
        setSelectedMarketPlace(data[0]);
      }
    })();
  }, [serviceNFT]);

  const profit = useMemo(() => {
    let result: BigNumber = new BigNumber(0);

    const buy = new BigNumber(buyText);
    const sell = new BigNumber(sellText);
    const bGas = new BigNumber(gasFee);

    if (buy.isNaN() || sell.isNaN()) {
      return '0 ETH';
    }
    const platform = new BigNumber(platformFee / 100).multipliedBy(sell);
    const creator = new BigNumber(creatorFee).multipliedBy(sell);

    result = sell
      .minus(platform)
      .minus(creator)
      .minus(buy)
      .minus(bGas)
      .decimalPlaces(6);
    if (result.isNaN()) {
      return '0 ETH';
    }

    return `${result.toFixed()} ETH`;
  }, [buyText, creatorFee, gasFee, platformFee, sellText]);

  return (
    <Modal
      size="xs"
      header={intl.formatMessage({ id: 'modal__calculator' })}
      footer={null}
    >
      {/* Forms */}
      <Column space={8}>
        <Column space="12px">
          <Text typography="Subheading" color="text-subdued">
            {intl.formatMessage({ id: 'form__platform' })}
          </Text>
          <Box m={-2}>
            <Pressable
              p={2}
              borderRadius="12px"
              flexDirection="row"
              alignItems="center"
              onPress={selectPlatformAction}
              _hover={{ bgColor: 'surface-hovered' }}
              _pressed={{ bgColor: 'surface-pressed' }}
            >
              <Row space="12px" alignItems="center" flex={1}>
                {selectedMarketPlace ? (
                  <>
                    <NetImage
                      key={selectedMarketPlace.logoUrl}
                      width="40px"
                      height="40px"
                      borderRadius="20px"
                      src={selectedMarketPlace.logoUrl}
                    />
                    <Text typography="Body1Strong">
                      {selectedMarketPlace.name}
                    </Text>
                  </>
                ) : (
                  <>
                    <CustomSkeleton
                      width="40px"
                      height="40px"
                      borderRadius="20px"
                    />
                    <Skeleton shape="Body1" />
                  </>
                )}
              </Row>
              <Icon name="ChevronRightMini" size={20} color="icon-subdued" />
            </Pressable>
          </Box>
        </Column>
        <Column space="12px">
          <Text typography="Subheading" color="text-subdued">
            {intl.formatMessage({ id: 'form__project' })}
          </Text>
          <Box m={-2}>
            <Pressable
              p={2}
              borderRadius="12px"
              flexDirection="row"
              alignItems="center"
              onPress={selectProjectAction}
              _hover={{ bgColor: 'surface-hovered' }}
              _pressed={{ bgColor: 'surface-pressed' }}
            >
              <Row space="12px" alignItems="center" flex={1}>
                {selectedProject ? (
                  <>
                    <NetImage
                      key={selectedProject.logoUrl}
                      width="40px"
                      height="40px"
                      borderRadius="20px"
                      src={selectedProject.logoUrl}
                    />
                    <Text typography="Body1Strong">{selectedProject.name}</Text>
                  </>
                ) : (
                  <>
                    <Box
                      borderStyle="dashed"
                      justifyContent="center"
                      alignItems="center"
                      size="40px"
                      borderRadius="12px"
                      bgColor="surface-neutral-subdued"
                      borderWidth="2px"
                      borderColor="border-default"
                    >
                      <Icon
                        name="CursorArrowRaysMini"
                        size={20}
                        color="decorative-icon-one"
                      />
                    </Box>

                    <Text typography="Body1Strong">
                      {intl.formatMessage({ id: 'action__select_a_project' })}
                    </Text>
                  </>
                )}
              </Row>
              <Icon name="ChevronRightMini" size={20} color="icon-subdued" />
            </Pressable>
          </Box>
        </Column>
        <Column space="12px">
          <Text typography="Subheading" color="text-subdued">
            {intl.formatMessage({ id: 'content__price' })} (ETH)
          </Text>
          <Row space="12px">
            <Input
              flex={1}
              size="xl"
              placeholder={intl.formatMessage({ id: 'action__buy' })}
              value={buyInput}
              onChangeText={setBuyInput}
              type="number"
              keyboardType="decimal-pad"
            />
            <Input
              flex={1}
              size="xl"
              placeholder={intl.formatMessage({ id: 'action__sell' })}
              value={sellInput}
              onChangeText={setSellInput}
              type="number"
              keyboardType="number-pad"
            />
          </Row>
        </Column>
      </Column>
      <Divider my="24px" />
      {/* Sum */}
      <Column space="8px">
        <Row space="8px" justifyContent="space-between">
          <Text typography="Body2Strong" color="text-subdued">
            {intl.formatMessage({ id: 'content__platform_fee' })}
          </Text>
          <Text typography="Body2">{`${platformFee}%`}</Text>
        </Row>
        <Row space="8px" justifyContent="space-between">
          <Text typography="Body2Strong" color="text-subdued">
            {intl.formatMessage({ id: 'content__creator_fee' })}
          </Text>
          <Text typography="Body2">{`${creatorFee * 100}%`}</Text>
        </Row>
        <Row space="8px" justifyContent="space-between">
          <Text typography="Body2Strong" color="text-subdued">
            {intl.formatMessage({ id: 'content__gas_fee' })}
          </Text>
          <Text typography="Body2">
            {`${new BigNumber(gasFee).decimalPlaces(3).toString()} ETH`}{' '}
          </Text>
        </Row>
        <Row space="8px" justifyContent="space-between" alignItems="baseline">
          <Text typography="Body2Strong" color="text-subdued">
            {intl.formatMessage({ id: 'content__profit' })}
          </Text>
          <Text typography="Display2XLarge">{profit}</Text>
        </Row>
      </Column>
    </Modal>
  );
};

export default CalculatorModal;
