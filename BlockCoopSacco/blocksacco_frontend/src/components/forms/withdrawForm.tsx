import React, { useState, useEffect, FC, FormEvent } from "react";
import { ethers } from "ethers";
import {
  useTokensInfo,
  useWithdraw,
  useGetUserDeposit,
} from "../contractFunctions/BlockCoopTokensFunctions";
import { useWithdrawEvents } from "../contractFunctions/useContractEvents";
import { useMessages } from "../hooks/useSuccessOrErrorMessage";
import { useActiveAccount } from "thirdweb/react";

interface Token {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  price?: string;
}

interface WithdrawEvent {
  transactionHash: string;
  args: {
    user: string;
    tokenAddress: string;
    amount: bigint;
  };
}

const WithdrawForm: FC = () => {
  // State management
  const [selectedToken, setSelectedToken] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [parsedTokens, setParsedTokens] = useState<Token[]>([]);
  const [withdrawTxHash, setWithdrawTxHash] = useState<string | null>(null);
  const { successMessage, displaySuccessMessage, clearSuccessMessage } =
    useMessages();

  // Get the connected user's wallet address
  const account = useActiveAccount();
  const userAddress = account?.address as `0x${string}` | undefined;

  // Fetch whitelisted tokens
  const { data: tokensData, isLoading, isError } = useTokensInfo(0, 100);

  // Get withdraw events
  const { events: withdrawEvents, isLoading: isLoadingEvents } =
    useWithdrawEvents(withdrawTxHash || undefined);

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

  // Hook to handle withdrawals
  const withdraw = useWithdraw();

  // Get user's deposit amount for selected token
  const { data: depositData } = useGetUserDeposit(userAddress, selectedToken);
  const [depositAmount, setDepositAmount] = useState<string | null>(null);

  // Update deposit amount when deposit data changes
  useEffect(() => {
    if (depositData && selectedToken) {
      const token = parsedTokens.find((t) => t.address === selectedToken);
      if (token) {
        try {
          const [amount] = depositData;
          const formattedAmount = ethers.utils.formatUnits(
            amount.toString(),
            token.decimals
          );
          setDepositAmount(formattedAmount);
        } catch (error) {
          console.error("Error formatting deposit amount:", error);
          setDepositAmount(null);
        }
      }
    } else {
      setDepositAmount(null);
    }
  }, [depositData, selectedToken, parsedTokens]);

  // Monitor withdraw events and show success message
  useEffect(() => {
    if (!withdrawEvents || !withdrawTxHash || !userAddress) return;

    console.log("Current withdraw txHash:", withdrawTxHash);
    console.log("All withdraw events:", withdrawEvents);

    // Find event matching our transaction hash and user address
    const matchingEvent = (withdrawEvents as WithdrawEvent[]).find(
      (event) =>
        event.transactionHash === withdrawTxHash &&
        event.args.user.toLowerCase() === userAddress.toLowerCase()
    );

    if (matchingEvent) {
      console.log("Found matching withdraw event:", matchingEvent);

      // Find the token details
      const token = parsedTokens.find(
        (t) => t.address === matchingEvent.args.tokenAddress
      );

      const formattedAmount = token
        ? ethers.utils.formatUnits(
            matchingEvent.args.amount.toString(),
            token.decimals
          )
        : ethers.utils.formatEther(matchingEvent.args.amount.toString());

      displaySuccessMessage(
        `Successfully withdrew ${formattedAmount} ${token?.symbol || "tokens"}!`
      );

      // Reset form after successful withdrawal
      setAmount("");
      setSelectedToken("");
      setWithdrawTxHash(null);
    }
  }, [
    withdrawEvents,
    withdrawTxHash,
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

    if (depositAmount && parseFloat(amount) > parseFloat(depositAmount)) {
      alert(
        `Insufficient deposit. You have ${depositAmount} tokens deposited.`
      );
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

      // Call withdraw function and wait for it to complete
      const result = await withdraw(selectedToken, amountInWei);
      console.log("Withdraw transaction result:", result);

      // Store the transaction hash to match with events
      if (result?.transactionHash) {
        setWithdrawTxHash(result.transactionHash);
      } else {
        // If we don't have a hash, display a temporary success message
        displaySuccessMessage(
          "Transaction submitted. Waiting for confirmation..."
        );
      }
    } catch (error) {
      console.error("Error during withdrawal:", error);
      alert("Withdrawal failed. Please try again.");
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
        <h3 className="text-lg font-medium mb-4">Withdraw Tokens</h3>

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
                disabled={isSubmitting}
              >
                <option value="">-- Select a Token --</option>
                {parsedTokens.map((token) => (
                  <option key={token.address} value={token.address}>
                    {token.name} ({token.symbol})
                  </option>
                ))}
              </select>
            </div>

            {depositAmount && (
              <div className="text-sm bg-gray-700 p-3 rounded-md">
                <span className="text-gray-300">Your Deposit: </span>
                <span className="font-medium">{depositAmount}</span>
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
                placeholder="Enter amount to withdraw"
                className="w-full px-4 py-2 border rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !selectedToken || !amount}
              className={`w-full px-4 py-2 rounded-md text-white ${
                isSubmitting
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isSubmitting ? "Processing..." : "Withdraw"}
            </button>
          </form>
        ) : (
          <p>No tokens available for withdrawal.</p>
        )}
      </div>
    </>
  );
};

export default WithdrawForm;
