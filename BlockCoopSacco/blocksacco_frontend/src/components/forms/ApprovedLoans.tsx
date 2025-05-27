import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import {
  useGetLoanCount,
  useGetLoan,
  useLiquidateLoan,
  useIsLoanLiquidatable,
} from "../contractFunctions/LoanManagerFunctions";

interface Loan {
  id: bigint;
  borrower: string;
  loanToken: string;
  loanAmount: bigint;
  interestRate: bigint;
  startTime: bigint;
  duration: bigint;
  isActive: boolean;
  totalRepaid: bigint;
}

export default function ApprovedLoans() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { data: loanCount } = useGetLoanCount();
  const [currentLoanId, setCurrentLoanId] = useState<bigint | null>(null);
  const { liquidateLoan } = useLiquidateLoan();

  // Only fetch one loan at a time
  const { data: currentLoanData } = useGetLoan(currentLoanId ?? BigInt(0));

  useEffect(() => {
    if (!loanCount) {
      setIsLoading(false);
      return;
    }

    // Start fetching from the first loan
    setCurrentLoanId(BigInt(0));
  }, [loanCount]);

  useEffect(() => {
    if (currentLoanData && currentLoanId !== null) {
      // Add the current loan to our list
      const newLoan: Loan = {
        id: currentLoanId,
        borrower: currentLoanData[0],
        loanToken: currentLoanData[1],
        loanAmount: currentLoanData[2],
        interestRate: currentLoanData[3],
        startTime: currentLoanData[4],
        duration: currentLoanData[5],
        isActive: currentLoanData[6],
        totalRepaid: currentLoanData[7],
      };

      setLoans((prevLoans) => {
        // Check if this loan is already in our list
        if (prevLoans.some((loan) => loan.id === newLoan.id)) {
          return prevLoans;
        }
        return [...prevLoans, newLoan];
      });

      // If there are more loans to fetch, continue
      if (loanCount && currentLoanId < loanCount - BigInt(1)) {
        setCurrentLoanId(currentLoanId + BigInt(1));
      } else {
        // We've fetched all loans
        setIsLoading(false);
      }
    }
  }, [currentLoanData, currentLoanId, loanCount]);

  const handleLiquidate = async (loanId: bigint) => {
    try {
      await liquidateLoan(loanId);
      // Update the loan status in the UI
      setLoans((prevLoans) =>
        prevLoans.map((loan) =>
          loan.id === loanId ? { ...loan, isActive: false } : loan
        )
      );
    } catch (error) {
      console.error("Failed to liquidate loan:", error);
    }
  };

  // Helper function to check if a loan is overdue
  const isLoanOverdue = (loan: Loan) => {
    const currentTime = Math.floor(Date.now() / 1000);
    const endTime = Number(loan.startTime) + Number(loan.duration);
    return currentTime > endTime;
  };

  if (isLoading) {
    return <div className="text-white">Loading loans...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white mb-4">
        Approved Loans ({loans.length})
      </h2>

      {loans.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-300">No approved loans found.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {loans.map((loan) => {
            const overdue = isLoanOverdue(loan);
            return (
              <div
                key={loan.id.toString()}
                className="bg-gray-800 rounded-lg p-4 border border-gray-700"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-white">
                        Loan #{loan.id.toString()}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          loan.isActive
                            ? "bg-green-900 text-green-200"
                            : "bg-gray-700 text-gray-300"
                        }`}
                      >
                        {loan.isActive ? "Active" : "Completed"}
                      </span>
                      {overdue && loan.isActive && (
                        <span className="px-2 py-1 rounded text-sm bg-red-900 text-red-200">
                          Overdue
                        </span>
                      )}
                    </div>

                    <div className="text-sm space-y-1 text-gray-300">
                      <p>
                        Borrower: {loan.borrower.slice(0, 6)}...
                        {loan.borrower.slice(-4)}
                      </p>
                      <p>Amount: {formatUnits(loan.loanAmount, 18)}</p>
                      <p>
                        Interest Rate:{" "}
                        {(Number(loan.interestRate) / 100).toFixed(2)}%
                      </p>
                      <p>
                        Start:{" "}
                        {new Date(
                          Number(loan.startTime) * 1000
                        ).toLocaleDateString()}
                      </p>
                      <p>
                        Duration: {Number(loan.duration) / (24 * 60 * 60)} days
                      </p>
                      <p>Repaid: {formatUnits(loan.totalRepaid, 18)}</p>
                    </div>
                  </div>

                  {/* Liquidate Button */}
                  {loan.isActive && overdue && (
                    <button
                      onClick={() => handleLiquidate(loan.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      Liquidate
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Debug information */}
      <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">
          Debug Info:
        </h3>
        <pre className="text-xs text-gray-400">
          {JSON.stringify(
            {
              loanCount: loanCount?.toString(),
              currentLoanId: currentLoanId?.toString(),
              loadedLoans: loans.length,
              isLoading,
            },
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
}
