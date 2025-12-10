import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Wallet } from 'lucide-react';

export const WalletButton = () => {
  const { connected, publicKey } = useWallet();

  return (
    <div className="wallet-button-wrapper">
      <WalletMultiButton>
        {connected && publicKey ? (
          <span className="flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            <span className="hidden sm:inline">
              {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            <span className="hidden sm:inline">Connect Wallet</span>
            <span className="sm:hidden">Connect</span>
          </span>
        )}
      </WalletMultiButton>
    </div>
  );
};
