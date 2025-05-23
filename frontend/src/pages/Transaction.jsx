"use client"

import { useState, useEffect } from "react"
import {
  AlertCircle,
  CheckCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  LoaderCircle,
  IndianRupee,
  Banknote,
  CreditCard,
} from "lucide-react"

export default function TransactionForms() {
  // Tab state
  const [activeTab, setActiveTab] = useState("deposit")

  // Form states
  const [depositAmount, setDepositAmount] = useState("")
  const [paymentId, setPaymentId] = useState("")
  const [withdrawalAmount, setWithdrawalAmount] = useState("")
  const [withdrawalNote, setWithdrawalNote] = useState("")
  const [bankDetails, setBankDetails] = useState({
    accountNumber: "",
    ifscCode: "",
    accountHolderName: "",
  })

  // Status states
  const [transactionStatus, setTransactionStatus] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isWeekend, setIsWeekend] = useState(false)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [formErrors, setFormErrors] = useState({})

  // User and balance data
  const [userData, setUserData] = useState(null)
  const [balanceData, setBalanceData] = useState(null)

  // Fetch user data from API
  const fetchUserData = async () => {
    try {
      setIsLoadingUser(true)
      const token = localStorage.getItem("token") || JSON.parse(localStorage.getItem("userinfo"))?.token

      if (!token) {
        throw new Error("No authentication token found")
      }

      const response = await fetch("https://r5qcmks6-3000.inc1.devtunnels.ms/api/v1/user/fetch/me", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch user data")
      }

      const data = await response.json()
      if (data.status === "success") {
        setUserData(data.data)
        setBalanceData(data.data.balance)

        // Pre-fill bank details if available
        setBankDetails({
          accountNumber: data.data.bankAccountNumber || "",
          ifscCode: data.data.ifscCode || "",
          accountHolderName: data.data.name || "",
        })
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
      setTransactionStatus({
        type: "error",
        message: "Failed to load user information. Please try again later.",
      })
    } finally {
      setIsLoadingUser(false)
    }
  }

  // Load user data on component mount
  useEffect(() => {
    // Check if today is weekend
    const today = new Date().getDay()
    setIsWeekend(today === 0 || today === 6) // 0 is Sunday, 6 is Saturday

    // Fetch user data
    fetchUserData()
  }, [])

  // Validate deposit form
  const validateDepositForm = () => {
    const errors = {}
    const amount = Number(depositAmount)

    if (!depositAmount || amount < 1) {
      errors.depositAmount = "Amount must be at least ₹1"
    }

    if (!paymentId || paymentId.trim() === "") {
      errors.paymentId = "Payment ID is required"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Validate withdrawal form
  const validateWithdrawalForm = () => {
    const errors = {}
    const amount = Number(withdrawalAmount)

    if (!withdrawalAmount || amount < 1) {
      errors.withdrawalAmount = "Amount must be at least ₹1"
    }

    if (amount > (balanceData?.totalBalance || 0)) {
      errors.withdrawalAmount = "Amount exceeds available balance"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setTransactionStatus(null)
    setFormErrors({})

    try {
      if (activeTab === "deposit") {
        // Validate deposit form
        if (!validateDepositForm()) {
          setIsSubmitting(false)
          return
        }

        const amount = Number(depositAmount)

        // Make API call to deposit endpoint
        const response = await fetch("https://r5qcmks6-3000.inc1.devtunnels.ms/api/v1/deposite/make", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || JSON.parse(localStorage.getItem("userinfo"))?.token}`,
          },
          body: JSON.stringify({
            amount,
            paymentId,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || "Deposit failed. Please try again.")
        }

        setTransactionStatus({
          type: "success",
          message: `Deposit of ₹${amount} submitted successfully. It will be processed shortly.`,
        })
        setDepositAmount("")
        setPaymentId("")

        await fetchUserData() // Refresh user info
      } else {
        // Validate withdrawal form
        if (!validateWithdrawalForm()) {
          setIsSubmitting(false)
          return
        }

        const amount = Number(withdrawalAmount)

        // Make API call to withdrawal endpoint
        const response = await fetch("https://r5qcmks6-3000.inc1.devtunnels.ms/api/v1/withdrawal/make", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || JSON.parse(localStorage.getItem("userinfo"))?.token}`,
          },
          body: JSON.stringify({
            amount,
            note: withdrawalNote,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || "Withdrawal failed. Please try again.")
        }

        setTransactionStatus({
          type: "success",
          message: `Withdrawal request for ₹${amount} submitted. It will be processed ${isWeekend ? "on the next business day" : "shortly"}.`,
        })
        setWithdrawalAmount("")
        setWithdrawalNote("")

        await fetchUserData() // Refresh user info
      }
    } catch (error) {
      console.error("Transaction Error:", error)
      setTransactionStatus({
        type: "error",
        message: error.message || "Transaction failed. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Error message component
  const ErrorMessage = ({ message }) => {
    if (!message) return null

    return (
      <p className="text-red-500 text-sm mt-1 flex items-center">
        <AlertCircle className="h-4 w-4 mr-1" />
        {message}
      </p>
    )
  }

  // Status alert component
  const StatusAlert = ({ status }) => {
    if (!status) return null

    const alertStyles = {
      success: "bg-green-100 border-green-600 text-green-600",
      error: "bg-red-100 border-red-600 text-red-600",
    }

    return (
      <div className={`mt-4 p-3 border-l-4 rounded flex items-start ${alertStyles[status.type]}`}>
        {status.type === "success" ? (
          <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
        ) : (
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
        )}
        <span>{status.message}</span>
      </div>
    )
  }

  // Tab component
  const Tab = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => {
        setActiveTab(id)
        setFormErrors({})
        setTransactionStatus(null)
      }}
      className={`flex items-center px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
        activeTab === id
          ? "border-blue-600 text-blue-600 bg-blue-50"
          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
      }`}
    >
      <Icon className="h-4 w-4 mr-2" />
      {label}
    </button>
  )

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "Never"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-IN")
  }

  // Format currency for display
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .format(amount)
      .replace("₹", "₹")
  }

  return (
    <div className="max-w-screen mx-auto p-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Manage Your Funds</h1>

      {/* Account Summary */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        {isLoadingUser ? (
          <div className="flex justify-center items-center p-4">
            <LoaderCircle className="animate-spin h-6 w-6 text-blue-600" />
            <span className="ml-2">Loading account information...</span>
          </div>
        ) : userData ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-blue-50 rounded">
              <p className="text-sm text-gray-500">Total Balance</p>
              <p className="font-bold text-lg">
                {balanceData ? formatCurrency(balanceData.totalBalance) : "Loading..."}
              </p>
            </div>
            <div className="p-3 bg-yellow-50 rounded">
              <p className="text-sm text-gray-500">Pending Withdrawal</p>
              <p className="font-bold text-lg">
                {balanceData ? formatCurrency(balanceData.pendingWithdrawal) : "Loading..."}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded">
              <p className="text-sm text-gray-500">Interest Earned</p>
              <p className="font-bold text-lg">
                {balanceData ? formatCurrency(balanceData.interestEarned) : "Loading..."}
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded">
              <p className="text-sm text-gray-500">Last Updated</p>
              <p className="font-bold text-lg">{balanceData ? formatDate(balanceData.updatedAt) : "Loading..."}</p>
            </div>
          </div>
        ) : (
          <div className="text-center p-4 text-red-500">Failed to load user information</div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-2 border-b border-gray-200">
        <Tab id="deposit" icon={ArrowDownCircle} label="Deposit" />
        <Tab id="withdrawal" icon={ArrowUpCircle} label="Withdrawal" />
      </div>

      {/* Tab Content */}
      <div className="bg-white p-6 rounded-b-lg rounded-tr-lg shadow">
        {activeTab === "deposit" ? (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2" htmlFor="depositAmount">
                Amount (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <IndianRupee className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="number"
                  id="depositAmount"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  min="1"
                  className={`pl-10 block w-full rounded border ${
                    formErrors.depositAmount
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  }`}
                  required
                  disabled={isLoadingUser}
                />
              </div>
              <ErrorMessage message={formErrors.depositAmount} />
              <p className="text-sm text-gray-500 mt-1">Min ₹1</p>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2" htmlFor="paymentId">
                Payment ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="paymentId"
                value={paymentId}
                onChange={(e) => setPaymentId(e.target.value)}
                className={`block w-full rounded border ${
                  formErrors.paymentId
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                }`}
                placeholder="Enter payment reference ID"
                required
                disabled={isLoadingUser}
              />
              <ErrorMessage message={formErrors.paymentId} />
              <p className="text-sm text-gray-500 mt-1">Enter the reference ID from your payment</p>
            </div>

            <div className="mb-4 p-4 bg-gray-50 rounded border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                <Banknote className="h-5 w-5 mr-2 text-blue-600" />
                Payment Methods
              </h3>
              <p className="text-sm text-gray-700 mb-3">
                Scan the QR code or use the bank details below to make your payment.
              </p>

              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="bg-gray-200 w-full aspect-square flex items-center justify-center text-gray-500 rounded">
                    QR Code
                  </div>
                </div>

                <div className="flex-1">
                  <div className="text-sm text-gray-700 space-y-2">
                    <p>
                      <span className="font-medium">Bank:</span> ABC Bank
                    </p>
                    <p>
                      <span className="font-medium">A/C:</span> 1234567890
                    </p>
                    <p>
                      <span className="font-medium">IFSC:</span> ABC0001234
                    </p>
                    <p>
                      <span className="font-medium">Beneficiary:</span> {userData?.name || "Your Name"}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      After making the payment, submit this form with the payment ID to notify us of your deposit.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isLoadingUser}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded flex items-center justify-center disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="animate-spin h-5 w-5 mr-2" />
                  Processing...
                </>
              ) : (
                "Submit Deposit"
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2" htmlFor="withdrawalAmount">
                Amount (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <IndianRupee className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="number"
                  id="withdrawalAmount"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                  min="1"
                  max={balanceData?.totalBalance || 0}
                  className={`pl-10 block w-full rounded border ${
                    formErrors.withdrawalAmount
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  }`}
                  required
                  disabled={isLoadingUser}
                />
              </div>
              <ErrorMessage message={formErrors.withdrawalAmount} />
              <p className="text-sm text-gray-500 mt-1">
                Available balance: {balanceData ? formatCurrency(balanceData.totalBalance) : "Loading..."}
                {balanceData?.pendingWithdrawal > 0 && (
                  <span className="text-yellow-600 ml-2">
                    ({formatCurrency(balanceData.pendingWithdrawal)} pending withdrawal)
                  </span>
                )}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2" htmlFor="withdrawalNote">
                Note (optional)
              </label>
              <textarea
                id="withdrawalNote"
                value={withdrawalNote}
                onChange={(e) => setWithdrawalNote(e.target.value)}
                className="block w-full rounded border border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                rows="2"
                placeholder="e.g. Emergency funds, Monthly expenses"
                disabled={isLoadingUser}
              ></textarea>
            </div>

            <div className="mb-4 p-4 bg-gray-50 rounded border border-gray-200">
  <h3 className="font-medium text-gray-900 mb-3 flex items-center">
    <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
    Bank Account Details
  </h3>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="block text-sm text-gray-700 mb-1">Account Holder Name</label>
      <p className="block w-full text-gray-800">{bankDetails.accountHolderName}</p>
    </div>

    <div>
      <label className="block text-sm text-gray-700 mb-1">Account Number</label>
      <p className="block w-full text-gray-800">{bankDetails.accountNumber}</p>
    </div>

    <div>
      <label className="block text-sm text-gray-700 mb-1">IFSC Code</label>
      <p className="block w-full text-gray-800">{bankDetails.ifscCode}</p>
    </div>
  </div>

  {userData?.bankAccountNumber && (
    <p className="text-xs text-green-600 mt-2">
      Your saved bank details have been pre-filled. Please verify before submitting.
    </p>
  )}
</div>


            {isWeekend && (
              <div className="mb-4 p-3 bg-yellow-100 rounded border border-yellow-400 text-yellow-800 text-sm">
                <p className="font-medium">Weekend Notice:</p>
                <p>
                  Withdrawals are processed only on business days (Monday to Friday). Requests made during weekends will
                  be processed on the next business day.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isWeekend || isLoadingUser}
              className={`w-full font-medium py-2 px-4 rounded flex items-center justify-center ${
                isWeekend || isLoadingUser
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="animate-spin h-5 w-5 mr-2" />
                  Processing...
                </>
              ) : isWeekend ? (
                "Withdrawals Unavailable on Weekends"
              ) : (
                "Submit Withdrawal Request"
              )}
            </button>
          </form>
        )}

        <StatusAlert status={transactionStatus} />
      </div>
    </div>
  )
}