import React from "react";
import { useActiveAccount } from "thirdweb/react";
import { useGetSupportedLoanTokens } from "../contractFunctions/LoanManagerFunctions";
import { useGetLendingPoolInfo } from "../contractFunctions/LoanManagerFunctions";
import { useGetUserDeposit } from "../contractFunctions/BlockCoopTokensFunctions";

export default function LiquidityPositions() {
  const account = useActiveAccount();
  const address = account?.address;
  const { data: supportedTokens } = useGetSupportedLoanTokens();

  if (!supportedTokens || supportedTokens.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        No supported tokens found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">
        Your Liquidity Positions
      </h3>
      <div className="grid gap-4">
        {supportedTokens.map((tokenAddress) => (
          <LiquidityPositionCard
            key={tokenAddress}
            tokenAddress={tokenAddress}
            userAddress={address}
          />
        ))}
      </div>
    </div>
  );
}

function LiquidityPositionCard({
  tokenAddress,
  userAddress,
}: {
  tokenAddress: string;
  userAddress: string | undefined;
}) {
  const { data: poolInfo } = useGetLendingPoolInfo(tokenAddress);
  const { data: userDeposit } = useGetUserDeposit(tokenAddress, userAddress);

  if (!poolInfo || !userDeposit) {
    return null;
  }

  const [totalDeposited, totalBorrowed, availableLiquidity] = poolInfo;
  const [userShares, userDepositTime] = userDeposit;

  // Calculate user's share percentage
  const sharePercentage =
    totalDeposited > 0n
      ? Number((userShares * 10000n) / totalDeposited) / 100
      : 0;

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="text-sm font-medium text-gray-900">
            Token: {tokenAddress.slice(0, 6)}...{tokenAddress.slice(-4)}
          </h4>
          <p className="mt-1 text-sm text-gray-500">
            Your Share: {sharePercentage.toFixed(2)}%
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">
            {Number(userShares) / 1e18} tokens
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Deposited:{" "}
            {new Date(Number(userDepositTime) * 1000).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Total Deposited</p>
          <p className="font-medium">{Number(totalDeposited) / 1e18} tokens</p>
        </div>
        <div>
          <p className="text-gray-500">Total Borrowed</p>
          <p className="font-medium">{Number(totalBorrowed) / 1e18} tokens</p>
        </div>
        <div>
          <p className="text-gray-500">Available</p>
          <p className="font-medium">
            {Number(availableLiquidity) / 1e18} tokens
          </p>
        </div>
      </div>
    </div>
  );
}
