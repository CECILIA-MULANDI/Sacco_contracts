import React, { useState, useEffect, FC, FormEvent, useMemo } from "react";
import { ethers } from "ethers";
import {
  useAddSaccoLiquidity,
  useRemoveSaccoLiquidity,
  useGetSupportedLoanTokens,
} from "../contractFunctions/LoanManagerFunctions";
import { useTokensInfo } from "../contractFunctions/BlockCoopTokensFunctions";
import { useMessages } from "../hooks/useSuccessOrErrorMessage";
import {
  useActiveAccount,
  useWalletBalance,
  useSendTransaction,
  useReadContract,
} from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { client } from "../../client";
import { chain, LOANMANAGER_CONTRACT_ADDRESS } from "../../config";

interface Token {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
}

interface LPPosition {
  shares: string;
  depositTime: string;
  pendingRewards: string;
  tokenAmount: string; // calculated amount of tokens
}

type ApprovalStatus = "idle" | "approving" | "approved" | "failed";
type TabType = "add" | "remove";

const LiquidityManagementForm: FC = () => {
  // State management
  const [activeTab, setActiveTab] = useState<TabType>("add");
  const [selectedToken, setSelectedToken] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [tokenBalance, setTokenBalance] = useState<string | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>("idle");

  const { successMessage, displaySuccessMessage, clearSuccessMessage } =
    useMessages();

  // Get the connected user's wallet address
  const account = useActiveAccount();
  const userAddress = account?.address as `0x${string}` | undefined;

  // Use sendTransaction hook for approvals
  const { mutateAsync: sendTransaction } = useSendTransaction();

  // Fetch supported loan tokens
  const {
    data: supportedTokens,
    isLoading: supportedTokensLoading,
    isError: supportedTokensError,
  } = useGetSupportedLoanTokens();

  // Fetch token metadata from BlockCoopTokens
  const { data: tokensInfo, isLoading: tokensInfoLoading } = useTokensInfo(
    0,
    100
  );

  // Hooks to handle adding and removing liquidity
  const { addLiquidity, isPending: isAddingLiquidity } = useAddSaccoLiquidity();
  const { removeLiquidity, isPending: isRemovingLiquidity } =
    useRemoveSaccoLiquidity();

  // Get user's LP tokens
  const { data: userLPTokens } = useReadContract({
    contract: getContract({
      client,
      address: LOANMANAGER_CONTRACT_ADDRESS,
      chain,
    }),
    method: "function getUserLPTokens(address) view returns (address[])",
    params: [userAddress || "0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!userAddress,
    },
  });

  // Create a map of token details
  const tokenDetails = useMemo(() => {
    if (!tokensInfo) return new Map();
    const [addresses, names, symbols, decimals, prices] = tokensInfo;
    return new Map(
      addresses.map((addr: string, i: number) => [
        addr,
        {
          name: names[i] || "Unknown",
          symbol: symbols[i] || "Unknown",
          price: prices[i] || BigInt(0),
          decimals: decimals[i] || 18,
        },
      ])
    );
  }, [tokensInfo]);

  // Create parsed tokens array with real metadata
  const parsedTokens: Token[] = useMemo(() => {
    if (!supportedTokens || !Array.isArray(supportedTokens)) return [];

    return supportedTokens
      .map((address: string) => {
        const tokenDetail = tokenDetails.get(address);
        return {
          address,
          name: tokenDetail?.name || "Unknown Token",
          symbol: tokenDetail?.symbol || "Unknown",
          decimals: tokenDetail?.decimals || 18,
        };
      })
      .filter((token) => token.name !== "Unknown Token");
  }, [supportedTokens, tokenDetails]);

  // Get user balance for the selected token
  const { data: balanceData } = useWalletBalance({
    client,
    chain: !!userAddress && !!selectedToken ? chain : undefined,
    address: userAddress ?? undefined,
    tokenAddress: selectedToken || undefined,
  });

  // Get LP position for selected token
  const { data: lpPositionData } = useReadContract({
    contract: getContract({
      client,
      address: LOANMANAGER_CONTRACT_ADDRESS,
      chain,
    }),
    method:
      "function getUserLPPosition(address, address) view returns (uint256, uint256, uint256)",
    params: [
      userAddress || "0x0000000000000000000000000000000000000000",
      selectedToken || "0x0000000000000000000000000000000000000000",
    ],
    queryOptions: {
      enabled: !!(userAddress && selectedToken),
    },
  });

  // Get pool info for selected token to calculate token amount from shares
  const { data: poolInfoData } = useReadContract({
    contract: getContract({
      client,
      address: LOANMANAGER_CONTRACT_ADDRESS,
      chain,
    }),
    method:
      "function getPoolInfo(address) view returns (uint256, uint256, uint256, uint256, uint256, bool)",
    params: [selectedToken || "0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!selectedToken,
    },
  });

  // Calculate user's LP position details
  const userLPPosition: LPPosition | null = useMemo(() => {
    if (!lpPositionData || !poolInfoData || !selectedToken) return null;

    const [shares, depositTime, pendingRewards] = lpPositionData;
    const [totalLiquidity, , , totalShares] = poolInfoData;

    // Calculate token amount from shares
    const tokenAmount =
      totalShares > 0n
        ? (BigInt(shares) * BigInt(totalLiquidity)) / BigInt(totalShares)
        : 0n;

    const token = parsedTokens.find((t) => t.address === selectedToken);
    const decimals = token?.decimals || 18;

    return {
      shares: ethers.utils.formatUnits(shares.toString(), 18),
      depositTime: depositTime.toString(),
      pendingRewards: ethers.utils.formatUnits(
        pendingRewards.toString(),
        decimals
      ),
      tokenAmount: ethers.utils.formatUnits(tokenAmount.toString(), decimals),
    };
  }, [lpPositionData, poolInfoData, selectedToken, parsedTokens]);

  // Update token balance when token selection or balance data changes
  useEffect(() => {
    if (balanceData && selectedToken) {
      const token = parsedTokens.find((t) => t.address === selectedToken);

      if (token) {
        try {
          const formattedBalance = ethers.utils.formatUnits(
            balanceData.value.toString(),
            token.decimals
          );
          setTokenBalance(formattedBalance);
        } catch (error) {
          console.error("Error formatting balance:", error);
          setTokenBalance(null);
        }
      }
    } else {
      setTokenBalance(null);
    }
  }, [balanceData, selectedToken, parsedTokens]);

  // Reset approval status and amount when token or tab changes
  useEffect(() => {
    setApprovalStatus("idle");
    setAmount("");
  }, [selectedToken, activeTab]);

  // Approve tokens before adding liquidity
  const handleApprove = async (amountInWei: string): Promise<boolean> => {
    try {
      setApprovalStatus("approving");

      const tokenContract = parsedTokens.find(
        (token) => token.address === selectedToken
      );
      if (!tokenContract) {
        throw new Error("Token contract not found.");
      }

      // Get ERC20 token contract instance
      const tokenContractInstance = getContract({
        client,
        address: selectedToken as `0x${string}`,
        chain,
      });

      // Prepare the approve call
      const approveTransaction = prepareContractCall({
        contract: tokenContractInstance,
        method:
          "function approve(address spender, uint256 amount) returns (bool)",
        params: [LOANMANAGER_CONTRACT_ADDRESS, BigInt(amountInWei)],
      });

      // Execute the transaction using useSendTransaction hook and wait for confirmation
      await sendTransaction(approveTransaction);

      // Wait a bit to ensure the approval is processed
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setApprovalStatus("approved");
      return true;
    } catch (error) {
      console.error("Error during token approval:", error);
      setApprovalStatus("failed");
      return false;
    }
  };

  // Handle add liquidity form submission
  const handleAddLiquidity = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedToken || !amount) {
      alert("Please select a token and enter an amount.");
      return;
    }

    if (!userAddress) {
      alert("Please connect your wallet.");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Please enter a valid positive amount.");
      return;
    }

    if (tokenBalance && parseFloat(amount) > parseFloat(tokenBalance)) {
      alert(`Insufficient balance. You have ${tokenBalance} tokens available.`);
      return;
    }

    try {
      setIsSubmitting(true);

      const token = parsedTokens.find((t) => t.address === selectedToken);
      if (!token) {
        alert("Invalid token selected.");
        return;
      }

      const amountInWei = ethers.utils
        .parseUnits(amount, token.decimals)
        .toString();

      // First approve the tokens
      const approved = await handleApprove(amountInWei);
      if (!approved) {
        setIsSubmitting(false);
        return;
      }

      // Then add liquidity
      await addLiquidity(selectedToken, BigInt(amountInWei));

      // Reset form after successful liquidity addition
      setAmount("");
      setSelectedToken("");
      setApprovalStatus("idle");

      displaySuccessMessage(
        `Successfully added ${amount} ${token.symbol} to liquidity pool!`
      );
    } catch (error) {
      console.error("Error during liquidity addition:", error);
      alert("Adding liquidity failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle remove liquidity form submission
  const handleRemoveLiquidity = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedToken || !amount) {
      alert("Please select a token and enter an amount.");
      return;
    }

    if (!userAddress || !userLPPosition) {
      alert("Please connect your wallet and select a token with liquidity.");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Please enter a valid positive amount.");
      return;
    }

    if (parseFloat(amount) > parseFloat(userLPPosition.tokenAmount)) {
      alert(
        `Insufficient liquidity. You have ${userLPPosition.tokenAmount} tokens available.`
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const token = parsedTokens.find((t) => t.address === selectedToken);
      if (!token || !poolInfoData || !lpPositionData) {
        alert("Invalid token selected or pool data unavailable.");
        return;
      }

      // Get user's current shares and calculate what portion to remove
      const [userShares] = lpPositionData;
      const userSharesBigInt = BigInt(userShares.toString());
      const totalTokenAmount = parseFloat(userLPPosition.tokenAmount);

      // Calculate the proportion of shares to remove based on the amount
      const proportion = parseFloat(amount) / totalTokenAmount;
      const sharesToRemove = BigInt(
        Math.floor(Number(userSharesBigInt) * proportion)
      );

      console.log("Remove liquidity calculation:", {
        amount,
        totalTokenAmount,
        proportion,
        userShares: userShares.toString(),
        sharesToRemove: sharesToRemove.toString(),
      });

      if (sharesToRemove <= 0n) {
        alert(
          "Amount too small to calculate shares. Please enter a larger amount."
        );
        return;
      }

      // Remove liquidity using shares
      await removeLiquidity(selectedToken, sharesToRemove);

      // Reset form after successful liquidity removal
      setAmount("");

      displaySuccessMessage(
        `Successfully removed ${amount} ${token.symbol} from liquidity pool!`
      );
    } catch (error) {
      console.error("Error during liquidity removal:", error);
      alert("Removing liquidity failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = supportedTokensLoading || tokensInfoLoading;
  const isError = supportedTokensError;

  // Get available tokens based on active tab
  const availableTokens =
    activeTab === "add"
      ? parsedTokens
      : parsedTokens.filter(
          (token) => userLPTokens && userLPTokens.includes(token.address)
        );

  return (
    <>
      {/* Success message toast notification */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-md flex items-center max-w-md">
          <div className="mr-3">
            <svg
              className="h-6 w-6 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div className="flex-1">{successMessage}</div>
          <button
            onClick={clearSuccessMessage}
            className="ml-auto text-green-500 hover:text-green-700"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-md border">
        {/* Tab Navigation */}
        <div className="flex mb-6 border-b border-gray-200">
          <button
            className={`py-2 px-4 font-medium text-sm focus:outline-none ${
              activeTab === "add"
                ? "border-b-2 border-indigo-500 text-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("add")}
          >
            Add Liquidity
          </button>
          <button
            className={`py-2 px-4 font-medium text-sm focus:outline-none ${
              activeTab === "remove"
                ? "border-b-2 border-indigo-500 text-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("remove")}
          >
            Remove Liquidity
          </button>
        </div>

        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {activeTab === "add" ? "Add Liquidity" : "Remove Liquidity"}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          {activeTab === "add"
            ? "Provide liquidity to earn yield from loan interest. Your tokens will be available for borrowers and you'll receive a share of the interest payments."
            : "Remove your liquidity from the pool. You can withdraw your tokens along with any earned rewards."}
        </p>

        {isLoading && (
          <p className="text-gray-500">Loading supported tokens...</p>
        )}
        {isError && (
          <p className="text-red-500">
            Error loading tokens. Please try again.
          </p>
        )}

        {availableTokens.length > 0 ? (
          <form
            onSubmit={
              activeTab === "add" ? handleAddLiquidity : handleRemoveLiquidity
            }
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="token"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Select Token
              </label>
              <select
                id="token"
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={
                  isSubmitting ||
                  approvalStatus === "approving" ||
                  isAddingLiquidity ||
                  isRemovingLiquidity
                }
              >
                <option value="">-- Select a Token --</option>
                {availableTokens.map((token) => (
                  <option key={token.address} value={token.address}>
                    {token.name} ({token.symbol})
                  </option>
                ))}
              </select>
            </div>

            {/* Show wallet balance for add tab */}
            {activeTab === "add" && tokenBalance && (
              <div className="text-sm text-gray-600">
                <span>Wallet Balance: </span>
                <span className="font-medium">
                  {tokenBalance}{" "}
                  {
                    parsedTokens.find((t) => t.address === selectedToken)
                      ?.symbol
                  }
                </span>
              </div>
            )}

            {/* Show LP position for remove tab */}
            {activeTab === "remove" && userLPPosition && selectedToken && (
              <div className="bg-gray-50 p-4 rounded-md space-y-2">
                <h4 className="font-medium text-gray-900">
                  Your Liquidity Position
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">
                      Available to Withdraw:{" "}
                    </span>
                    <span className="font-medium">
                      {userLPPosition.tokenAmount}{" "}
                      {
                        parsedTokens.find((t) => t.address === selectedToken)
                          ?.symbol
                      }
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Pending Rewards: </span>
                    <span className="font-medium">
                      {userLPPosition.pendingRewards}{" "}
                      {
                        parsedTokens.find((t) => t.address === selectedToken)
                          ?.symbol
                      }
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="amount"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Amount
              </label>
              <input
                id="amount"
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Enter amount to ${
                  activeTab === "add" ? "add as" : "remove from"
                } liquidity`}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={
                  isSubmitting ||
                  approvalStatus === "approving" ||
                  isAddingLiquidity ||
                  isRemovingLiquidity
                }
              />
            </div>

            {/* Quick amount buttons for remove tab */}
            {activeTab === "remove" && userLPPosition && selectedToken && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setAmount(
                      (parseFloat(userLPPosition.tokenAmount) * 0.25).toString()
                    )
                  }
                  className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  disabled={isSubmitting || isRemovingLiquidity}
                >
                  25%
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setAmount(
                      (parseFloat(userLPPosition.tokenAmount) * 0.5).toString()
                    )
                  }
                  className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  disabled={isSubmitting || isRemovingLiquidity}
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setAmount(
                      (parseFloat(userLPPosition.tokenAmount) * 0.75).toString()
                    )
                  }
                  className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  disabled={isSubmitting || isRemovingLiquidity}
                >
                  75%
                </button>
                <button
                  type="button"
                  onClick={() => setAmount(userLPPosition.tokenAmount)}
                  className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  disabled={isSubmitting || isRemovingLiquidity}
                >
                  Max
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={
                isSubmitting ||
                approvalStatus === "approving" ||
                isAddingLiquidity ||
                isRemovingLiquidity ||
                !selectedToken ||
                !amount
              }
              className={`w-full px-4 py-2 rounded-md text-white font-medium ${
                isSubmitting ||
                approvalStatus === "approving" ||
                isAddingLiquidity ||
                isRemovingLiquidity
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              }`}
            >
              {isSubmitting
                ? "Processing..."
                : approvalStatus === "approving"
                ? "Approving..."
                : isAddingLiquidity
                ? "Adding Liquidity..."
                : isRemovingLiquidity
                ? "Removing Liquidity..."
                : activeTab === "add"
                ? "Add Liquidity"
                : "Remove Liquidity"}
            </button>
          </form>
        ) : (
          !isLoading && (
            <p className="text-gray-500">
              {activeTab === "add"
                ? "No supported tokens available for liquidity provision."
                : "You don't have any liquidity positions to remove."}
            </p>
          )
        )}
      </div>
    </>
  );
};

export default LiquidityManagementForm;
