import { useMemo } from "react";
import { useActiveAccount } from "thirdweb/react";
import {
  useGetUserLoanRequests,
  useGetLoanRequest,
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

// Custom hook to get all loan request details for a user
function useUserLoanRequestsData(userAddress: string | undefined) {
  // Get user's loan request IDs
  const {
    data: requestIds = [],
    isLoading: idsLoading,
    refetch: refetchIds,
  } = useGetUserLoanRequests(userAddress);

  // Get details for each request ID
  const requestsData = requestIds.map((id) => useGetLoanRequest(BigInt(id)));

  // Combine loading states
  const isLoading = idsLoading || requestsData.some((req) => req.isLoading);

  // Extract loan requests data
  const loanRequests = useMemo(() => {
    if (!requestIds.length) return [];

    return requestsData
      .map((req, index) => {
        if (!req.data) return null;
        const [
          borrower,
          loanToken,
          loanAmount,
          collateralTokens,
          collateralAmounts,
          duration,
          approved,
          processed,
        ] = req.data;
        return {
          id: requestIds[index],
          borrower,
          loanToken,
          loanAmount: loanAmount.toString(),
          collateralTokens,
          collateralAmounts: collateralAmounts.map((amount: bigint) =>
            amount.toString()
          ),
          duration: Number(duration),
          approved,
          processed,
        };
      })
      .filter(Boolean) as LoanRequest[];
  }, [requestsData, requestIds]);

  const refetch = () => {
    refetchIds();
    requestsData.forEach((req) => req.refetch());
  };

  return { data: loanRequests, isLoading, refetch };
}

export default function DisplayLoanRequests() {
  const account = useActiveAccount();
  const { displayErrorMessage: showError } = useMessages();
  const { data: loanRequests = [], isLoading: requestsLoading } =
    useUserLoanRequestsData(account?.address);

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

  const getStatusClassName = (request: LoanRequest) => {
    if (!request.processed) return "bg-yellow-100 text-yellow-800";
    return request.approved
      ? "bg-green-100 text-green-800"
      : "bg-red-100 text-red-800";
  };

  const getStatusText = (request: LoanRequest) => {
    if (!request.processed) return "Pending";
    return request.approved ? "Approved" : "Rejected";
  };

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

  // Show loading state if either requests or tokens are still loading
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
        <p className="text-gray-600">No loan requests found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          Your Loan Requests
        </h3>
      </div>
      <div className="border-t border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loan Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Collateral
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loanRequests.map((request) => {
                const loanTokenInfo: TokenInfo = tokenInfoMap.get(
                  request.loanToken
                ) || {
                  name: request.loanToken.slice(0, 6),
                  decimals: 18,
                  symbol: undefined,
                  price: undefined,
                };
                return (
                  <tr key={request.id} className="hover:bg-gray-50">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClassName(
                          request
                        )}`}
                      >
                        {getStatusText(request)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="space-y-1">
                        {request.collateralTokens.map((token, i) => {
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
                        })}
                      </div>
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
