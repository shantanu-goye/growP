import { useState, useEffect } from "react"
import qr from "../assets/qr.jpeg"

export default function TransactionForms() {
  const [activeTab, setActiveTab] = useState("deposit")
  const [depositData, setDepositData] = useState({
    amount: "",
    utr: "",
    transactionId: ""
  })
  const [withdrawalType, setWithdrawalType] = useState("full")
  const [transactionStatus, setTransactionStatus] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isWeekend, setIsWeekend] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [showConfirmation, setShowConfirmation] = useState(false)

  useEffect(() => {
    const today = new Date().getDay()
    setIsWeekend(today === 0 || today === 6)
  }, [])

  // Clear status when switching tabs
  useEffect(() => {
    setTransactionStatus(null)
    setFormErrors({})
  }, [activeTab])

  // Deposit Validation
  const validateDeposit = () => {
    const errors = {}
    if (!depositData.amount || Number(depositData.amount) < 1) {
      errors.amount = "Amount must be at least ₹1"
    }
    if (Number(depositData.amount) > 100000) {
      errors.amount = "Amount cannot exceed ₹1,00,000"
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
    setFormErrors({})
    return true
  }

  // Get auth token with error handling
  const getAuthToken = () => {
    try {
      return localStorage.getItem("token")
    } catch (error) {
      console.error("Failed to get auth token:", error)
      return null
    }
  }

  // Handle API errors
  const handleApiError = (error, response) => {
    if (response?.status === 401) {
      return "Authentication failed. Please login again."
    }
    if (response?.status === 403) {
      return "You don't have permission to perform this action."
    }
    if (response?.status >= 500) {
      return "Server error. Please try again later."
    }
    return error.message || "An unexpected error occurred"
  }

  // Handle Deposit
  const handleDeposit = async () => {
    if (!validateDeposit()) return

    const token = getAuthToken()
    if (!token) {
      setTransactionStatus({
        type: "error",
        message: "Please login to continue"
      })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("https://app.growp.in/api/v1/transactions/deposit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(depositData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(handleApiError(result, response))
      }

      setTransactionStatus({
        type: "success",
        message: "Deposit request submitted successfully"
      })

      // Reset form
      setDepositData({ amount: "", utr: "", transactionId: "" })
    } catch (error) {
      setTransactionStatus({ 
        type: "error", 
        message: error.message || "Failed to submit deposit request"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Withdrawal
  const handleWithdrawal = async () => {
    if (!validateWithdrawal()) return

    const token = getAuthToken()
    if (!token) {
      setTransactionStatus({
        type: "error",
        message: "Please login to continue"
      })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("https://app.growp.in/api/v1/transactions/withdrawal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ type: withdrawalType }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(handleApiError(result, response))
      }

      setTransactionStatus({
        type: "success",
        message: "Withdrawal request submitted successfully"
      })

      // Reset form
      setWithdrawalType("full")
    } catch (error) {
      setTransactionStatus({ 
        type: "error", 
        message: error.message || "Failed to submit withdrawal request"
      })
    } finally {
      setIsSubmitting(false)
      setShowConfirmation(false)
    }
  }

  // Status Alert Component
  const StatusAlert = ({ status }) => {
    if (!status) return null
    return (
      <div 
        className={`mt-4 p-3 border-l-4 rounded flex items-start ${
          status.type === "success" 
            ? "bg-green-100 border-green-600 text-green-600"
            : "bg-red-100 border-red-600 text-red-600"
        }`}
        role="alert"
        aria-live="polite"
      >
        <div className="mr-2 mt-0.5">
          {status.type === "success" ? (
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <span>{status.message}</span>
      </div>
    )
  }

  return (
    <div className="max-w-screen mx-auto p-4">
      <div className="flex space-x-2 border-b border-gray-200" role="tablist">
        <button
          onClick={() => setActiveTab("deposit")}
          className={`flex items-center px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 ${
            activeTab === "deposit" 
              ? "border-blue-600 text-blue-600 bg-blue-50" 
              : "border-transparent text-gray-500"
          }`}
          role="tab"
          aria-selected={activeTab === "deposit"}
          aria-controls="deposit-panel"
        >
          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Deposit
        </button>
        <button
          onClick={() => setActiveTab("withdrawal")}
          className={`flex items-center px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 ${
            activeTab === "withdrawal" 
              ? "border-blue-600 text-blue-600 bg-blue-50" 
              : "border-transparent text-gray-500"
          }`}
          role="tab"
          aria-selected={activeTab === "withdrawal"}
          aria-controls="withdrawal-panel"
        >
          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18v-6m0 0V6m0 6h6m-6 0H6" />
          </svg>
          Withdrawal
        </button>
      </div>

      <div className="bg-white p-6 rounded-b-lg rounded-tr-lg shadow">
        {activeTab === "deposit" ? (
          <div id="deposit-panel" role="tabpanel" aria-labelledby="deposit-tab">
            <div className="mb-4">
              <label htmlFor="amount" className="block text-gray-700 font-medium mb-2">
                Amount (₹) *
              </label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                <input
                  id="amount"
                  type="number"
                  value={depositData.amount}
                  onChange={(e) => setDepositData({...depositData, amount: e.target.value})}
                  className={`pl-10 block w-full rounded border p-2 ${
                    formErrors.amount ? 'border-red-500' : 'border-gray-300'
                  }`}
                  min="1"
                  max="100000"
                  placeholder="Enter amount"
                  aria-describedby={formErrors.amount ? "amount-error" : undefined}
                />
              </div>
              {formErrors.amount && (
                <p id="amount-error" className="text-red-500 text-sm mt-1" role="alert">
                  {formErrors.amount}
                </p>
              )}
            </div>

            <div className="mb-4">
              <label htmlFor="utr" className="block text-gray-700 font-medium mb-2">
                UTR (Optional)
              </label>
              <input
                id="utr"
                type="text"
                value={depositData.utr}
                onChange={(e) => setDepositData({...depositData, utr: e.target.value})}
                className="block w-full rounded border border-gray-300 p-2"
                placeholder="Enter UTR number"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="transactionId" className="block text-gray-700 font-medium mb-2">
                Transaction ID (Optional)
              </label>
              <input
                id="transactionId"
                type="text"
                value={depositData.transactionId}
                onChange={(e) => setDepositData({...depositData, transactionId: e.target.value})}
                className="block w-full rounded border border-gray-300 p-2"
                placeholder="Enter transaction ID"
              />
            </div>

            <button
              onClick={handleDeposit}
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? "Processing..." : "Submit Deposit"}
            </button>

            {/* QR Code Payment Section */}
            <div className="mt-6 p-4 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
              <div className="flex flex-col items-center justify-center py-8">
                <img 
                  src={qr}
                  alt="Payment QR Code" 
                  className="mb-4 rounded-lg shadow-md max-w-xs w-full"
                />
                <p className="text-gray-600 text-center">
                  Scan the QR code above to make payment
                </p>
                <p className="text-sm text-gray-500 mt-2 text-center">
                  After payment, please enter the transaction details above
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div id="withdrawal-panel" role="tabpanel" aria-labelledby="withdrawal-tab">
            <div className="mb-4">
              <label htmlFor="withdrawalType" className="block text-gray-700 font-medium mb-2">
                Withdrawal Type *
              </label>
              <select
                id="withdrawalType"
                value={withdrawalType}
                onChange={(e) => setWithdrawalType(e.target.value)}
                className={`block w-full rounded border p-2 ${
                  formErrors.type ? 'border-red-500' : 'border-gray-300'
                }`}
                aria-describedby={formErrors.type ? "withdrawal-error" : undefined}
              >
                <option value="full">Full Withdrawal</option>
                <option value="rewardOnly">Reward Only</option>
              </select>
              {formErrors.type && (
                <p id="withdrawal-error" className="text-red-500 text-sm mt-1" role="alert">
                  {formErrors.type}
                </p>
              )}
            </div>

            {isWeekend && (
              <div className="mb-4 p-3 bg-yellow-100 rounded border border-yellow-400" role="alert">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p>Withdrawals are processed only on business days (Monday-Friday)</p>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowConfirmation(true)}
              disabled={isSubmitting || isWeekend}
              className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? "Processing..." : "Request Withdrawal"}
            </button>

            {/* Confirmation Modal */}
            {showConfirmation && (
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
              >
                <div className="bg-white p-6 rounded-lg max-w-sm mx-4">
                  <h3 id="modal-title" className="font-bold text-lg mb-4">Confirm Withdrawal</h3>
                  <p className="mb-4">
                    {withdrawalType === "full" 
                      ? "Full withdrawal will deactivate your account. Are you sure you want to continue?"
                      : "Are you sure you want to proceed with reward withdrawal?"}
                  </p>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setShowConfirmation(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleWithdrawal}
                      disabled={isSubmitting}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                    >
                      {isSubmitting ? "Processing..." : "Confirm"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <StatusAlert status={transactionStatus} />
      </div>
    </div>
  )
}