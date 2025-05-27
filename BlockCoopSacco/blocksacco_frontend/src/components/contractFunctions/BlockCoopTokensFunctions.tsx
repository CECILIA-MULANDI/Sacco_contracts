// contracts/ContractFunctions.ts
import { useReadContract, useSendTransaction } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { client } from "../../client";
import { chain, BLOCKCOOPTOKENS_CONTRACT_ADDRESS } from "../../config";

import { useEffect, useState } from "react";
import { useMessages } from "../hooks/useSuccessOrErrorMessage";

// Function to get contract instance
export function getContractInstance() {
  return getContract({
    client,
    address: BLOCKCOOPTOKENS_CONTRACT_ADDRESS,
    chain,
  });
}

// Get contract instance at module level for use in hooks
const contract = getContractInstance();

// Custom hook for checking contract owner
export function useContractOwner() {
  return useReadContract({
    contract,
    method: "function owner() view returns (address)",
    params: [],
  });
}

// Custom hook for checking if an address is a fund manager
export function useIsFundManager(address: string | undefined) {
  return useReadContract({
    contract,
    method: "function isFundManager(address) view returns (bool)",
    params: [address ?? "0x0000000000000000000000000000000000000000"],
  });
}

export function useAddFundManager() {
  // Extract the correct properties from useSendTransaction
  const {
    mutateAsync: sendTransaction,
    isPending,
    error: txError,
  } = useSendTransaction();

  const [error, setError] = useState<string | null>(null);

  // Use useEffect to handle errors from the useSendTransaction hook
  useEffect(() => {
    if (txError) {
      // Parse the error message from the txError
      let errorMessage = "Transaction failed";

      if (txError instanceof Error) {
        // Extract the error message
        errorMessage = txError.message;

        // Check for specific contract revert messages within the error
        if (errorMessage.includes("Already a fund manager")) {
          errorMessage = "This address is already registered as a fund manager";
        } else if (errorMessage.includes("ERR_ZERO_ADDRESS")) {
          errorMessage = "Cannot add zero address as a fund manager";
        } else if (
          errorMessage.includes("403") ||
          errorMessage.includes("Forbidden")
        ) {
          errorMessage =
            "API access forbidden. Please check your ThirdWeb API credentials.";
        } else if (
          errorMessage.includes("401") ||
          errorMessage.includes("Unauthorized")
        ) {
          errorMessage =
            "Unauthorized. Please check your wallet connection and permissions.";
        }
      }

      setError(errorMessage);
    } else {
      setError(null);
    }
  }, [txError]);

  // Return a function that takes the manager address as parameter
  const addManager = async (managerAddress: string) => {
    // Use isPending instead of isLoading
    try {
      const transaction = prepareContractCall({
        contract,
        method: "function addFundManager(address _manager)",
        params: [managerAddress],
      });

      await sendTransaction(transaction);
    } catch (err: any) {
      // This will catch any errors not caught by the mutation hook
      let errorMessage = "Transaction failed";

      if (typeof err === "object" && err !== null) {
        if (err.message) {
          errorMessage = err.message;
        } else if (err.reason) {
          errorMessage = err.reason;
        }
      }

      setError(errorMessage);
    }
  };

  return { addManager, error, isLoading: isPending };
}
export function useGetActiveFundManagers() {
  return useReadContract({
    contract,
    method: "function getAllActiveFundManagers() view returns (address[])",
    params: [],
  });
}

// Get all fund managers
export function useActiveFundManagers() {
  // First we need to get the count
  const { data: managerCount } = useReadContract({
    contract,
    method: "function activeFundManagers() view returns (address[])",
    params: [],
  });

  return { fundManagers: managerCount };
}

// Get tokens info with pagination
export function useGetTokensInfo(offset: number, limit: number) {
  return useReadContract({
    contract,
    method:
      "function getTokensInfo(uint256 _offset, uint256 _limit) view returns (address[], string[], string[], uint8[], uint256[])",
    params: [BigInt(offset), BigInt(limit)],
  });
}

