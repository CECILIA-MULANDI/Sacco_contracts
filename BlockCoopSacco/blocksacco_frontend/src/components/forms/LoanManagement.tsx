import { useState } from "react";
import {
  useGetPendingLoanRequests,
  useApproveLoanRequest,
  useRejectLoanRequest,
  useGetUserLoans,
  useLiquidateLoan,
  useIsLoanLiquidatable,
  useGetLiquidationInfo,
  useRepayLoan,
} from "../contractFunctions/LoanManagerFunctions";
import { useActiveAccount } from "thirdweb/react";
import { ethers } from "ethers";

export default function LoanManagement() {
  const account = useActiveAccount();
  const [activeTab, setActiveTab] = useState<"requests" | "loans">("requests");

  const {
    data: pendingRequests,
    isLoading: loadingRequests,
    error: requestsError,
  } = useGetPendingLoanRequests();
  const {
    data: activeLoans,
    isLoading: loadingLoans,
    error: loansError,
  } = useGetUserLoans(account?.address);

  const { approveLoanRequest } = useApproveLoanRequest();
  const { rejectLoanRequest } = useRejectLoanRequest();
  const { liquidateLoan } = useLiquidateLoan();
  const { repayLoan } = useRepayLoan();

  // Debug logging
  console.log("🔍 LoanManagement Debug Info:");
  console.log("- Account:", account?.address);
  console.log("- Pending Requests:", pendingRequests);
  console.log("- Loading Requests:", loadingRequests);
  console.log("- Requests Error:", requestsError);

  console.log("- Loading Loans:", loadingLoans);
  console.log("- Loans Error:", loansError);

  const handleApprove = async (requestId: number) => {
    try {
      console.log("🟢 Approving request ID:", requestId);
      await approveLoanRequest(BigInt(requestId));
    } catch (error) {
      console.error("❌ Approval failed:", error);
    }
  };

  const handleReject = async (requestId: number) => {
    try {
      console.log("🔴 Rejecting request ID:", requestId);
      await rejectLoanRequest(BigInt(requestId));
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

  const handleRepayLoan = async (loanId: number, amount: string) => {
    try {
      console.log("💰 Repaying loan ID:", loanId, "Amount:", amount);
      const amountWei = ethers.parseEther(amount);
      await repayLoan(BigInt(loanId), amountWei);
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
    requestId,
  }: {
    request: any;
    requestId: number;
  }) => (
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
            Request #{requestId}
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
                style={{ margin: "4px 0", fontSize: "14px", color: "#6b7280" }}
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
                style={{ margin: "4px 0", fontSize: "14px", color: "#6b7280" }}
              >
                Loan Amount:
              </p>
              <p style={{ margin: "0", fontSize: "16px", fontWeight: "600" }}>
                {request.loanAmount
                  ? ethers.formatEther(request.loanAmount)
                  : "N/A"}{" "}
                tokens
              </p>
            </div>
            <div>
              <p
                style={{ margin: "4px 0", fontSize: "14px", color: "#6b7280" }}
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
                style={{ margin: "4px 0", fontSize: "14px", color: "#6b7280" }}
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
              onClick={() => handleApprove(requestId)}
            >
              Approve
            </button>
            <button
              style={buttonStyle("reject")}
              onClick={() => handleReject(requestId)}
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const LoanCard = ({ loan, index }: { loan: any; index: number }) => {
    const [repayAmount, setRepayAmount] = useState("");

    // Calculate loan details
    const loanAmount = loan.loanAmount
      ? ethers.formatEther(loan.loanAmount)
      : "0";
    const totalRepaid = loan.totalRepaid
      ? ethers.formatEther(loan.totalRepaid)
      : "0";
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
                        handleRepayLoan(loan.id || index, repayAmount);
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

  return (
    <div style={containerStyle}>
      <h1
        style={{
          fontSize: "28px",
          fontWeight: "bold",
          marginBottom: "24px",
          color: "#1f2937",
        }}
      >
        🏦 Loan Management Dashboard
      </h1>

      <div style={tabStyle}>
        <button
          style={tabButtonStyle(activeTab === "requests")}
          onClick={() => setActiveTab("requests")}
        >
          Pending Requests ({pendingRequests?.length || 0})
        </button>
      </div>

      {activeTab === "requests" && (
        <div>
          <h2
            style={{ fontSize: "20px", marginBottom: "16px", color: "#1f2937" }}
          >
            Pending Loan Requests
          </h2>

          {/* Debug Information */}
          {requestsError && (
            <div
              style={{
                backgroundColor: "#fee2e2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "16px",
              }}
            >
              <p style={{ color: "#dc2626", margin: 0 }}>
                ❌ Error loading requests:{" "}
                {requestsError.message || requestsError.toString()}
              </p>
            </div>
          )}

          <div
            style={{
              backgroundColor: "#f0f9ff",
              border: "1px solid #bae6fd",
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "16px",
              fontSize: "14px",
            }}
          >
            <p style={{ margin: 0 }}>
              🔍 Debug: Found {pendingRequests?.length || 0} pending requests |
              Loading: {loadingRequests ? "Yes" : "No"} | Contract:
              0x5B7511FC6ecDA99F7B4f0504EE850669cA9f8592
            </p>
          </div>

          {loadingRequests ? (
            <p>Loading requests...</p>
          ) : pendingRequests && pendingRequests.length > 0 ? (
            pendingRequests.map((request, index) => (
              <LoanRequestCard
                key={index}
                request={request}
                requestId={index}
              />
            ))
          ) : (
            <div style={cardStyle}>
              <p style={{ textAlign: "center", color: "#6b7280", margin: 0 }}>
                No pending loan requests found.
              </p>
            </div>
          )}
        </div>
      )}

      <div
        style={{
          backgroundColor: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "16px",
          marginTop: "24px",
        }}
      >
        <h3 style={{ margin: "0 0 12px 0", color: "#1f2937" }}>
          📋 Liquidation Policy
        </h3>
        <div style={{ fontSize: "14px", color: "#6b7280", lineHeight: "1.5" }}>
          <p>
            <strong>When liquidated, funds are distributed as follows:</strong>
          </p>
          <ul style={{ marginLeft: "20px" }}>
            <li>
              <strong>Debt Recovery:</strong> Proportional amount goes to
              liquidity pool to cover outstanding debt
            </li>
            <li>
              <strong>Protocol Fee (2%):</strong> Goes to contract owner for
              protocol maintenance
            </li>
            <li>
              <strong>Liquidator Reward (3%):</strong> Incentive for liquidator
              who executes the transaction
            </li>
            <li>
              <strong>Remaining Collateral:</strong> Returned to the borrower
              (if any)
            </li>
          </ul>
          <p>
            <em>
              Note: Liquidation is only possible after the loan duration has
              expired.
            </em>
          </p>
        </div>
      </div>
    </div>
  );
}
