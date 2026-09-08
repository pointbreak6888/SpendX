"use client";

import AuthGuard from "@/components/AuthGuard";
import LiquidGlassNavbar from "@/components/ui/liquidglassnavbar";
import TopHeader from "@/components/ui/topheader";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  Search,
  SlidersHorizontal,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Trash2,
  Loader2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
  Pencil,
  Download,
} from "lucide-react";

import {
  addTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactions,
  type TransactionInput,
} from "@/lib/transactions";

type Transaction = {
  id: string;
  user_id: string;
  amount: number | string;
  type: "income" | "expense";
  category: string;
  transaction_mode: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
};

type FilterType = "all" | "income" | "expense";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getTodayISODate() {
  return new Date().toISOString().split("T")[0];
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function toTransactionDateKey(dateString: string) {
  const datePart = dateString.split("T")[0];

  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return datePart;
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return toISODate(date);
}

function getCalendarDays(currentMonth: Date) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startPadding = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const days: Array<Date | null> = [];

  for (let i = 0; i < startPadding; i++) {
    days.push(null);
  }

  for (let day = 1; day <= totalDays; day++) {
    days.push(new Date(year, month, day));
  }

  return days;
}

function isLoginError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.toLowerCase().includes("log in")
  );
}

function calculateExpenseAmount(input: string): number {
  const cleanedInput = input
    .toLowerCase()
    .replace(/×/g, "*")
    .replace(/x/g, "*")
    .replace(/\s/g, "");

  if (!cleanedInput) {
    throw new Error("Enter a valid expense amount greater than 0.");
  }

  const isValidExpression = /^[0-9+\-*/.()]+$/.test(cleanedInput);

  if (!isValidExpression) {
    throw new Error("Enter a valid expense amount. Example: 30x5");
  }

  const result = Function(`"use strict"; return (${cleanedInput})`)();

  if (typeof result !== "number" || !Number.isFinite(result) || result <= 0) {
    throw new Error("Enter a valid expense amount greater than 0.");
  }

  return Number(result.toFixed(2));
}

function calculateIncomeAmount(input: string): number {
  const cleanedInput = input.trim();

  if (!cleanedInput) {
    throw new Error("Enter a valid income amount greater than 0.");
  }

  const isValidIncome = /^[0-9]+(\.[0-9]+)?$/.test(cleanedInput);

  if (!isValidIncome) {
    throw new Error("Income amount should be a normal number, like 5000.");
  }

  const result = Number(cleanedInput);

  if (!Number.isFinite(result) || result <= 0) {
    throw new Error("Enter a valid income amount greater than 0.");
  }

  return Number(result.toFixed(2));
}

