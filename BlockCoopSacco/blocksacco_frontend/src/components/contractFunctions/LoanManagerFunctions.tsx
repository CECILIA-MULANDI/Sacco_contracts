import { getContract, prepareContractCall } from "thirdweb";
import { client } from "../../client";
import { chain, LOANMANAGER_CONTRACT_ADDRESS } from "../../config";
import {
  useSendTransaction,
  useReadContract,
  useActiveAccount,
} from "thirdweb/react";
import { useMessages } from "../hooks/useSuccessOrErrorMessage";

export function getLoanManagerContractInstance() {
  return getContract({
    client,
    address: LOANMANAGER_CONTRACT_ADDRESS,
    chain,
  });
}

const contract = getLoanManagerContractInstance();

export function useAddSupportedLoanTokens() {
  const { mutateAsync: sendTransaction } = useSendTransaction();
  const addSupportedToken = async (_tokenAddress: string) => {
    const transaction = prepareContractCall({
      contract,
      method: "function addSupportedToken(address _token)",
      params: [_tokenAddress],
    });
    await sendTransaction(transaction);
  };
  return addSupportedToken;
}
export function useRemoveSupportedLoanTokens() {
  const { mutate: sendTransaction } = useSendTransaction();
  const removeSupportedToken = (_tokenAddress: string) => {
    const transaction = prepareContractCall({
      contract,
      method: "function removeSupportedLoanToken(address _token)",
      params: [_tokenAddress],
    });
    sendTransaction(transaction);
  };
  return removeSupportedToken;
}

export function useRequestLoan() {
  const {
    mutateAsync: sendTransaction,
    isPending,
    error,
  } = useSendTransaction();
  const { displaySuccessMessage: showSuccess, displayErrorMessage: showError } =
    useMessages();

  const requestLoan = async (
    _loanToken: string,
    _loanAmount: bigint,
    _collateralTokens: string[],
    _collateralAmounts: bigint[],
    _duration: bigint
  ) => {
    try {
      const transaction = prepareContractCall({
        contract,
        method:
          "function requestLoan(address,uint256,address[],uint256[],uint256) returns (uint256)",
        params: [
          _loanToken,
          _loanAmount,
          _collateralTokens,
          _collateralAmounts,
          _duration,
        ],
      });

      return await sendTransaction(transaction, {
        onSuccess: (tx) => {
          showSuccess(
            `Loan request submitted successfully! Transaction hash: ${tx.transactionHash}`
          );
        },
        onError: (error: any) => {
          showError(error.message ?? "Failed to request loan");
          throw error;
        },
      });
    } catch (error: any) {
      showError(error.message ?? "Failed to request loan");
      throw error;
    }
  };

  return { requestLoan, isPending, error };
}

export function useGetSupportedLoanTokens() {
  return useReadContract({
    contract,
    method: "function getSupportedTokens() view returns (address[])",
    params: [],
  });
}

export function useGetMaxLtvRatio() {
  return useReadContract({
    contract,
    method: "function maxLtvRatio() view returns (uint256)",
    params: [],
  });
}

export function useGetUserLoanRequests(userAddress: string | undefined) {
  return useReadContract({
    contract,
    method: "function userLoanRequests(address) view returns (uint256[])",
    params: [userAddress || "0x0000000000000000000000000000000000000000"],
  });
}

export function useGetUserLoanRequestByIndex(
  userAddress: string | undefined,
  index: number
) {
  return useReadContract({
    contract,
    method:
      "function userLoanRequests(address, uint256) view returns (uint256)",
    params: [
      userAddress || "0x0000000000000000000000000000000000000000",
      BigInt(index),
    ],
    queryOptions: {
      enabled: !!userAddress,
    },
  });
}

export function useGetLoanRequest(requestId: bigint) {
  return useReadContract({
    contract,
    method:
      "function loanRequests(uint256) view returns ((address,address,uint256,address[],uint256[],uint256,bool,bool,uint256))",
    params: [requestId],
  });
}

