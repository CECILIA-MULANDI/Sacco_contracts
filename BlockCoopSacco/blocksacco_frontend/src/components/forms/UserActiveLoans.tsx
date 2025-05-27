import { useState, useEffect } from "react";
import {
  useGetUserLoanIds,
  useRepayLoan,
  useGetLoanById,
} from "../contractFunctions/LoanManagerFunctions";
import { useActiveAccount } from "thirdweb/react";

interface LoanCardProps {
  loanId: bigint;
  repayAmounts: { [key: string]: string };
  setRepayAmounts: React.Dispatch<
    React.SetStateAction<{ [key: string]: string }>
  >;
  handleRepayLoan: (loanId: string, amount: string) => Promise<boolean>;
  repayPending: boolean;
  formatTokenAmount: (amount: any) => string;
}

function LoanCard({
  loanId,
  repayAmounts,
  setRepayAmounts,
  handleRepayLoan,
  repayPending,
  formatTokenAmount,
}: LoanCardProps) {
  const { data: loanData, isPending, error, refetch } = useGetLoanById(loanId);

  // Refresh data when repayment is completed
  useEffect(() => {
    if (!repayPending) {
      refetch();
    }
  }, [repayPending, refetch]);

  if (isPending) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        Loading loan #{loanId.toString()}...
      </div>
    );
  }

  if (error || !loanData) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-red-600">
          Error loading loan #{loanId.toString()}:{" "}
          {error?.message || "Unknown error"}
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
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold text-gray-800">
          🏦 Loan #{loanIdStr}
          <span
            className={`ml-2 px-3 py-1 rounded-full text-sm font-medium ${
              isActive
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {isActive ? "Active" : "Completed"}
          </span>
        </h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-sm text-gray-600">Loan Amount</p>
          <p className="text-lg font-semibold">{loanAmountFormatted} tokens</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-sm text-gray-600">Total Repaid</p>
          <p className="text-lg font-semibold text-green-600">
            {totalRepaidFormatted} tokens
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-sm text-gray-600">Remaining</p>
          <p className="text-lg font-semibold text-red-600">
            {remainingDebt.toFixed(4)} tokens
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-sm text-gray-600">Interest Rate</p>
          <p className="text-lg font-semibold">{interestRateFormatted}%</p>
        </div>
      </div>

      {isActive && remainingDebt > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-blue-800 mb-3">
            💰 Repay Loan
          </h4>
          <div className="flex gap-3">
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
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              step="0.01"
              min="0"
              max={remainingDebt.toString()}
            />
            <button
              onClick={async () => {
                if (repayAmount && parseFloat(repayAmount) > 0) {
                  const success = await handleRepayLoan(loanIdStr, repayAmount);
                  if (success) {
                    refetch();
                  }
                }
              }}
              disabled={
                !repayAmount ||
                parseFloat(repayAmount) <= 0 ||
                parseFloat(repayAmount) > remainingDebt ||
                repayPending
              }
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {repayPending ? "Processing..." : "Repay"}
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Maximum: {remainingDebt.toFixed(4)} tokens
          </p>
        </div>
      )}

      <details className="mt-4">
        <summary className="cursor-pointer text-gray-500 text-sm">
          Show loan details
        </summary>
        <div className="mt-2 p-3 bg-gray-100 rounded text-xs">
          <p>
            <strong>Borrower:</strong> {borrower}
          </p>
          <p>
            <strong>Loan Token:</strong> {loanToken}
          </p>
          <p>
            <strong>Start Time:</strong>{" "}
            {new Date(Number(startTime) * 1000).toLocaleString()}
          </p>
          <p>
            <strong>Duration:</strong> {Number(duration) / 86400} days
          </p>
        </div>
      </details>
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

  if (!account) {
    return (
      <div className="text-center p-6 bg-yellow-100 rounded-lg">
        <p className="text-yellow-800">
          Please connect your wallet to view your loans
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center p-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Loading your loans...</p>
      </div>
    );
  }

  if (error) {
    console.log("Error details:", error);
    return (
      <div className="text-center p-8 bg-red-100 rounded-lg">
        <div className="text-6xl mb-4">⚠️</div>
        <h3 className="text-xl font-semibold text-red-700 mb-2">
          Error Loading Loans
        </h3>
        <p className="text-red-600 mb-4">{error.message || error.toString()}</p>
        <details className="text-left">
          <summary className="cursor-pointer text-red-700 font-medium">
            Debug Info
          </summary>
          <div className="mt-2 p-3 bg-red-50 rounded text-sm">
            <p>
              <strong>Account:</strong> {account?.address || "Not connected"}
            </p>
            <p>
              <strong>Error type:</strong>{" "}
              {error.constructor?.name || "Unknown"}
            </p>
            <p>
              <strong>Full error:</strong> {JSON.stringify(error, null, 2)}
            </p>
          </div>
        </details>
      </div>
    );
  }

  if (!loanIds || loanIds.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg">
        <div className="text-6xl mb-4">🏦</div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          No Active Loans
        </h3>
        <p className="text-gray-600">
          You don't have any active loans at the moment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          💼 Your Active Loans
        </h2>
        <p className="text-gray-600">Found {loanIds.length} loan(s)</p>
      </div>

      <div className="space-y-4">
        {loanIds.map((loanId) => (
          <LoanCard
            key={loanId.toString()}
            loanId={loanId}
            repayAmounts={repayAmounts}
            setRepayAmounts={setRepayAmounts}
            handleRepayLoan={handleRepayLoan}
            repayPending={repayPending}
            formatTokenAmount={formatTokenAmount}
          />
        ))}
      </div>
    </div>
  );
}
