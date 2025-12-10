import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Wallet, X } from 'lucide-react';

interface GameWalletButtonProps {
  compact?: boolean;
}

export const GameWalletButton = ({ compact = false }: GameWalletButtonProps) => {
  const { connected, publicKey, disconnect } = useWallet();

  if (compact) {
    return (
      <div className="game-wallet-compact">
        <WalletMultiButton>
          {connected && publicKey ? (
            <span className="flex items-center gap-1 text-xs">
              <Wallet className="w-3 h-3" />
              <span>{publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs">
              <Wallet className="w-3 h-3" />
              <span>Connect</span>
            </span>
          )}
        </WalletMultiButton>
      </div>
    );
  }

  return (
    <div className="wallet-button-wrapper">
      <WalletMultiButton>
        {connected && publicKey ? (
          <span className="flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            <span>{publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}</span>
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            <span>Connect Wallet</span>
          </span>
        )}
      </WalletMultiButton>
    </div>
  );
};