// Main function to get all user loan requests with complete data
export function useGetBorrowerLoanRequests(userAddress: string | undefined) {
  return useReadContract({
    contract,
    method:
      "function getBorrowerLoanRequests(address) view returns ((address,address,uint256,address[],uint256[],uint256,bool,bool)[])",
    params: [userAddress || "0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!userAddress,
    },
  });
}

export function useGetPendingLoanRequests() {
  return useReadContract({
    contract,
    method:
      "function getPendingRequests() view returns ((address borrower, address loanToken, uint256 loanAmount, address[] collateralTokens, uint256[] collateralAmounts, uint256 duration, bool approved, bool processed, uint256 timestamp)[])",
    params: [],
  });
}

export function useApproveLoanRequest() {
  const { mutateAsync: sendTransaction, isPending } = useSendTransaction();
  const { displaySuccessMessage: showSuccess, displayErrorMessage: showError } =
    useMessages();

  const approveLoanRequest = async (requestId: bigint) => {
    try {
      const transaction = prepareContractCall({
        contract,
        method: "function approveLoanRequest(uint256 _requestId)",
        params: [requestId],
      });

      // Use mutateAsync instead of mutate to get a Promise
      return await sendTransaction(transaction, {
        onSuccess: (tx) => {
          showSuccess(
            `Loan request approved! Transaction hash: ${tx.transactionHash}`
          );
        },
        onError: (error: any) => {
          showError(error.message ?? "Failed to approve loan request");
          throw error; // Re-throw to let caller handle it
        },
      });
    } catch (error: any) {
      showError(error.message ?? "Failed to approve loan request");
      throw error; // Re-throw to let caller handle it
    }
  };

  return { approveLoanRequest, isPending };
}

export function useRejectLoanRequest() {
  const { mutateAsync: sendTransaction } = useSendTransaction();
  const { displaySuccessMessage: showSuccess, displayErrorMessage: showError } =
    useMessages();

  const rejectLoanRequest = async (requestId: bigint) => {
    try {
      const transaction = prepareContractCall({
        contract,
        method: "function rejectLoanRequest(uint256 _requestId)",
        params: [requestId],
      });

      await sendTransaction(transaction);
      showSuccess("Loan request rejected successfully!");
    } catch (error) {
      console.error("Loan rejection error:", error);
      showError(`Failed to reject loan request: ${error}`);
    }
  };

  return { rejectLoanRequest };
}

export function useAddSaccoLiquidity() {
  const { mutate: sendTransaction, isPending } = useSendTransaction();
  const { displaySuccessMessage: showSuccess, displayErrorMessage: showError } =
    useMessages();

  const addLiquidity = async (tokenAddress: string, amount: bigint) => {
    try {
      const transaction = prepareContractCall({
        contract,
        method: "function addLiquidity(address _token, uint256 _amount)",
        params: [tokenAddress, amount],
      });

      sendTransaction(transaction, {
        onSuccess: (tx) => {
          showSuccess(
            `Liquidity added successfully! Transaction hash: ${tx.transactionHash}`
          );
        },
        onError: (error: any) => {
          showError(error.message ?? "Failed to add liquidity");
        },
      });
    } catch (error: any) {
      showError(error.message ?? "Failed to add liquidity");
    }
  };

  return { addLiquidity, isPending };
}

export function useRemoveSaccoLiquidity() {
  const { mutateAsync: sendTransaction, isPending } = useSendTransaction();
  const { displaySuccessMessage: showSuccess, displayErrorMessage: showError } =
    useMessages();

  const removeLiquidity = async (tokenAddress: string, shares: bigint) => {
    try {
      const transaction = prepareContractCall({
        contract,
        method: "function removeLiquidity(address _token, uint256 _shares)",
        params: [tokenAddress, shares],
      });

      await sendTransaction(transaction, {
        onSuccess: (tx) => {
          showSuccess(
            `Liquidity removed successfully! Transaction hash: ${tx.transactionHash}`
          );
        },
        onError: (error: any) => {
          showError(error.message ?? "Failed to remove liquidity");
          throw error;
        },
      });
    } catch (error: any) {
      showError(error.message ?? "Failed to remove liquidity");
      throw error;
    }
  };

  return { removeLiquidity, isPending };
}