export default function Transactions() {
  const router = useRouter();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState("");
  const [transactionMode, setTransactionMode] = useState("UPI");
  const [transactionDate, setTransactionDate] = useState(getTodayISODate());

  const [filterType, setFilterType] = useState<FilterType>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  const calculatedExpensePreview = useMemo(() => {
    if (type !== "expense" || !amount.trim()) {
      return null;
    }

    try {
      return calculateExpenseAmount(amount);
    } catch {
      return null;
    }
  }, [amount, type]);

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const data = await getTransactions();
      setTransactions(data as Transaction[]);
    } catch (error) {
      console.error("Load transactions error:", error);

      if (isLoginError(error)) {
        router.replace("/login");
        return;
      }

      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Something went wrong while loading transactions.");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  async function handleAddTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    let numericAmount: number;

    try {
      if (type === "expense") {
        numericAmount = calculateExpenseAmount(amount);
      } else {
        numericAmount = calculateIncomeAmount(amount);
      }
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Enter a valid amount.");
      }

      return;
    }

    if (!category.trim()) {
      setErrorMessage("Enter a category.");
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");

      const transaction: TransactionInput = {
        amount: numericAmount,
        type,
        category: category.trim(),
        transaction_mode: transactionMode,
        transaction_date: transactionDate,
      };

      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, transaction);
      } else {
        await addTransaction(transaction);
      }

      setAmount("");
      setCategory("");
      setTransactionMode("UPI");
      setTransactionDate(getTodayISODate());
      setType("expense");
      setEditingTransaction(null);

      await loadTransactions();
    } catch (error) {
      console.error("Save transaction error:", error);

      if (isLoginError(error)) {
        router.replace("/login");
        return;
      }

      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Something went wrong while saving the transaction.");
      }
    } finally {
      setSaving(false);
    }
  }

  function handleEditTransaction(tx: Transaction) {
    setEditingTransaction(tx);

    setAmount(String(tx.amount));
    setType(tx.type);
    setCategory(tx.category);
    setTransactionMode(tx.transaction_mode || "UPI");
    setTransactionDate(tx.transaction_date);
    setErrorMessage("");
  }

  async function handleDeleteTransaction(id: string) {
    try {
      setDeletingId(id);
      setErrorMessage("");

      await deleteTransaction(id);

      setTransactions((current) =>
        current.filter((transaction) => transaction.id !== id)
      );
    } catch (error) {
      console.error("Delete transaction error:", error);

      if (isLoginError(error)) {
        router.replace("/login");
        return;
      }

      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Something went wrong while deleting the transaction.");
      }
    } finally {
      setDeletingId(null);
    }
  }

  function handleSelectDate(date: Date) {
    setTransactionDate(toISODate(date));
    setShowCalendar(false);
  }

  function goToPreviousMonth() {
    setCalendarMonth(
      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)
    );
  }

  function goToNextMonth() {
    setCalendarMonth(
      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)
    );
  }

  function resetFilters() {
    setSearchQuery("");
    setFilterType("all");
    setShowFilters(false);
  }

  function handleExportCSV() {
    if (filteredTransactions.length === 0) {
      setErrorMessage("There are no transactions to export.");
      return;
    }

    const headers = [
      "Date",
      "Type",
      "Category",
      "Amount",
      "Transaction Mode",
    ];

    const rows = filteredTransactions.map((transaction) => [
      formatDate(transaction.transaction_date),
      transaction.type,
      transaction.category,
      Number(transaction.amount).toFixed(2),
      transaction.transaction_mode || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `spendx-transactions-${getTodayISODate()}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadTransactions();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadTransactions]);

  const filteredTransactions = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return transactions
      .filter((transaction) => {
        const title =
          transaction.transaction_mode || transaction.category || "";
        const amountText = String(transaction.amount);

        const matchesSearch =
          !query ||
          title.toLowerCase().includes(query) ||
          transaction.category.toLowerCase().includes(query) ||
          transaction.type.toLowerCase().includes(query) ||
          amountText.toLowerCase().includes(query);

        const matchesType =
          filterType === "all" || transaction.type === filterType;

        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        const transactionDateA = new Date(a.transaction_date).getTime();
        const transactionDateB = new Date(b.transaction_date).getTime();

        if (transactionDateB !== transactionDateA) {
          return transactionDateB - transactionDateA;
        }

        const createdAtA = new Date(a.created_at).getTime();
        const createdAtB = new Date(b.created_at).getTime();

        return createdAtB - createdAtA;
      });
  }, [transactions, searchQuery, filterType]);

  const calendarDays = getCalendarDays(calendarMonth);

  const calendarActivity = useMemo(() => {
    return transactions.reduce<
      Record<string, { income: boolean; expense: boolean }>
    >((activity, transaction) => {
      const dateKey = toTransactionDateKey(transaction.transaction_date);

      if (!dateKey) {
        return activity;
      }

      const dateActivity = activity[dateKey] || {
        income: false,
        expense: false,
      };

      dateActivity[transaction.type] = true;
      activity[dateKey] = dateActivity;

      return activity;
    }, {});
  }, [transactions]);

  return (
    <AuthGuard>
      <div className="sx-screen">
        <TopHeader />

        <main className="mx-auto max-w-6xl px-6 pt-36 pb-32">
          <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h1 className="font-mono text-4xl font-bold tracking-tight sx-title">
                Transactions
              </h1>

              <p className="mt-2 sx-muted">
                Add, search, filter, and manage your SpendX ledger.
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-400">
              <span>{errorMessage}</span>

              <button
                type="button"
                onClick={() => setErrorMessage("")}
                className="rounded-full p-1 text-red-400 hover:bg-red-500/10"
                aria-label="Clear error"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <form
            onSubmit={handleAddTransaction}
            className="mb-8 sx-card rounded-3xl p-6"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h3 className="font-mono text-base font-semibold sx-title">
                  {editingTransaction
                    ? "Update Transaction"
                    : "Add Transaction"}
                </h3>

                <p className="mt-1 text-xs sx-muted">
                  {type === "expense"
                    ? "Expense supports calculations like 30x5."
                    : "Income accepts only normal numbers."}
                </p>
              </div>

              <div className="flex rounded-2xl border border-border bg-card/40 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setType("expense");
                    setAmount("");
                    setErrorMessage("");
                  }}
                  className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${type === "expense"
                      ? "bg-red-500/20 text-red-400"
                      : "sx-muted hover:sx-title"
                    }`}
                >
                  Expense
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setType("income");
                    setAmount("");
                    setErrorMessage("");
                  }}
                  className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${type === "income"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "sx-muted hover:sx-title"
                    }`}
                >
                  Income
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
              <div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder={
                    type === "expense"
                      ? "Amount, e.g. 30x5"
                      : "Amount, e.g. 5000"
                  }
                  className="sx-field w-full rounded-2xl px-4 py-3 text-sm placeholder:text-muted-foreground"
                />

                {type === "expense" && amount.trim() && (
                  <p className="mt-2 text-xs sx-muted">
                    Final amount:{" "}
                    <span className="font-semibold text-emerald-400">
                      {calculatedExpensePreview !== null
                        ? formatCurrency(calculatedExpensePreview)
                        : "Invalid"}
                    </span>
                  </p>
                )}
              </div>

              <input
                type="text"
                value={category}
                onChange={(event) => {
                  const value = event.target.value;
                  setCategory(value.charAt(0).toUpperCase() + value.slice(1));
                }}
                placeholder="Category"
                className="sx-field w-full rounded-2xl px-4 py-3 text-sm placeholder:text-muted-foreground"
              />

              <select
                value={transactionMode}
                onChange={(event) => setTransactionMode(event.target.value)}
                className="sx-field w-full rounded-2xl px-4 py-3 text-sm"
              >
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Net Banking">Net Banking</option>
                <option value="Wallet">Wallet</option>
              </select>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCalendar((current) => !current)}
                  className="sx-field flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm"
                >
                  <span>{formatDate(transactionDate)}</span>
                  <CalendarDays size={16} className="sx-muted" />
                </button>

                {showCalendar && (
                  <div className="absolute right-0 top-14 z-40 w-80 sx-card rounded-3xl p-4 shadow-2xl">
                    <div className="mb-4 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={goToPreviousMonth}
                        className="rounded-xl border border-border p-2 sx-muted hover:bg-card/60 hover:sx-title"
                        aria-label="Previous month"
                      >
                        <ChevronLeft size={16} />
                      </button>

                      <p className="font-mono text-sm font-semibold sx-title">
                        {calendarMonth.toLocaleDateString("en-IN", {
                          month: "long",
                          year: "numeric",
                        })}
                      </p>

                      <button
                        type="button"
                        onClick={goToNextMonth}
                        className="rounded-xl border border-border p-2 sx-muted hover:bg-card/60 hover:sx-title"
                        aria-label="Next month"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>

                    <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold sx-muted">
                      <span>Sun</span>
                      <span>Mon</span>
                      <span>Tue</span>
                      <span>Wed</span>
                      <span>Thu</span>
                      <span>Fri</span>
                      <span>Sat</span>
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {calendarDays.map((date, index) => {
                        if (!date) {
                          return <div key={`empty-${index}`} />;
                        }

                        const isoDate = toISODate(date);
                        const selected = isoDate === transactionDate;
                        const today = isoDate === getTodayISODate();
                        const activity = calendarActivity[isoDate];

                        return (
                          <button
                            key={isoDate}
                            type="button"
                            onClick={() => handleSelectDate(date)}
                            className={`flex h-10 flex-col items-center justify-center rounded-xl text-sm transition-colors ${selected
                                ? "bg-emerald-500 font-bold text-black"
                                : today
                                  ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                  : "sx-muted hover:bg-card/60 hover:sx-title"
                              }`}
                          >
                            <span className="leading-none">
                              {date.getDate()}
                            </span>

                            <span className="mt-1 flex h-1.5 items-center justify-center gap-1">
                              {activity?.expense && (
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                              )}

                              {activity?.income && (
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving
                  </>
                ) : editingTransaction ? (
                  <>
                    <Pencil size={16} />
                    Update
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Add
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mb-8 flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 sx-muted"
              />

              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search mode, category, type, amount..."
                className="sx-field w-full py-3 pl-11 pr-4 text-sm placeholder:text-muted-foreground"
              />
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowFilters((current) => !current)}
                className="flex items-center gap-2 rounded-2xl border border-border bg-card/40 px-5 py-3 text-sm font-semibold sx-muted transition-colors hover:bg-card/60"
              >
                <SlidersHorizontal size={16} />
                <span>Filters</span>
              </button>

              {showFilters && (
                <div className="absolute right-0 top-14 z-30 w-56 sx-card rounded-3xl p-3 shadow-2xl">
                  <button
                    type="button"
                    onClick={() => setFilterType("all")}
                    className={`w-full rounded-2xl px-4 py-3 text-left text-sm transition-colors ${filterType === "all"
                        ? "bg-card/60 sx-title"
                        : "sx-muted hover:bg-card/40 hover:sx-title"
                      }`}
                  >
                    All transactions
                  </button>

                  <button
                    type="button"
                    onClick={() => setFilterType("income")}
                    className={`w-full rounded-2xl px-4 py-3 text-left text-sm transition-colors ${filterType === "income"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "sx-muted hover:bg-card/40 hover:sx-title"
                      }`}
                  >
                    Income only
                  </button>

                  <button
                    type="button"
                    onClick={() => setFilterType("expense")}
                    className={`w-full rounded-2xl px-4 py-3 text-left text-sm transition-colors ${filterType === "expense"
                        ? "bg-red-500/15 text-red-400"
                        : "sx-muted hover:bg-card/40 hover:sx-title"
                      }`}
                  >
                    Expenses only
                  </button>

                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-2 w-full rounded-2xl border border-border px-4 py-3 text-left text-sm sx-muted transition-colors hover:bg-card/40 hover:sx-title"
                  >
                    Reset filters
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filteredTransactions.length === 0 || loading}
              className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card/40 px-5 py-3 text-sm font-semibold sx-muted transition-colors hover:bg-card/60 hover:sx-title disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>

          <div className="sx-card overflow-hidden rounded-3xl shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/60 p-6">
              <h3 className="font-mono text-base font-semibold sx-title">
                History Log
              </h3>

              <span className="font-mono text-xs sx-muted">
                {filteredTransactions.length} ledger entries
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 sx-muted">
                <Loader2 size={20} className="mr-2 animate-spin" />
                Loading transactions...
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-sm sx-muted">
                  No transactions found. Add your first income or expense above.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {filteredTransactions.map((tx) => {
                  const isIncome = tx.type === "income";
                  const amountNumber = Number(tx.amount);
                  const title = tx.category || "Transaction";

                  return (
                    <div
                      key={tx.id}
                      className="flex flex-col justify-between gap-4 p-5 transition-all duration-200 hover:bg-card/30 sm:flex-row sm:items-center"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-2xl border text-lg ${isIncome
                              ? "border-emerald-500/10 bg-emerald-500/10 text-emerald-500"
                              : "border-red-500/10 bg-red-500/10 text-red-500"
                            }`}
                        >
                          {isIncome ? (
                            <ArrowDownLeft size={20} />
                          ) : (
                            <ArrowUpRight size={20} />
                          )}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-bold sx-title">
                              {title}
                            </h4>

                            {tx.transaction_mode && (
                              <span className="flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
                                {tx.transaction_mode}
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-xs sx-muted">
                            {formatDate(tx.transaction_date)} • via SpendX
                            Ledger
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-6 sm:justify-end">
                        <div className="sm:text-right">
                          <p
                            className={`font-mono text-base font-bold ${isIncome
                                ? "text-emerald-500"
                                : "text-red-500"
                              }`}
                          >
                            {isIncome ? "+" : "-"}
                            {formatCurrency(amountNumber)}
                          </p>

                          <span className="text-[10px] sx-muted">
                            Settled
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditTransaction(tx)}
                            className="rounded-xl border border-border p-2 sx-muted transition-colors hover:border-emerald-500/20 hover:bg-emerald-500/10 hover:text-emerald-400"
                            aria-label="Edit transaction"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteTransaction(tx.id)}
                            disabled={deletingId === tx.id}
                            className="rounded-xl border border-border p-2 sx-muted transition-colors hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                            aria-label="Delete transaction"
                          >
                            {deletingId === tx.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        <LiquidGlassNavbar />
      </div>
    </AuthGuard>
  );
}