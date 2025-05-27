import React, { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import DepositForm from "../../forms/depositForm";
import WithdrawForm from "../../forms/withdrawForm";
import UserInfo from "./userInfo";
import RequestLoanForm from "../../forms/requestLoanForm";
import UserLoanRequestsDisplay from "../../forms/userLoanRequestsDisplay";
import UserActiveLoans from "../../forms/UserActiveLoans";
import AddLiquidityForm from "../../forms/addLiquidityForm";

export default function UserDashboard() {
  const [activeTab, setActiveTab] = useState("deposit");
  const account = useActiveAccount();

  // If no account is connected, show a connect wallet message
  if (!account) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">
            Connect Your Wallet
          </h2>
          <p className="text-gray-600">
            Please connect your wallet to access the dashboard
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <div className="bg-gray-800 text-white shadow-lg mb-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap mt-2 border-b border-gray-700">
            {/* Deposit Tab */}
            <button
              className={`py-3 px-6 font-medium text-lg transition-colors duration-200 ${
                activeTab === "deposit"
                  ? "border-b-2 border-blue-400 text-blue-400"
                  : "text-gray-400 hover:text-white"
              }`}
              onClick={() => setActiveTab("deposit")}
            >
              Deposit
            </button>

            {/* Withdraw Tab */}
            <button
              className={`py-3 px-6 font-medium text-lg transition-colors duration-200 ${
                activeTab === "withdraw"
                  ? "border-b-2 border-blue-400 text-blue-400"
                  : "text-gray-400 hover:text-white"
              }`}
              onClick={() => setActiveTab("withdraw")}
            >
              Withdraw
            </button>

            {/* Add Liquidity Tab */}
            <button
              className={`py-3 px-6 font-medium text-lg transition-colors duration-200 ${
                activeTab === "addLiquidity"
                  ? "border-b-2 border-blue-400 text-blue-400"
                  : "text-gray-400 hover:text-white"
              }`}
              onClick={() => setActiveTab("addLiquidity")}
            >
              Add Liquidity
            </button>

            {/* Loans Tab */}
            <button
              className={`py-3 px-6 font-medium text-lg transition-colors duration-200 ${
                activeTab === "loans"
                  ? "border-b-2 border-blue-400 text-blue-400"
                  : "text-gray-400 hover:text-white"
              }`}
              onClick={() => setActiveTab("loans")}
            >
              Loans
            </button>

            {/* User Info Tab */}
            <button
              className={`py-3 px-6 font-medium text-lg transition-colors duration-200 ${
                activeTab === "userInfo"
                  ? "border-b-2 border-blue-400 text-blue-400"
                  : "text-gray-400 hover:text-white"
              }`}
              onClick={() => setActiveTab("userInfo")}
            >
              User Info
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="container mx-auto px-4 pb-8">
        {activeTab === "deposit" && (
          <div>
            <h3 className="text-2xl font-semibold mb-6 text-gray-800">
              Deposit Tokens
            </h3>
            <DepositForm />
          </div>
        )}

        {activeTab === "withdraw" && (
          <div>
            <h3 className="text-2xl font-semibold mb-6 text-gray-800">
              Withdraw Tokens
            </h3>
            <WithdrawForm />
          </div>
        )}

        {activeTab === "addLiquidity" && (
          <div>
            <h3 className="text-2xl font-semibold mb-6 text-gray-800">
              Add Liquidity
            </h3>
            <AddLiquidityForm />
          </div>
        )}

        {activeTab === "userInfo" && (
          <div>
            <h3 className="text-2xl font-semibold mb-6 text-gray-800">
              User Info
            </h3>
            <UserInfo />
          </div>
        )}

        {activeTab === "loans" && (
          <div className="space-y-8">
            {/* Active Loans Section */}
            <div>
              <h3 className="text-2xl font-semibold mb-6 text-gray-800">
                💼 Your Active Loans
              </h3>
              <UserActiveLoans />
            </div>

            {/* Request New Loan Section */}
            <div>
              <h3 className="text-2xl font-semibold mb-6 text-gray-800">
                📝 Request a New Loan
              </h3>
              <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
                <RequestLoanForm />
              </div>
            </div>

            {/* Loan Requests History */}
            <div>
              <h3 className="text-2xl font-semibold mb-6 text-gray-800">
                📋 Your Loan Request History
              </h3>
              <UserLoanRequestsDisplay />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
