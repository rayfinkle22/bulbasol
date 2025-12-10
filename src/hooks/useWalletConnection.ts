import { useWallet } from '@solana/wallet-adapter-react';
import { useCallback } from 'react';

export const useWalletConnection = () => {
  const { publicKey, connected, connecting, disconnect, wallet } = useWallet();

  const walletAddress = publicKey?.toBase58() || null;

  const disconnectWallet = useCallback(async () => {
    await disconnect();
  }, [disconnect]);

  return {
    walletAddress,
    connected,
    connecting,
    disconnect: disconnectWallet,
    walletName: wallet?.adapter.name || null,
  };
};
