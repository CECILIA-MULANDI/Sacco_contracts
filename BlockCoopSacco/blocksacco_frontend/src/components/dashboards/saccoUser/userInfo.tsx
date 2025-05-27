import { useActiveAccount } from "thirdweb/react";
import { ethers } from "ethers";
import {
  useGetUserDepositedTokens,
  useGetUserDeposit,
  useGetUserTotalValueUSD,
  useTokensInfo,
} from "../../contractFunctions/BlockCoopTokensFunctions";
import { FC } from "react";

interface TokenDepositProps {
  tokenAddress: string;
  userAddress: string;
  tokensInfo: any;
}

const TokenDeposit: FC<TokenDepositProps> = ({
  tokenAddress,
  userAddress,
  tokensInfo,
}) => {
  const { data: deposit } = useGetUserDeposit(userAddress, tokenAddress);

  if (!deposit || !tokensInfo) return null;

  // Find token info
  const tokenIndex = tokensInfo[0].findIndex(
    (addr: string) => addr.toLowerCase() === tokenAddress.toLowerCase()
  );

  if (tokenIndex === -1) return null;

  const [amount, timestamp] = deposit;
  const tokenName = tokensInfo[1][tokenIndex];
  const tokenSymbol = tokensInfo[2][tokenIndex];
  const tokenDecimals = tokensInfo[3][tokenIndex];

  // Format token amount with proper decimals
  const formatTokenAmount = (amount: bigint, decimals: number) => {
    return ethers.utils.formatUnits(amount.toString(), decimals);
  };

  // Format timestamp to readable date
  const formatTimestamp = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  return (
    <div className="bg-gray-700 p-4 rounded-lg">
      <div className="flex justify-between items-start">
        <div>
          <h5 className="font-medium">
            {tokenName} ({tokenSymbol})
          </h5>
          <p className="text-sm text-gray-400 mt-1">
            Amount: {formatTokenAmount(amount, tokenDecimals)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Deposited: {formatTimestamp(timestamp)}
          </p>
        </div>
        <div className="text-xs bg-gray-600 px-2 py-1 rounded">
          {tokenAddress.slice(0, 6)}...{tokenAddress.slice(-4)}
        </div>
      </div>
    </div>
  );
};

const UserInfo: FC = () => {
  const account = useActiveAccount();
  const userAddress = account?.address;

  // Get user's deposited tokens
  const { data: depositedTokens } = useGetUserDepositedTokens(userAddress);

  // Get total portfolio value
  const { data: totalValueData } = useGetUserTotalValueUSD(
    userAddress ?? "",
    0,
    100
  );

  // Calculate total value, ensuring we handle the array properly
  const totalValue = totalValueData && totalValueData.length > 0 ? totalValueData[0] : BigInt(0);

  // Get token info for all whitelisted tokens
  const { data: tokensInfo } = useTokensInfo(0, 100);

  if (!userAddress) {
    return (
      <div className="bg-gray-800 text-white p-4 rounded-lg shadow-md">
        <h3 className="text-lg font-medium mb-4">User Info</h3>
        <p>Please connect your wallet to view your information.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 text-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-medium mb-4">User Info</h3>

      {/* Total Value */}
      <div className="mb-6 bg-gray-700 p-4 rounded-lg">
        <h4 className="text-md font-medium mb-2">Total Portfolio Value</h4>
        <p className="text-2xl font-bold text-green-400">
          $
          {totalValue
            ? (Number(totalValue) / 1e18).toFixed(2)
            : "0.00"}
        </p>
      </div>

      {/* Deposited Tokens */}
      <div>
        <h4 className="text-md font-medium mb-4">Your Deposits</h4>

        {depositedTokens && depositedTokens.length > 0 ? (
          <div className="space-y-4">
            {depositedTokens.map((tokenAddress) => (
              <TokenDeposit
                key={tokenAddress}
                tokenAddress={tokenAddress}
                userAddress={userAddress}
                tokensInfo={tokensInfo}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-400">No deposits found.</p>
        )}
      </div>
    </div>
  );
};

export default UserInfo;
