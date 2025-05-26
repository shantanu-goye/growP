import { useState, useMemo, useEffect } from 'react';

export default function TransactionPassbook() {
  // State for API data
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for pagination and search
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 10;

  // Fetch transactions from separate APIs
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get token from localStorage (you might need to adjust this based on your auth setup)
        const token = localStorage?.getItem('token') || '';

        // Fetch deposits and withdrawals in parallel
        const [depositsResponse, withdrawalsResponse] = await Promise.all([
          fetch('http://localhost:4000/api/v1/transactions/deposits', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': token ? `Bearer ${token}` : '',
            },
          }),
          fetch('http://localhost:4000/api/v1/transactions/withdrawals', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': token ? `Bearer ${token}` : '',
            },
          })
        ]);

        // Check if both requests were successful
        if (!depositsResponse.ok) {
          throw new Error(`Deposits API error! status: ${depositsResponse.status}`);
        }
        if (!withdrawalsResponse.ok) {
          throw new Error(`Withdrawals API error! status: ${withdrawalsResponse.status}`);
        }

        // Parse the responsesz
        const depositsData = await depositsResponse.json();
        const withdrawalsData = await withdrawalsResponse.json();

        // Handle different response structures
        if (depositsData.success) {
          setDeposits(depositsData.deposits || []);
        } else {
          throw new Error(depositsData.message || 'Failed to fetch deposits');
        }

        if (withdrawalsData.success) {
          setWithdrawals(withdrawalsData.withdrawals || []);
        } else {
          throw new Error(withdrawalsData.message || 'Failed to fetch withdrawals');
        }

      } catch (err) {
        setError(err.message);
        console.error('Error fetching transactions:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  // Prepare transactions
  const allTransactions = useMemo(() => {
    const depositTransactions = deposits.map(deposit => ({
      ...deposit,
      type: 'Deposit',
      description: deposit.remarks || 'Deposit',
      amount: deposit.amount,
      debit: null,
      credit: deposit.amount,
      status: deposit.status || 'PENDING',
      transactionId: deposit.depositId || deposit.transactionId || deposit.id,
      createdAt: deposit.createdAt
    }));
    
    const withdrawalTransactions = withdrawals.map(withdrawal => ({
      ...withdrawal,
      type: 'Withdrawal',
      description: withdrawal.remarks || 'Withdrawal',
      amount: withdrawal.amount,
      debit: withdrawal.amount,
      credit: null,
      status: withdrawal.status || 'PENDING',
      transactionId: withdrawal.withdrawalId || withdrawal.transactionId || withdrawal.id,
      createdAt: withdrawal.createdAt
    }));
    
    // Combine and sort by date (newest first)
    return [...depositTransactions, ...withdrawalTransactions].sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
  }, [deposits, withdrawals]);

  // Filter transactions based on search term
  const filteredTransactions = useMemo(() => {
    if (!searchTerm) return allTransactions;
    
    const lowerCaseSearch = searchTerm.toLowerCase();
    return allTransactions.filter(transaction => 
      transaction.transactionId?.toLowerCase().includes(lowerCaseSearch) ||
      (transaction.description?.toLowerCase().includes(lowerCaseSearch)) ||
      transaction.amount.toString().includes(searchTerm) ||
      transaction.type.toLowerCase().includes(lowerCaseSearch)
    );
  }, [allTransactions, searchTerm]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;

  // Calculate running balance
  const transactionsWithBalance = useMemo(() => {
    // Clone and sort from oldest to newest for proper balance calculation
    const orderedTransactions = [...filteredTransactions].sort((a, b) => 
      new Date(a.createdAt) - new Date(b.createdAt)
    );
    
    let balance = 0;
    const transactions = orderedTransactions.map(transaction => {
      if (transaction.type === 'Deposit' && transaction.status === 'completed') {
        balance += transaction.amount;
      } else if (transaction.type === 'Withdrawal' && transaction.status === 'completed') {
        balance -= transaction.amount;
      }
      return { ...transaction, balance };
    });
    
    // Return to newest first order for display
    return transactions.reverse();
  }, [filteredTransactions]);

  // Slice the transactions with balance for pagination
  const paginatedTransactions = transactionsWithBalance.slice(startIndex, startIndex + itemsPerPage);

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle page changes
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Handle search
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  // Handle retry
  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    // The useEffect will automatically trigger a refetch
  };

  return (
    <div className="flex flex-col w-full bg-white rounded-lg shadow font-sans text-gray-800">
      {/* Loading state */}
      {isLoading && (
        <div className="p-4 text-center">
          <div className="animate-pulse flex flex-col items-center justify-center p-8">
            <div className="w-12 h-12 bg-gray-300 rounded-full mb-4"></div>
            <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-300 rounded w-1/3"></div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 text-center">
          <div className="p-4 bg-red-50 rounded-lg">
            <p className="text-red-700 font-medium">Error loading transactions</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <button
              onClick={handleRetry}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Content when not loading */}
      {!isLoading && !error && (
        <>
          {/* Header and Search */}
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Transaction Passbook</h2>
            <div className="flex justify-between items-center">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by ID, Description, Amount, or Type"
                  value={searchTerm}
                  onChange={handleSearch}
                  className="p-2 pl-3 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-80 text-gray-700"
                />
                <span className="absolute right-3 top-2.5 text-gray-500">
                  {searchTerm ? (
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  ) : (
                    "🔍"
                  )}
                </span>
              </div>
              <div className="flex gap-4 text-sm text-gray-600">
                <div>Total Deposits: {deposits.length}</div>
                <div>Total Withdrawals: {withdrawals.length}</div>
                <div>Found: {filteredTransactions.length} transactions</div>
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Transaction ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Debit</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Credit</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Balance</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedTransactions.length > 0 ? (
                  paginatedTransactions.map((transaction, index) => (
                    <tr key={transaction.id || index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {formatDate(transaction.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {transaction.transactionId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {transaction.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          transaction.type === 'Deposit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {transaction.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-700">
                        {transaction.debit ? `₹${transaction.debit.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-700">
                        {transaction.credit ? `₹${transaction.credit.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right text-gray-900">
                        ₹{transaction.balance.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          transaction.status?.toLowerCase() === 'completed' ? 'bg-green-100 text-green-800' : 
                          transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {transaction.status?.toUpperCase() || 'UNKNOWN'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-700">
                      {searchTerm ? 'No matching transactions found' : 'No transactions available'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                    currentPage === 1 ? 'bg-gray-100 text-gray-500' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                    currentPage === totalPages ? 'bg-gray-100 text-gray-500' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(startIndex + itemsPerPage, filteredTransactions.length)}
                    </span>{' '}
                    of <span className="font-medium">{filteredTransactions.length}</span> transactions
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => goToPage(1)}
                      disabled={currentPage === 1}
                      className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                        currentPage === 1 ? 'text-gray-400' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      &laquo;
                    </button>
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium ${
                        currentPage === 1 ? 'text-gray-400' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      &lsaquo;
                    </button>
                    
                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => goToPage(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === pageNum
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-700'
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium ${
                        currentPage === totalPages ? 'text-gray-400' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      &rsaquo;
                    </button>
                    <button
                      onClick={() => goToPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                        currentPage === totalPages ? 'text-gray-400' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      &raquo;
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}