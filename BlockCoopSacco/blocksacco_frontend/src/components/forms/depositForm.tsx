import React, { useState, useEffect, FC, FormEvent, useRef } from "react";
import { ethers } from "ethers";
import {
  useTokensInfo,
  useDeposit,
} from "../contractFunctions/BlockCoopTokensFunctions";
import { useDepositEvents } from "../contractFunctions/useContractEvents";
import { useMessages } from "../hooks/useSuccessOrErrorMessage";
import {
  useActiveAccount,
  useWalletBalance,
  useSendTransaction,
} from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { client } from "../../client";
import { chain, BLOCKCOOPTOKENS_CONTRACT_ADDRESS } from "../../config";

interface Token {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  price?: string;
}

type ApprovalStatus = "idle" | "approving" | "approved" | "failed";

const DepositForm: FC = () => {
  // State management
  const [selectedToken, setSelectedToken] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [tokenBalance, setTokenBalance] = useState<string | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>("idle");
  const [parsedTokens, setParsedTokens] = useState<Token[]>([]);
  const [depositTxHash, setDepositTxHash] = useState<string | null>(null);
  const { successMessage, displaySuccessMessage, clearSuccessMessage } =
    useMessages();

  // Get the connected user's wallet address
  const account = useActiveAccount();
  const userAddress = account?.address as `0x${string}` | undefined;

  // Use sendTransaction hook
  const { mutateAsync: sendTransaction } = useSendTransaction();

  // Fetch whitelisted tokens
  const { data: tokensData, isLoading, isError } = useTokensInfo(0, 100);

  // Get deposit events
  const { events: depositEvents, isLoading: isLoadingEvents } =
    useDepositEvents();

  // Parse tokens data when available
  useEffect(() => {
    if (tokensData) {
      const [addresses, names, symbols, decimals, prices] = tokensData;

      const tokens: Token[] = addresses.map((address, index) => ({
        address,
        name: names[index],
        symbol: symbols[index],
        decimals: decimals[index],
        price: prices?.[index]?.toString(),
      }));

      setParsedTokens(tokens);
    }
  }, [tokensData]);

  // Hook to handle deposits
  const { deposit: depositTokens } = useDeposit();

  // Get user balance for the selected token
  const { data: balanceData } = useWalletBalance({
    client,
    chain: !!userAddress && !!selectedToken ? chain : undefined,
    address: userAddress ?? undefined,
    tokenAddress: selectedToken || undefined,
  });

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

  // Reset approval status when token changes
  useEffect(() => {
    setApprovalStatus("idle");
  }, [selectedToken]);

  // Approve tokens before deposit
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
        params: [BLOCKCOOPTOKENS_CONTRACT_ADDRESS, BigInt(amountInWei)],
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

  // Monitor deposit events and show success message
  useEffect(() => {
    if (!depositEvents || !depositTxHash || !userAddress) return;

    console.log("Current deposit txHash:", depositTxHash);
    console.log("All deposit events:", depositEvents);

    // Find event matching our transaction hash and user address
    const matchingEvent = depositEvents.find(
      (event) =>
        event.transactionHash === depositTxHash &&
        event.args.user.toLowerCase() === userAddress.toLowerCase()
    );

    if (matchingEvent) {
      console.log("Found matching deposit event:", matchingEvent);

      // Find the token details
      const token = parsedTokens.find(
        (t) => t.address === matchingEvent.args.tokenAddress
      );

      const formattedAmount = token
        ? ethers.utils.formatUnits(matchingEvent.args.amount, token.decimals)
        : ethers.utils.formatEther(matchingEvent.args.amount);

      displaySuccessMessage(
        `Successfully deposited ${formattedAmount} ${
          token?.symbol || "tokens"
        }!`
      );

      // Reset form after successful deposit
      setAmount("");
      setSelectedToken("");
      setApprovalStatus("idle");
      setDepositTxHash(null);
    }
  }, [
    depositEvents,
    depositTxHash,
    userAddress,
    parsedTokens,
    displaySuccessMessage,
  ]);

  // Handle form submission
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
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

      const approved = await handleApprove(amountInWei);
      if (!approved) {
        setIsSubmitting(false);
        return;
      }

      // Call deposit function and wait for it to complete
      const result = await depositTokens(selectedToken, BigInt(amountInWei));
      console.log("Deposit transaction result:", result);

      // Store the transaction hash to match with events
      if (result?.hash) {
        setDepositTxHash(result.hash);
      } else {
        // If we don't have a hash, display a temporary success message
        displaySuccessMessage(
          "Transaction submitted. Waiting for confirmation..."
        );
      }
    } catch (error) {
      console.error("Error during deposit:", error);
      alert("Deposit failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

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

      <div className="bg-gray-800 text-white p-4 rounded-lg shadow-md">
        <h3 className="text-lg font-medium mb-4">Deposit Tokens</h3>

        {isLoading && <p>Loading tokens...</p>}
        {isError && <p>Error loading tokens. Please try again.</p>}

        {parsedTokens.length > 0 ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="token" className="block text-sm font-medium mb-2">
                Select Token
              </label>
              <select
                id="token"
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
                className="w-full px-4 py-2 border rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting || approvalStatus === "approving"}
              >
                <option value="">-- Select a Token --</option>
                {parsedTokens.map((token) => (
                  <option key={token.address} value={token.address}>
                    {token.name} ({token.symbol})
                  </option>
                ))}
              </select>
            </div>

            {tokenBalance && (
              <div className="text-sm">
                <span className="text-gray-300">Available Balance: </span>
                <span className="font-medium">{tokenBalance}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="amount"
                className="block text-sm font-medium mb-2"
              >
                Amount
              </label>
              <input
                id="amount"
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount to deposit"
                className="w-full px-4 py-2 border rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting || approvalStatus === "approving"}
              />
            </div>

            <button
              type="submit"
              disabled={
                isSubmitting ||
                approvalStatus === "approving" ||
                !selectedToken ||
                !amount
              }
              className={`w-full px-4 py-2 rounded-md text-white ${
                isSubmitting || approvalStatus === "approving"
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isSubmitting
                ? "Processing..."
                : approvalStatus === "approving"
                ? "Approving..."
                : "Deposit"}
            </button>
          </form>
        ) : (
          <p>No whitelisted tokens available for deposit.</p>
        )}
      </div>
    </>
  );
};

export default DepositForm;