// Get user's total portfolio value
export function useGetUserTotalValueUSD(
  userAddress: string,
  offset: number,
  limit: number
) {
  return useReadContract({
    contract,
    method:
      "function getUserTotalValueUSD(address _user, uint256 _offset, uint256 _limit) view returns (uint256 totalValue, uint256 processedTokens)",
    params: [userAddress, BigInt(offset), BigInt(limit)],
  });
}

// Check if user has deposited a specific token
export function useHasUserDepositedToken(
  userAddress: string | undefined,
  tokenAddress: string
) {
  return useReadContract({
    contract,
    method:
      "function hasUserDepositedToken(address _user, address _token) view returns (bool)",
    params: [
      userAddress ?? "0x0000000000000000000000000000000000000000",
      tokenAddress,
    ],
  });
}

// Get all user deposited tokens
export function useGetUserDepositedTokens(userAddress: string | undefined) {
  return useReadContract({
    contract,
    method:
      "function getUserDepositedTokens(address _user) view returns (address[])",
    params: [userAddress || "0x0000000000000000000000000000000000000000"],
  });
}

// Get total count of whitelisted tokens
export function useGetWhitelistedTokenCount() {
  return useReadContract({
    contract,
    method: "function getWhitelistedTokenCount() view returns (uint256)",
    params: [],
  });
}
export function useTokensInfo(_offset: number, _limit: number) {
  return useReadContract({
    contract,
    method:
      "function getTokensInfo(uint256 _offset, uint256 _limit) view returns (address[] tokens, string[] names, string[] symbols, uint8[] decimals, uint256[] prices)",
    params: [BigInt(_offset), BigInt(_limit)],
  });
}
export function useRemoveFundManager() {
  const { mutate: sendTransaction } = useSendTransaction();

  // Return a function that takes the manager address as parameter
  const removeManager = (managerAddress: string) => {
    const transaction = prepareContractCall({
      contract,
      method: "function removeFundManager(address _manager)",
      params: [managerAddress],
    });
    sendTransaction(transaction);
  };

  return removeManager;
}

export function useWhiteListToken() {
  const { mutate: sendTransaction } = useSendTransaction();

  // Return a function that takes the token address as parameter
  const whiteListToken = (
    tokenAddress: string,
    _priceFeed: string,
    _isStable: boolean
  ) => {
    const transaction = prepareContractCall({
      contract,
      method:
        "function whitelistToken(address _tokenAddress, address _priceFeed, bool _isStable)",
      params: [tokenAddress, _priceFeed, _isStable],
    });
    sendTransaction(transaction);
  };

  return whiteListToken;
}
export function useUnWhiteListToken() {
  const { mutate: sendTransaction } = useSendTransaction();

  // Return a function that takes the token address as parameter
  const unWhiteListToken = (tokenAddress: string) => {
    const transaction = prepareContractCall({
      contract,
      method: "function unWhitelistToken(address _tokenAddress)",
      params: [tokenAddress],
    });
    sendTransaction(transaction);
  };

  return unWhiteListToken;
}
export function useDeposit() {
  const { mutate: sendTransaction, isPending } = useSendTransaction();
  const { displaySuccessMessage: showSuccess, displayErrorMessage: showError } =
    useMessages();

  const deposit = async (_tokenAddress: string, _amount: bigint) => {
    try {
      const transaction = prepareContractCall({
        contract,
        method: "function deposit(address _token, uint256 _amount)",
        params: [_tokenAddress, _amount],
      });

      sendTransaction(transaction, {
        onSuccess: (tx) => {
          showSuccess(
            `Tokens deposited successfully! Transaction hash: ${tx.transactionHash}`
          );
        },
        onError: (error: any) => {
          showError(error.message ?? "Failed to deposit tokens");
        },
      });
    } catch (error: any) {
      showError(error.message ?? "Failed to deposit tokens");
    }
  };

  return { deposit, isPending };
}

