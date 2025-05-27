import { useState, useMemo, useEffect } from "react";
import {
  useGetPendingLoanRequests,
  useApproveLoanRequest,
  useRejectLoanRequest,
  useGetUserLoans,
  useLiquidateLoan,
  useIsLoanLiquidatable,
  useGetLiquidationInfo,
  useRepayLoan,
  useGetLoanRequest,
  getLoanManagerContractInstance,
  useApproveToken,
  useGetTokenAllowance,
} from "../contractFunctions/LoanManagerFunctions";
import { useActiveAccount, useReadContract } from "thirdweb/react";
import { formatEther, parseEther } from "viem";
import { useGetTokensInfo } from "../contractFunctions/BlockCoopTokensFunctions";
import { LOANMANAGER_CONTRACT_ADDRESS } from "../../config";

interface TokenInfo {
  name: string;
  symbol?: string;
  decimals: number;
  price?: string;
}

interface LoanRequest {
  borrower: string;
  loanToken: string;
  loanAmount: bigint;
  collateralTokens: readonly string[];
  collateralAmounts: readonly bigint[];
  duration: bigint;
  approved: boolean;
  processed: boolean;
  timestamp: bigint;
}

function useGetRequestIds() {
  const contract = getLoanManagerContractInstance();
  return useReadContract({
    contract,
    method: "function getPendingRequestIds() view returns (uint256[])",
    params: [],
  }) as {
    data: bigint[] | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<any>;
  };
}

