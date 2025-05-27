import { useState, useMemo, useEffect } from "react";
import {
  useRequestLoan,
  useGetSupportedLoanTokens,
  useGetMaxLtvRatio,
} from "../contractFunctions/LoanManagerFunctions";
import {
  useGetUserDepositedTokens,
  useGetUserDeposit,
  useTokensInfo,
  useDeposit,
  useGetLockedAmount,
} from "../contractFunctions/BlockCoopTokensFunctions";
import { useApproveToken } from "../contractFunctions/TokenFunctions";
import { BLOCKCOOPTOKENS_CONTRACT_ADDRESS } from "../../config";
import { useMessages } from "../hooks/useSuccessOrErrorMessage";
import { useActiveAccount } from "thirdweb/react";
import { ethers } from "ethers";
import CollateralDiagnostics from "./CollateralDiagnostics";

export default function RequestLoanForm() {
  const [loanToken, setLoanToken] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [collateralToken, setCollateralToken] = useState("");
  const [collateralAmount, setCollateralAmount] = useState<string>("");
  const [duration, setDuration] = useState(7); // Minimum 7 days
  const [isSubmitting, setIsSubmitting] = useState(false);

  const account = useActiveAccount();
  const userAddress = account?.address;

  const {
    requestLoan,
    isPending: isRequestPending,
    error: requestError,
  } = useRequestLoan();

  const { data: supportedTokens = [] } = useGetSupportedLoanTokens();

  // Get user's deposited tokens
  const { data: userTokens = [] } = useGetUserDepositedTokens(userAddress);

  const approveToken = useApproveToken();
  const { deposit, isPending: isDepositPending } = useDeposit();

  // Get token information including names and prices
  const { data: tokensInfo } = useTokensInfo(0, 100);

  // Initialize tokenDetails with an empty Map
  const tokenDetails = useMemo(() => {
    if (!tokensInfo) return new Map();
    const [addresses, names, symbols, decimals, prices] = tokensInfo;
    return new Map(
      addresses.map((addr: string, i: number) => [
        addr,
        {
          name: names[i] || "Unknown",
          symbol: symbols[i] || "Unknown",
          decimals: decimals[i] || 18,
          price: prices[i] || BigInt(0),
        },
      ])
    );
  }, [tokensInfo]);

  // Get user's deposited balance for the selected collateral token
  const { data: selectedDeposit, refetch: refetchDeposit } = useGetUserDeposit(
    userAddress,
    collateralToken
  );
  const maxCollateralAmount = selectedDeposit?.[0] ?? BigInt(0);

  // Get locked amount for the selected collateral token
  const { data: lockedAmount = BigInt(0) } = useGetLockedAmount(
    userAddress,
    collateralToken
  );

  // Calculate available balance (total deposit - locked collateral)
  const availableCollateralAmount = maxCollateralAmount - lockedAmount;

  // Get LTV ratio from contract
  const { data: maxLtvRatio = BigInt(7000) } = useGetMaxLtvRatio();

  // Calculate maximum borrowing amount based on specified collateral
  const maxBorrowAmount = useMemo(() => {
    if (
      !collateralToken ||
      !collateralAmount ||
      !loanToken ||
      !tokenDetails.has(collateralToken) ||
      !tokenDetails.has(loanToken)
    )
      return 0;

    // Get token details
    const collateralTokenInfo = tokenDetails.get(collateralToken);
    const loanTokenInfo = tokenDetails.get(loanToken);
    if (!collateralTokenInfo || !loanTokenInfo) return 0;

    try {
      // Get decimals for proper conversion
      const collateralDecimals = collateralTokenInfo.decimals;
      const loanDecimals = loanTokenInfo.decimals;

      // Convert collateral amount to wei using proper decimals
      const amountInWei = ethers.utils.parseUnits(
        collateralAmount,
        collateralDecimals
      );

      // Calculate collateral value in USD
    const collateralValueUSD =
        Number(
          (amountInWei.toBigInt() * collateralTokenInfo.price) / BigInt(1e18)
        ) / 1e18;

    // Calculate max loan value in USD using contract's LTV ratio
      const maxLoanValueUSD =
        (collateralValueUSD * Number(maxLtvRatio)) / 10000;

    // Convert max USD value back to loan token units
    const loanTokenPriceUSD = Number(loanTokenInfo.price) / 1e18;
    const maxLoanTokenAmount = maxLoanValueUSD / loanTokenPriceUSD;

    return maxLoanTokenAmount;
    } catch (error) {
      console.error("Error calculating max borrow amount:", error);
      return 0;
    }
  }, [collateralToken, collateralAmount, loanToken, tokenDetails, maxLtvRatio]);

  const { displaySuccessMessage: showSuccess, displayErrorMessage: showError } =
    useMessages();

  // Duration options in days
  const durationOptions = [
    { value: 7, label: "1 week" },
    { value: 14, label: "2 weeks" },
    { value: 30, label: "1 month" },
    { value: 90, label: "3 months" },
    { value: 180, label: "6 months" },
    { value: 365, label: "1 year" },
  ];

  // Utility function to wait for deposit completion
  const waitForDepositCompletion = async (
    expectedAmount: bigint,
    maxWaitTime: number = 10000
  ): Promise<boolean> => {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const result = await refetchDeposit();
        const [currentAmount] = result.data || [BigInt(0), BigInt(0)];
        console.log(
          `Checking deposit: ${currentAmount.toString()} >= ${expectedAmount.toString()}`
        );

        if (currentAmount >= expectedAmount) {
          console.log("Deposit confirmed!");
          return true;
        }

        // Wait 1 second before checking again
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error("Error checking deposit status:", error);
      }
    }
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userAddress) {
      showError("Please connect your wallet");
      return;
    }

    setIsSubmitting(true);

    try {
      // Validate inputs
      if (!loanToken || !collateralToken || !loanAmount || !collateralAmount) {
        throw new Error("Please fill in all fields");
      }

      const loanTokenInfo = tokenDetails.get(loanToken);
      const collateralTokenInfo = tokenDetails.get(collateralToken);

      if (!loanTokenInfo || !collateralTokenInfo) {
        throw new Error("Invalid token selected");
      }

      // Convert amounts using proper decimals
      const loanAmountWei = ethers.utils.parseUnits(
        loanAmount,
        loanTokenInfo.decimals
      );
      const collateralAmountWei = ethers.utils.parseUnits(
        collateralAmount,
        collateralTokenInfo.decimals
      );

      // Convert duration to seconds
      const durationSeconds = BigInt(duration * 24 * 60 * 60);

      // Verify the loan amount is within limits
      if (parseFloat(loanAmount) > maxBorrowAmount) {
        throw new Error(
          `Loan amount exceeds maximum allowed (${maxBorrowAmount.toFixed(6)} ${
            loanTokenInfo.symbol || "tokens"
          })`
        );
      }

      // Check pool liquidity before proceeding
      console.log("Checking pool liquidity for token:", loanToken);

      // Check if we have enough available collateral
      const [depositAmount] = selectedDeposit || [BigInt(0), BigInt(0)];
      console.log("Current deposit amount:", depositAmount.toString());
      console.log("Current locked amount:", lockedAmount.toString());
      console.log(
        "Available collateral amount:",
        availableCollateralAmount.toString()
      );
      console.log(
        "Required collateral amount:",
        collateralAmountWei.toString()
      );

      if (availableCollateralAmount < collateralAmountWei.toBigInt()) {
        // Need to deposit more collateral
        const additionalAmount =
          collateralAmountWei.toBigInt() - availableCollateralAmount;
        console.log(
          "Need to deposit additional amount:",
          additionalAmount.toString()
        );

        // First approve the token for BlockCoopTokens contract
        console.log("Approving tokens for deposit...");
        await approveToken(
          collateralToken,
          BLOCKCOOPTOKENS_CONTRACT_ADDRESS,
          additionalAmount
        );
        showSuccess("Token approved for deposit");

        // Then deposit the token - improved flow
        console.log("Depositing collateral tokens...");

        // Execute the deposit
        deposit(collateralToken, additionalAmount);
        showSuccess(
          "Deposit transaction submitted, waiting for confirmation..."
        );

        // Wait for the deposit to be confirmed
        const expectedTotalDeposit = depositAmount + additionalAmount;
        const depositConfirmed = await waitForDepositCompletion(
          expectedTotalDeposit
        );

        if (!depositConfirmed) {
          throw new Error(
            "Deposit transaction took too long to confirm. Please check your transaction and try again."
          );
        }

        showSuccess("Collateral deposited successfully");
      }

      // Now request the loan
      console.log("Requesting loan with params:", {
        loanToken,
        loanAmount: loanAmountWei.toString(),
        collateralToken,
        collateralAmount: collateralAmountWei.toString(),
        duration: durationSeconds.toString(),
      });

      await requestLoan(
        loanToken,
        loanAmountWei.toBigInt(),
        [collateralToken],
        [collateralAmountWei.toBigInt()],
        durationSeconds
      );

      // Reset form
      setLoanToken("");
      setLoanAmount("");
      setCollateralToken("");
      setCollateralAmount("");
      setDuration(7);
    } catch (error: any) {
      console.error("Loan request error:", error);

      // Provide more specific error messages
      let errorMessage = error.message || "Failed to request loan";

      if (errorMessage.includes("Insufficient available balance")) {
        errorMessage =
          "Insufficient balance. This could be due to:\n" +
          "• Not enough collateral deposited\n" +
          "• Some collateral is already locked in other loans\n" +
          "• Insufficient liquidity in the lending pool\n" +
          "• Transaction still processing\n\n" +
          "Please wait a moment and try again, or check your available collateral balance.";
      } else if (errorMessage.includes("User is not authorized")) {
        errorMessage =
          "You are not authorized to request loans. Please contact support.";
      } else if (errorMessage.includes("Token not supported")) {
        errorMessage = "The selected token is not supported for loans.";
      } else if (errorMessage.includes("Insufficient liquidity")) {
        errorMessage =
          "The lending pool doesn't have enough liquidity for this loan amount.";
      }

      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle transaction errors
  useEffect(() => {
    if (requestError) {
      showError(requestError.message || "Failed to request loan");
    }
  }, [requestError, showError]);

  const isLoading = isSubmitting || isRequestPending || isDepositPending;

  // Add some debug logging
  console.log("RequestLoanForm rendered", {
    supportedTokens: supportedTokens?.length || 0,
    userTokens: userTokens?.length || 0,
    isLoading,
    userAddress,
  });

  return (
    <div
      style={{
        backgroundColor: "white",
        padding: "24px",
        borderRadius: "8px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        border: "1px solid #e5e7eb",
        maxWidth: "600px",
      }}
    >
      <h3
        style={{
          fontSize: "18px",
          fontWeight: "500",
          color: "#111827",
          marginBottom: "16px",
        }}
      >
        Request Loan
      </h3>
      <p
        style={{
          fontSize: "14px",
          color: "#6b7280",
          marginBottom: "24px",
        }}
      >
        Request a loan by providing collateral from your deposited tokens. Your
        collateral will be locked until the loan is repaid.
      </p>

      {!userAddress && (
        <div
          style={{
            backgroundColor: "#fef3c7",
            border: "1px solid #f59e0b",
            padding: "12px",
            borderRadius: "6px",
            marginBottom: "16px",
          }}
        >
          <p style={{ color: "#92400e", fontSize: "14px" }}>
            Please connect your wallet to request a loan.
          </p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "16px" }}
      >
      <div>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "6px",
            }}
          >
          Loan Token
        </label>
        <select
          value={loanToken}
          onChange={(e) => setLoanToken(e.target.value)}
          required
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
              backgroundColor: isLoading ? "#f3f4f6" : "white",
            }}
        >
            <option value="">Select token to borrow</option>
          {supportedTokens.map((token: string) => {
            const details = tokenDetails.get(token);
            return (
              <option key={token} value={token}>
                {details?.symbol || "Unknown"} - {details?.name || token}
              </option>
            );
          })}
        </select>
          {supportedTokens.length === 0 && (
            <p style={{ fontSize: "12px", color: "#ef4444", marginTop: "4px" }}>
              No supported tokens available. Please check your connection.
            </p>
          )}
      </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "6px",
            }}
          >
          Loan Amount
        </label>
        <input
            type="number"
            min="0"
            step="0.000001"
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
              backgroundColor: isLoading ? "#f3f4f6" : "white",
            }}
          placeholder="Enter loan amount"
          value={loanAmount}
          onChange={(e) => setLoanAmount(e.target.value)}
            disabled={isLoading}
            required
        />
        {maxBorrowAmount > 0 && (
            <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
            Maximum borrowing amount: {maxBorrowAmount.toFixed(6)}{" "}
            {tokenDetails.get(loanToken)?.symbol || "tokens"} (
              {Number(maxLtvRatio) / 100}% LTV)
          </p>
        )}
      </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "6px",
            }}
          >
          Collateral Token
        </label>
        <select
          value={collateralToken}
          onChange={(e) => setCollateralToken(e.target.value)}
          required
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
              backgroundColor: isLoading ? "#f3f4f6" : "white",
            }}
        >
            <option value="">Select collateral token</option>
          {userTokens.map((token: string) => {
            const details = tokenDetails.get(token);
              const balance =
                collateralToken === token
                  ? Number(availableCollateralAmount) /
                    Math.pow(10, details?.decimals || 18)
                  : 0;
            return (
              <option key={token} value={token}>
                  {details?.symbol || "Unknown"} - {details?.name || "Unknown"}
                {collateralToken === token
                    ? ` (Available: ${balance.toFixed(6)})`
                  : ""}
              </option>
            );
          })}
        </select>
          {userTokens.length === 0 && (
            <p style={{ fontSize: "12px", color: "#f59e0b", marginTop: "4px" }}>
              No deposited tokens available. Please deposit tokens first.
            </p>
          )}
          {collateralToken && (
            <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
              Available balance:{" "}
              {(
                Number(availableCollateralAmount) /
                Math.pow(10, tokenDetails.get(collateralToken)?.decimals || 18)
              ).toFixed(6)}{" "}
              {tokenDetails.get(collateralToken)?.symbol || "tokens"}
              {lockedAmount > BigInt(0) && (
                <span style={{ color: "#f59e0b" }}>
                  {" "}
                  (Locked:{" "}
                  {(
                    Number(lockedAmount) /
                    Math.pow(
                      10,
                      tokenDetails.get(collateralToken)?.decimals || 18
                    )
                  ).toFixed(6)}
                  )
                </span>
              )}
            </p>
          )}
      </div>

      <div>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "6px",
            }}
          >
          Collateral Amount
        </label>
        <input
          type="number"
          min="0"
          step="0.000001"
          value={collateralAmount}
          onChange={(e) => setCollateralAmount(e.target.value)}
          required
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
              backgroundColor: isLoading ? "#f3f4f6" : "white",
            }}
            placeholder="Enter collateral amount"
        />
      </div>

        {/* Add Collateral Diagnostics */}
        {collateralToken && (
          <CollateralDiagnostics
            tokenAddress={collateralToken}
            tokenSymbol={tokenDetails.get(collateralToken)?.symbol || "Unknown"}
          />
        )}

      <div>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "6px",
            }}
          >
            Loan Duration
        </label>
        <select
          value={duration}
          onChange={(e) => setDuration(parseInt(e.target.value))}
          required
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
              backgroundColor: isLoading ? "#f3f4f6" : "white",
            }}
        >
          {durationOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
          disabled={isLoading || userTokens.length === 0}
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            color: "white",
            backgroundColor:
              isLoading || userTokens.length === 0 ? "#9ca3af" : "#4f46e5",
            border: "none",
            cursor:
              isLoading || userTokens.length === 0 ? "not-allowed" : "pointer",
            transition: "background-color 0.2s",
          }}
          onMouseOver={(e) => {
            if (!isLoading && userTokens.length > 0) {
              e.currentTarget.style.backgroundColor = "#4338ca";
            }
          }}
          onMouseOut={(e) => {
            if (!isLoading && userTokens.length > 0) {
              e.currentTarget.style.backgroundColor = "#4f46e5";
            }
          }}
        >
          {isLoading ? "Processing..." : "Request Loan"}
      </button>
    </form>

      <div style={{ marginTop: "20px", fontSize: "12px", color: "#6b7280" }}>
        <p>Debug Info:</p>
        <p>Connected: {userAddress ? "Yes" : "No"}</p>
        <p>Supported Tokens: {supportedTokens?.length || 0}</p>
        <p>User Tokens: {userTokens?.length || 0}</p>
        <p>Loading: {isLoading ? "Yes" : "No"}</p>
        <p>Total Deposit: {selectedDeposit?.[0]?.toString() || "0"}</p>
        <p>Locked Amount: {lockedAmount.toString()}</p>
        <p>Available Collateral: {availableCollateralAmount.toString()}</p>
      </div>
    </div>
  );
}
