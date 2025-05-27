import React, { useState } from "react";
import WhitelistTokenForm from "../../forms/whiteListTokens";
import TokenInfoDisplay from "../../forms/displayTokens";
import AddSupportedTokenForm from "../../forms/addSupportedTokenForm";
import LoanManagement from "../../forms/LoanManagement";
import AddLiquidityForm from "../../forms/addLiquidityForm";
import ApprovedLoans from "../../forms/ApprovedLoans";

const menuItems = [
  {
    label: "Loan Module",
    isDropdown: true,
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
    ),
    items: [
      {
        label: "Add Supported Tokens",
        value: "supportedTokens",
      },
      {
        label: "Display Loan Requests",
        value: "loans",
      },
      {
        label: "Approved Loans",
        value: "approvedLoans",
      },
      {
        label: "Add Liquidity",
        value: "addLiquidity",
      },
    ],
  },
  {
    label: "Token Management",
    isDropdown: true,
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    items: [
      {
        label: "Whitelist Tokens",
        value: "whitelist",
      },
      {
        label: "Display Whitelisted Tokens",
        value: "tokenList",
      },
    ],
  },
];

export default function FundManagerDashboard() {
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem("fundManagerDashboardTab");
    return savedTab || "loans";
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [openDropdowns, setOpenDropdowns] = useState<{
    [key: string]: boolean;
  }>({});

  const handleTabChange = (tab: string) => {
    localStorage.setItem("fundManagerDashboardTab", tab);
    setActiveTab(tab);
  };

  const toggleDropdown = (label: string) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="flex">
        {/* Sidebar */}
        <div
          className={`bg-gray-800 text-white w-64 min-h-screen ${
            isSidebarOpen ? "" : "hidden"
          }`}
        >
          <div className="p-4">
            <h2 className="text-xl font-semibold mb-4">
              Fund Manager Dashboard
            </h2>
            <nav className="space-y-1">
              {menuItems.map((item) => (
                <div key={item.label}>
                  {item.isDropdown ? (
                    <div className="space-y-1">
                      <button
                        onClick={() => toggleDropdown(item.label)}
                        className="w-full flex items-center justify-between px-4 py-2 rounded-lg transition-colors text-gray-300 hover:bg-gray-700"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-400">{item.icon}</span>
                          <span>{item.label}</span>
                        </div>
                        <svg
                          className={`w-5 h-5 transform transition-transform ${
                            openDropdowns[item.label] ? "rotate-180" : ""
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
                      </button>
                      {openDropdowns[item.label] && (
                        <div className="ml-4 pl-3 border-l border-gray-700">
                          {item.items.map((subItem) => (
                            <button
                              key={subItem.value}
                              onClick={() => handleTabChange(subItem.value)}
                              className={`w-full flex items-center space-x-2 px-4 py-2 rounded-lg mb-1 transition-colors ${
                                activeTab === subItem.value
                                  ? "bg-gray-900 text-white"
                                  : "text-gray-300 hover:bg-gray-700"
                              }`}
                            >
                              <span>{subItem.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleTabChange(item.value)}
                      className={`w-full flex items-center space-x-2 px-4 py-2 rounded-lg mb-1 transition-colors ${
                        activeTab === item.value
                          ? "bg-gray-900 text-white"
                          : "text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      <span className="text-gray-400">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  )}
                </div>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="fixed top-4 left-4 z-20 p-2 rounded-md bg-gray-800 text-white hover:bg-gray-700"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          <div className="max-w-6xl mx-auto">
            {activeTab === "loans" && (
              <div className="px-4 py-5 sm:p-6">
                <LoanManagement />
              </div>
            )}
            {activeTab === "approvedLoans" && (
              // <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700">
              <div className="px-4 py-5 sm:p-6">
                <ApprovedLoans />
              </div>
              // </div>
            )}
            {activeTab === "addLiquidity" && (
              <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-white mb-4">
                    Add Liquidity
                  </h3>
                  <div className="mt-2 max-w-xl text-sm text-gray-300 mb-4">
                    <p>Provide liquidity to earn yield from loan interest.</p>
                  </div>
                  <AddLiquidityForm />
                </div>
              </div>
            )}
            {activeTab === "whitelist" && (
              // <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700">

              <WhitelistTokenForm />

              // </div>
            )}
            {activeTab === "supportedTokens" && (
              <div className="pt-4">
                <AddSupportedTokenForm />
              </div>
            )}
            {activeTab === "tokenList" && (
              <div className="pt-4">
                <TokenInfoDisplay />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
