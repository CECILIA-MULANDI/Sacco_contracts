import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DisplaySupportedLoanTokens from "../../forms/displaySupportedLoanTokens";
import TokenInfoDisplay from "../../forms/displayTokens";
import WhitelistTokenForm from "../../forms/whiteListTokens";
import DisplayPendingLoanRequests from "../../forms/displayPendingLoanRequests";
import AddLiquidityForm from "../../forms/addLiquidityForm";
import ApprovedLoans from "../../forms/ApprovedLoans";

export default function FundManagerDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => {
    // Set initial active tab based on current route
    const path = location.pathname;
    if (path.includes("/tokens")) return "tokens";
    if (path.includes("/displayTokens")) return "displayTokens";
    if (path.includes("/supportedTokens")) return "supportedTokens";
    if (path.includes("/loanRequests")) return "loanRequests";
    if (path.includes("/addLiquidity")) return "addLiquidity";
    if (path.includes("/approvedLoans")) return "approvedLoans";
    return "tokens";
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Navigation */}
      <div className="border-b border-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex space-x-8 overflow-x-auto">
            <button
              className={`py-2 px-4 font-medium ${
                activeTab === "tokens"
                  ? "border-b-2 border-blue-400 text-blue-400"
                  : "text-gray-400 hover:text-white"
              }`}
              onClick={() => {
                setActiveTab("tokens");
                navigate("/fund-manager-dashboard/tokens");
              }}
            >
              Whitelist Tokens
            </button>
            <button
              className={`py-2 px-4 font-medium ${
                activeTab === "displayTokens"
                  ? "border-b-2 border-blue-400 text-blue-400"
                  : "text-gray-400 hover:text-white"
              }`}
              onClick={() => {
                setActiveTab("displayTokens");
                navigate("/fund-manager-dashboard/displayTokens");
              }}
            >
              Display Whitelisted Tokens
            </button>
            <button
              className={`py-2 px-4 font-medium ${
                activeTab === "supportedTokens"
                  ? "border-b-2 border-blue-400 text-blue-400"
                  : "text-gray-400 hover:text-white"
              }`}
              onClick={() => {
                setActiveTab("supportedTokens");
                navigate("/fund-manager-dashboard/supportedTokens");
              }}
            >
              Supported Loan Tokens
            </button>
            <button
              className={`py-2 px-4 font-medium ${
                activeTab === "addLiquidity"
                  ? "border-b-2 border-blue-400 text-blue-400"
                  : "text-gray-400 hover:text-white"
              }`}
              onClick={() => {
                setActiveTab("addLiquidity");
                navigate("/fund-manager-dashboard/addLiquidity");
              }}
            >
              Add Liquidity
            </button>
            <button
              className={`py-2 px-4 font-medium ${
                activeTab === "loanRequests"
                  ? "border-b-2 border-blue-400 text-blue-400"
                  : "text-gray-400 hover:text-white"
              }`}
              onClick={() => {
                setActiveTab("loanRequests");
                navigate("/fund-manager-dashboard/loanRequests");
              }}
            >
              Loan Requests
            </button>
            <button
              className={`py-2 px-4 font-medium ${
                activeTab === "approvedLoans"
                  ? "border-b-2 border-blue-400 text-blue-400"
                  : "text-gray-400 hover:text-white"
              }`}
              onClick={() => {
                setActiveTab("approvedLoans");
                navigate("/fund-manager-dashboard/approvedLoans");
              }}
            >
              Approved Loans
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Content based on active tab */}
        {activeTab === "tokens" && (
          <div>
            <WhitelistTokenForm />
          </div>
        )}

        {activeTab === "displayTokens" && (
          <div>
            <TokenInfoDisplay />
          </div>
        )}

        {activeTab === "supportedTokens" && (
          <div>
            <DisplaySupportedLoanTokens canModify={true} />
          </div>
        )}

        {activeTab === "addLiquidity" && (
          <div>
            <AddLiquidityForm />
          </div>
        )}

        {activeTab === "loanRequests" && (
          <div>
            <DisplayPendingLoanRequests />
          </div>
        )}

        {activeTab === "approvedLoans" && (
          <div>
            <ApprovedLoans />
          </div>
        )}
      </div>
    </div>
  );
}
