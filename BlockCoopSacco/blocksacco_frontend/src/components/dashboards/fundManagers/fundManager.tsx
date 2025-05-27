import React, { useState } from "react";
import WhitelistTokenForm from "../../forms/whiteListTokens";
import TokenInfoDisplay from "../../forms/displayTokens";
import AddSupportedTokenForm from "../../forms/addSupportedTokenForm";
import LoanManagement from "../../forms/LoanManagement";
import AddLiquidityForm from "../../forms/addLiquidityForm";

export default function FundManagerDashboard() {
  // Tab state
  const [activeTab, setActiveTab] = useState("loans"); // "tokenList", "whitelist", "supportedTokens", or "addLiquidity"

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <div className="bg-gray-800 text-white shadow-lg mb-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap mt-2 border-b border-gray-700">
            <button
              className={`py-3 px-6 font-medium text-lg transition-colors duration-200 ${
                activeTab === "loans"
                  ? "border-b-2 border-blue-400 text-blue-400"
                  : "text-gray-400 hover:text-white"
              }`}
              onClick={() => setActiveTab("loans")}
            >
              Loan Requests
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4">
        {/* Tabs navigation */}
        <div className="border-b border-gray-200 mb-6">
          <ul className="flex flex-wrap -mb-px">
            <li className="mr-2">
              <button
                className={`inline-block p-4 border-b-2 rounded-t-lg ${
                  activeTab === "tokenList"
                    ? "text-blue-600 border-blue-600"
                    : "border-transparent hover:text-gray-600 hover:border-gray-300"
                }`}
                onClick={() => setActiveTab("tokenList")}
              >
                Token List
              </button>
            </li>
            <li className="mr-2">
              <button
                className={`inline-block p-4 border-b-2 rounded-t-lg ${
                  activeTab === "whitelist"
                    ? "text-blue-600 border-blue-600"
                    : "border-transparent hover:text-gray-600 hover:border-gray-300"
                }`}
                onClick={() => setActiveTab("whitelist")}
              >
                Whitelist New Tokens
              </button>
            </li>
            <li className="mr-2">
              <button
                className={`inline-block p-4 border-b-2 rounded-t-lg ${
                  activeTab === "supportedTokens"
                    ? "text-blue-600 border-blue-600"
                    : "border-transparent hover:text-gray-600 hover:border-gray-300"
                }`}
                onClick={() => setActiveTab("supportedTokens")}
              >
                Loan Tokens
              </button>
            </li>
            <li className="mr-2">
              <button
                className={`inline-block p-4 border-b-2 rounded-t-lg ${
                  activeTab === "addLiquidity"
                    ? "text-blue-600 border-blue-600"
                    : "border-transparent hover:text-gray-600 hover:border-gray-300"
                }`}
                onClick={() => setActiveTab("addLiquidity")}
              >
                Add Liquidity
              </button>
            </li>
          </ul>
        </div>

        {/* Tab content */}
        {activeTab === "loans" && (
          <div>
            <h3 className="text-2xl font-semibold mb-6 text-gray-800">
              Pending Loan Requests
            </h3>
            <LoanManagement />
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
        {activeTab === "whitelist" ? (
          <div>
            <h3 className="text-lg font-medium mb-4">Whitelist New Tokens</h3>
            <WhitelistTokenForm />
          </div>
        ) : activeTab === "supportedTokens" ? (
          <div>
            <h3 className="text-lg font-medium mb-4">Manage Loan Tokens</h3>
            <AddSupportedTokenForm />
          </div>
        ) : activeTab === "tokenList" ? (
          <TokenInfoDisplay />
        ) : null}
      </div>
    </div>
  );
}