export function useGetLendingPoolInfo(tokenAddress: string) {
  return useReadContract({
    contract,
    method:
      "function lendingPools(address) view returns (uint256 totalDeposited, uint256 totalBorrowed, uint256 availableLiquidity)",
    params: [tokenAddress],
  });
}

export function useIsContractOwner() {
  const { data: owner } = useReadContract({
    contract,
    method: "function owner() view returns (address)",
    params: [],
  });

  const account = useActiveAccount();
  const address = account?.address;

  return {
    isOwner: owner === address,
    owner,
  };
}

export function useGetPoolInfo(tokenAddress: string) {
  return useReadContract({
    contract,
    method:
      "function getPoolInfo(address) view returns (uint256, uint256, uint256, uint256, uint256, bool)",
    params: [tokenAddress],
  });
}

export function useSetPoolStatus() {
  const { mutateAsync: sendTransaction, isPending } = useSendTransaction();
  const { displaySuccessMessage: showSuccess, displayErrorMessage: showError } =
    useMessages();

  const setPoolStatus = async (tokenAddress: string, isActive: boolean) => {
    try {
      const transaction = prepareContractCall({
        contract,
        method: "function setPoolStatus(address _token, bool _isActive)",
        params: [tokenAddress, isActive],
      });

      return await sendTransaction(transaction, {
        onSuccess: (tx) => {
          showSuccess(
            `Pool status updated successfully! Transaction hash: ${tx.transactionHash}`
          );
        },
        onError: (error: any) => {
          showError(error.message ?? "Failed to update pool status");
          throw error;
        },
      });
    } catch (error: any) {
      showError(error.message ?? "Failed to update pool status");
      throw error;
    }
  };

  return { setPoolStatus, isPending };
}

export function useGetLoanRequestFromContract(
  contractAddress: string,
  requestId: bigint
) {
  const debugContract = getContract({
    client,
    address: contractAddress as `0x${string}`,
    chain,
  });

  return useReadContract({
    contract: debugContract,
    method:
      "function loanRequests(uint256) view returns (address, address, uint256, address[], uint256[], uint256, bool, bool, uint256)",
    params: [requestId],
  });
}

// Try getting just duration and collateral separately
export function useGetLoanRequestDuration(requestId: bigint) {
  return useReadContract({
    contract,
    method: "function loanRequests(uint256) view returns (uint256)",
    params: [requestId],
  });
}

// Helper functions to diagnose collateral issues
export function useGetLockedAmount(
  userAddress: string | undefined,
  tokenAddress: string
) {
  const saccoContract = getContract({
    client,
    address: "0x8521671BA5065274f68e9F6b903839296c134701", // Your Sacco contract address
    chain,
  });

  return useReadContract({
    contract: saccoContract,
    method:
      "function getLockedAmount(address user, address token) view returns (uint256)",
    params: [
      userAddress || "0x0000000000000000000000000000000000000000",
      tokenAddress,
    ],
    queryOptions: {
      enabled: !!userAddress && !!tokenAddress,
    },
  });
}

export function useGetUserDeposit(
  userAddress: string | undefined,
  tokenAddress: string
) {
  const saccoContract = getContract({
    client,
    address: "0x8521671BA5065274f68e9F6b903839296c134701", // Your Sacco contract address
    chain,
  });

  return useReadContract({
    contract: saccoContract,
    method:
      "function userDeposits(address, address) view returns (uint256, uint256)",
    params: [
      userAddress || "0x0000000000000000000000000000000000000000",
      tokenAddress,
    ],
    queryOptions: {
      enabled: !!userAddress && !!tokenAddress,
    },
  });
}

