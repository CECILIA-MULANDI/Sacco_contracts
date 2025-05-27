import { useState, useEffect } from "react";
import {
  useGetUserLoanIds,
  useRepayLoan,
  useGetLoanById,
  useApproveToken,
  useGetTokenAllowance,
} from "../contractFunctions/LoanManagerFunctions";
import { useTokensInfo } from "../contractFunctions/BlockCoopTokensFunctions";
import { useActiveAccount } from "thirdweb/react";

interface LoanCardProps {
  loanId: bigint;
  repayAmounts: { [key: string]: string };
  setRepayAmounts: React.Dispatch<
    React.SetStateAction<{ [key: string]: string }>
  >;
  handleRepayLoan: (loanId: string, amount: string) => Promise<boolean>;
  handleApproveToken: (
    tokenAddress: string,
    amount: string
  ) => Promise<boolean>;
  repayPending: boolean;
  approvePending: boolean;
  formatTokenAmount: (amount: any) => string;
}

function LoanCard({
  loanId,
  repayAmounts,
  setRepayAmounts,
  handleRepayLoan,
  handleApproveToken,
  repayPending,
  approvePending,
  formatTokenAmount,
}: LoanCardProps) {
  const account = useActiveAccount();
  const { data: loanData, isPending, error, refetch } = useGetLoanById(loanId);
  const { data: tokensInfo } = useTokensInfo(0, 100); // Get all tokens info
  const [tokenSymbol, setTokenSymbol] = useState<string>("tokens");

  // Get token allowance for the loan token
  const loanTokenAddress = loanData?.[1]; // loanToken is the second element in the tuple
  const { data: allowance, refetch: refetchAllowance } = useGetTokenAllowance(
    loanTokenAddress,
    account?.address
  );

  // Refresh data when repayment is completed
  useEffect(() => {
    if (!repayPending) {
      refetch();
      refetchAllowance();
    }
  }, [repayPending, refetch, refetchAllowance]);

  // Update token symbol when loan data and tokens info are available
  useEffect(() => {
    if (loanData && tokensInfo) {
      const [, loanToken] = loanData;
      const [tokenAddresses, , tokenSymbols] = tokensInfo;

      const tokenIndex = tokenAddresses.findIndex(
        (addr: string) => addr.toLowerCase() === loanToken.toLowerCase()
      );

      if (tokenIndex !== -1 && tokenSymbols[tokenIndex]) {
        setTokenSymbol(tokenSymbols[tokenIndex]);
      }
    }
  }, [loanData, tokensInfo]);

  if (isPending) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
        <p className="text-gray-500 text-sm mt-2">
          Loading loan #{loanId.toString()}...
        </p>
      </div>
    );
  }

  if (error || !loanData) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div className="text-red-600 text-sm sm:text-base">
          <div className="flex items-center space-x-2">
            <span className="text-red-500">⚠️</span>
            <span>Error loading loan #{loanId.toString()}</span>
          </div>
          <p className="text-xs text-red-500 mt-1">
            {error?.message || "Unknown error"}
          </p>
        </div>
      </div>
    );
  }

  // Destructure the loan data tuple from the contract (arrays not included in public getter)
  const [
    borrower,
    loanToken,
    loanAmount,
    interestRate,
    startTime,
    duration,
    isActive,
    totalRepaid,
    id,
  ] = loanData;

  const loanAmountFormatted = formatTokenAmount(loanAmount);
  const totalRepaidFormatted = formatTokenAmount(totalRepaid);
  const remainingDebt = Math.max(
    0,
    parseFloat(loanAmountFormatted) - parseFloat(totalRepaidFormatted)
  );
  const interestRateFormatted = (Number(interestRate) / 100).toFixed(2);
  const loanIdStr = id.toString();
  const repayAmount = repayAmounts[loanIdStr] || "";

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6 w-full max-w-full overflow-hidden">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 space-y-2 sm:space-y-0">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-800 flex items-center min-w-0">
          <span className="mr-2 flex-shrink-0">🏦</span>
          <span className="break-all min-w-0">Loan #{loanIdStr}</span>
        </h3>
        <span
          className={`self-start px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0 ${
            isActive
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {isActive ? "Active" : "Completed"}
        </span>
      </div>

      {/* Stats Grid - Fully Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 w-full">
        <div className="bg-gray-50 rounded-lg p-3 min-w-0">
          <p className="text-xs sm:text-sm text-gray-600">Loan Amount</p>
          <p className="text-sm sm:text-lg font-semibold break-all min-w-0">
            {loanAmountFormatted}{" "}
            <span className="text-xs sm:text-base">{tokenSymbol}</span>
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 min-w-0">
          <p className="text-xs sm:text-sm text-gray-600">Total Repaid</p>
          <p className="text-sm sm:text-lg font-semibold text-green-600 break-all min-w-0">
            {totalRepaidFormatted}{" "}
            <span className="text-xs sm:text-base">{tokenSymbol}</span>
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 min-w-0">
          <p className="text-xs sm:text-sm text-gray-600">Remaining</p>
          <p className="text-sm sm:text-lg font-semibold text-red-600 break-all min-w-0">
            {remainingDebt.toFixed(4)}{" "}
            <span className="text-xs sm:text-base">{tokenSymbol}</span>
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 min-w-0">
          <p className="text-xs sm:text-sm text-gray-600">Interest Rate</p>
          <p className="text-sm sm:text-lg font-semibold">
            {interestRateFormatted}%
          </p>
        </div>
      </div>

      {/* Repayment Section - Mobile Optimized */}
      {isActive && remainingDebt > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 w-full max-w-full overflow-hidden">
          <h4 className="text-base sm:text-lg font-semibold text-blue-800 mb-3 flex items-center">
            <span className="mr-2">💰</span>
            Repay Loan
          </h4>

          {/* Check if approval is needed */}
          {(() => {
            const repayAmountWei = repayAmount
              ? BigInt(Math.floor(parseFloat(repayAmount) * Math.pow(10, 18)))
              : BigInt(0);
            const currentAllowance = allowance || BigInt(0);
            const needsApproval =
              repayAmount &&
              parseFloat(repayAmount) > 0 &&
              repayAmountWei > currentAllowance;

            return (
              <div className="space-y-3 w-full">
                {/* Input and Button - Responsive Layout */}
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <input
                    type="number"
                    placeholder="Amount to repay"
                    value={repayAmount}
                    onChange={(e) =>
                      setRepayAmounts((prev: any) => ({
                        ...prev,
                        [loanIdStr]: e.target.value,
                      }))
                    }
                    className="flex-1 min-w-0 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                    step="0.01"
                    min="0"
                    max={remainingDebt.toString()}
                  />

                  {needsApproval ? (
                    <button
                      onClick={async () => {
                        if (
                          repayAmount &&
                          parseFloat(repayAmount) > 0 &&
                          loanToken
                        ) {
                          const success = await handleApproveToken(
                            loanToken,
                            repayAmount
                          );
                          if (success) {
                            refetchAllowance();
                          }
                        }
                      }}
                      disabled={
                        !repayAmount ||
                        parseFloat(repayAmount) <= 0 ||
                        parseFloat(repayAmount) > remainingDebt ||
                        approvePending
                      }
                      className="w-full sm:w-auto flex-shrink-0 px-4 sm:px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm sm:text-base font-medium"
                    >
                      {approvePending ? "Approving..." : "Approve"}
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        if (repayAmount && parseFloat(repayAmount) > 0) {
                          const success = await handleRepayLoan(
                            loanIdStr,
                            repayAmount
                          );
                          if (success) {
                            refetch();
                            refetchAllowance();
                          }
                        }
                      }}
                      disabled={
                        !repayAmount ||
                        parseFloat(repayAmount) <= 0 ||
                        parseFloat(repayAmount) > remainingDebt ||
                        repayPending
                      }
                      className="w-full sm:w-auto flex-shrink-0 px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm sm:text-base font-medium"
                    >
                      {repayPending ? "Processing..." : "Repay"}
                    </button>
                  )}
                </div>

                {/* Info Section - Mobile Optimized */}
                <div className="text-xs sm:text-sm text-gray-600 space-y-1 w-full max-w-full overflow-hidden">
                  <p className="break-all">
                    <span className="font-medium">Maximum:</span>{" "}
                    {remainingDebt.toFixed(4)} {tokenSymbol}
                  </p>
                  {Boolean(allowance && allowance > 0n) && (
                    <p className="break-all">
                      <span className="font-medium">Current Allowance:</span>{" "}
                      {formatTokenAmount(allowance)} {tokenSymbol}
                    </p>
                  )}
                  {needsApproval && (
                    <div className="bg-yellow-100 border border-yellow-300 rounded p-2 mt-2 w-full max-w-full overflow-hidden">
                      <p className="text-yellow-700 font-medium text-xs sm:text-sm flex items-start">
                        <span className="mr-1 mt-0.5 flex-shrink-0">⚠️</span>
                        <span className="break-words">
                          You need to approve the contract to spend your tokens
                          first
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

export default function UserActiveLoans() {
  const account = useActiveAccount();
  const [repayAmounts, setRepayAmounts] = useState<{ [key: string]: string }>(
    {}
  );

  const {
    data: loanIds,
    isLoading,
    error,
  } = useGetUserLoanIds(account?.address);

  const { repayLoan, isPending: repayPending } = useRepayLoan();
  const { approveToken, isPending: approvePending } = useApproveToken();

  // Helper to format BigInt to readable number
  const formatTokenAmount = (amount: any): string => {
    if (!amount) return "0";
    try {
      const bigintAmount =
        typeof amount === "bigint" ? amount : BigInt(amount.toString());
      const formatted = Number(bigintAmount) / Math.pow(10, 18);
      return formatted.toFixed(4);
    } catch {
      return "0";
    }
  };

  const handleRepayLoan = async (
    loanId: string,
    amount: string
  ): Promise<boolean> => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      console.error("Invalid amount");
      return false;
    }

    try {
      const amountWei = BigInt(
        Math.floor(parseFloat(amount) * Math.pow(10, 18))
      );
      await repayLoan(BigInt(loanId), amountWei);
      setRepayAmounts((prev) => ({ ...prev, [loanId]: "" }));
      return true;
    } catch (error: any) {
      console.error("Repayment failed:", error);
      return false;
    }
  };

  const handleApproveToken = async (
    tokenAddress: string,
    amount: string
  ): Promise<boolean> => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      console.error("Invalid amount");
      return false;
    }

    try {
      const amountWei = BigInt(
        Math.floor(parseFloat(amount) * Math.pow(10, 18))
      );
      await approveToken(tokenAddress, amountWei);
      return true;
    } catch (error: any) {
      console.error("Approval failed:", error);
      return false;
    }
  };

  if (!account) {
    return (
      <div className="text-center p-4 sm:p-6 bg-yellow-100 rounded-lg mx-4 sm:mx-0">
        <div className="text-4xl sm:text-6xl mb-2 sm:mb-4">🔗</div>
        <h3 className="text-lg sm:text-xl font-semibold text-yellow-800 mb-2">
          Wallet Not Connected
        </h3>
        <p className="text-yellow-700 text-sm sm:text-base">
          Please connect your wallet to view your loans
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center p-6 sm:p-8">
        <div className="inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600 text-sm sm:text-base">
          Loading your loans...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 sm:p-8 bg-red-100 rounded-lg mx-4 sm:mx-0">
        <div className="text-4xl sm:text-6xl mb-2 sm:mb-4">⚠️</div>
        <h3 className="text-lg sm:text-xl font-semibold text-red-700 mb-2">
          Error Loading Loans
        </h3>
        <p className="text-red-600 mb-4 text-sm sm:text-base break-words">
          {error.message || error.toString()}
        </p>
        <details className="text-left">
          <summary className="cursor-pointer text-red-700 font-medium text-sm sm:text-base">
            Debug Info
          </summary>
          <div className="mt-2 p-3 bg-red-50 rounded text-xs sm:text-sm overflow-auto">
            <p className="break-all">
              <strong>Account:</strong> {account?.address || "Not connected"}
            </p>
            <p>
              <strong>Error type:</strong>{" "}
              {error.constructor?.name || "Unknown"}
            </p>
            <p className="break-all">
              <strong>Full error:</strong> {JSON.stringify(error, null, 2)}
            </p>
          </div>
        </details>
      </div>
    );
  }

  if (!loanIds || loanIds.length === 0) {
    return (
      <div className="text-center p-6 sm:p-8 bg-gray-50 rounded-lg mx-4 sm:mx-0">
        <div className="text-4xl sm:text-6xl mb-2 sm:mb-4">🏦</div>
        <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">
          No Active Loans
        </h3>
        <p className="text-gray-600 text-sm sm:text-base">
          You don't have any active loans at the moment.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="space-y-3 sm:space-y-4 w-full">
        {loanIds.map((loanId) => (
          <LoanCard
            key={loanId.toString()}
            loanId={loanId}
            repayAmounts={repayAmounts}
            setRepayAmounts={setRepayAmounts}
            handleRepayLoan={handleRepayLoan}
            handleApproveToken={handleApproveToken}
            repayPending={repayPending}
            approvePending={approvePending}
            formatTokenAmount={formatTokenAmount}
          />
        ))}
      </div>
    </div>
  );
}