export default function LoanManagement() {
  const account = useActiveAccount();
  const [activeTab, setActiveTab] = useState<"requests" | "loans">("requests");
  const [repayAmounts, setRepayAmounts] = useState<{ [key: string]: string }>(
    {}
  );
  const [processingRequestId, setProcessingRequestId] = useState<number | null>(
    null
  );
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());

  // Get both the requests and their IDs
  const {
    data: pendingRequests,
    isLoading: loadingRequests,
    error: requestsError,
    refetch: refetchPendingRequests,
  } = useGetPendingLoanRequests() as {
    data: LoanRequest[] | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<any>;
  };

  // Get the actual request IDs
  const {
    data: pendingRequestIds,
    isLoading: loadingRequestIds,
    error: requestIdsError,
    refetch: refetchRequestIds,
  } = useGetRequestIds();

  // Get the current request's contract state
  const { data: currentRequestState } = useGetLoanRequest(
    processingRequestId !== null ? BigInt(processingRequestId) : BigInt(0)
  );

  const {
    data: activeLoans,
    isLoading: loadingLoans,
    error: loansError,
  } = useGetUserLoans(account?.address);

  // Get all unique token addresses from requests
  const uniqueTokenAddresses = useMemo(() => {
    const addresses = new Set<string>();
    if (pendingRequests) {
      pendingRequests.forEach((request: any) => {
        if (request.loanToken) {
          addresses.add(request.loanToken);
        }
      });
    }
    return Array.from(addresses);
  }, [pendingRequests]);

  // Fetch token information
  const { data: tokensData, isLoading: tokensLoading } = useGetTokensInfo(
    0,
    100
  );

  // Create a map of token addresses to their info
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

  const { approveLoanRequest } = useApproveLoanRequest();
  const { rejectLoanRequest } = useRejectLoanRequest();
  const { liquidateLoan } = useLiquidateLoan();
  const { repayLoan } = useRepayLoan();
  const { approveToken } = useApproveToken();

  // Debug logging
  console.log("🔍 LoanManagement Debug Info:", {
    timestamp: new Date().toISOString(),
    lastRefresh: new Date(lastRefreshTime).toISOString(),
    account: account?.address,
    pendingRequests,
    pendingRequestIds,
    loadingRequests,
    loadingRequestIds,
  });

  // Function to refresh data with debounce
  const refreshData = async () => {
    const now = Date.now();
    if (now - lastRefreshTime < 2000) {
      console.log("⏳ Skipping refresh - too soon");
      return;
    }
    console.log("🔄 Refreshing data...");
    setLastRefreshTime(now);
    await Promise.all([refetchPendingRequests(), refetchRequestIds()]);
  };

  const handleApprove = async (index: number) => {
    try {
      if (!pendingRequests || !pendingRequestIds) {
        console.error("❌ No requests or request IDs available");
        alert("Request data not available");
        return;
      }

      // Get the actual request ID from the pendingRequestIds array
      const actualRequestId = pendingRequestIds[index];
      if (actualRequestId === undefined) {
        console.error("❌ Request ID not found:", {
          index,
          totalRequests: pendingRequests.length,
          totalRequestIds: pendingRequestIds.length,
        });
        alert(`Request ID at index ${index} not found`);
        return;
      }

      console.log("🔍 Processing request:", {
        index,
        actualRequestId: Number(actualRequestId),
        totalRequests: pendingRequests.length,
      });

      setProcessingRequestId(Number(actualRequestId));

      const request = pendingRequests[index];
      if (!request) {
        console.error("❌ Request not found:", {
          index,
          totalRequests: pendingRequests.length,
        });
        alert(`Request at index ${index} not found`);
        return;
      }

      // Log detailed request state
      console.log("📝 Current Request State:", {
        index,
        actualRequestId: Number(actualRequestId),
        request: {
          borrower: request.borrower,
          loanAmount: formatEther(request.loanAmount),
          processed: request.processed,
          approved: request.approved,
          timestamp: new Date(Number(request.timestamp) * 1000).toISOString(),
          duration: Number(request.duration),
          loanToken: request.loanToken,
        },
      });

      // Force refresh before proceeding
      console.log("🔄 Refreshing data before approval...");
      await Promise.all([refetchPendingRequests(), refetchRequestIds()]);

      // Re-check the request after refresh
      const freshRequests = await refetchPendingRequests();
      const freshRequestIds = await refetchRequestIds();
      const freshRequest = freshRequests.data?.[index];
      const freshRequestId = freshRequestIds.data?.[index];

      if (!freshRequest || !freshRequestId) {
        console.error("❌ Request state changed during refresh");
        alert("Request state has changed. Please try again.");
        return;
      }

      if (freshRequest.processed) {
        console.error("❌ Request is already processed");
        alert("This request has already been processed.");
        return;
      }

      console.log("🟢 Proceeding with approval for request:", {
        index,
        actualRequestId: Number(freshRequestId),
      });

      try {
        // Use the actual request ID, not the array index
        const tx = await approveLoanRequest(freshRequestId);
        console.log("✅ Approval transaction:", tx);
        alert(`Request #${Number(freshRequestId)} approved successfully!`);
      } catch (txError: any) {
        console.error("❌ Transaction failed:", {
          error: txError,
          code: txError.code,
          message: txError.message,
          data: txError.data,
          index,
          actualRequestId: Number(freshRequestId),
        });
        throw txError;
      }

      // Final refresh
      await Promise.all([refetchPendingRequests(), refetchRequestIds()]);
    } catch (error: any) {
      console.error("❌ Approval failed:", {
        error,
        code: error.code,
        message: error.message,
        data: error.data,
      });

      if (error.message?.includes("Request already processed")) {
        console.log(
          "🔍 Request appears to be already processed, refreshing state..."
        );
        alert(
          "This request has already been processed. Refreshing the list..."
        );
        await Promise.all([refetchPendingRequests(), refetchRequestIds()]);
      } else if (error.code === -32000) {
        alert("Transaction failed. Please check your wallet and try again.");
      } else {
        alert(error.message || "Failed to approve request");
      }
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleReject = async (index: number) => {
    try {
      if (!pendingRequestIds) {
        console.error("❌ No request IDs available");
        alert("Request data not available");
        return;
      }

      // Get the actual request ID from the pendingRequestIds array
      const actualRequestId = pendingRequestIds[index];
      if (actualRequestId === undefined) {
        console.error("❌ Request ID not found:", {
          index,
          totalRequestIds: pendingRequestIds.length,
        });
        alert(`Request ID at index ${index} not found`);
        return;
      }

      console.log(
        "🔴 Rejecting request at index:",
        index,
        "with ID:",
        Number(actualRequestId)
      );
      await rejectLoanRequest(actualRequestId);

      // Refresh data after rejection
      await Promise.all([refetchPendingRequests(), refetchRequestIds()]);
    } catch (error) {
      console.error("❌ Rejection failed:", error);
    }
  };

  const handleLiquidate = async (loanId: number) => {
    try {
      console.log("⚡ Liquidating loan ID:", loanId);
      await liquidateLoan(BigInt(loanId));
    } catch (error) {
      console.error("❌ Liquidation failed:", error);
    }
  };

  const handleRepayLoan = async (loanId: number) => {
    const amount = repayAmounts[loanId.toString()];
    if (!amount) return;

    try {
      console.log("💰 Repaying loan ID:", loanId, "Amount:", amount);
      const amountWei = parseEther(amount);
      await repayLoan(BigInt(loanId), amountWei);
      // Clear the repay amount after successful repayment
      setRepayAmounts((prev) => {
        const newAmounts = { ...prev };
        delete newAmounts[loanId.toString()];
        return newAmounts;
      });
    } catch (error) {
      console.error("❌ Repayment failed:", error);
    }
  };

  const containerStyle = {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "20px",
    fontFamily: "Arial, sans-serif",
  };

  const tabStyle = {
    display: "flex",
    borderBottom: "2px solid #e5e7eb",
    marginBottom: "20px",
  };

  const tabButtonStyle = (isActive: boolean) => ({
    padding: "12px 24px",
    border: "none",
    backgroundColor: isActive ? "#3b82f6" : "transparent",
    color: isActive ? "white" : "#6b7280",
    cursor: "pointer",
    borderBottom: isActive ? "2px solid #3b82f6" : "2px solid transparent",
    fontSize: "16px",
    fontWeight: "500",
  });

  const cardStyle = {
    backgroundColor: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    padding: "20px",
    marginBottom: "16px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  };

  const buttonStyle = (variant: "approve" | "reject" | "liquidate") => {
    const baseStyle = {
      padding: "8px 16px",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "500",
      marginRight: "8px",
    };

    switch (variant) {
      case "approve":
        return { ...baseStyle, backgroundColor: "#10b981", color: "white" };
      case "reject":
        return { ...baseStyle, backgroundColor: "#ef4444", color: "white" };
      case "liquidate":
        return { ...baseStyle, backgroundColor: "#f59e0b", color: "white" };
      default:
        return baseStyle;
    }
  };

  const LoanRequestCard = ({
    request,
    index,
  }: {
    request: any;
    index: number;
  }) => {
    // Get the actual request ID for display
    const actualRequestId = pendingRequestIds?.[index];

    return (
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: "0 0 12px 0", color: "#1f2937" }}>
              Request #{actualRequestId ? Number(actualRequestId) : index}
              {actualRequestId ? (
                <span style={{ fontSize: "14px", color: "#6b7280" }}>
                  {" "}
                  (Index: {index})
                </span>
              ) : null}
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <div>
                <p
                  style={{
                    margin: "4px 0",
                    fontSize: "14px",
                    color: "#6b7280",
                  }}
                >
                  Borrower:
                </p>
                <p
                  style={{
                    margin: "0",
                    fontSize: "12px",
                    fontFamily: "monospace",
                  }}
                >
                  {request.borrower || "N/A"}
                </p>
              </div>
              <div>
                <p
                  style={{
                    margin: "4px 0",
                    fontSize: "14px",
                    color: "#6b7280",
                  }}
                >
                  Loan Amount:
                </p>
                <p style={{ margin: "0", fontSize: "16px", fontWeight: "600" }}>
                  {request.loanAmount ? formatEther(request.loanAmount) : "N/A"}{" "}
                  tokens
                </p>
              </div>
              <div>
                <p
                  style={{
                    margin: "4px 0",
                    fontSize: "14px",
                    color: "#6b7280",
                  }}
                >
                  Duration:
                </p>
                <p style={{ margin: "0" }}>
                  {request.duration
                    ? Math.floor(Number(request.duration) / (24 * 60 * 60))
                    : "N/A"}{" "}
                  days
                </p>
              </div>
              <div>
                <p
                  style={{
                    margin: "4px 0",
                    fontSize: "14px",
                    color: "#6b7280",
                  }}
                >
                  Status:
                </p>
                <span
                  style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    backgroundColor: request.processed ? "#fee2e2" : "#fef3c7",
                    color: request.processed ? "#dc2626" : "#d97706",
                  }}
                >
                  {request.processed ? "Processed" : "Pending"}
                </span>
              </div>
            </div>
          </div>
          {!request.processed && (
            <div>
              <button
                style={buttonStyle("approve")}
                onClick={() => handleApprove(index)}
                disabled={
                  processingRequestId ===
                  (actualRequestId ? Number(actualRequestId) : null)
                }
              >
                {processingRequestId ===
                (actualRequestId ? Number(actualRequestId) : null)
                  ? "Processing..."
                  : "Approve"}
              </button>
              <button
                style={buttonStyle("reject")}
                onClick={() => handleReject(index)}
              >
                Reject
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const LoanCard = ({ loan, index }: { loan: any; index: number }) => {
    const [repayAmount, setRepayAmount] = useState("");

    // Calculate loan details
    const loanAmount = loan.loanAmount ? formatEther(loan.loanAmount) : "0";
    const totalRepaid = loan.totalRepaid ? formatEther(loan.totalRepaid) : "0";
    const interestRate = loan.interestRate
      ? (Number(loan.interestRate) / 100).toFixed(2)
      : "0";
    const startTime = loan.startTime
      ? new Date(Number(loan.startTime) * 1000).toLocaleDateString()
      : "N/A";
    const duration = loan.duration
      ? Math.floor(Number(loan.duration) / (24 * 60 * 60))
      : 0;
    const endDate = loan.startTime
      ? new Date(
          (Number(loan.startTime) + Number(loan.duration)) * 1000
        ).toLocaleDateString()
      : "N/A";

    // Calculate time remaining
    const currentTime = Math.floor(Date.now() / 1000);
    const endTime = Number(loan.startTime) + Number(loan.duration);
    const isOverdue = currentTime > endTime;
    const timeRemaining = isOverdue
      ? 0
      : Math.floor((endTime - currentTime) / (24 * 60 * 60));

    return (
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: "0 0 12px 0", color: "#1f2937" }}>
              Loan #{loan.id || index}
              <span
                style={{
                  marginLeft: "8px",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  backgroundColor: loan.isActive ? "#dcfce7" : "#fee2e2",
                  color: loan.isActive ? "#16a34a" : "#dc2626",
                }}
              >
                {loan.isActive ? "Active" : "Inactive"}
              </span>
              {isOverdue && loan.isActive && (
                <span
                  style={{
                    marginLeft: "8px",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    backgroundColor: "#fee2e2",
                    color: "#dc2626",
                  }}
                >
                  Overdue
                </span>
              )}
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <div>
                <p
                  style={{
                    margin: "4px 0",
                    fontSize: "14px",
                    color: "#6b7280",
                  }}
                >
                  Borrower:
                </p>
                <p
                  style={{
                    margin: "0",
                    fontSize: "12px",
                    fontFamily: "monospace",
                  }}
                >
                  {loan.borrower?.slice(0, 6)}...{loan.borrower?.slice(-4)}
                </p>
              </div>
              <div>
                <p
                  style={{
                    margin: "4px 0",
                    fontSize: "14px",
                    color: "#6b7280",
                  }}
                >
                  Loan Amount:
                </p>
                <p style={{ margin: "0", fontSize: "16px", fontWeight: "600" }}>
                  {loanAmount} tokens
                </p>
              </div>
              <div>
                <p
                  style={{
                    margin: "4px 0",
                    fontSize: "14px",
                    color: "#6b7280",
                  }}
                >
                  Interest Rate:
                </p>
                <p style={{ margin: "0", fontSize: "16px", fontWeight: "600" }}>
                  {interestRate}%
                </p>
              </div>
              <div>
                <p
                  style={{
                    margin: "4px 0",
                    fontSize: "14px",
                    color: "#6b7280",
                  }}
                >
                  Total Repaid:
                </p>
                <p style={{ margin: "0", fontSize: "16px", fontWeight: "600" }}>
                  {totalRepaid} tokens
                </p>
              </div>
              <div>
                <p
                  style={{
                    margin: "4px 0",
                    fontSize: "14px",
                    color: "#6b7280",
                  }}
                >
                  Start Date:
                </p>
                <p style={{ margin: "0" }}>{startTime}</p>
              </div>
              <div>
                <p
                  style={{
                    margin: "4px 0",
                    fontSize: "14px",
                    color: "#6b7280",
                  }}
                >
                  End Date:
                </p>
                <p style={{ margin: "0" }}>{endDate}</p>
              </div>
              <div>
                <p
                  style={{
                    margin: "4px 0",
                    fontSize: "14px",
                    color: "#6b7280",
                  }}
                >
                  Duration:
                </p>
                <p style={{ margin: "0" }}>{duration} days</p>
              </div>
              <div>
                <p
                  style={{
                    margin: "4px 0",
                    fontSize: "14px",
                    color: "#6b7280",
                  }}
                >
                  Time Remaining:
                </p>
                <p
                  style={{
                    margin: "0",
                    color: isOverdue ? "#dc2626" : "#16a34a",
                  }}
                >
                  {isOverdue ? "Overdue" : `${timeRemaining} days`}
                </p>
              </div>
            </div>

            {/* Repayment Section */}
            {loan.isActive && (
              <div
                style={{
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  padding: "12px",
                  marginTop: "12px",
                }}
              >
                <h4
                  style={{
                    margin: "0 0 8px 0",
                    fontSize: "14px",
                    color: "#1f2937",
                  }}
                >
                  Repay Loan
                </h4>
                <div
                  style={{ display: "flex", gap: "8px", alignItems: "center" }}
                >
                  <input
                    type="number"
                    placeholder="Amount to repay"
                    value={repayAmount}
                    onChange={(e) => setRepayAmount(e.target.value)}
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "4px",
                      fontSize: "14px",
                      flex: 1,
                    }}
                  />
                  <button
                    style={{
                      ...buttonStyle("approve"),
                      margin: 0,
                    }}
                    onClick={() => {
                      if (repayAmount && parseFloat(repayAmount) > 0) {
                        handleRepayLoan(loan.id || index);
                        setRepayAmount("");
                      }
                    }}
                    disabled={!repayAmount || parseFloat(repayAmount) <= 0}
                  >
                    Repay
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ marginLeft: "16px" }}>
            {isOverdue && loan.isActive && (
              <button
                style={buttonStyle("liquidate")}
                onClick={() => handleLiquidate(loan.id || index)}
              >
                Liquidate
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loadingRequests || tokensLoading) {
    return <div className="text-white">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Borrower
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {pendingRequests && pendingRequests.length > 0 ? (
              pendingRequests.map((request: LoanRequest, index: number) => {
                const duration = Number(request.duration) / (24 * 60 * 60);
                const tokenInfo = tokenInfoMap.get(request.loanToken) || {
                  name: request.loanToken.slice(0, 6),
                  decimals: 18,
                  symbol: undefined,
                };

                const isProcessing = processingRequestId === index;

                return (
                  <tr
                    key={`${request.borrower}-${index}`}
                    className="bg-gray-800"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {index}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {request.borrower.slice(0, 6)}...
                      {request.borrower.slice(-4)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {formatEther(request.loanAmount)}{" "}
                      {tokenInfo.symbol ?? tokenInfo.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {duration} days
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          request.processed
                            ? "bg-gray-700 text-gray-300"
                            : "bg-yellow-900 text-yellow-200"
                        }`}
                      >
                        {request.processed ? "Processed" : "Pending"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {!request.processed && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApprove(index)}
                            disabled={isProcessing}
                            className={`px-3 py-1 ${
                              isProcessing
                                ? "bg-gray-600 cursor-not-allowed"
                                : "bg-green-600 hover:bg-green-700"
                            } text-white rounded transition-colors`}
                          >
                            {isProcessing ? "Processing..." : "Approve"}
                          </button>
                          <button
                            onClick={() => handleReject(index)}
                            disabled={isProcessing}
                            className={`px-3 py-1 ${
                              isProcessing
                                ? "bg-gray-600 cursor-not-allowed"
                                : "bg-red-600 hover:bg-red-700"
                            } text-white rounded transition-colors`}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr className="bg-gray-800">
                <td colSpan={6} className="px-6 py-4 text-center text-gray-300">
                  No pending loan requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Liquidation Policy Info */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mt-6">
        <h3 className="text-lg font-medium text-white mb-3">
          📋 Liquidation Policy
        </h3>
        <div className="text-sm text-gray-300 space-y-2">
          <p className="font-medium">
            When liquidated, funds are distributed as follows:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <span className="font-medium">Debt Recovery:</span> Proportional
              amount goes to liquidity pool
            </li>
            <li>
              <span className="font-medium">Protocol Fee (2%):</span> Goes to
              contract owner
            </li>
            <li>
              <span className="font-medium">Liquidator Reward (3%):</span> Goes
              to transaction executor
            </li>
            <li>
              <span className="font-medium">Remaining Collateral:</span>{" "}
              Returned to borrower
            </li>
          </ul>
          <p className="text-gray-400 italic mt-2">
            Note: Liquidation is only possible after loan duration has expired.
          </p>
        </div>
      </div>
    </div>
  );
}