// Get user's active loans (original implementation)
export function useGetUserLoans(userAddress: string | undefined) {
  return useReadContract({
    contract,
    method:
      "function getUserLoans(address) view returns ((address,address,uint256,address[],uint256[],uint256,uint256,uint256,bool,uint256,uint256)[])",
    params: [userAddress ?? "0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!userAddress,
    },
  });
}

// Get single user loan ID at specific index
export function useGetUserLoanIdAtIndex(
  userAddress: string | undefined,
  index: number
) {
  return useReadContract({
    contract,
    method: "function userLoans(address, uint256) view returns (uint256)",
    params: [
      userAddress || "0x0000000000000000000000000000000000000000",
      BigInt(index),
    ],
    queryOptions: {
      enabled: !!userAddress,
    },
  });
}

// Get user's loan IDs by trying multiple indices (userLoans is a mapping, not array getter)
export function useGetUserLoanIds(userAddress: string | undefined) {
  const loan0 = useReadContract({
    contract,
    method: "function userLoans(address, uint256) view returns (uint256)",
    params: [
      userAddress || "0x0000000000000000000000000000000000000000",
      BigInt(0),
    ],
    queryOptions: {
      enabled: !!userAddress,
    },
  });

  const loan1 = useReadContract({
    contract,
    method: "function userLoans(address, uint256) view returns (uint256)",
    params: [
      userAddress || "0x0000000000000000000000000000000000000000",
      BigInt(1),
    ],
    queryOptions: {
      enabled: !!userAddress && loan0.data !== undefined,
    },
  });

  const loan2 = useReadContract({
    contract,
    method: "function userLoans(address, uint256) view returns (uint256)",
    params: [
      userAddress || "0x0000000000000000000000000000000000000000",
      BigInt(2),
    ],
    queryOptions: {
      enabled: !!userAddress && loan1.data !== undefined,
    },
  });

  // Collect valid loan IDs (only from successful calls)
  const validLoanIds: bigint[] = [];

  if (loan0.data !== undefined && loan0.data !== null) {
    validLoanIds.push(loan0.data as bigint);
  }
  if (loan1.data !== undefined && loan1.data !== null) {
    validLoanIds.push(loan1.data as bigint);
  }
  if (loan2.data !== undefined && loan2.data !== null) {
    validLoanIds.push(loan2.data as bigint);
  }

  // Only consider it loading if loan0 is still loading (the first required call)
  const isLoading = loan0.isPending;

  // Only report error if the first loan call fails (which means no loans exist)
  const error = loan0.error;

  return {
    data: validLoanIds,
    isLoading,
    error,
  };
}

// Get individual loan by ID - Solidity public mapping getter excludes arrays
export function useGetLoanById(loanId: bigint) {
  return useReadContract({
    contract,
    method:
      "function loans(uint256) view returns (address, address, uint256, uint256, uint256, uint256, bool, uint256, uint256)",
    params: [loanId],
  });
}

// Test function to get loan with just first 3 fields
export function useGetLoanBasic(loanId: bigint) {
  return useReadContract({
    contract,
    method: "function loans(uint256) view returns (address, address, uint256)",
    params: [loanId],
  });
}

