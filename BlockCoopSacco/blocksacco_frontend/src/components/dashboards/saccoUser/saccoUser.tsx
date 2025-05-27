import React, { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import DepositForm from "../../forms/depositForm";
import WithdrawForm from "../../forms/withdrawForm";
import UserInfo from "./userInfo";
import RequestLoanForm from "../../forms/requestLoanForm";
import UserLoanRequestsDisplay from "../../forms/userLoanRequestsDisplay";
import UserActiveLoans from "../../forms/UserActiveLoans";
import AddLiquidityForm from "../../forms/addLiquidityForm";

const menuItems = [
  {
    id: "deposit",
    label: "Deposit",
    icon: "💰",
    description: "Deposit tokens into your account",
  },
  {
    id: "withdraw",
    label: "Withdraw",
    icon: "🏧",
    description: "Withdraw your tokens",
  },
  {
    id: "addLiquidity",
    label: "Add Liquidity",
    icon: "💧",
    description: "Provide liquidity to earn rewards",
  },
  {
    id: "loans",
    label: "Loans",
    icon: "🏦",
    description: "Manage your loans and requests",
    subItems: [
      {
        id: "activeLoan",
        label: "Active Loans",
        icon: "💼",
        description: "View your active loans",
      },
      {
        id: "requestLoan",
        label: "Request Loan",
        icon: "📝",
        description: "Apply for a new loan",
      },
      {
        id: "loanHistory",
        label: "Loan History",
        icon: "📋",
        description: "View your loan request history",
      },
    ],
  },
  {
    id: "userInfo",
    label: "User Portfolio",
    icon: "👤",
    description: "View your account details",
  },
];

export default function UserDashboard() {
  const [activeTab, setActiveTab] = useState("deposit");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoansOpen, setIsLoansOpen] = useState(false);
  const account = useActiveAccount();

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

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
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full bg-gray-900 shadow-lg transition-all duration-300 ease-in-out z-10
          ${isSidebarOpen ? "w-64" : "w-20"}`}
      >
        {/* Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-4 top-9 bg-gray-900 hover:bg-gray-800 text-white rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-200 group cursor-pointer"
          title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          <div className="w-6 h-6 flex items-center justify-center">
            {isSidebarOpen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              </svg>
            )}
          </div>
        </button>

        {/* Logo/Brand */}
        <div
          className={`p-6 border-b border-gray-800 flex items-center ${
            isSidebarOpen ? "justify-start" : "justify-center"
          }`}
        >
          <span className="text-2xl">🏦</span>
          <span
            className={`ml-3 font-bold text-xl text-white transition-opacity duration-300 ${
              isSidebarOpen ? "opacity-100" : "opacity-0 hidden"
            }`}
          >
            BlockSacco
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="mt-6">
          {menuItems.map((item) => (
            <div key={item.id}>
              <button
                onClick={() => {
                  if (item.id === "loans") {
                    setIsLoansOpen(!isLoansOpen);
                  } else {
                    setActiveTab(item.id);
                    setIsLoansOpen(false);
                  }
                }}
                className={`w-full flex items-center p-4 transition-all duration-200 relative group
                  ${
                    activeTab === item.id || activeTab.startsWith(item.id + "_")
                      ? "bg-blue-900 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
              >
                <span className="text-2xl">{item.icon}</span>
                <span
                  className={`ml-4 font-medium transition-opacity duration-300 flex-1 ${
                    isSidebarOpen ? "opacity-100" : "opacity-0 w-0 hidden"
                  }`}
                >
                  {item.label}
                </span>
                {item.subItems && isSidebarOpen && (
                  <svg
                    className={`w-5 h-5 transition-transform duration-200 ${
                      isLoansOpen ? "transform rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                )}
                {!isSidebarOpen && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </button>

              {/* Sub-items for Loans */}
              {item.subItems && isSidebarOpen && (
                <div
                  className={`pl-4 overflow-hidden transition-all duration-200 ${
                    isLoansOpen ? "max-h-48" : "max-h-0"
                  }`}
                >
                  {item.subItems.map((subItem) => (
                    <button
                      key={subItem.id}
                      onClick={() => setActiveTab(`loans_${subItem.id}`)}
                      className={`w-full flex items-center p-3 transition-all duration-200
                        ${
                          activeTab === `loans_${subItem.id}`
                            ? "bg-blue-800 text-white"
                            : "text-gray-400 hover:bg-gray-800 hover:text-white"
                        }`}
                    >
                      <span className="text-xl">{subItem.icon}</span>
                      <span className="ml-3 font-medium text-sm">
                        {subItem.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* User Section */}
        <div
          className={`absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800 bg-gray-900
          ${isSidebarOpen ? "text-left" : "text-center"}`}
        >
          <div className="flex items-center group relative">
            <span className="text-2xl">👤</span>
            <div
              className={`ml-3 transition-opacity duration-300 ${
                isSidebarOpen ? "opacity-100" : "opacity-0 w-0 hidden"
              }`}
            >
              <p className="text-sm font-medium text-gray-300">Connected</p>
              <p className="text-xs text-gray-400 truncate">
                {account?.address?.slice(0, 6)}...{account?.address?.slice(-4)}
              </p>
            </div>
            {!isSidebarOpen && (
              <div className="absolute left-full bottom-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap">
                {account?.address?.slice(0, 6)}...{account?.address?.slice(-4)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        className={`flex-1 transition-all duration-300 ${
          isSidebarOpen ? "ml-64" : "ml-20"
        }`}
      >
        <div className="p-8">
          {/* Content Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <span>
                {menuItems.find((item) => item.id === activeTab)?.icon}
              </span>
              <span>
                {menuItems.find((item) => item.id === activeTab)?.label}
              </span>
            </h2>
            <p className="text-gray-600 mt-2">
              {menuItems.find((item) => item.id === activeTab)?.description}
            </p>
          </div>

          {/* Tab Content */}
          <div className="transition-all duration-300 ease-in-out">
            {activeTab === "deposit" && (
              <div className="animate-fadeIn">
                <DepositForm />
              </div>
            )}

            {activeTab === "withdraw" && (
              <div className="animate-fadeIn">
                <WithdrawForm />
              </div>
            )}

            {activeTab === "addLiquidity" && (
              <div className="animate-fadeIn">
                <AddLiquidityForm />
              </div>
            )}

            {activeTab === "userInfo" && (
              <div className="animate-fadeIn">
                <UserInfo />
              </div>
            )}

            {/* Active Loans Section */}
            {activeTab === "loans_activeLoan" && (
              <div className="animate-fadeIn">
                <h3 className="text-2xl font-semibold mb-6 text-gray-800 flex items-center gap-2">
                  <span className="text-3xl">💼</span> Your Active Loans
                </h3>
                <UserActiveLoans />
              </div>
            )}

            {/* Request New Loan Section */}
            {activeTab === "loans_requestLoan" && (
              <div className="animate-fadeIn">
                <h3 className="text-2xl font-semibold mb-6 text-gray-800 flex items-center gap-2">
                  <span className="text-3xl">📝</span> Request a New Loan
                </h3>
                <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
                  <RequestLoanForm />
                </div>
              </div>
            )}

            {/* Loan Requests History */}
            {activeTab === "loans_loanHistory" && (
              <div className="animate-fadeIn">
                <h3 className="text-2xl font-semibold mb-6 text-gray-800 flex items-center gap-2">
                  <span className="text-3xl">📋</span> Your Loan Request History
                </h3>
                <UserLoanRequestsDisplay />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
