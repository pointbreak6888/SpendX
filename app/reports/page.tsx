"use client";

import AuthGuard from "@/components/AuthGuard";
import LiquidGlassNavbar from "@/components/ui/liquidglassnavbar";
import TopHeader from "@/components/ui/topheader";
import { supabase } from "@/lib/supabase";

import { useEffect, useMemo, useState } from "react";

import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Brain,
  CalendarDays,
  Loader2,
  PiggyBank,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { getTransactions } from "@/lib/transactions";
import { motion } from "framer-motion";

import {
  formatCurrency as formatCurrencyValue,
} from "@/lib/formatCurrency";

import type { CurrencyCode } from "@/lib/currencies";

type Transaction = {
  id: string;
  user_id: string;
  amount: number | string;
  type: "income" | "expense";
  category: string;
  note: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
};

type MonthlySummary = {
  monthKey: string;
  monthLabel: string;
  income: number;
  expense: number;
  net: number;
};

type YearlySummary = {
  yearKey: string;
  yearLabel: string;
  income: number;
  expense: number;
  net: number;
};

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

function getMonthLabelFromKey(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);

  return date.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function getDaysInMonth(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0
  ).getDate();
}

function getFinancialCondition(
  projectedNet: number,
  projectedSavingsRate: number
) {
  if (projectedNet <= 0) {
    return {
      label: "Risky",
      color: "text-red-300",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      message:
        "Your projected expenses may cross your income next month. Try reducing non-essential spending.",
    };
  }

  if (projectedSavingsRate >= 30) {
    return {
      label: "Excellent",
      color: "text-emerald-300",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      message:
        "Your projected savings look strong. You are expected to stay financially comfortable next month.",
    };
  }

  if (projectedSavingsRate >= 15) {
    return {
      label: "Healthy",
      color: "text-cyan-300",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/20",
      message:
        "Your next month looks stable, but there is room to improve your savings rate.",
    };
  }

  return {
    label: "Tight",
    color: "text-amber-300",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    message:
      "You are expected to stay positive, but your savings margin may be low next month.",
  };
}