export function useApproveSpender() {
  const { mutate: sendTransaction, isPending } = useSendTransaction();
  const { displaySuccessMessage: showSuccess, displayErrorMessage: showError } =
    useMessages();

  const approveSpender = async (tokenAddress: string, amount: bigint) => {
    try {
      const transaction = prepareContractCall({
        contract,
        method: "function approveSpender(address _token, uint256 _amount)",
        params: [tokenAddress, amount],
      });

      sendTransaction(transaction, {
        onSuccess: (tx) => {
          showSuccess(
            `Spender approved successfully! Transaction hash: ${tx.transactionHash}`
          );
        },
        onError: (error: any) => {
          showError(error.message ?? "Failed to approve spender");
        },
      });
    } catch (error: any) {
      showError(error.message ?? "Failed to approve spender");
    }
  };

  return { approveSpender, isPending };
}

export function useWithdraw() {
  const { mutateAsync: sendTransaction } = useSendTransaction();

  const withdraw = async (_tokenAddress: string, _amount: string) => {
    const transaction = prepareContractCall({
      contract,
      method: "function withdraw(address _tokenAddress, uint256 _amount)",
      params: [_tokenAddress, BigInt(_amount)],
    });
    return await sendTransaction(transaction);
  };

  return withdraw;
}

export function useGetUserDeposit(
  userAddress: string | undefined,
  tokenAddress: string | undefined
) {
  return useReadContract({
    contract,
    method:
      "function userDeposits(address user, address token) view returns (uint256 amount, uint256 timestamp)",
    params: [
      userAddress || "0x0000000000000000000000000000000000000000",
      tokenAddress || "0x0000000000000000000000000000000000000000",
    ],
    queryOptions: {
      enabled: !!(userAddress && tokenAddress),
    },
  });
}

export function useGetLockedAmount(
  userAddress: string | undefined,
  tokenAddress: string | undefined
) {
  return useReadContract({
    contract,
    method:
      "function getLockedAmount(address user, address tokenAddress) view returns (uint256)",
    params: [
      userAddress ?? "0x0000000000000000000000000000000000000000",
      tokenAddress ?? "0x0000000000000000000000000000000000000000",
    ],
    queryOptions: {
      enabled: !!(userAddress && tokenAddress),
    },
  });
}

export function useGetLoanManagerAddress() {
  return useReadContract({
    contract,
    method: "function loanManager() view returns (address)",
    params: [],
  });
}

export function useSetLoanManager() {
  const { mutateAsync: sendTransaction, isPending } = useSendTransaction();
  const { displaySuccessMessage: showSuccess, displayErrorMessage: showError } =
    useMessages();

  const setLoanManager = async (loanManagerAddress: string) => {
    try {
      const transaction = prepareContractCall({
        contract,
        method: "function setLoanManager(address _loanManager)",
        params: [loanManagerAddress],
      });

      await sendTransaction(transaction, {
        onSuccess: (tx) => {
          showSuccess(
            `LoanManager address set successfully! Transaction hash: ${tx.transactionHash}`
          );
        },
        onError: (error: any) => {
          showError(error.message ?? "Failed to set LoanManager address");
          throw error;
        },
      });
    } catch (error: any) {
      showError(error.message ?? "Failed to set LoanManager address");
      throw error;
    }
  };

  return { setLoanManager, isPending };
}

// Get token balance for a user
export function useGetTokenBalance(
  userAddress: string | undefined,
  tokenAddress: string | undefined
) {
  const tokenContract = tokenAddress
    ? getContract({
        client,
        address: tokenAddress as `0x${string}`,
        chain,
      })
    : undefined;

  return useReadContract({
    contract: tokenContract!,
    method: "function balanceOf(address _owner) view returns (uint256)",
    params: [userAddress ?? "0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!tokenContract && !!userAddress,
    },
  });
}
