import React, { useState, useEffect, FC, FormEvent } from "react";
import { ethers } from "ethers";
import {
  useTokensInfo,
  useWithdraw,
  useGetUserDeposit,
  useGetLockedAmount,
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
  const [selectedToken, setSelectedToken] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [parsedTokens, setParsedTokens] = useState<Token[]>([]);
  const [withdrawTxHash, setWithdrawTxHash] = useState<string | null>(null);
  const { successMessage, displaySuccessMessage } = useMessages();

  const account = useActiveAccount();
  const userAddress = account?.address as `0x${string}` | undefined;

  // Get the locked amount hook
  const { data: lockedAmountData } = useGetLockedAmount(
    userAddress,
    selectedToken
  );
  const [availableBalance, setAvailableBalance] = useState<string | null>(null);
  const [lockedAmount, setLockedAmount] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState<string | null>(null);

  // Fetch whitelisted tokens
  const { data: tokensData } = useTokensInfo(0, 100);

  // Get withdraw events
  const { events: withdrawEvents } = useWithdrawEvents(
    withdrawTxHash ?? undefined
  );

  // Get user's deposit amount for selected token
  const { data: depositData } = useGetUserDeposit(userAddress, selectedToken);

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

  // Update available balance when deposit data or locked amount changes
  useEffect(() => {
    const updateBalances = async () => {
      if (depositData && selectedToken && userAddress) {
        const token = parsedTokens.find((t) => t.address === selectedToken);
        if (token) {
          try {
            const [totalAmount] = depositData;
            // Format amounts
            const formattedTotal = ethers.utils.formatUnits(
              totalAmount.toString(),
              token.decimals
            );
            const formattedLocked = ethers.utils.formatUnits(
              (lockedAmountData ?? BigInt(0)).toString(),
              token.decimals
            );

            // Calculate available balance
            const available =
              parseFloat(formattedTotal) - parseFloat(formattedLocked);

            setDepositAmount(formattedTotal);
            setLockedAmount(formattedLocked);
            setAvailableBalance(available.toFixed(token.decimals));
          } catch (error) {
            console.error("Error calculating available balance:", error);
            setDepositAmount(null);
            setLockedAmount(null);
            setAvailableBalance(null);
          }
        }
      } else {
        setDepositAmount(null);
        setLockedAmount(null);
        setAvailableBalance(null);
      }
    };

    updateBalances();
  }, [depositData, selectedToken, userAddress, parsedTokens, lockedAmountData]);

  // Monitor withdraw events
  useEffect(() => {
    if (!withdrawEvents || !withdrawTxHash || !userAddress) return;

    const matchingEvent = (withdrawEvents as WithdrawEvent[]).find(
      (event) =>
        event.transactionHash === withdrawTxHash &&
        event.args.user.toLowerCase() === userAddress.toLowerCase()
    );

    if (matchingEvent) {
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

  // Get withdraw function
  const withdraw = useWithdraw();

  // Handle form submission
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedToken || !amount || !availableBalance) {
      alert("Please select a token and enter a valid amount.");
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

    if (amountNum > parseFloat(availableBalance)) {
      alert(
        `Insufficient available balance. You can withdraw up to ${availableBalance} tokens.`
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

      const result = await withdraw(selectedToken, amountInWei);
      console.log("Withdraw transaction result:", result);

      if (result?.transactionHash) {
        setWithdrawTxHash(result.transactionHash);
      } else {
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
    <div className="bg-gray-800 rounded-lg shadow-md p-6 text-white">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="token"
            className="block text-sm font-medium text-white"
          >
            Select Token
          </label>
          <select
            id="token"
            value={selectedToken}
            onChange={(e) => setSelectedToken(e.target.value)}
            className="bg-gray-700 mt-1 block w-full pl-3 px-4 py-2  border  text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            disabled={isSubmitting}
          >
            <option value="">Select a token</option>
            {parsedTokens.map((token) => (
              <option key={token.address} value={token.address}>
                {token.symbol}
              </option>
            ))}
          </select>
        </div>

        {selectedToken && (
          <div className="bg-white rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Deposited:</span>
              <span className="font-medium text-gray-900">
                {depositAmount || "0"}{" "}
                {parsedTokens.find((t) => t.address === selectedToken)?.symbol}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Locked as Collateral:</span>
              <span className="font-medium text-red-600">
                {lockedAmount || "0"}{" "}
                {parsedTokens.find((t) => t.address === selectedToken)?.symbol}
              </span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="text-gray-500">Available for Withdrawal:</span>
              <span className="font-medium text-green-600">
                {availableBalance || "0"}{" "}
                {parsedTokens.find((t) => t.address === selectedToken)?.symbol}
              </span>
            </div>
          </div>
        )}

        <div>
          <label
            htmlFor="amount"
            className="block text-sm font-medium text-white"
          >
            Amount to Withdraw
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-gray-700 focus:ring-blue-500 focus:border-blue-500 block w-full pl-3 pr-12 px-4 py-2 border  sm:text-sm border-gray-300 rounded-md"
              placeholder="0.0"
              disabled={isSubmitting}
              step="any"
              min="0"
              max={availableBalance || "0"}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-gray-300 sm:text-sm">
                {parsedTokens.find((t) => t.address === selectedToken)?.symbol}
              </span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={
            isSubmitting ||
            !selectedToken ||
            !amount ||
            parseFloat(amount) <= 0 ||
            !availableBalance ||
            parseFloat(amount) > parseFloat(availableBalance)
          }
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            isSubmitting
              ? "bg-blue-400 cursor-not-allowed"
              : "bg-blue-900 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-900"
          }`}
        >
          {isSubmitting ? "Processing..." : "Withdraw"}
        </button>

        {successMessage && (
          <div className="mt-4 p-4 bg-green-50 rounded-md">
            <p className="text-sm text-green-700">{successMessage}</p>
          </div>
        )}
      </form>
    </div>
  );
};

export default WithdrawForm;
