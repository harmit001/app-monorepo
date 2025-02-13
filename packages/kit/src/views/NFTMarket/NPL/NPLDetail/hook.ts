import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Network } from '@onekeyhq/engine/src/types/network';

import backgroundApiProxy from '../../../../background/instance/backgroundApiProxy';
import { useDebounce } from '../../../../hooks';

export function useSearchAddress({
  keyword,
  network,
  onAddressSearch,
}: {
  keyword: string;
  network: Network;
  onAddressSearch: ({
    address,
    ens,
  }: {
    address?: string;
    ens?: string;
  }) => void;
}) {
  const terms = useDebounce(keyword, 500).toLowerCase();

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [account, setAccount] = useState('');
  const lookupEnsName = useCallback(async (address: string) => {
    const result = backgroundApiProxy.serviceRevoke.lookupEnsName(address);
    return result;
  }, []);

  const valildAddress = useCallback(
    async (address: string) => {
      try {
        await backgroundApiProxy.validator.validateAddress(network.id, address);
        return true;
      } catch (e) {
        return false;
      }
    },
    [network.id],
  );

  const getAddress = useCallback(
    async (address: string) => {
      const result = await backgroundApiProxy.serviceRevoke.getAddress(
        address,
        network.id,
      );
      return result;
    },
    [network.id],
  );

  useEffect(() => {
    if (terms?.length > 0) {
      (async () => {
        if (terms === name || terms.toLowerCase() === account.toLowerCase()) {
          return;
        }
        setLoading(true);
        const [ens, address] = await Promise.all([
          lookupEnsName(terms),
          getAddress(terms),
        ]);

        if (address) {
          const isValid = await valildAddress(address);
          if (isValid) {
            let ensName = ens;
            if (terms.toLowerCase() !== address.toLowerCase()) {
              ensName = terms;
              setName(ensName);
            }
            setAccount(address);
            onAddressSearch({
              address: address.toLocaleLowerCase(),
              ens: ensName,
            });
          }
        } else {
          setName('');
        }
        setLoading(false);
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terms]);

  return useMemo(() => ({ loading }), [loading]);
}
