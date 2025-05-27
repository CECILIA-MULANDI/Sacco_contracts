import { useActiveAccount } from "thirdweb/react";
import {
  useGetBorrowerLoanRequests,
  useGetLockedAmount,
  useGetUserDeposit,
  useGetUserLoanIds,
} from "../contractFunctions/LoanManagerFunctions";

interface CollateralDiagnosticsProps {
  tokenAddress: string;
  tokenSymbol: string;
}

export default function CollateralDiagnostics({
  tokenAddress,
  tokenSymbol,
}: CollateralDiagnosticsProps) {
  const account = useActiveAccount();
  const userAddress = account?.address;

  const { data: userDeposit } = useGetUserDeposit(userAddress, tokenAddress);
  const { data: lockedAmount } = useGetLockedAmount(userAddress, tokenAddress);
  const { data: userLoanIds } = useGetUserLoanIds(userAddress);
  const { data: loanRequests } = useGetBorrowerLoanRequests(userAddress);

  const totalDeposit = userDeposit
    ? Number(userDeposit[0]) / Math.pow(10, 18)
    : 0;
  const totalLocked = lockedAmount
    ? Number(lockedAmount) / Math.pow(10, 18)
    : 0;
  const availableAmount = totalDeposit - totalLocked;

  const pendingRequests = loanRequests?.filter((req) => !req.processed) || [];

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
      <h4 className="font-bold text-yellow-800 mb-3">
        🔍 Collateral Diagnostics for {tokenSymbol}
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
        <div className="bg-white p-3 rounded border">
          <p className="font-medium text-gray-700">Total Deposited</p>
          <p className="text-lg font-bold text-green-600">
            {totalDeposit.toLocaleString()} {tokenSymbol}
          </p>
        </div>

        <div className="bg-white p-3 rounded border">
          <p className="font-medium text-gray-700">Currently Locked</p>
          <p className="text-lg font-bold text-red-600">
            {totalLocked.toLocaleString()} {tokenSymbol}
          </p>
        </div>

        <div className="bg-white p-3 rounded border">
          <p className="font-medium text-gray-700">Available</p>
          <p className="text-lg font-bold text-blue-600">
            {availableAmount.toLocaleString()} {tokenSymbol}
          </p>
        </div>

        <div className="bg-white p-3 rounded border">
          <p className="font-medium text-gray-700">Pending Requests</p>
          <p className="text-lg font-bold text-orange-600">
            {pendingRequests.length}
          </p>
        </div>
      </div>

      {/* Show pending requests that might have locked collateral */}
      {pendingRequests.length > 0 && (
        <div className="mt-4 bg-orange-50 p-3 rounded border border-orange-200">
          <h5 className="font-medium text-orange-800 mb-2">
            ⚠️ Pending Loan Requests (Collateral May Be Locked):
          </h5>
          <div className="space-y-2">
            {pendingRequests.map((request, index) => (
              <div key={index} className="text-sm bg-white p-2 rounded border">
                <div className="flex justify-between">
                  <span>Request #{index + 1}</span>
                  <span className="text-orange-600 font-medium">
                    {!request.processed
                      ? "Pending"
                      : request.approved
                      ? "Approved"
                      : "Rejected"}
                  </span>
                </div>
                <div className="text-gray-600">
                  Loan: {Number(request.loanAmount) / Math.pow(10, 18)}{" "}
                  {tokenSymbol}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active loan IDs */}
      {userLoanIds && userLoanIds.length > 0 && (
        <div className="mt-4 bg-blue-50 p-3 rounded border border-blue-200">
          <h5 className="font-medium text-blue-800 mb-2">
            📋 Active Loan IDs: {userLoanIds.map((id) => Number(id)).join(", ")}
          </h5>
        </div>
      )}

      {/* Action recommendations */}
      <div className="mt-4 bg-gray-50 p-3 rounded border">
        <h5 className="font-medium text-gray-800 mb-2">💡 Recommendations:</h5>
        <div className="text-sm text-gray-700 space-y-1">
          {totalLocked > 0 && pendingRequests.length > 0 && (
            <p>
              • You have {totalLocked} {tokenSymbol} locked in{" "}
              {pendingRequests.length} pending request(s)
            </p>
          )}
          {availableAmount <= 0 && (
            <p>
              • ❌ No available collateral - all your {tokenSymbol} is currently
              locked
            </p>
          )}
          {availableAmount > 0 && (
            <p>
              • ✅ You have {availableAmount} {tokenSymbol} available for new
              loan requests
            </p>
          )}
          {pendingRequests.length > 0 && (
            <p>
              • Wait for pending requests to be approved/rejected to unlock
              collateral
            </p>
          )}
          {totalDeposit === 0 && (
            <p>• Make a deposit first before requesting loans</p>
          )}
        </div>
      </div>
    </div>
  );
}
