import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import { ThirdwebProvider } from "@thirdweb-dev/react";
import { Celo } from "@thirdweb-dev/chains";
import Header from "./components/layouts/Header";
import OwnerDashboard from "./components/dashboards/owner/contractOwner";
import FundManagerDashboard from "./components/dashboards/fundManagers/fundManager";
import UserDashboard from "./components/dashboards/saccoUser/saccoUser";
import Welcome from "./components/pages/Welcome";
import { useActiveAccount } from "thirdweb/react";
import {
  useContractOwner,
  useIsFundManager,
} from "./components/contractFunctions/BlockCoopTokensFunctions";

// Define a type for user roles
type UserRole = "owner" | "fundManager" | "user";

// Protected route component to check access
function ProtectedRoute({
  children,
  allowedRoles,
  redirectPath = "/",
}: Readonly<{
  children: React.ReactNode;
  allowedRoles: UserRole[];
  redirectPath?: string;
}>) {
  const account = useActiveAccount();
  const { data: ownerAddress, isLoading: ownerLoading } = useContractOwner();
  const { data: isFundManager, isLoading: managerLoading } = useIsFundManager(
    account?.address
  );

  // If still loading, show loading indicator
  if (ownerLoading || managerLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  // Check if user has owner role
  const isOwner =
    ownerAddress?.toLowerCase() === account?.address?.toLowerCase();

  // Determine user roles
  const roles: UserRole[] = [];
  if (isOwner) roles.push("owner");
  if (isFundManager) roles.push("fundManager");
  if (account?.address) roles.push("user");

  // Check if user has allowed role
  const hasAccess = allowedRoles.some((role) => roles.includes(role));

  if (!account || !hasAccess) {
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}

export default function App() {
  return (
    <ThirdwebProvider
      activeChain={Celo}
      clientId={import.meta.env.VITE_TEMPLATE_CLIENT_ID}
    >
      <Router>
        <div className="min-h-screen bg-gray-100 pt-16 pb-8">
          <Header />
          <Routes>
            {/* Default route - Welcome page */}
            <Route path="/" element={<Welcome />} />

            {/* Owner routes - protected for the owner only */}
            <Route
              path="/owner-dashboard/*"
              element={
                <ProtectedRoute allowedRoles={["owner"]}>
                  <Routes>
                    <Route path="managers" element={<OwnerDashboard />} />
                    <Route path="tokens" element={<OwnerDashboard />} />
                    <Route path="displayTokens" element={<OwnerDashboard />} />
                    <Route
                      path="addSupportedToken"
                      element={<OwnerDashboard />}
                    />
                    <Route path="loanRequests" element={<OwnerDashboard />} />
                    <Route path="setLoanManager" element={<OwnerDashboard />} />
                    <Route path="liquidity" element={<OwnerDashboard />} />
                    <Route path="deposit" element={<OwnerDashboard />} />
                    <Route path="addLiquidity" element={<OwnerDashboard />} />
                    <Route
                      path="*"
                      element={
                        <Navigate to="/owner-dashboard/managers" replace />
                      }
                    />
                  </Routes>
                </ProtectedRoute>
              }
            />

            {/* Fund Manager route - protected for the fund managers only */}
            <Route
              path="/fund-manager-dashboard"
              element={
                <ProtectedRoute allowedRoles={["owner", "fundManager"]}>
                  <FundManagerDashboard />
                </ProtectedRoute>
              }
            />

            {/* User Dashboard - open to all connected users */}
            <Route
              path="/user-dashboard"
              element={
                <ProtectedRoute allowedRoles={["user", "owner", "fundManager"]}>
                  <UserDashboard />
                </ProtectedRoute>
              }
            />

            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </ThirdwebProvider>
  );
}
