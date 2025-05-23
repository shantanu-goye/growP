"use client"

import { useState, useEffect } from "react"
import { CreditCard, ArrowDownCircle, ArrowUpCircle, User, DollarSign, Clock } from "lucide-react"

export default function UserDashboard() {
  // For responsive design detection
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  // User data state
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // State for active tab
  const [activeTab, setActiveTab] = useState("deposits")

  // Effect for detecting screen size changes
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Fetch user data
  useEffect(() => {
   const fetchUserData = async () => {
  try {
    const token = localStorage.getItem("token"); // Adjust the key if named differently

    const response = await fetch("https://app.growp.in/api/v1/user/auth/profile", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch user data");
    }

    const responseData = await response.json();

    if (responseData.success && responseData.profile) {
      setUserData(responseData.profile);
    } else {
      throw new Error("Invalid data structure received from API");
    }
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

    fetchUserData()
  }, [])

  // Format date function
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="bg-white p-6 rounded-xl shadow-lg text-center">
          <div className="text-red-500 text-xl font-medium mb-2">Error</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="text-gray-500 text-lg">No user data available</div>
        </div>
      </div>
    )
  }

  // Get the first balance object
  const balanceData = userData.balances[0] || {
    balance: 0,
    pendingWithdrawalBalance: 0,
    pendingDepositBalance: 0,
    rewardBalance: 0,
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-screen mx-auto px-4 py-8">
        {/* Main Dashboard Container */}
        <div className="space-y-6">
          {/* Balance Summary - Always First for Mobile */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl shadow-xl p-6 text-white overflow-hidden relative">
            <div className="absolute right-0 top-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-blue-100 font-medium mb-1">Welcome back,</h2>
                  <h1 className="text-2xl md:text-3xl font-bold capitalize mb-4">{userData.name}</h1>
                </div>
                {userData.plan && (
                  <div className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm font-medium">
                    {userData.plan.toUpperCase()} Plan
                  </div>
                )}
              </div>

              <div className="flex flex-col md:flex-row gap-4 mt-6">
                <div className=" bg-opacity-1 backdrop-blur-sm rounded-xl p-4 flex-1 border border-white border-opacity-20">
                  <p className="text-xs text-white text-opacity-80 uppercase tracking-wider">Total Balance</p>
                  <p className="text-2xl md:text-3xl font-bold mt-1 text-white">
                    ₹{balanceData.balance.toLocaleString()}
                  </p>
                </div>

                <div className=" bg-opacity-20 backdrop-blur-sm rounded-xl p-4 flex-1 border border-white border-opacity-20">
                  <p className="text-xs text-white text-opacity-80 uppercase tracking-wider">Available Balance</p>
                  <p className="text-2xl md:text-3xl font-bold mt-1 text-white">
                    ₹{(balanceData.balance - (balanceData.pendingWithdrawalBalance || 0)).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mt-4 text-xs text-white text-opacity-70 flex items-center">
                <Clock size={14} className="mr-1" />
                Last updated: {formatDate(balanceData.updatedAt)}
              </div>
            </div>
          </div>

          {/* Balance Details Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Pending Withdrawal - Only show if not zero */}
            {balanceData.pendingWithdrawalBalance > 0 && (
              <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-4 border-l-4 border-yellow-400">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pending Withdrawal</p>
                  <div className="bg-yellow-100 p-2 rounded-lg">
                    <Clock size={18} className="text-yellow-600" />
                  </div>
                </div>
                <p className="text-xl md:text-2xl font-bold text-gray-800">
                  ₹{balanceData.pendingWithdrawalBalance.toLocaleString()}
                </p>
              </div>
            )}

            {/* Pending Deposit - Only show if not zero */}
            {balanceData.pendingDepositBalance > 0 && (
              <div className="bg- rounded-xl shadow-md hover:shadow-lg transition-shadow p-4 border-l-4 border-blue-400">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pending Deposit</p>
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Clock size={18} className="text-blue-600" />
                  </div>
                </div>
                <p className="text-xl md:text-2xl font-bold text-gray-800">
                  ₹{balanceData.pendingDepositBalance.toLocaleString()}
                </p>
              </div>
            )}

            {/* Reward Balance */}
            <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-4 border-l-4 border-purple-400">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Reward Balance</p>
                <div className="bg-purple-100 p-2 rounded-lg">
                  <DollarSign size={18} className="text-purple-600" />
                </div>
              </div>
              <p className="text-xl md:text-2xl font-bold text-gray-800">
                ₹{balanceData.rewardBalance.toLocaleString()}
              </p>
            </div>

            {/* Account Created */}
            <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-4 border-l-4 border-green-400">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Account Created</p>
                <div className="bg-green-100 p-2 rounded-lg">
                  <User size={18} className="text-green-600" />
                </div>
              </div>
              <p className="text-xl md:text-2xl font-bold text-gray-800">
                {new Date(userData.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* User Profile Card */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center mb-5">
              <div className="bg-blue-100 p-3 rounded-lg mr-4">
                <User size={22} className="text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Profile Information</h2>
              <div className="ml-auto bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                {userData.plan.toUpperCase()}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
              <div className="group flex justify-between items-center border-b border-gray-100 pb-3 hover:border-blue-200 transition-colors">
                <span className="text-sm text-gray-500">Name</span>
                <span className="font-medium text-gray-800 group-hover:text-blue-600 transition-colors">
                  {userData.name}
                </span>
              </div>
              <div className="group flex justify-between items-center border-b border-gray-100 pb-3 hover:border-blue-200 transition-colors">
                <span className="text-sm text-gray-500">Email</span>
                <span className="font-medium text-gray-800 group-hover:text-blue-600 transition-colors">
                  {userData.email}
                </span>
              </div>
              <div className="group flex justify-between items-center border-b border-gray-100 pb-3 hover:border-blue-200 transition-colors">
                <span className="text-sm text-gray-500">Plan</span>
                <span className="font-medium text-gray-800 group-hover:text-blue-600 transition-colors capitalize">
                  {userData.plan}
                </span>
              </div>
              <div className="group flex justify-between items-center border-b border-gray-100 pb-3 hover:border-blue-200 transition-colors">
                <span className="text-sm text-gray-500">Joined</span>
                <span className="font-medium text-gray-800 group-hover:text-blue-600 transition-colors">
                  {formatDate(userData.createdAt).split(",")[0]}
                </span>
              </div>
            </div>
          </div>

          {/* Transaction History */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800">Transaction History</h3>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100">
              <button
                className={`flex-1 py-4 text-sm font-medium relative ${activeTab === "deposits" ? "text-blue-600" : "text-gray-500 hover:text-gray-800"}`}
                onClick={() => setActiveTab("deposits")}
              >
                Deposits
                {activeTab === "deposits" && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></span>
                )}
              </button>
              <button
                className={`flex-1 py-4 text-sm font-medium relative ${activeTab === "withdrawals" ? "text-blue-600" : "text-gray-500 hover:text-gray-800"}`}
                onClick={() => setActiveTab("withdrawals")}
              >
                Withdrawals
                {activeTab === "withdrawals" && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></span>
                )}
              </button>
              <button
                className={`flex-1 py-4 text-sm font-medium relative ${activeTab === "transactions" ? "text-blue-600" : "text-gray-500 hover:text-gray-800"}`}
                onClick={() => setActiveTab("transactions")}
              >
                All Transactions
                {activeTab === "transactions" && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></span>
                )}
              </button>
            </div>

            {/* Mobile Transaction Cards */}
            {isMobile && (
              <div className="p-4 space-y-4">
                {activeTab === "deposits" ? (
                  userData.recentDeposits && userData.recentDeposits.length > 0 ? (
                    userData.recentDeposits.map((deposit) => (
                      <div
                        key={deposit.id}
                        className="border border-gray-100 rounded-xl p-4 hover:border-green-200 hover:shadow-md transition-all"
                      >
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-medium text-gray-800 truncate max-w-xs">
                            {deposit.transactionId || deposit.id}
                          </span>
                          <span className="text-green-600 font-semibold">+₹{deposit.amount}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mb-3">
                          <span>{formatDate(deposit.createdAt)}</span>
                          <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                            {deposit.status || "Completed"}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                        <ArrowDownCircle size={24} className="text-gray-400" />
                      </div>
                      <p>No deposit transactions found</p>
                    </div>
                  )
                ) : activeTab === "withdrawals" ? (
                  userData.recentWithdrawals && userData.recentWithdrawals.length > 0 ? (
                    userData.recentWithdrawals.map((withdrawal) => (
                      <div
                        key={withdrawal.id}
                        className="border border-gray-100 rounded-xl p-4 hover:border-red-200 hover:shadow-md transition-all"
                      >
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-medium text-gray-800 truncate max-w-xs">
                            {withdrawal.transactionId || withdrawal.id}
                          </span>
                          <span className="text-red-600 font-semibold">-₹{withdrawal.amount}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mb-3">
                          <span>{formatDate(withdrawal.createdAt)}</span>
                          <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">
                            {withdrawal.status || "Pending"}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                        <ArrowUpCircle size={24} className="text-gray-400" />
                      </div>
                      <p>No withdrawal transactions found</p>
                    </div>
                  )
                ) : userData.recentTransactions && userData.recentTransactions.length > 0 ? (
                  userData.recentTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="border border-gray-100 rounded-xl p-4 hover:border-blue-200 hover:shadow-md transition-all"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-medium text-gray-800 truncate max-w-xs">
                          {transaction.transactionId || transaction.id}
                        </span>
                        <span
                          className={`font-semibold ${transaction.type === "deposit" ? "text-green-600" : "text-red-600"}`}
                        >
                          {transaction.type === "deposit" ? "+" : "-"}₹{transaction.amount}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mb-3">
                        <span>{formatDate(transaction.createdAt)}</span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            transaction.type === "deposit"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {transaction.status || (transaction.type === "deposit" ? "Completed" : "Pending")}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CreditCard size={24} className="text-gray-400" />
                    </div>
                    <p>No transactions found</p>
                  </div>
                )}
              </div>
            )}

            {/* Desktop Transactions Table */}
            {!isMobile && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 text-left">Transaction ID</th>
                      <th className="px-6 py-4 text-left">Date & Time</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                      <th className="px-6 py-4 text-left">Status</th>
                      {activeTab === "transactions" && <th className="px-6 py-4 text-left">Type</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activeTab === "deposits" ? (
                      userData.recentDeposits && userData.recentDeposits.length > 0 ? (
                        userData.recentDeposits.map((deposit) => (
                          <tr key={deposit.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-sm text-gray-800 font-medium">
                              {deposit.transactionId || deposit.id}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">{formatDate(deposit.createdAt)}</td>
                            <td className="px-6 py-4 text-sm text-right font-semibold text-green-600">
                              +₹{deposit.amount.toLocaleString()}
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-3 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-green-100 text-green-800">
                                {deposit.status || "Completed"}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                            No deposit transactions found
                          </td>
                        </tr>
                      )
                    ) : activeTab === "withdrawals" ? (
                      userData.recentWithdrawals && userData.recentWithdrawals.length > 0 ? (
                        userData.recentWithdrawals.map((withdrawal) => (
                          <tr key={withdrawal.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-sm text-gray-800 font-medium">
                              {withdrawal.transactionId || withdrawal.id}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">{formatDate(withdrawal.createdAt)}</td>
                            <td className="px-6 py-4 text-sm text-right font-semibold text-red-600">
                              -₹{withdrawal.amount.toLocaleString()}
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-3 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-yellow-100 text-yellow-800">
                                {withdrawal.status || "Pending"}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                            No withdrawal transactions found
                          </td>
                        </tr>
                      )
                    ) : userData.recentTransactions && userData.recentTransactions.length > 0 ? (
                      userData.recentTransactions.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-800 font-medium">
                            {transaction.transactionId || transaction.id}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">{formatDate(transaction.createdAt)}</td>
                  <td
  className={`px-6 py-4 text-sm text-right font-semibold ${
    transaction.type === "deposit" ? "text-green-600" : "text-red-600"
  }`}>
  {transaction.type === "deposit" ? "+" : "-"}₹{transaction.amount.toLocaleString()}
</td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-3 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${
                                transaction.type === "deposit"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {transaction.status || (transaction.type === "deposit" ? "Completed" : "Pending")}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 capitalize">{transaction.type}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                          No transactions found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bottom Spacing for Mobile */}
          <div className="h-16 md:hidden"></div>
        </div>
      </div>
    </div>
  )
}
