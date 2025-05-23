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
  const [activeTab, setActiveTab] = useState("deposit")
  const [depositData, setDepositData] = useState({
    amount: "",
    utr: "",
    transactionId: ""
  })
  const [withdrawalType, setWithdrawalType] = useState("full")
  const [bankDetails, setBankDetails] = useState({
    accountNumber: "",
    ifscCode: "",
    accountHolderName: "",
  })
  const [transactionStatus, setTransactionStatus] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isWeekend, setIsWeekend] = useState(false)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [formErrors, setFormErrors] = useState({})
  const [userData, setUserData] = useState(null)
  const [showConfirmation, setShowConfirmation] = useState(false)

  // Fetch user data
  const fetchUserData = async () => {
    try {
      setIsLoadingUser(true)
      const token = localStorage.getItem("token") || JSON.parse(localStorage.getItem("userinfo"))?.token
      const response = await fetch("https://r5qcmks6-3000.inc1.devtunnels.ms/api/v1/user/fetch/me", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()
      if (data.status === "success") {
        setUserData(data.data)
        setBankDetails({
          accountNumber: data.data.bankAccountNumber || "",
          ifscCode: data.data.ifscCode || "",
          accountHolderName: data.data.name || "",
        })
      }
    } catch (error) {
      setTransactionStatus({ type: "error", message: "Failed to load user information" })
    } finally {
      setIsLoadingUser(false)
    }
  }

  useEffect(() => {
    const today = new Date().getDay()
    setIsWeekend(today === 0 || today === 6)
    fetchUserData()
  }, [])

  // Deposit Validation
  const validateDeposit = () => {
    const errors = {}
    if (!depositData.amount || Number(depositData.amount) < 1) {
      errors.amount = "Amount must be at least ₹1"
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Withdrawal Validation
  const validateWithdrawal = () => {
    if (!withdrawalType) {
      setFormErrors({ type: "Please select withdrawal type" })
      return false
    }
    return true
  }

  // Handle Deposit
  const handleDeposit = async (e) => {
    e.preventDefault()
    if (!validateDeposit()) return

    setIsSubmitting(true)
    try {
      const response = await fetch("https://app.growp.in/api/v1/transactions/deposit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          amount: Number(depositData.amount),
          utr: depositData.utr,
          transactionId: depositData.transactionId
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.message)

      setTransactionStatus({
        type: "success",
        message: data.message
      })

      // Show activation modal if account activated
      if (data.message.includes("activated")) {
        // Implement your modal show logic here
        console.log("Show activation modal")
      }

      // Reset form
      setDepositData({ amount: "", utr: "", transactionId: "" })
      await fetchUserData()

    } catch (error) {
      setTransactionStatus({ type: "error", message: error.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Withdrawal
  const handleWithdrawal = async (e) => {
    e.preventDefault()
    if (!validateWithdrawal()) return

    setIsSubmitting(true)
    try {
      const response = await fetch("https://app.growp.in/api/v1/transactions/withdrawal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ type: withdrawalType }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.message)

      setTransactionStatus({
        type: "success",
        message: data.message
      })

      // Show deactivation modal for full withdrawal
      if (withdrawalType === "full") {
        // Implement your modal show logic here
        console.log("Show deactivation modal")
      }

    } catch (error) {
      setTransactionStatus({ type: "error", message: error.message })
    } finally {
      setIsSubmitting(false)
      setShowConfirmation(false)
    }
  }

  // Status Alert Component
  const StatusAlert = ({ status }) => {
    if (!status) return null
    return (
      <div className={`mt-4 p-3 border-l-4 rounded flex items-start ${
        status.type === "success" 
          ? "bg-green-100 border-green-600 text-green-600"
          : "bg-red-100 border-red-600 text-red-600"
      }`}>
        {status.type === "success" ? (
          <CheckCircle className="h-5 w-5 mr-2" />
        ) : (
          <AlertCircle className="h-5 w-5 mr-2" />
        )}
        <span>{status.message}</span>
      </div>
    )
  }

  return (
    <div className="max-w-screen mx-auto p-4">
      <div className="flex space-x-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("deposit")}
          className={`flex items-center px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 ${
            activeTab === "deposit" 
              ? "border-blue-600 text-blue-600 bg-blue-50" 
              : "border-transparent text-gray-500"
          }`}
        >
          <ArrowDownCircle className="h-4 w-4 mr-2" />
          Deposit
        </button>
        <button
          onClick={() => setActiveTab("withdrawal")}
          className={`flex items-center px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 ${
            activeTab === "withdrawal" 
              ? "border-blue-600 text-blue-600 bg-blue-50" 
              : "border-transparent text-gray-500"
          }`}
        >
          <ArrowUpCircle className="h-4 w-4 mr-2" />
          Withdrawal
        </button>
      </div>

      <div className="bg-white p-6 rounded-b-lg rounded-tr-lg shadow">
        {activeTab === "deposit" ? (
          <form onSubmit={handleDeposit}>
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">
                Amount (₹) *
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  type="number"
                  value={depositData.amount}
                  onChange={(e) => setDepositData({...depositData, amount: e.target.value})}
                  className="pl-10 block w-full rounded border border-gray-300 p-2"
                  min="1"
                  required
                />
              </div>
              {formErrors.amount && (
                <p className="text-red-500 text-sm mt-1">{formErrors.amount}</p>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">
                UTR (Optional)
              </label>
              <input
                type="text"
                value={depositData.utr}
                onChange={(e) => setDepositData({...depositData, utr: e.target.value})}
                className="block w-full rounded border border-gray-300 p-2"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">
                Transaction ID (Optional)
              </label>
              <input
                type="text"
                value={depositData.transactionId}
                onChange={(e) => setDepositData({...depositData, transactionId: e.target.value})}
                className="block w-full rounded border border-gray-300 p-2"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isSubmitting ? "Processing..." : "Submit Deposit"}
            </button>
          </form>
        ) : (
          <form onSubmit={(e) => {
            e.preventDefault()
            setShowConfirmation(true)
          }}>
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">
                Withdrawal Type *
              </label>
              <select
                value={withdrawalType}
                onChange={(e) => setWithdrawalType(e.target.value)}
                className="block w-full rounded border border-gray-300 p-2"
              >
                <option value="full">Full Withdrawal</option>
                <option value="rewardOnly">Reward Only</option>
              </select>
            </div>

            {/* Bank Details Display */}
            <div className="mb-4 p-4 bg-gray-50 rounded border">
              <h3 className="font-medium mb-2 flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Bank Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm">Account Holder: {bankDetails.accountHolderName}</p>
                  <p className="text-sm">Account Number: {bankDetails.accountNumber}</p>
                  <p className="text-sm">IFSC Code: {bankDetails.ifscCode}</p>
                </div>
              </div>
            </div>

            {isWeekend && (
              <div className="mb-4 p-3 bg-yellow-100 rounded border border-yellow-400">
                <p>Withdrawals processed only on business days</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isWeekend}
              className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isSubmitting ? "Processing..." : "Request Withdrawal"}
            </button>

            {/* Confirmation Modal */}
            {showConfirmation && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="bg-white p-6 rounded-lg max-w-sm">
                  <h3 className="font-bold text-lg mb-4">Confirm Withdrawal</h3>
                  <p className="mb-4">
                    {withdrawalType === "full" 
                      ? "Full withdrawal will deactivate your account. Continue?"
                      : "Confirm reward withdrawal?"}
                  </p>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setShowConfirmation(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleWithdrawal}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              </div>
            )}
          </form>
        )}

        <StatusAlert status={transactionStatus} />
      </div>
    </div>
  )
}