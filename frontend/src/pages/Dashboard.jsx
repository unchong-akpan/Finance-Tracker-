import { useState, useEffect } from 'react';
import { format, startOfMonth } from 'date-fns';
import { stats, transactions as transactionsApi } from '../api';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const EXPENSE_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6',
];

export default function Dashboard() {
  const [summary, setSummary] = useState({ income: 0, expenses: 0, balance: 0 });
  const [categoryData, setCategoryData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const currentMonth = format(new Date(), 'yyyy-MM');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [summaryRes, categoryRes, monthlyRes, recentRes] = await Promise.all([
        stats.getSummary({ month: currentMonth }),
        stats.getByCategory({ month: currentMonth, type: 'expense' }),
        stats.getMonthly(),
        stats.getRecent({ limit: 5 }),
      ]);
      setSummary(summaryRes.data);
      setCategoryData(categoryRes.data);
      setMonthlyData(monthlyRes.data);
      setRecentTransactions(recentRes.data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const doughnutData = {
    labels: categoryData.map((c) => c.category),
    datasets: [
      {
        data: categoryData.map((c) => c.total),
        backgroundColor: EXPENSE_COLORS.slice(0, categoryData.length),
        borderWidth: 0,
      },
    ],
  };

  const barData = {
    labels: monthlyData.map((m) => m.month),
    datasets: [
      {
        label: 'Income',
        data: monthlyData.map((m) => m.income),
        backgroundColor: '#22c55e',
      },
      {
        label: 'Expenses',
        data: monthlyData.map((m) => m.expenses),
        backgroundColor: '#ef4444',
      },
    ],
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <p className="text-sm font-medium text-gray-500">Total Income</p>
          <p className="text-3xl font-bold text-green-600 mt-1">
            ${summary.income.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <p className="text-sm font-medium text-gray-500">Total Expenses</p>
          <p className="text-3xl font-bold text-red-600 mt-1">
            ${summary.expenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <p className="text-sm font-medium text-gray-500">Balance</p>
          <p className={`text-3xl font-bold mt-1 ${summary.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${summary.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Overview</h3>
          {monthlyData.length > 0 ? (
            <Bar data={barData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
          ) : (
            <p className="text-gray-500 text-center py-8">No data yet</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending by Category</h3>
          {categoryData.length > 0 ? (
            <div className="max-w-xs mx-auto">
              <Doughnut data={doughnutData} options={{ plugins: { legend: { position: 'bottom' } } }} />
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No expenses this month</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
        {recentTransactions.length > 0 ? (
          <div className="space-y-3">
            {recentTransactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium text-gray-900">{t.description || t.category}</p>
                  <p className="text-sm text-gray-500">{t.category} &middot; {t.date}</p>
                </div>
                <p className={`font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No transactions yet</p>
        )}
      </div>
    </div>
  );
}
