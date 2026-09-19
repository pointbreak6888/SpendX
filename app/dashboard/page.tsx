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

  // Monthly spending limit
  const [monthlyLimit, setMonthlyLimit] = useState<number | null>(null);

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

      // Load user's currency
      const { data: profileSettings, error: profileError } =
        await supabase
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

      // Load user's monthly spending limit
      const {
        data: spendingLimitSettings,
        error: spendingLimitError,
      } = await supabase
        .from("monthly_spending_limits")
        .select("monthly_limit")
        .eq("user_id", user.id)
        .maybeSingle();

      if (spendingLimitError) {
        console.error(
          "Dashboard spending limit error:",
          spendingLimitError
        );

        setMonthlyLimit(null);
      } else {
        setMonthlyLimit(
          spendingLimitSettings?.monthly_limit != null
            ? Number(spendingLimitSettings.monthly_limit)
            : null
        );
      }

      const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "User";

      setDisplayName(name);

      // Load transactions
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

      return (
        !Number.isNaN(date.getTime()) &&
        isSameMonth(date, today)
      );
    });

    const previousMonthTransactions = transactions.filter((transaction) => {
      const date = parseTransactionDate(
        transaction.transaction_date || transaction.created_at
      );

      return (
        !Number.isNaN(date.getTime()) &&
        isSameMonth(date, previousMonth)
      );
    });

    const currentMonthIncome = currentMonthTransactions
      .filter((transaction) => transaction.type === "income")
      .reduce(
        (sum, transaction) =>
          sum + Number(transaction.amount || 0),
        0
      );

    const currentMonthExpenses = currentMonthTransactions
      .filter((transaction) => transaction.type === "expense")
      .reduce(
        (sum, transaction) =>
          sum + Number(transaction.amount || 0),
        0
      );

    const previousMonthIncome = previousMonthTransactions
      .filter((transaction) => transaction.type === "income")
      .reduce(
        (sum, transaction) =>
          sum + Number(transaction.amount || 0),
        0
      );

    const previousMonthExpenses = previousMonthTransactions
      .filter((transaction) => transaction.type === "expense")
      .reduce(
        (sum, transaction) =>
          sum + Number(transaction.amount || 0),
        0
      );

    const currentMonthSavings =
      currentMonthIncome - currentMonthExpenses;

    // =========================================================
    // MONTHLY SPENDING LIMIT
    // =========================================================

    const spendingLimitPercentage =
      monthlyLimit !== null && monthlyLimit > 0
        ? (currentMonthExpenses / monthlyLimit) * 100
        : 0;

    // Progress bar cannot visually exceed 100%
    const spendingLimitProgress = Math.min(
      spendingLimitPercentage,
      100
    );

    const remainingSpendingLimit =
      monthlyLimit !== null
        ? monthlyLimit - currentMonthExpenses
        : null;

    // 100% or more
    const spendingLimitExceeded =
      monthlyLimit !== null &&
      currentMonthExpenses >= monthlyLimit;

    // 90% - 99%
    const spendingLimitCritical =
      monthlyLimit !== null &&
      currentMonthExpenses >= monthlyLimit * 0.9 &&
      currentMonthExpenses < monthlyLimit;

    // 70% - 89%
    const spendingLimitApproaching =
      monthlyLimit !== null &&
      currentMonthExpenses >= monthlyLimit * 0.7 &&
      currentMonthExpenses < monthlyLimit * 0.9;

    // 0% - 69%
    const spendingLimitSafe =
      monthlyLimit !== null &&
      currentMonthExpenses < monthlyLimit * 0.7;

    const categoryTotals: Record<string, number> = {};

    currentMonthTransactions
      .filter((transaction) => transaction.type === "expense")
      .forEach((transaction) => {
        const category = getSafeCategory(transaction.category);
        const amount = Number(transaction.amount || 0);

        categoryTotals[category] =
          (categoryTotals[category] || 0) + amount;
      });

    const categoryEntries = Object.entries(categoryTotals).sort(
      (a, b) => b[1] - a[1]
    );

    const highestCategory =
      categoryEntries[0]?.[0] || "No expenses yet";

    const highestCategoryAmount =
      categoryEntries[0]?.[1] || 0;

    const dailyAverageExpense =
      currentDayOfMonth > 0
        ? currentMonthExpenses / currentDayOfMonth
        : 0;

    const projectedMonthlyExpense =
      dailyAverageExpense * daysInCurrentMonth;

    const expenseChangePercent =
      previousMonthExpenses > 0
        ? ((currentMonthExpenses - previousMonthExpenses) /
          previousMonthExpenses) *
        100
        : null;

    const incomeChangePercent =
      previousMonthIncome > 0
        ? ((currentMonthIncome - previousMonthIncome) /
          previousMonthIncome) *
        100
        : null;

    const recentTransactions = [...transactions]
      .sort((a, b) => {
        const dateA = parseTransactionDate(
          a.transaction_date || a.created_at
        );

        const dateB = parseTransactionDate(
          b.transaction_date || b.created_at
        );

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
      const roundedChange =
        Math.abs(expenseChangePercent).toFixed(0);

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
        description:
          "Add last month’s transactions to compare spending trends.",
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
      value: formatCurrency(
        projectedMonthlyExpense,
        currency
      ),
      description:
        currentMonthExpenses > 0
          ? "Estimated full-month expense based on your current daily average."
          : "No expense projection yet because there are no expenses this month.",
    });

    insights.push({
      icon: "sparkles",
      title: "Net Savings",
      value: formatCurrency(
        currentMonthSavings,
        currency
      ),
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

      // Monthly spending limit data
      spendingLimitPercentage,
      spendingLimitProgress,
      remainingSpendingLimit,
      spendingLimitExceeded,
      spendingLimitCritical,
      spendingLimitApproaching,
      spendingLimitSafe,
    };
  }, [transactions, currency, monthlyLimit]);

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
      badgeClass:
        "border-red-500/20 bg-red-500/10 text-red-300",
    },
    {
      title: "Net Savings",
      value: dashboardData.currentMonthSavings,
      icon: TrendingUp,
      badge:
        dashboardData.currentMonthSavings >= 0
          ? "Saved"
          : "Overspent",
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
      className:
        "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
      iconClassName: "animate-spin text-cyan-400",
    },
    active: {
      label: "SpendX Active",
      icon: CheckCircle2,
      className:
        "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
      iconClassName: "text-emerald-400",
    },
    offline: {
      label: "Offline",
      icon: WifiOff,
      className:
        "border-red-500/20 bg-red-500/10 text-red-300",
      iconClassName: "text-red-400",
    },
    session: {
      label: "Session issue",
      icon: AlertTriangle,
      className:
        "border-amber-500/20 bg-amber-500/10 text-amber-300",
      iconClassName: "text-amber-400",
    },
    database: {
      label: "Database issue",
      icon: Database,
      className:
        "border-red-500/20 bg-red-500/10 text-red-300",
      iconClassName: "text-red-400",
    },
    empty: {
      label: "No data yet",
      icon: Activity,
      className:
        "border-zinc-500/20 bg-white/[0.04] text-zinc-300",
      iconClassName: "text-zinc-400",
    },
  };

  const currentSpendXStatus =
    spendXStatusConfig[dashboardStatus];

  const SpendXStatusIcon = currentSpendXStatus.icon;

  function renderInsightIcon(
    icon: "brain" | "target" | "calendar" | "sparkles"
  ) {
    if (icon === "brain") return <Brain size={19} />;
    if (icon === "target") return <Target size={19} />;
    if (icon === "calendar") {
      return <CalendarDays size={19} />;
    }

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
                className={
                  currentSpendXStatus.iconClassName
                }
              />

              <span>
                {currentSpendXStatus.label}
              </span>
            </div>
          </div>

          <div className="sx-chip mb-6 inline-flex max-w-full items-center gap-2 rounded-full px-4 py-2.5 text-sm sm:mb-8 sm:px-5 sm:py-3">
            {loading ? (
              <>
                <Loader2
                  size={16}
                  className="animate-spin text-muted-foreground"
                />

                <span>Loading your dashboard</span>
              </>
            ) : (
              <span>
                Welcome back, {displayName}
              </span>
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
                    {formatCurrency(
                      card.value,
                      currency
                    )}
                  </h2>
                </div>
              );
            })}
          </section>

          {/* =====================================================
              MONTHLY SPENDING LIMIT
          ====================================================== */}
          <section className="sx-card mt-6 rounded-2xl p-5 sm:mt-8 sm:p-7">
            <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <h3 className="font-mono text-xl font-bold sx-title">
                  Monthly Spending Limit
                </h3>

                <p className="mt-1 text-sm sx-muted">
                  Track your spending against the limit you set in Settings.
                </p>
              </div>

              {monthlyLimit !== null && (
                <span
                  className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${dashboardData.spendingLimitExceeded ||
                      dashboardData.spendingLimitCritical
                      ? "border-red-500/20 bg-red-500/10 text-red-300"
                      : dashboardData.spendingLimitApproaching
                        ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
                        : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                    }`}
                >
                  {dashboardData.spendingLimitExceeded
                    ? "Limit exceeded"
                    : dashboardData.spendingLimitCritical
                      ? "Critical"
                      : dashboardData.spendingLimitApproaching
                        ? "Approaching limit"
                        : "Within limit"}
                </span>
              )}
            </div>

            {monthlyLimit === null ? (
              <div className="sx-panel rounded-xl p-5">
                <p className="font-mono text-base font-semibold sx-title">
                  No monthly spending limit set
                </p>

                <p className="mt-2 text-sm leading-6 sx-muted">
                  Set a monthly spending limit from Settings
                  to start tracking your spending against it.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Spent and Limit */}
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div>
                    <p className="text-sm sx-muted">
                      Spent this month
                    </p>

                    <p className="mt-1 font-mono text-3xl font-bold sx-title">
                      {formatCurrency(
                        dashboardData.currentMonthExpenses,
                        currency
                      )}
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <p className="text-sm sx-muted">
                      Monthly limit
                    </p>

                    <p className="mt-1 font-mono text-xl font-bold sx-title">
                      {formatCurrency(
                        monthlyLimit,
                        currency
                      )}
                    </p>
                  </div>
                </div>

                {/* Percentage + Remaining */}
                <div>
                  <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                    <span className="sx-muted">
                      {dashboardData.spendingLimitPercentage.toFixed(
                        0
                      )}
                      % used
                    </span>

                    <span
                      className={`font-mono font-semibold ${dashboardData.spendingLimitExceeded ||
                          dashboardData.spendingLimitCritical
                          ? "text-red-300"
                          : dashboardData.spendingLimitApproaching
                            ? "text-amber-300"
                            : "text-emerald-400"
                        }`}
                    >
                      {dashboardData.spendingLimitExceeded
                        ? `${formatCurrency(
                          Math.abs(
                            dashboardData.remainingSpendingLimit ??
                            0
                          ),
                          currency
                        )} over`
                        : `${formatCurrency(
                          dashboardData.remainingSpendingLimit ??
                          0,
                          currency
                        )} remaining`}
                    </span>
                  </div>

                  {/* Dynamic Progress Bar */}
                  <div className="h-3 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-3 rounded-full transition-all duration-700 ease-out ${dashboardData.spendingLimitExceeded ||
                          dashboardData.spendingLimitCritical
                          ? "bg-red-500"
                          : dashboardData.spendingLimitApproaching
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                      style={{
                        width: `${dashboardData.spendingLimitProgress}%`,
                      }}
                    />
                  </div>

                  {/* Threshold Labels */}
                  <div className="mt-2 flex justify-between text-[10px] sx-muted">
                    <span>0%</span>
                    <span>70%</span>
                    <span>90%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Dynamic Status Message */}
                <div
                  className={`rounded-xl border p-4 ${dashboardData.spendingLimitExceeded ||
                      dashboardData.spendingLimitCritical
                      ? "border-red-500/20 bg-red-500/10"
                      : dashboardData.spendingLimitApproaching
                        ? "border-amber-500/20 bg-amber-500/10"
                        : "border-emerald-500/20 bg-emerald-500/10"
                    }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Dynamic Icon */}
                    {dashboardData.spendingLimitExceeded ||
                      dashboardData.spendingLimitCritical ? (
                      <AlertTriangle
                        size={20}
                        className="mt-0.5 shrink-0 text-red-400"
                      />
                    ) : dashboardData.spendingLimitApproaching ? (
                      <AlertTriangle
                        size={20}
                        className="mt-0.5 shrink-0 text-amber-400"
                      />
                    ) : (
                      <CheckCircle2
                        size={20}
                        className="mt-0.5 shrink-0 text-emerald-400"
                      />
                    )}

                    <div>
                      {/* Dynamic Message */}
                      <p
                        className={`font-semibold ${dashboardData.spendingLimitExceeded ||
                            dashboardData.spendingLimitCritical
                            ? "text-red-300"
                            : dashboardData.spendingLimitApproaching
                              ? "text-amber-300"
                              : "text-emerald-400"
                          }`}
                      >
                        {dashboardData.spendingLimitExceeded
                          ? "Monthly spending limit exceeded."
                          : dashboardData.spendingLimitCritical
                            ? "You are very close to your monthly spending limit."
                            : dashboardData.spendingLimitApproaching
                              ? "You are approaching your monthly spending limit."
                              : "Your spending is within the monthly limit."}
                      </p>

                      <p className="mt-1 text-sm sx-muted">
                        {dashboardData.spendingLimitExceeded
                          ? `You have spent ${formatCurrency(
                            Math.abs(
                              dashboardData.remainingSpendingLimit ??
                              0
                            ),
                            currency
                          )} more than your monthly limit.`
                          : dashboardData.spendingLimitCritical
                            ? `${formatCurrency(
                              dashboardData.remainingSpendingLimit ??
                              0,
                              currency
                            )} remaining. Consider reducing your spending for the rest of the month.`
                            : dashboardData.spendingLimitApproaching
                              ? `${formatCurrency(
                                dashboardData.remainingSpendingLimit ??
                                0,
                                currency
                              )} remaining for this month.`
                              : `${formatCurrency(
                                dashboardData.remainingSpendingLimit ??
                                0,
                                currency
                              )} remaining for this month.`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* SMART INSIGHTS */}
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
                <Loader2
                  size={18}
                  className="mr-2 animate-spin"
                />
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

                    <p className="text-sm sx-muted">
                      {insight.title}
                    </p>

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

          {/* RECENT ACTIVITY + CASHFLOW */}
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
                  <Loader2
                    size={18}
                    className="mr-2 animate-spin"
                  />
                  Loading activity...
                </div>
              ) : dashboardData.recentTransactions.length ===
                0 ? (
                <div className="sx-panel rounded-xl px-6 py-10 text-center text-sm sx-muted">
                  No transactions yet. Add your first
                  income or expense to see it here.
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboardData.recentTransactions.map(
                    (transaction) => {
                      const isIncome =
                        transaction.type === "income";

                      const amount = Number(
                        transaction.amount || 0
                      );

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
                                {getSafeCategory(
                                  transaction.category
                                )}{" "}
                                •{" "}
                                {formatDate(
                                  transaction.transaction_date ||
                                  transaction.created_at
                                )}
                              </p>
                            </div>
                          </div>

                          <p
                            className={`font-mono text-sm font-bold ${isIncome
                                ? "text-emerald-400"
                                : "text-red-300"
                              }`}
                          >
                            {isIncome ? "+" : "-"}
                            {formatCurrency(
                              amount,
                              currency
                            )}
                          </p>
                        </div>
                      );
                    }
                  )}
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
                {/* Income */}
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="sx-muted">
                      Income
                    </span>

                    <span className="font-mono text-emerald-400">
                      {formatCurrency(
                        dashboardData.currentMonthIncome,
                        currency
                      )}
                    </span>
                  </div>

                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 w-full rounded-full bg-emerald-500" />
                  </div>
                </div>

                {/* Expenses */}
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="sx-muted">
                      Expenses
                    </span>

                    <span className="font-mono text-red-300">
                      {formatCurrency(
                        dashboardData.currentMonthExpenses,
                        currency
                      )}
                    </span>
                  </div>

                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-red-500"
                      style={{
                        width:
                          dashboardData.currentMonthIncome >
                            0
                            ? `${Math.min(
                              (dashboardData.currentMonthExpenses /
                                dashboardData.currentMonthIncome) *
                              100,
                              100
                            )}%`
                            : dashboardData.currentMonthExpenses >
                              0
                              ? "100%"
                              : "0%",
                      }}
                    />
                  </div>
                </div>

                {/* Net Cashflow */}
                <div className="sx-panel rounded-xl p-5">
                  <p className="text-sm sx-muted">
                    Net Cashflow
                  </p>

                  <p
                    className={`mt-2 break-words font-mono text-3xl font-bold ${dashboardData.currentMonthSavings >= 0
                        ? "text-emerald-400"
                        : "text-red-300"
                      }`}
                  >
                    {formatCurrency(
                      dashboardData.currentMonthSavings,
                      currency
                    )}
                  </p>

                  <p className="mt-3 text-sm sx-muted">
                    {dashboardData.currentMonthSavings >=
                      0
                      ? "Your current month cashflow is positive."
                      : "Your current month cashflow is negative."}
                  </p>
                </div>

                {/* Highest Spending Category */}
                <div className="sx-panel rounded-xl p-5">
                  <p className="text-sm sx-muted">
                    Highest Spending Category
                  </p>

                  <p className="mt-2 break-words font-mono text-2xl font-bold sx-title">
                    {dashboardData.highestCategory}
                  </p>

                  <p className="mt-3 text-sm sx-muted">
                    {dashboardData.highestCategoryAmount >
                      0
                      ? `${formatCurrency(
                        dashboardData.highestCategoryAmount,
                        currency
                      )} spent this month.`
                      : "No expense category data available yet."}
                  </p>
                </div>

                {/* Full Month Projection */}
                <div className="sx-panel rounded-xl p-5">
                  <p className="text-sm sx-muted">
                    Full Month Expense Projection
                  </p>

                  <p className="mt-2 break-words font-mono text-2xl font-bold sx-title">
                    {formatCurrency(
                      dashboardData.projectedMonthlyExpense,
                      currency
                    )}
                  </p>

                  <p className="mt-3 text-sm sx-muted">
                    Daily average expense:{" "}
                    {formatCurrency(
                      dashboardData.dailyAverageExpense,
                      currency
                    )}
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