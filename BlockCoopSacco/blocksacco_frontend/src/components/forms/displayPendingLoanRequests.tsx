import { useMemo, useState } from "react";
import {
  useApproveLoanRequest,
  useRejectLoanRequest,
  useGetPendingLoanRequests,
} from "../contractFunctions/LoanManagerFunctions";
import { useMessages } from "../hooks/useSuccessOrErrorMessage";
import { formatUnits } from "ethers/lib/utils";
import { useGetTokensInfo } from "../contractFunctions/BlockCoopTokensFunctions";

interface LoanRequest {
  id: bigint;
  borrower: string;
  loanToken: string;
  loanAmount: string;
  collateralTokens: string[];
  collateralAmounts: string[];
  duration: number;
  approved: boolean;
  processed: boolean;
}

interface TokenInfo {
  name: string;
  symbol?: string;
  decimals: number;
  price?: string;
}

export default function DisplayPendingLoanRequests() {
  const { displayErrorMessage: showError, displaySuccessMessage: showSuccess } =
    useMessages();
  const { approveLoanRequest, isPending: isApproving } =
    useApproveLoanRequest();
  const { rejectLoanRequest, isPending: isRejecting } = useRejectLoanRequest();
  const {
    data: requests,
    isLoading: requestsLoading,
    refetch: refetchRequests,
  } = useGetPendingLoanRequests();
  const [processedRequestIds, setProcessedRequestIds] = useState<Set<string>>(
    new Set()
  );
  const [transactionStatus, setTransactionStatus] = useState<
    Record<string, "pending" | "confirmed" | "failed">
  >({});

  const loanRequests = useMemo(
    () =>
      requests
        ?.map((request: any, index: number) => {
          if (!request) return null;
          return {
            id: BigInt(index),
            borrower: request.borrower,
            loanToken: request.loanToken,
            loanAmount: request.loanAmount?.toString() || "0",
            collateralTokens: request.collateralTokens ?? [],
            collateralAmounts: (request.collateralAmounts || []).map(
              (amount: any) => amount?.toString() || "0"
            ),
            duration: Number(request.duration || 0),
            approved: request.approved || false,
            processed: request.processed || false,
          };
        })
        .filter((request): request is LoanRequest => request !== null) || [],
    [requests]
  );

  // Get all unique token addresses from loan requests
  const uniqueTokenAddresses = useMemo(() => {
    const addresses = new Set<string>();
    loanRequests.forEach((request) => {
      addresses.add(request.loanToken);
      request.collateralTokens.forEach((token: string) => addresses.add(token));
    });
    return Array.from(addresses);
  }, [loanRequests]);

  const { data: tokensData, isLoading: tokensLoading } = useGetTokensInfo(
    0,
    100
  );

  const tokenInfoMap = useMemo(() => {
    const map = new Map<string, TokenInfo>();

    // Default values for all addresses
    uniqueTokenAddresses.forEach((address) => {
      map.set(address, { name: address.slice(0, 6), decimals: 18 });
    });

    if (tokensData && Array.isArray(tokensData)) {
      const [tokens, names, symbols, decimals, prices] = tokensData;

      for (let i = 0; i < tokens.length; i++) {
        const tokenAddress = tokens[i];
        if (uniqueTokenAddresses.includes(tokenAddress)) {
          map.set(tokenAddress, {
            name: names[i] || tokenAddress.slice(0, 6),
            symbol: symbols[i],
            decimals: decimals[i] || 18,
            price: prices[i]?.toString(),
          });
        }
      }
    }

    return map;
  }, [uniqueTokenAddresses, tokensData]);

  // Function to format duration into weeks and days
  const formatDuration = (durationInDays: number) => {
    const weeks = Math.floor(durationInDays / 7);
    const days = durationInDays % 7;
    if (weeks === 0) return `${days} days`;
    if (days === 0) return `${weeks} weeks`;
    return `${weeks} weeks, ${days} days`;
  };

  // Function to format token amount
  const formatTokenAmount = (amount: string, decimals: number) => {
    return parseFloat(formatUnits(amount, decimals)).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
  };

  const handleApprove = async (requestId: bigint) => {
    const requestIdStr = requestId.toString();
    try {
      setTransactionStatus((prev) => ({ ...prev, [requestIdStr]: "pending" }));
      setProcessedRequestIds((prev) => new Set([...prev, requestIdStr]));

      const result = await approveLoanRequest(requestId);

      // Check if the transaction was successful
      if (result) {
        showSuccess("Transaction submitted successfully!");
        setTransactionStatus((prev) => ({
          ...prev,
          [requestIdStr]: "confirmed",
        }));

        // Wait a bit for the blockchain to update
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Refetch to verify the change
        await refetchRequests();
        showSuccess("Loan request approved and confirmed on blockchain!");
      }
    } catch (error: any) {
      setTransactionStatus((prev) => ({ ...prev, [requestIdStr]: "failed" }));
      setProcessedRequestIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(requestIdStr);
        return newSet;
      });
      showError(error.message ?? "Failed to approve loan request");
    }
  };

  const handleReject = async (requestId: bigint) => {
    const requestIdStr = requestId.toString();
    try {
      setTransactionStatus((prev) => ({ ...prev, [requestIdStr]: "pending" }));
      setProcessedRequestIds((prev) => new Set([...prev, requestIdStr]));

      const result = await rejectLoanRequest(requestId);

      // Check if the transaction was successful
      if (result) {
        showSuccess("Transaction submitted successfully!");
        setTransactionStatus((prev) => ({
          ...prev,
          [requestIdStr]: "confirmed",
        }));

        // Wait a bit for the blockchain to update
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Refetch to verify the change
        await refetchRequests();
        showSuccess("Loan request rejected and confirmed on blockchain!");
      }
    } catch (error: any) {
      setTransactionStatus((prev) => ({ ...prev, [requestIdStr]: "failed" }));
      setProcessedRequestIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(requestIdStr);
        return newSet;
      });
      showError(error.message ?? "Failed to reject loan request");
    }
  };

  if (requestsLoading || tokensLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (loanRequests.length === 0) {
    return (
      <div className="text-center p-8 bg-white rounded-lg shadow">
        <p className="text-gray-600">No pending loan requests found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          Pending Loan Requests
        </h3>
      </div>
      <div className="border-t border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Borrower
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loan Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Collateral
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loanRequests.map((request) => {
                const requestIdStr = request.id.toString();
                const isProcessed = processedRequestIds.has(requestIdStr);
                const status = transactionStatus[requestIdStr];
                const loanTokenInfo: TokenInfo = tokenInfoMap.get(
                  request.loanToken
                ) || {
                  name: request.loanToken.slice(0, 6),
                  decimals: 18,
                  symbol: undefined,
                  price: undefined,
                };
                return (
                  <tr key={requestIdStr} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {request.borrower}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTokenAmount(
                        request.loanAmount,
                        loanTokenInfo.decimals
                      )}{" "}
                      {loanTokenInfo.name}{" "}
                      {loanTokenInfo.symbol ? `(${loanTokenInfo.symbol})` : ""}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDuration(request.duration / 86400)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="space-y-1">
                        {request.collateralTokens.map(
                          (token: string, i: number) => {
                            const tokenInfo: TokenInfo = tokenInfoMap.get(
                              token
                            ) || {
                              name: token.slice(0, 6),
                              decimals: 18,
                              symbol: undefined,
                              price: undefined,
                            };
                            return (
                              <div
                                key={token}
                                className="flex items-center space-x-2"
                              >
                                <span className="font-medium">
                                  {tokenInfo.name}{" "}
                                  {tokenInfo.symbol
                                    ? `(${tokenInfo.symbol})`
                                    : ""}
                                </span>
                                <span className="text-gray-500">
                                  (
                                  {formatTokenAmount(
                                    request.collateralAmounts[i],
                                    tokenInfo.decimals
                                  )}
                                  )
                                </span>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {isProcessed ? (
                        <div className="flex flex-col space-y-1">
                          <span
                            className={`text-sm ${
                              status === "confirmed"
                                ? "text-green-600"
                                : status === "failed"
                                ? "text-red-600"
                                : "text-gray-500"
                            }`}
                          >
                            {status === "confirmed"
                              ? "Confirmed"
                              : status === "failed"
                              ? "Failed"
                              : "Processing..."}
                          </span>
                          {status === "failed" && (
                            <button
                              onClick={() => {
                                setProcessedRequestIds((prev) => {
                                  const newSet = new Set(prev);
                                  newSet.delete(requestIdStr);
                                  return newSet;
                                });
                                setTransactionStatus((prev) => {
                                  const newStatus = { ...prev };
                                  delete newStatus[requestIdStr];
                                  return newStatus;
                                });
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Try Again
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApprove(request.id)}
                            disabled={isApproving || isProcessed}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                          >
                            {isApproving ? "Approving..." : "Approve"}
                          </button>
                          <button
                            onClick={() => handleReject(request.id)}
                            disabled={isRejecting || isProcessed}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                          >
                            {isRejecting ? "Rejecting..." : "Reject"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
