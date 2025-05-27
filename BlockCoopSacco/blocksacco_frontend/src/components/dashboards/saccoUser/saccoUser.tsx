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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoansOpen, setIsLoansOpen] = useState(false);
  const account = useActiveAccount();

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // If no account is connected, show a connect wallet message
  if (!account) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="text-center p-6 bg-white rounded-lg shadow-lg max-w-md w-full">
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
    <div className="min-h-screen bg-gray-100 flex relative overflow-x-hidden">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-screen bg-gray-900 shadow-lg transition-all duration-300 ease-in-out z-30
          lg:relative lg:translate-x-0
          ${
            isSidebarOpen
              ? "translate-x-0 w-64"
              : "-translate-x-full w-64 lg:translate-x-0 lg:w-20"
          }`}
      >
        {/* Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-200 border-2 border-white z-40"
          title={isSidebarOpen ? "Close Menu" : "Open Menu"}
        >
          <div className="w-5 h-5 flex items-center justify-center">
            {isSidebarOpen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
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
          {isSidebarOpen && (
            <span className="ml-3 font-bold text-xl text-white">
              BlockSacco
            </span>
          )}
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
                    // Close sidebar on mobile after selection
                    if (window.innerWidth < 1024) {
                      setIsSidebarOpen(false);
                    }
                  }
                }}
                className={`w-full flex items-center p-4 transition-all duration-200 relative group
                  ${
                    activeTab === item.id || activeTab.startsWith(item.id + "_")
                      ? "bg-blue-900 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
              >
                <span className="text-2xl flex-shrink-0">{item.icon}</span>
                {isSidebarOpen && (
                  <>
                    <span className="ml-4 font-medium flex-1">
                      {item.label}
                    </span>
                    {item.subItems && (
                      <svg
                        className={`w-5 h-5 transition-transform duration-200 flex-shrink-0 ${
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
                  </>
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
                      onClick={() => {
                        setActiveTab(`loans_${subItem.id}`);
                        // Close sidebar on mobile after selection
                        if (window.innerWidth < 1024) {
                          setIsSidebarOpen(false);
                        }
                      }}
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
          className={`absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800 bg-gray-900 ${
            isSidebarOpen ? "text-left" : "text-center"
          }`}
        >
          <div className="flex items-center group relative">
            <span className="text-2xl">👤</span>
            {isSidebarOpen && (
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-300">Connected</p>
                <p className="text-xs text-gray-400 truncate">
                  {account?.address?.slice(0, 6)}...
                  {account?.address?.slice(-4)}
                </p>
              </div>
            )}
            {!isSidebarOpen && (
              <div className="absolute left-full bottom-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap">
                {account?.address?.slice(0, 6)}...{account?.address?.slice(-4)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 w-full min-w-0 lg:ml-20">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white shadow-sm p-4 flex items-center justify-between">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-800">BlockSacco</h1>
          <div className="w-10"></div> {/* Spacer for centering */}
        </div>

        <div className="p-4 sm:p-6 lg:p-8 max-w-full overflow-x-hidden">
          {/* Content Header */}
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 flex items-center gap-2 sm:gap-3 break-words">
              <span className="text-xl sm:text-2xl">
                {(() => {
                  const mainItem = menuItems.find(
                    (item) => item.id === activeTab
                  );
                  if (mainItem) return mainItem.icon;

                  const parentItem = menuItems.find((item) =>
                    activeTab.startsWith(item.id)
                  );
                  return parentItem?.icon;
                })()}
              </span>
              <span className="break-words">
                {(() => {
                  const mainItem = menuItems.find(
                    (item) => item.id === activeTab
                  );
                  if (mainItem) return mainItem.label;

                  const parentItem = menuItems.find((item) =>
                    activeTab.startsWith(item.id)
                  );
                  if (parentItem?.subItems) {
                    const subItem = parentItem.subItems.find(
                      (sub) => activeTab === `${parentItem.id}_${sub.id}`
                    );
                    return subItem?.label;
                  }
                })()}
              </span>
            </h2>
          </div>

          {/* Content */}
          {activeTab === "deposit" && <DepositForm />}
          {activeTab === "withdraw" && <WithdrawForm />}
          {activeTab === "addLiquidity" && <AddLiquidityForm />}
          {activeTab === "loans_activeLoan" && <UserActiveLoans />}
          {activeTab === "loans_requestLoan" && <RequestLoanForm />}
          {activeTab === "loans_loanHistory" && <UserLoanRequestsDisplay />}
          {activeTab === "userInfo" && <UserInfo />}
        </div>
      </div>
    </div>
  );
}