// Get user's active loans (simplified approach)
export function useGetUserLoansAlternative(userAddress: string | undefined) {
  // Just get the first few loan IDs manually (no dynamic hooks)
  const loan0 = useGetUserLoanIdAtIndex(userAddress, 0);
  const loan1 = useGetUserLoanIdAtIndex(userAddress, 1);
  const loan2 = useGetUserLoanIdAtIndex(userAddress, 2);
  const loan3 = useGetUserLoanIdAtIndex(userAddress, 3);
  const loan4 = useGetUserLoanIdAtIndex(userAddress, 4);

  // Collect valid loan IDs
  const loanIds = [loan0, loan1, loan2, loan3, loan4]
    .filter(
      (query) => query.data !== undefined && query.data !== null && !query.error
    )
    .map((query) => query.data as bigint);

  // Get loan details for each valid ID
  const loanDetail0 = useGetLoanById(loanIds[0] || BigInt(0));
  const loanDetail1 = useGetLoanById(loanIds[1] || BigInt(0));
  const loanDetail2 = useGetLoanById(loanIds[2] || BigInt(0));
  const loanDetail3 = useGetLoanById(loanIds[3] || BigInt(0));
  const loanDetail4 = useGetLoanById(loanIds[4] || BigInt(0));

  // Collect valid loan details
  const loans = [
    loanDetail0,
    loanDetail1,
    loanDetail2,
    loanDetail3,
    loanDetail4,
  ]
    .filter((query, index) => loanIds[index] && query.data && !query.error)
    .map((query) => query.data);

  const isLoading = [
    loan0,
    loan1,
    loan2,
    loan3,
    loan4,
    loanDetail0,
    loanDetail1,
    loanDetail2,
    loanDetail3,
    loanDetail4,
  ].some((query) => query.isLoading);

  const error = [
    loan0,
    loan1,
    loan2,
    loan3,
    loan4,
    loanDetail0,
    loanDetail1,
    loanDetail2,
    loanDetail3,
    loanDetail4,
  ].find((query) => query.error)?.error;

  return {
    data: loans.length > 0 ? loans : undefined,
    isLoading,
    error,
  };
}

// Repay loan function
export function useRepayLoan() {
  const { mutateAsync: sendTransaction, isPending } = useSendTransaction();
  const { displaySuccessMessage: showSuccess, displayErrorMessage: showError } =
    useMessages();

  const repayLoan = async (loanId: bigint, amount: bigint) => {
    try {
      const transaction = prepareContractCall({
        contract,
        method: "function repayLoan(uint256 _loanId, uint256 _amount)",
        params: [loanId, amount],
      });

      return await sendTransaction(transaction, {
        onSuccess: (tx) => {
          showSuccess(
            `Loan repayment successful! Transaction hash: ${tx.transactionHash}`
          );
        },
        onError: (error: any) => {
          showError(error.message ?? "Failed to repay loan");
          throw error;
        },
      });
    } catch (error: any) {
      showError(error.message ?? "Failed to repay loan");
      throw error;
    }
  };

  return { repayLoan, isPending };
}

// Liquidate loan function
export function useLiquidateLoan() {
  const { mutateAsync: sendTransaction } = useSendTransaction();
  const { displaySuccessMessage: showSuccess, displayErrorMessage: showError } =
    useMessages();

  const liquidateLoan = async (loanId: bigint) => {
    try {
      const transaction = prepareContractCall({
        contract,
        method: "function liquidateLoan(uint256 _loanId)",
        params: [loanId],
      });

      await sendTransaction(transaction);
      showSuccess("Loan liquidated successfully!");
    } catch (error) {
      console.error("Loan liquidation error:", error);
      showError(`Failed to liquidate loan: ${error}`);
    }
  };

  return { liquidateLoan };
}

// Check if loan is liquidatable
export function useIsLoanLiquidatable(loanId: bigint) {
  return useReadContract({
    contract,
    method: "function isLoanLiquidatable(uint256 _loanId) view returns (bool)",
    params: [loanId],
  });
}

// Get liquidation info
export function useGetLiquidationInfo(loanId: bigint) {
  return useReadContract({
    contract,
    method:
      "function getLiquidationInfo(uint256 _loanId) view returns (uint256, uint256, uint256, uint256)",
    params: [loanId],
  });
}

// Get total number of loans
export function useGetLoanCount() {
  return useReadContract({
    contract,
    method: "function loanCount() view returns (uint256)",
    params: [],
  });
}

// Get loan by ID
export function useGetLoan(loanId: bigint) {
  return useReadContract({
    contract,
    method:
      "function loans(uint256) view returns (address borrower, address loanToken, uint256 loanAmount, uint256 interestRate, uint256 startTime, uint256 duration, bool isActive, uint256 totalRepaid, uint256 id)",
    params: [loanId],
  });
}
