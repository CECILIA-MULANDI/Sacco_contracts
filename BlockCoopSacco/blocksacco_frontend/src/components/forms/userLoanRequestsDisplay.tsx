import { useMemo } from "react";
import { useGetBorrowerLoanRequests } from "../contractFunctions/LoanManagerFunctions";
import { useActiveAccount } from "thirdweb/react";
import { useTokensInfo } from "../contractFunctions/BlockCoopTokensFunctions";

interface LoanRequest {
  borrower: string;
  loanToken: string;
  loanAmount: bigint;
  collateralTokens: readonly string[];
  collateralAmounts: readonly bigint[];
  duration: bigint;
  approved: boolean;
  processed: boolean;
}

// Helper function to format wei to readable amount
function formatTokenAmount(amount: bigint, decimals: number = 18): string {
  return (Number(amount) / Math.pow(10, decimals)).toLocaleString();
}

// Helper function to format duration
function formatDuration(durationSeconds: bigint): string {
  const seconds = Number(durationSeconds);
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));

  if (days > 0) {
    return `${days} day${days !== 1 ? "s" : ""}${
      hours > 0 ? ` ${hours}h` : ""
    }`;
  }
  return `${hours} hour${hours !== 1 ? "s" : ""}`;
}

// Helper function to get status
function getRequestStatus(
  approved: boolean,
  processed: boolean
): { text: string; className: string } {
  if (processed && approved) {
    return { text: "Approved", className: "bg-green-100 text-green-800" };
  } else if (processed && !approved) {
    return { text: "Rejected", className: "bg-red-100 text-red-800" };
  } else {
    return { text: "Pending", className: "bg-yellow-100 text-yellow-800" };
  }
}

export default function UserLoanRequestsDisplay() {
  const account = useActiveAccount();
  const userAddress = account?.address;

  const {
    data: loanRequestsData,
    isLoading,
    error,
  } = useGetBorrowerLoanRequests(userAddress);

  // Get token information including names and prices
  const { data: tokensInfo } = useTokensInfo(0, 100);

  // Initialize tokenDetails with an empty Map
  const tokenDetails = useMemo(() => {
    if (!tokensInfo) return new Map();
    const [addresses, names, symbols, decimals, prices] = tokensInfo;
    return new Map(
      addresses.map((addr: string, i: number) => [
        addr.toLowerCase(),
        {
          name: names[i] || "Unknown",
          symbol: symbols[i] || "Unknown",
          decimals: decimals[i] || 18,
          price: prices[i] || BigInt(0),
        },
      ])
    );
  }, [tokensInfo]);

  const userRequests = useMemo(() => {
    if (!loanRequestsData || !Array.isArray(loanRequestsData)) {
      return [];
    }

    return loanRequestsData.map((requestData, index) => {
      const [
        borrower,
        loanToken,
        loanAmount,
        collateralTokens,
        collateralAmounts,
        duration,
        approved,
        processed,
      ] = requestData;

      return {
        id: index,
        borrower,
        loanToken,
        loanAmount,
        collateralTokens,
        collateralAmounts,
        duration,
        approved,
        processed,
      } as LoanRequest;
    });
  }, [loanRequestsData]);

  console.log("🎉 Simplified Loan Requests:");
  console.log("User Address:", userAddress);
  console.log("Raw Data:", loanRequestsData);
  console.log("Processed Requests:", userRequests);

  if (!account) {
    return (
      <div className="text-center p-4 bg-yellow-900/50 border border-yellow-700 rounded-lg">
        <p className="text-yellow-200">
          Please connect your wallet to view loan requests
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Debug Panel */}
      {/* <div className="bg-green-100 p-4 rounded-lg text-sm">
        <h4 className="font-bold mb-2">
          ✅ Using getBorrowerLoanRequests Function:
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p>
              <strong>Function:</strong> getBorrowerLoanRequests
            </p>
            <p>
              <strong>Requests Found:</strong> {userRequests.length}
            </p>
          </div>
          <div>
            <p>
              <strong>Status:</strong>
            </p>
            <p>Loading: {isLoading ? "Yes" : "No"}</p>
            <p>Error: {error ? "Yes" : "No"}</p>
          </div>
          <div>
            <p>
              <strong>Data Available:</strong>
            </p>
            <p>✅ Duration</p>
            <p>✅ Collateral</p>
            <p>✅ Status</p>
          </div>
        </div>
      </div> */}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center p-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          {/* <p className="mt-2 text-gray-600">Loading your loan requests...</p> */}
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="text-center p-4 bg-red-900/50 border border-red-700 rounded-lg">
          <p className="text-red-200">
            Error loading loan requests: {error.message}
          </p>
        </div>
      )}

      {/* No Requests State */}
      {!isLoading && !error && userRequests.length === 0 && (
        <div className="text-center p-8 bg-gray-800 rounded-lg border border-gray-700">
          <p className="text-gray-300 mb-2">No loan requests found.</p>
          <p className="text-sm text-gray-400">
            Submit your first loan request using the form above.
          </p>
        </div>
      )}

      {/* Loan Requests Table */}
      {!isLoading && !error && userRequests.length > 0 && (
        <div className="bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Request
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Token
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Collateral
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {userRequests.map((request, index) => {
                  const status = getRequestStatus(
                    request.approved,
                    request.processed
                  );
                  const loanTokenInfo = tokenDetails.get(
                    request.loanToken.toLowerCase()
                  );

                  return (
                    <tr key={index} className="hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-200">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                        <div>
                          <div className="font-medium">
                            {loanTokenInfo?.symbol || "Unknown"}
                          </div>
                          <div className="text-xs text-gray-400">
                            {loanTokenInfo?.name ||
                              request.loanToken.slice(0, 10) + "..."}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                        <div className="font-medium">
                          {formatTokenAmount(
                            request.loanAmount,
                            loanTokenInfo?.decimals
                          )}
                        </div>
                        <div className="text-xs text-gray-400">
                          {loanTokenInfo?.symbol || "tokens"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                        <span className="text-blue-400 font-medium">
                          {formatDuration(request.duration)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                        <div className="space-y-1">
                          {request.collateralTokens.map((token, idx) => {
                            const collateralTokenInfo = tokenDetails.get(
                              token.toLowerCase()
                            );
                            return (
                              <div key={idx} className="text-xs">
                                <span className="font-medium">
                                  {formatTokenAmount(
                                    request.collateralAmounts[idx],
                                    collateralTokenInfo?.decimals
                                  )}
                                </span>{" "}
                                <span className="text-gray-400">
                                  {collateralTokenInfo?.symbol || "Unknown"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${status.className}`}
                        >
                          {status.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
