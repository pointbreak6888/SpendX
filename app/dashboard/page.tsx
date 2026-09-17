"use client";

import AuthGuard from "@/components/AuthGuard";
import TopHeader from "@/components/ui/topheader";
import LiquidGlassNavbar from "@/components/ui/liquidglassnavbar";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/formatCurrency";
import type { CurrencyCode } from "@/lib/currencies";
import { useEffect, useMemo, useState } from "react";
import {
  Wallet,
  CreditCard,
  TrendingUp,
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  Brain,
  Target,
  CalendarDays,
  Sparkles,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  Database,
} from "lucide-react";

type Transaction = {
  id: string;
  user_id?: string;
  amount: number | string;
  type: "income" | "expense";
  category: string;
  note?: string | null;
  transaction_date?: string | null;
  created_at?: string | null;
};

type SpendXStatusType =
  | "loading"
  | "active"
  | "offline"
  | "session"
  | "database"
  | "empty";

function formatDate(dateString?: string | null) {
  if (!dateString) return "No date";

  const date = parseTransactionDate(dateString);

  if (Number.isNaN(date.getTime())) {
    return "No date";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function parseTransactionDate(dateString?: string | null) {
  if (!dateString) return new Date("");

  if (dateString.includes("T")) {
    return new Date(dateString);
  }

  return new Date(`${dateString}T00:00:00`);
}

function isSameMonth(date: Date, target: Date) {
  return (
    date.getFullYear() === target.getFullYear() &&
    date.getMonth() === target.getMonth()
  );
}

function getPreviousMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}

function getDaysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function getSafeCategory(category?: string | null) {
  if (!category || category.trim() === "") return "Uncategorized";

  return category.trim();
}

export default function DashboardPage() {
  const [displayName, setDisplayName] = useState("User");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currency, setCurrency] = useState<CurrencyCode>("INR");
  const [loading, setLoading] = useState(true);
  const [dashboardStatus, setDashboardStatus] =
    useState<SpendXStatusType>("loading");

  useEffect(() => {
    const handleOnline = () => {
      loadDashboardData();
    };

    const handleOffline = () => {
      setDashboardStatus("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);
      setDashboardStatus("loading");

      if (!navigator.onLine) {
        setDashboardStatus("offline");
        setTransactions([]);
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setDashboardStatus("session");
        setTransactions([]);
        return;
      }

      const { data: profileSettings, error: profileError } = await supabase
        .from("profiles")
        .select("currency")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Dashboard currency error:", profileError);
      } else {
        setCurrency(
          (profileSettings?.currency as CurrencyCode) || "INR"
        );
      }

      const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "User";

      setDisplayName(name);

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("transaction_date", { ascending: false });

      if (error) {
        console.error("Dashboard transactions error:", error);
        setDashboardStatus("database");
        setTransactions([]);
        return;
      }

      const fetchedTransactions = (data || []) as Transaction[];

      setTransactions(fetchedTransactions);

      if (fetchedTransactions.length === 0) {
        setDashboardStatus("empty");
      } else {
        setDashboardStatus("active");
      }
    } catch (error) {
      console.error("Dashboard load error:", error);
      setDashboardStatus("database");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  const dashboardData = useMemo(() => {
    const today = new Date();
    const previousMonth = getPreviousMonth(today);
    const daysInCurrentMonth = getDaysInMonth(today);
    const currentDayOfMonth = today.getDate();

    const currentMonthTransactions = transactions.filter((transaction) => {
      const date = parseTransactionDate(
        transaction.transaction_date || transaction.created_at
      );

      return !Number.isNaN(date.getTime()) && isSameMonth(date, today);
    });

    const previousMonthTransactions = transactions.filter((transaction) => {
      const date = parseTransactionDate(
        transaction.transaction_date || transaction.created_at
      );

      return !Number.isNaN(date.getTime()) && isSameMonth(date, previousMonth);
    });

    const currentMonthIncome = currentMonthTransactions
      .filter((transaction) => transaction.type === "income")
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

    const currentMonthExpenses = currentMonthTransactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

    const previousMonthIncome = previousMonthTransactions
      .filter((transaction) => transaction.type === "income")
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

    const previousMonthExpenses = previousMonthTransactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

    const currentMonthSavings = currentMonthIncome - currentMonthExpenses;

    const categoryTotals: Record<string, number> = {};

    currentMonthTransactions
      .filter((transaction) => transaction.type === "expense")
      .forEach((transaction) => {
        const category = getSafeCategory(transaction.category);
        const amount = Number(transaction.amount || 0);

        categoryTotals[category] = (categoryTotals[category] || 0) + amount;
      });

    const categoryEntries = Object.entries(categoryTotals).sort(
      (a, b) => b[1] - a[1]
    );

    const highestCategory = categoryEntries[0]?.[0] || "No expenses yet";
    const highestCategoryAmount = categoryEntries[0]?.[1] || 0;

    const dailyAverageExpense =
      currentDayOfMonth > 0 ? currentMonthExpenses / currentDayOfMonth : 0;

    const projectedMonthlyExpense = dailyAverageExpense * daysInCurrentMonth;

    const expenseChangePercent =
      previousMonthExpenses > 0
        ? ((currentMonthExpenses - previousMonthExpenses) /
          previousMonthExpenses) *
        100
        : null;

    const incomeChangePercent =
      previousMonthIncome > 0
        ? ((currentMonthIncome - previousMonthIncome) / previousMonthIncome) *
        100
        : null;

    const recentTransactions = [...transactions]
      .sort((a, b) => {
        const dateA = parseTransactionDate(a.transaction_date || a.created_at);
        const dateB = parseTransactionDate(b.transaction_date || b.created_at);

        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 4);

    const insights: {
      icon: "brain" | "target" | "calendar" | "sparkles";
      title: string;
      value: string;
      description: string;
    }[] = [];

    if (expenseChangePercent !== null) {
      const roundedChange = Math.abs(expenseChangePercent).toFixed(0);

      insights.push({
        icon: "brain",
        title: "Monthly Spend Trend",
        value:
          expenseChangePercent > 0
            ? `${roundedChange}% higher`
            : `${roundedChange}% lower`,
        description:
          expenseChangePercent > 0
            ? "You have spent more than last month so far."
            : "You are spending less than last month so far.",
      });
    } else {
      insights.push({
        icon: "brain",
        title: "Monthly Spend Trend",
        value: "Tracking started",
        description: "Add last month’s transactions to compare spending trends.",
      });
    }

    insights.push({
      icon: "target",
      title: "Biggest Expense",
      value: highestCategory,
      description:
        highestCategoryAmount > 0
          ? `${formatCurrency(
            highestCategoryAmount,
            currency
          )} spent on ${highestCategory} this month.`
          : "Add expenses to find your biggest spending category.",
    });

    insights.push({
      icon: "calendar",
      title: "Projected Expense",
      value: formatCurrency(projectedMonthlyExpense, currency),
      description:
        currentMonthExpenses > 0
          ? "Estimated full-month expense based on your current daily average."
          : "No expense projection yet because there are no expenses this month.",
    });

    insights.push({
      icon: "sparkles",
      title: "Net Savings",
      value: formatCurrency(currentMonthSavings, currency),
      description:
        currentMonthSavings >= 0
          ? "Your income is currently higher than your expenses this month."
          : "Your expenses are currently higher than your income this month.",
    });

    return {
      currentMonthIncome,
      currentMonthExpenses,
      currentMonthSavings,
      previousMonthIncome,
      previousMonthExpenses,
      projectedMonthlyExpense,
      dailyAverageExpense,
      highestCategory,
      highestCategoryAmount,
      expenseChangePercent,
      incomeChangePercent,
      currentMonthTransactions,
      recentTransactions,
      insights,
    };
  }, [transactions, currency]);

  const statCards = [
    {
      title: "This Month Income",
      value: dashboardData.currentMonthIncome,
      icon: Wallet,
      badge: "Income",
      badgeClass:
        "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
    },
    {
      title: "This Month Spends",
      value: dashboardData.currentMonthExpenses,
      icon: CreditCard,
      badge: "Live data",
      badgeClass: "border-red-500/20 bg-red-500/10 text-red-300",
    },
    {
      title: "Net Savings",
      value: dashboardData.currentMonthSavings,
      icon: TrendingUp,
      badge: dashboardData.currentMonthSavings >= 0 ? "Saved" : "Overspent",
      badgeClass:
        dashboardData.currentMonthSavings >= 0
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
          : "border-red-500/20 bg-red-500/10 text-red-300",
    },
  ];

  const spendXStatusConfig = {
    loading: {
      label: "Syncing SpendX",
      icon: Loader2,
      className: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
      iconClassName: "animate-spin text-cyan-400",
    },
    active: {
      label: "SpendX Active",
      icon: CheckCircle2,
      className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
      iconClassName: "text-emerald-400",
    },
    offline: {
      label: "Offline",
      icon: WifiOff,
      className: "border-red-500/20 bg-red-500/10 text-red-300",
      iconClassName: "text-red-400",
    },
    session: {
      label: "Session issue",
      icon: AlertTriangle,
      className: "border-amber-500/20 bg-amber-500/10 text-amber-300",
      iconClassName: "text-amber-400",
    },
    database: {
      label: "Database issue",
      icon: Database,
      className: "border-red-500/20 bg-red-500/10 text-red-300",
      iconClassName: "text-red-400",
    },
    empty: {
      label: "No data yet",
      icon: Activity,
      className: "border-zinc-500/20 bg-white/[0.04] text-zinc-300",
      iconClassName: "text-zinc-400",
    },
  };

  const currentSpendXStatus = spendXStatusConfig[dashboardStatus];
  const SpendXStatusIcon = currentSpendXStatus.icon;

  function renderInsightIcon(icon: "brain" | "target" | "calendar" | "sparkles") {
    if (icon === "brain") return <Brain size={19} />;
    if (icon === "target") return <Target size={19} />;
    if (icon === "calendar") return <CalendarDays size={19} />;
    return <Sparkles size={19} />;
  }

  return (
    <AuthGuard>
      <div className="sx-screen">
        <TopHeader />

        <main className="mx-auto max-w-7xl px-4 pb-28 pt-28 sm:px-6 sm:pb-32 sm:pt-36">
          <div className="mb-7 flex flex-col justify-between gap-4 sm:mb-10 lg:flex-row lg:items-start">
            <div>
              <h1 className="font-mono text-4xl font-bold tracking-tight sx-title sm:text-5xl">
                Dashboard
              </h1>

              <p className="mt-3 max-w-xl text-base leading-7 sx-muted sm:text-lg">
                Welcome back to your financial control center.
              </p>
            </div>

            <div
              className={`flex w-fit items-center gap-2 rounded-full border px-4 py-2.5 text-sm shadow-sm backdrop-blur-xl transition-all duration-300 sm:px-5 sm:py-3 ${currentSpendXStatus.className}`}
            >
              <SpendXStatusIcon
                size={17}
                className={currentSpendXStatus.iconClassName}
              />
              <span>{currentSpendXStatus.label}</span>
            </div>
          </div>

          <div className="sx-chip mb-6 inline-flex max-w-full items-center gap-2 rounded-full px-4 py-2.5 text-sm sm:mb-8 sm:px-5 sm:py-3">
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin text-muted-foreground" />
                <span>Loading your dashboard</span>
              </>
            ) : (
              <span>Welcome back, {displayName}</span>
            )}
          </div>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
            {statCards.map((card) => {
              const Icon = card.icon;

              return (
                <div
                  key={card.title}
                  className="sx-card rounded-2xl p-5 sm:p-7"
                >
                  <div className="mb-6 flex items-start justify-between gap-4 sm:mb-7">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted/70 text-muted-foreground">
                      <Icon size={22} />
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${card.badgeClass}`}
                    >
                      {card.badge}
                    </span>
                  </div>

                  <p className="font-mono text-sm sx-muted">
                    {card.title}
                  </p>

                  <h2 className="mt-2 break-words font-mono text-[2rem] font-bold leading-tight tracking-tight sx-title sm:text-4xl">
                    {formatCurrency(card.value, currency)}
                  </h2>
                </div>
              );
            })}
          </section>

          <section className="sx-card mt-6 rounded-2xl p-5 sm:mt-8 sm:p-7">
            <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-mono text-xl font-bold sx-title">
                  Smart Insights
                </h3>

                <p className="mt-1 text-sm sx-muted">
                  Dynamic insights calculated from this month’s transactions.
                </p>
              </div>

              <span className="w-fit rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                Real-time
              </span>
            </div>

            {loading ? (
              <div className="sx-panel flex items-center justify-center rounded-xl py-12 sx-muted">
                <Loader2 size={18} className="mr-2 animate-spin" />
                Building insights...
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {dashboardData.insights.map((insight) => (
                  <div
                    key={insight.title}
                    className="sx-panel rounded-xl p-5"
                  >
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                      {renderInsightIcon(insight.icon)}
                    </div>

                    <p className="text-sm sx-muted">{insight.title}</p>

                    <h4 className="mt-2 break-words font-mono text-2xl font-bold sx-title">
                      {insight.value}
                    </h4>

                    <p className="mt-3 text-sm leading-6 sx-muted">
                      {insight.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-6 grid grid-cols-1 gap-6 sm:mt-8 lg:grid-cols-[1.5fr_1fr] lg:gap-8">
            <div className="sx-card rounded-2xl p-5 sm:p-7">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="font-mono text-xl font-bold sx-title">
                  Recent Activity
                </h3>

                <span className="text-sm sx-muted">
                  {transactions.length} entries
                </span>
              </div>

              {loading ? (
                <div className="sx-panel flex items-center justify-center rounded-xl py-12 sx-muted">
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Loading activity...
                </div>
              ) : dashboardData.recentTransactions.length === 0 ? (
                <div className="sx-panel rounded-xl px-6 py-10 text-center text-sm sx-muted">
                  No transactions yet. Add your first income or expense to see
                  it here.
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboardData.recentTransactions.map((transaction) => {
                    const isIncome = transaction.type === "income";
                    const amount = Number(transaction.amount || 0);

                    return (
                      <div
                        key={transaction.id}
                        className="sx-panel flex flex-col gap-4 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${isIncome
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                              : "border-red-500/20 bg-red-500/10 text-red-300"
                              }`}
                          >
                            {isIncome ? (
                              <ArrowDownLeft size={19} />
                            ) : (
                              <ArrowUpRight size={19} />
                            )}
                          </div>

                          <div>
                            <p className="text-sm font-semibold sx-title">
                              {transaction.note ||
                                transaction.category ||
                                "Transaction"}
                            </p>

                            <p className="mt-1 text-xs sx-muted">
                              {getSafeCategory(transaction.category)} •{" "}
                              {formatDate(
                                transaction.transaction_date ||
                                transaction.created_at
                              )}
                            </p>
                          </div>
                        </div>

                        <p
                          className={`font-mono text-sm font-bold ${isIncome ? "text-emerald-400" : "text-red-300"
                            }`}
                        >
                          {isIncome ? "+" : "-"}
                          {formatCurrency(amount, currency)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="sx-card rounded-2xl p-5 sm:p-7">
              <h3 className="font-mono text-xl font-bold sx-title">
                Cashflow Summary
              </h3>

              <p className="mt-1 text-sm sx-muted">
                Based on current month activity.
              </p>

              <div className="mt-7 space-y-5">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="sx-muted">Income</span>
                    <span className="font-mono text-emerald-400">
                      {formatCurrency(dashboardData.currentMonthIncome, currency)}
                    </span>
                  </div>

                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 w-full rounded-full bg-emerald-500" />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="sx-muted">Expenses</span>
                    <span className="font-mono text-red-300">
                      {formatCurrency(dashboardData.currentMonthExpenses, currency)}
                    </span>
                  </div>

                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-red-500"
                      style={{
                        width:
                          dashboardData.currentMonthIncome > 0
                            ? `${Math.min(
                              (dashboardData.currentMonthExpenses /
                                dashboardData.currentMonthIncome) *
                              100,
                              100
                            )}%`
                            : dashboardData.currentMonthExpenses > 0
                              ? "100%"
                              : "0%",
                      }}
                    />
                  </div>
                </div>

                <div className="sx-panel rounded-xl p-5">
                  <p className="text-sm sx-muted">Net Cashflow</p>

                  <p
                    className={`mt-2 break-words font-mono text-3xl font-bold ${dashboardData.currentMonthSavings >= 0
                      ? "text-emerald-400"
                      : "text-red-300"
                      }`}
                  >
                    {formatCurrency(dashboardData.currentMonthSavings, currency)}
                  </p>

                  <p className="mt-3 text-sm sx-muted">
                    {dashboardData.currentMonthSavings >= 0
                      ? "Your current month cashflow is positive."
                      : "Your current month cashflow is negative."}
                  </p>
                </div>

                <div className="sx-panel rounded-xl p-5">
                  <p className="text-sm sx-muted">
                    Highest Spending Category
                  </p>

                  <p className="mt-2 break-words font-mono text-2xl font-bold sx-title">
                    {dashboardData.highestCategory}
                  </p>

                  <p className="mt-3 text-sm sx-muted">
                    {dashboardData.highestCategoryAmount > 0
                      ? `${formatCurrency(
                        dashboardData.highestCategoryAmount,
                        currency
                      )} spent this month.`
                      : "No expense category data available yet."}
                  </p>
                </div>

                <div className="sx-panel rounded-xl p-5">
                  <p className="text-sm sx-muted">
                    Full Month Expense Projection
                  </p>

                  <p className="mt-2 break-words font-mono text-2xl font-bold sx-title">
                    {formatCurrency(dashboardData.projectedMonthlyExpense, currency)}
                  </p>

                  <p className="mt-3 text-sm sx-muted">
                    Daily average expense:{" "}
                    {formatCurrency(dashboardData.dailyAverageExpense, currency)}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>

        <LiquidGlassNavbar />
      </div>
    </AuthGuard>
  );
}