export default function ReportsPage() {
  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [selectedRange, setSelectedRange] =
    useState<"monthly" | "yearly">(
      "monthly"
    );

  const [chartRange, setChartRange] =
    useState<
      "monthly" | "yearly" | null
    >(null);

  /*
   * Currency selected in Settings.
   *
   * IMPORTANT:
   * Transaction amounts are NOT converted.
   * This only controls how amounts are displayed.
   */
  const [currency, setCurrency] =
    useState<CurrencyCode>("INR");

  async function loadCurrency() {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(
          "Reports user error:",
          userError
        );
        return;
      }

      if (!user) {
        return;
      }

      const {
        data: profileSettings,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("currency")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error(
          "Reports currency error:",
          profileError
        );
        return;
      }

      setCurrency(
        (profileSettings?.currency as CurrencyCode) ||
        "INR"
      );
    } catch (error) {
      console.error(
        "Load reports currency error:",
        error
      );
    }
  }

  async function loadTransactions() {
    try {
      setLoading(true);
      setErrorMessage("");

      const data = await getTransactions();

      setTransactions(
        data as Transaction[]
      );
    } catch (error) {
      console.error(
        "Reports load error:",
        error
      );

      if (error instanceof Error) {
        setErrorMessage(
          error.message
        );
      } else {
        setErrorMessage(
          "Something went wrong while loading reports."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions();
    loadCurrency();
  }, []);

  const analysis = useMemo(() => {
    const today = new Date();

    const sortedTransactions =
      [...transactions].sort(
        (a, b) =>
          new Date(
            a.transaction_date
          ).getTime() -
          new Date(
            b.transaction_date
          ).getTime()
      );

    const firstTransactionDate =
      sortedTransactions[0]
        ?.transaction_date;

    const daysTracked =
      firstTransactionDate
        ? Math.floor(
          (today.getTime() -
            new Date(
              firstTransactionDate
            ).getTime()) /
          (1000 * 60 * 60 * 24)
        ) + 1
        : 0;

    const hasEnoughForecastData =
      daysTracked >= 30;

    const currentMonthKey =
      getMonthKey(today);

    const currentDay =
      today.getDate();

    const daysInCurrentMonth =
      getDaysInMonth(today);

    const summariesMap =
      new Map<
        string,
        MonthlySummary
      >();

    const yearlyMap =
      new Map<
        string,
        YearlySummary
      >();

    const categoryExpenseMap =
      new Map<string, number>();

    let currentMonthIncome = 0;
    let currentMonthExpense = 0;

    for (const transaction of transactions) {
      const transactionDate =
        new Date(
          transaction.transaction_date
        );

      if (
        Number.isNaN(
          transactionDate.getTime()
        )
      ) {
        continue;
      }

      const monthKey =
        getMonthKey(
          transactionDate
        );

      const yearKey = String(
        transactionDate.getFullYear()
      );

      const amount =
        Number(
          transaction.amount
        ) || 0;

      /*
       * Monthly
       */
      if (
        !summariesMap.has(
          monthKey
        )
      ) {
        summariesMap.set(
          monthKey,
          {
            monthKey,
            monthLabel:
              getMonthLabelFromKey(
                monthKey
              ),
            income: 0,
            expense: 0,
            net: 0,
          }
        );
      }

      const summary =
        summariesMap.get(
          monthKey
        )!;

      /*
       * Yearly
       */
      if (
        !yearlyMap.has(
          yearKey
        )
      ) {
        yearlyMap.set(
          yearKey,
          {
            yearKey,
            yearLabel:
              yearKey,
            income: 0,
            expense: 0,
            net: 0,
          }
        );
      }

      const yearlySummary =
        yearlyMap.get(
          yearKey
        )!;

      if (
        transaction.type ===
        "income"
      ) {
        summary.income += amount;
        yearlySummary.income +=
          amount;

        if (
          monthKey ===
          currentMonthKey
        ) {
          currentMonthIncome +=
            amount;
        }
      } else {
        summary.expense += amount;
        yearlySummary.expense +=
          amount;

        if (
          monthKey ===
          currentMonthKey
        ) {
          currentMonthExpense +=
            amount;
        }

        const currentCategoryTotal =
          categoryExpenseMap.get(
            transaction.category
          ) || 0;

        categoryExpenseMap.set(
          transaction.category,
          currentCategoryTotal +
          amount
        );
      }

      summary.net =
        summary.income -
        summary.expense;

      yearlySummary.net =
        yearlySummary.income -
        yearlySummary.expense;
    }

    const monthlySummaries =
      Array.from(
        summariesMap.values()
      ).sort((a, b) =>
        b.monthKey.localeCompare(
          a.monthKey
        )
      );

    const yearlySummaries =
      Array.from(
        yearlyMap.values()
      ).sort((a, b) =>
        b.yearKey.localeCompare(
          a.yearKey
        )
      );

    const previousCompletedMonths =
      monthlySummaries.filter(
        (summary) =>
          summary.monthKey !==
          currentMonthKey
      );

    const currentMonthProjectedExpense =
      currentDay > 0
        ? (currentMonthExpense /
          currentDay) *
        daysInCurrentMonth
        : currentMonthExpense;

    const currentMonthProjectedIncome =
      currentDay > 0
        ? (currentMonthIncome /
          currentDay) *
        daysInCurrentMonth
        : currentMonthIncome;

    const averagePreviousIncome =
      previousCompletedMonths.length >
        0
        ? previousCompletedMonths.reduce(
          (sum, month) =>
            sum + month.income,
          0
        ) /
        previousCompletedMonths.length
        : currentMonthProjectedIncome;

    const averagePreviousExpense =
      previousCompletedMonths.length >
        0
        ? previousCompletedMonths.reduce(
          (sum, month) =>
            sum + month.expense,
          0
        ) /
        previousCompletedMonths.length
        : currentMonthProjectedExpense;

    let projectedNextMonthIncome = 0;
    let projectedNextMonthExpense = 0;
    let projectedNextMonthNet = 0;

    if (hasEnoughForecastData) {
      projectedNextMonthIncome =
        previousCompletedMonths.length >
          0
          ? Math.round(
            (averagePreviousIncome +
              currentMonthProjectedIncome) /
            2
          )
          : Math.round(
            currentMonthProjectedIncome
          );

      projectedNextMonthExpense =
        previousCompletedMonths.length >
          0
          ? Math.round(
            (averagePreviousExpense +
              currentMonthProjectedExpense) /
            2
          )
          : Math.round(
            currentMonthProjectedExpense
          );

      projectedNextMonthNet =
        projectedNextMonthIncome -
        projectedNextMonthExpense;
    }

    const currentMonthNet =
      currentMonthIncome -
      currentMonthExpense;

    const currentSavingsRate =
      currentMonthIncome > 0
        ? (currentMonthNet /
          currentMonthIncome) *
        100
        : 0;

    const projectedSavingsRate =
      projectedNextMonthIncome > 0
        ? (projectedNextMonthNet /
          projectedNextMonthIncome) *
        100
        : 0;

    const dailyAverageExpense =
      currentDay > 0
        ? currentMonthExpense /
        currentDay
        : 0;

    const topCategories =
      Array.from(
        categoryExpenseMap.entries()
      )
        .map(
          ([category, total]) => ({
            category,
            total,
          })
        )
        .sort(
          (a, b) =>
            b.total - a.total
        )
        .slice(0, 5);

    const condition =
      hasEnoughForecastData
        ? getFinancialCondition(
          projectedNextMonthNet,
          projectedSavingsRate
        )
        : {
          label:
            "Insufficient Data",
          color:
            "text-zinc-300",
          bg:
            "bg-zinc-500/10",
          border:
            "border-zinc-500/20",
          message:
            "Continue using SpendX for at least 30 days before forecast predictions become available.",
        };

    return {
      currentMonthLabel:
        today.toLocaleDateString(
          "en-IN",
          {
            month: "long",
            year: "numeric",
          }
        ),

      daysTracked,
      hasEnoughForecastData,

      currentMonthIncome,
      currentMonthExpense,
      currentMonthNet,
      currentSavingsRate,

      dailyAverageExpense,

      currentMonthProjectedIncome,
      currentMonthProjectedExpense,

      projectedNextMonthIncome,
      projectedNextMonthExpense,
      projectedNextMonthNet,

      projectedSavingsRate,

      monthlySummaries,
      yearlySummaries,
      topCategories,
      condition,
    };
  }, [transactions]);

  return (
    <AuthGuard>
      <div className="sx-screen">
        <TopHeader />

        <main className="mx-auto max-w-6xl px-6 pt-36 pb-32">
          <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                <Brain size={14} />
                SpendX Analysis
              </div>

              <h1 className="font-mono text-4xl font-bold tracking-tight text-white">
                Reports
              </h1>

              <p className="mt-2 text-zinc-400">
                Monthly performance,
                spending behaviour,
                and next month
                projection.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-zinc-400">
              <span className="text-zinc-500">
                Viewing:
              </span>{" "}
              <span className="font-semibold text-white">
                {
                  analysis.currentMonthLabel
                }
              </span>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-8 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
              {errorMessage}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center rounded-3xl border border-white/[0.08] bg-white/[0.03] py-20 text-zinc-400">
              <Loader2
                size={20}
                className="mr-2 animate-spin"
              />
              Loading analysis...
            </div>
          ) : transactions.length ===
            0 ? (
            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] px-6 py-20 text-center">
              <BarChart3
                className="mx-auto mb-4 text-zinc-500"
                size={40}
              />

              <h3 className="text-lg font-bold text-white">
                No data available yet
              </h3>

              <p className="mt-2 text-sm text-zinc-400">
                Add income and
                expenses from the
                Transactions page to
                generate your
                analysis.
              </p>
            </div>
          ) : (
            <>
              {/* =========================
                  SUMMARY CARDS
              ========================== */}
              <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                    <ArrowDownRight
                      size={20}
                    />
                  </div>

                  <p className="text-xs text-zinc-500">
                    This Month Income
                  </p>

                  <h3 className="mt-2 font-mono text-xl font-bold text-emerald-400">
                    {formatCurrencyValue(
                      analysis.currentMonthIncome,
                      currency
                    )}
                  </h3>
                </div>

                <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
                    <ArrowUpRight
                      size={20}
                    />
                  </div>

                  <p className="text-xs text-zinc-500">
                    This Month Expense
                  </p>

                  <h3 className="mt-2 font-mono text-xl font-bold text-red-400">
                    {formatCurrencyValue(
                      analysis.currentMonthExpense,
                      currency
                    )}
                  </h3>
                </div>

                <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400">
                    <PiggyBank
                      size={20}
                    />
                  </div>

                  <p className="text-xs text-zinc-500">
                    Net Savings
                  </p>

                  <h3
                    className={`mt-2 font-mono text-xl font-bold ${analysis.currentMonthNet >=
                      0
                      ? "text-cyan-300"
                      : "text-red-400"
                      }`}
                  >
                    {formatCurrencyValue(
                      analysis.currentMonthNet,
                      currency
                    )}
                  </h3>
                </div>

                <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                    <Activity
                      size={20}
                    />
                  </div>

                  <p className="text-xs text-zinc-500">
                    Savings Rate
                  </p>

                  <h3 className="mt-2 font-mono text-xl font-bold text-white">
                    {analysis.currentSavingsRate.toFixed(
                      1
                    )}
                    %
                  </h3>
                </div>
              </section>

              {/* =========================
                  FORECAST
              ========================== */}
              <section className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 lg:col-span-2">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <h3 className="font-mono text-base font-semibold text-white">
                        Next Month Forecast
                      </h3>

                      <p className="mt-1 text-xs text-zinc-500">
                        {analysis.hasEnoughForecastData
                          ? "Estimated using your recent income and expense pattern."
                          : `Forecast unlocks after 30 days of usage. (${analysis.daysTracked}/30 days collected)`}
                      </p>
                    </div>

                    <div
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${analysis.condition.border} ${analysis.condition.bg} ${analysis.condition.color}`}
                    >
                      {
                        analysis
                          .condition
                          .label
                      }
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                      <div className="mb-3 flex items-center gap-2 text-xs text-zinc-500">
                        <TrendingUp
                          size={14}
                        />
                        Projected Income
                      </div>

                      <p className="font-mono text-lg font-bold text-emerald-400">
                        {formatCurrencyValue(
                          analysis.projectedNextMonthIncome,
                          currency
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                      <div className="mb-3 flex items-center gap-2 text-xs text-zinc-500">
                        <TrendingDown
                          size={14}
                        />
                        Projected Expense
                      </div>

                      <p className="font-mono text-lg font-bold text-red-400">
                        {formatCurrencyValue(
                          analysis.projectedNextMonthExpense,
                          currency
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                      <div className="mb-3 flex items-center gap-2 text-xs text-zinc-500">
                        <Wallet
                          size={14}
                        />
                        Projected Net
                      </div>

                      <p
                        className={`font-mono text-lg font-bold ${analysis.projectedNextMonthNet >=
                          0
                          ? "text-cyan-300"
                          : "text-red-400"
                          }`}
                      >
                        {formatCurrencyValue(
                          analysis.projectedNextMonthNet,
                          currency
                        )}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`mt-5 rounded-2xl border p-4 ${analysis.condition.border} ${analysis.condition.bg}`}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <ShieldCheck
                        size={16}
                        className={
                          analysis
                            .condition
                            .color
                        }
                      />

                      <p
                        className={`text-sm font-bold ${analysis.condition.color}`}
                      >
                        Financial
                        Condition:{" "}
                        {
                          analysis
                            .condition
                            .label
                        }
                      </p>
                    </div>

                    <p className="text-sm text-zinc-300">
                      {
                        analysis
                          .condition
                          .message
                      }
                    </p>
                  </div>
                </div>

                {/* =========================
                    CURRENT MONTH PACE
                ========================== */}
                <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6">
                  <h3 className="font-mono text-base font-semibold text-white">
                    Current Month Pace
                  </h3>

                  <p className="mt-1 text-xs text-zinc-500">
                    Based on your daily
                    average so far.
                  </p>

                  <div className="mt-6 space-y-4">
                    <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                      <p className="text-xs text-zinc-500">
                        Daily Average
                        Expense
                      </p>

                      <p className="mt-2 font-mono text-lg font-bold text-red-300">
                        {formatCurrencyValue(
                          analysis.dailyAverageExpense,
                          currency
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                      <p className="text-xs text-zinc-500">
                        Full Month
                        Expense Projection
                      </p>

                      <p className="mt-2 font-mono text-lg font-bold text-white">
                        {formatCurrencyValue(
                          analysis.currentMonthProjectedExpense,
                          currency
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* =========================
                  HISTORY + CATEGORIES
              ========================== */}
              <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6">
                  <div className="mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-mono text-base font-semibold text-white">
                          History
                        </h3>

                        <p className="mt-1 text-xs text-zinc-500">
                          {chartRange ===
                            "monthly"
                            ? "Monthly income vs expense visual representation."
                            : chartRange ===
                              "yearly"
                              ? "Yearly income vs expense visual representation."
                              : "Income, expense, and net history."}
                        </p>
                      </div>

                      {chartRange !==
                        null ? (
                        <button
                          type="button"
                          onClick={() =>
                            setChartRange(
                              null
                            )
                          }
                          className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-zinc-400 transition-colors hover:text-white"
                        >
                          Show List
                        </button>
                      ) : (
                        <CalendarDays
                          size={18}
                          className="text-zinc-500"
                        />
                      )}
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                      <select
                        value={
                          selectedRange
                        }
                        onChange={(e) =>
                          setSelectedRange(
                            e.target
                              .value as
                            | "monthly"
                            | "yearly"
                          )
                        }
                        className="rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2 text-xs font-semibold text-zinc-300 outline-none focus:border-emerald-500/50"
                      >
                        <option value="monthly">
                          Monthly
                        </option>

                        <option value="yearly">
                          Yearly
                        </option>
                      </select>

                      <button
                        type="button"
                        onClick={() =>
                          setChartRange(
                            selectedRange
                          )
                        }
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-black transition-colors hover:bg-emerald-400"
                      >
                        <BarChart3
                          size={12}
                        />

                        Analyze
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {chartRange ===
                      null ? (
                      selectedRange ===
                        "monthly" ? (
                        analysis.monthlySummaries
                          .slice(
                            0,
                            6
                          )
                          .map(
                            (
                              month
                            ) => (
                              <div
                                key={
                                  month.monthKey
                                }
                                className="rounded-2xl border border-white/[0.06] bg-black/20 p-4"
                              >
                                <div className="mb-3 flex items-center justify-between">
                                  <p className="text-sm font-bold text-white">
                                    {
                                      month.monthLabel
                                    }
                                  </p>

                                  <p
                                    className={`font-mono text-sm font-bold ${month.net >=
                                      0
                                      ? "text-cyan-300"
                                      : "text-red-400"
                                      }`}
                                  >
                                    {formatCurrencyValue(
                                      month.net,
                                      currency
                                    )}
                                  </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-xs">
                                  <div>
                                    <p className="text-zinc-500">
                                      Income
                                    </p>

                                    <p className="mt-1 font-mono text-emerald-400">
                                      {formatCurrencyValue(
                                        month.income,
                                        currency
                                      )}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-zinc-500">
                                      Expense
                                    </p>

                                    <p className="mt-1 font-mono text-red-400">
                                      {formatCurrencyValue(
                                        month.expense,
                                        currency
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )
                          )
                      ) : (
                        analysis.yearlySummaries
                          .slice(
                            0,
                            6
                          )
                          .map(
                            (
                              year
                            ) => (
                              <div
                                key={
                                  year.yearKey
                                }
                                className="rounded-2xl border border-white/[0.06] bg-black/20 p-4"
                              >
                                <div className="mb-3 flex items-center justify-between">
                                  <p className="text-sm font-bold text-white">
                                    Year{" "}
                                    {
                                      year.yearLabel
                                    }
                                  </p>

                                  <p
                                    className={`font-mono text-sm font-bold ${year.net >=
                                      0
                                      ? "text-cyan-300"
                                      : "text-red-400"
                                      }`}
                                  >
                                    {formatCurrencyValue(
                                      year.net,
                                      currency
                                    )}
                                  </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-xs">
                                  <div>
                                    <p className="text-zinc-500">
                                      Income
                                    </p>

                                    <p className="mt-1 font-mono text-emerald-400">
                                      {formatCurrencyValue(
                                        year.income,
                                        currency
                                      )}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-zinc-500">
                                      Expense
                                    </p>

                                    <p className="mt-1 font-mono text-red-400">
                                      {formatCurrencyValue(
                                        year.expense,
                                        currency
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )
                          )
                      )
                    ) : (
                      (() => {
                        const chartData =
                          chartRange ===
                            "monthly"
                            ? [
                              ...analysis.monthlySummaries,
                            ]
                              .reverse()
                              .slice(
                                -6
                              )
                            : [
                              ...analysis.yearlySummaries,
                            ]
                              .reverse()
                              .slice(
                                -5
                              );

                        const maxVal =
                          Math.max(
                            ...chartData.map(
                              (d) =>
                                Math.max(
                                  d.income,
                                  d.expense
                                )
                            ),
                            1
                          );

                        if (
                          chartData.length ===
                          0
                        ) {
                          return (
                            <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-6 text-center text-sm text-zinc-400">
                              No data
                              available
                              for
                              analysis.
                            </div>
                          );
                        }

                        return (
                          <div className="relative rounded-2xl border border-white/[0.06] bg-black/20 p-6">
                            {/* Guidelines */}
                            <div className="pointer-events-none absolute inset-y-6 left-16 right-6 flex flex-col justify-between">
                              <div className="w-full border-t border-white/[0.04]" />
                              <div className="w-full border-t border-white/[0.04]" />
                              <div className="w-full border-t border-white/[0.04]" />
                            </div>

                            {/* Chart Area */}
                            <div className="relative z-10 flex h-56 items-end justify-between gap-3 pl-12 pr-2">
                              {/* Y-Axis */}
                              <div className="absolute left-0 top-0 bottom-0 flex w-10 select-none flex-col justify-between pr-2 text-right text-[10px] text-zinc-500">
                                <span>
                                  {formatCurrencyValue(
                                    maxVal,
                                    currency
                                  )}
                                </span>

                                <span>
                                  {formatCurrencyValue(
                                    maxVal /
                                    2,
                                    currency
                                  )}
                                </span>

                                <span>
                                  {formatCurrencyValue(
                                    0,
                                    currency
                                  )}
                                </span>
                              </div>

                              {/* Columns */}
                              {chartData.map(
                                (d) => {
                                  const isMonthly =
                                    chartRange ===
                                    "monthly";

                                  const m =
                                    d as MonthlySummary;

                                  const y =
                                    d as YearlySummary;

                                  const label =
                                    isMonthly
                                      ? m.monthLabel.split(
                                        " "
                                      )[0]
                                      : y.yearLabel;

                                  const key =
                                    isMonthly
                                      ? m.monthKey
                                      : y.yearKey;

                                  return (
                                    <div
                                      key={
                                        key
                                      }
                                      className="group relative flex h-full flex-1 flex-col items-center justify-end"
                                    >
                                      {/* Tooltip */}
                                      <div className="absolute bottom-[105%] z-50 hidden flex-col items-center group-hover:flex">
                                        <div className="rounded-xl border border-white/10 bg-zinc-900/90 px-3 py-2 text-[11px] text-white shadow-xl backdrop-blur-md">
                                          <p className="mb-1 border-b border-white/5 pb-1 text-center font-bold text-zinc-300">
                                            {isMonthly
                                              ? m.monthLabel
                                              : `Year ${y.yearLabel}`}
                                          </p>

                                          <div className="space-y-0.5">
                                            <p className="flex justify-between gap-4">
                                              <span className="text-zinc-400">
                                                Income:
                                              </span>

                                              <span className="font-mono font-semibold text-emerald-400">
                                                {formatCurrencyValue(
                                                  d.income,
                                                  currency
                                                )}
                                              </span>
                                            </p>

                                            <p className="flex justify-between gap-4">
                                              <span className="text-zinc-400">
                                                Expense:
                                              </span>

                                              <span className="font-mono font-semibold text-red-400">
                                                {formatCurrencyValue(
                                                  d.expense,
                                                  currency
                                                )}
                                              </span>
                                            </p>

                                            <p className="mt-1 flex justify-between gap-4 border-t border-white/5 pt-1">
                                              <span className="text-zinc-400">
                                                Net:
                                              </span>

                                              <span
                                                className={`font-mono font-bold ${d.net >=
                                                  0
                                                  ? "text-cyan-300"
                                                  : "text-red-400"
                                                  }`}
                                              >
                                                {formatCurrencyValue(
                                                  d.net,
                                                  currency
                                                )}
                                              </span>
                                            </p>
                                          </div>
                                        </div>

                                        <div className="-mt-1 h-2 w-2 rotate-45 border-b border-r border-white/10 bg-zinc-900/90" />
                                      </div>

                                      {/* Bars */}
                                      <div className="flex h-[85%] w-full items-end justify-center gap-1.5 px-1">
                                        {/* Income */}
                                        <div className="relative flex h-full max-w-[20px] flex-1 flex-col justify-end">
                                          <motion.div
                                            initial={{
                                              height: 0,
                                            }}
                                            animate={{
                                              height: `${(d.income /
                                                maxVal) *
                                                100
                                                }%`,
                                            }}
                                            transition={{
                                              duration:
                                                0.6,
                                              ease: "easeOut",
                                            }}
                                            className="w-full cursor-pointer rounded-t-lg bg-gradient-to-t from-emerald-600/30 to-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.15)] transition-all group-hover:brightness-110"
                                          />
                                        </div>

                                        {/* Expense */}
                                        <div className="relative flex h-full max-w-[20px] flex-1 flex-col justify-end">
                                          <motion.div
                                            initial={{
                                              height: 0,
                                            }}
                                            animate={{
                                              height: `${(d.expense /
                                                maxVal) *
                                                100
                                                }%`,
                                            }}
                                            transition={{
                                              duration:
                                                0.6,
                                              ease: "easeOut",
                                              delay: 0.1,
                                            }}
                                            className="w-full cursor-pointer rounded-t-lg bg-gradient-to-t from-red-600/30 to-red-400 shadow-[0_0_12px_rgba(248,113,113,0.15)] transition-all group-hover:brightness-110"
                                          />
                                        </div>
                                      </div>

                                      {/* Label */}
                                      <span className="mt-2 w-full truncate text-center text-[10px] font-semibold text-zinc-400 transition-colors group-hover:text-white">
                                        {label}
                                      </span>
                                    </div>
                                  );
                                }
                              )}
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </div>
                </div>

                {/* =========================
                    TOP CATEGORIES
                ========================== */}
                <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <h3 className="font-mono text-base font-semibold text-white">
                        Top Spending
                        Categories
                      </h3>

                      <p className="mt-1 text-xs text-zinc-500">
                        Your biggest
                        expense areas.
                      </p>
                    </div>

                    <Wallet
                      size={18}
                      className="text-zinc-500"
                    />
                  </div>

                  {analysis.topCategories
                    .length ===
                    0 ? (
                    <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-6 text-center text-sm text-zinc-400">
                      No expense
                      categories yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {analysis.topCategories.map(
                        (
                          item,
                          index
                        ) => {
                          const maxTotal =
                            analysis
                              .topCategories[0]
                              ?.total ||
                            1;

                          const width =
                            Math.max(
                              (item.total /
                                maxTotal) *
                              100,
                              8
                            );

                          return (
                            <div
                              key={
                                item.category
                              }
                              className="rounded-2xl border border-white/[0.06] bg-black/20 p-4"
                            >
                              <div className="mb-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-[10px] text-zinc-400">
                                    {index +
                                      1}
                                  </span>

                                  <p className="text-sm font-bold text-white">
                                    {
                                      item.category
                                    }
                                  </p>
                                </div>

                                <p className="font-mono text-sm font-bold text-red-400">
                                  {formatCurrencyValue(
                                    item.total,
                                    currency
                                  )}
                                </p>
                              </div>

                              <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                                <div
                                  className="h-full rounded-full bg-red-500/60"
                                  style={{
                                    width: `${width}%`,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </main>

        <LiquidGlassNavbar />
      </div>
    </AuthGuard>
  );
}