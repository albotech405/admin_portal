import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Card, Table, Button } from '../components'
import {
  supabaseService,
  WalletTransaction,
} from '../services/supabaseService'

export const WalletView: React.FC = () => {
  const { driverId } = useParams<{ driverId: string }>()
  const [balance, setBalance] = useState<number>(0)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (driverId) {
      loadWalletData()
    }
  }, [driverId])

  const loadWalletData = async () => {
    if (!driverId) return

    try {
      setIsLoading(true)
      const [balanceData, txData] = await Promise.all([
        supabaseService.getWalletBalance(driverId),
        supabaseService.getWalletTransactions(driverId),
      ])
      setBalance(balanceData)
      setTransactions(txData)
      setError(null)
    } catch (err) {
      setError('Failed to load wallet data')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const tableColumns = [
    { key: 'type', label: 'Type', width: 'w-20' },
    { key: 'amount', label: 'Amount', width: 'w-24' },
    { key: 'description', label: 'Description' },
    { key: 'created_at', label: 'Date', width: 'w-32' },
  ]

  const tableData = transactions.map((tx: WalletTransaction) => ({
    ...tx,
    amount: `${tx.type === 'credit' ? '+' : '-'}${tx.amount.toLocaleString()} CDF`,
    type: tx.type.charAt(0).toUpperCase() + tx.type.slice(1),
    created_at: new Date(tx.created_at).toLocaleDateString(),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-brand-950">Driver Wallet</h1>
          <p className="text-brand-600 mt-2">Driver ID: {driverId}</p>
        </div>
        <Button variant="secondary" onClick={loadWalletData}>
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Balance Card */}
      <Card>
        <div>
          <p className="text-brand-500 text-lg">Current Balance</p>
          <p className="text-5xl font-bold text-green-600">{balance.toLocaleString()} CDF</p>
          <p className="text-brand-400 text-sm mt-2">
            Last updated: {new Date().toLocaleString()}
          </p>
        </div>
      </Card>

      {/* Transaction History */}
      <Card>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-brand-950">Transaction History</h2>
          <p className="text-brand-500 text-sm">
            {transactions.length} transactions found
          </p>
        </div>
        <Table columns={tableColumns} data={tableData} isLoading={isLoading} />
      </Card>
    </div>
  )
}
