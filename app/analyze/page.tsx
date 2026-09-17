"use client";

import AuthGuard from "@/components/AuthGuard";
import LiquidGlassNavbar from "@/components/ui/liquidglassnavbar";
import TopHeader from "@/components/ui/topheader";
import { supabase } from "@/lib/supabase";

import { formatCurrency as formatCurrencyValue } from "@/lib/formatCurrency";
import type { CurrencyCode } from "@/lib/currencies";

import {
    useMemo,
    useState,
    useEffect,
    type FormEvent,
} from "react";

import {
    AlertTriangle,
    Bike,
    Calculator,
    Car,
    CheckCircle2,
    Home,
    Landmark,
    PiggyBank,
    ShieldCheck,
    TrendingUp,
    Wallet,
    Loader2,
} from "lucide-react";

type InvestmentType =
    | "House"
    | "Car"
    | "Bike"
    | "Business"
    | "Other";

type RiskLevel =
    | "Enter Details"
    | "Safe"
    | "Moderate"
    | "Risky"
    | "Not Affordable";

type ChartTone =
    | "emerald"
    | "red"
    | "orange"
    | "indigo"
    | "cyan";

function parseAmount(value: string) {
    const cleaned = value
        .replace(/,/g, "")
        .trim();

    if (!cleaned) return 0;

    const number = Number(cleaned);

    if (!Number.isFinite(number) || number < 0) {
        return 0;
    }

    return number;
}

function getInvestmentIcon(type: InvestmentType) {
    if (type === "House") return Home;
    if (type === "Car") return Car;
    if (type === "Bike") return Bike;
    if (type === "Business") return Landmark;

    return Calculator;
}

function getRiskStyles(risk: RiskLevel) {
    if (risk === "Enter Details") {
        return {
            badge:
                "border-indigo-500/20 bg-indigo-500/10 text-indigo-300",
            card:
                "border-indigo-500/20 bg-indigo-500/10",
            progress: "bg-indigo-400",
            iconBox:
                "border-indigo-500/20 bg-indigo-500/10 text-indigo-300",
            icon: Calculator,
        };
    }

    if (risk === "Safe") {
        return {
            badge:
                "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
            card:
                "border-emerald-500/20 bg-emerald-500/10",
            progress: "bg-emerald-400",
            iconBox:
                "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
            icon: CheckCircle2,
        };
    }

    if (risk === "Moderate") {
        return {
            badge:
                "border-yellow-500/20 bg-yellow-500/10 text-yellow-300",
            card:
                "border-yellow-500/20 bg-yellow-500/10",
            progress: "bg-yellow-400",
            iconBox:
                "border-yellow-500/20 bg-yellow-500/10 text-yellow-300",
            icon: AlertTriangle,
        };
    }

    if (risk === "Risky") {
        return {
            badge:
                "border-orange-500/20 bg-orange-500/10 text-orange-300",
            card:
                "border-orange-500/20 bg-orange-500/10",
            progress: "bg-orange-400",
            iconBox:
                "border-orange-500/20 bg-orange-500/10 text-orange-300",
            icon: AlertTriangle,
        };
    }

    return {
        badge:
            "border-red-500/20 bg-red-500/10 text-red-300",
        card:
            "border-red-500/20 bg-red-500/10",
        progress: "bg-red-400",
        iconBox:
            "border-red-500/20 bg-red-500/10 text-red-300",
        icon: AlertTriangle,
    };
}

function getBarWidth(
    value: number,
    maxValue: number
) {
    if (maxValue <= 0 || value <= 0) {
        return "0%";
    }

    const percentage = Math.min(
        (value / maxValue) * 100,
        100
    );

    return `${percentage}%`;
}

function getBarColor() {
    return "#10b981";
}

export default function AnalyzePage() {
    const [salary, setSalary] = useState("");
    const [monthlyExpenses, setMonthlyExpenses] =
        useState("");
    const [currentSavings, setCurrentSavings] =
        useState("");

    const [investmentType, setInvestmentType] =
        useState<InvestmentType>("House");

    const [investmentName, setInvestmentName] =
        useState("");

    const [investmentPrice, setInvestmentPrice] =
        useState("");

    const [downPayment, setDownPayment] =
        useState("");

    const [expectedEmi, setExpectedEmi] =
        useState("");

    const [monthlySavingPlan, setMonthlySavingPlan] =
        useState("");

    /*
     * Currency selected from Settings.
     *
     * IMPORTANT:
     * The numeric values used by the analyzer are NOT
     * converted. Currency only controls how monetary
     * values are displayed.
     */
    const [currency, setCurrency] =
        useState<CurrencyCode>("INR");

    const [hasEvaluated, setHasEvaluated] =
        useState(false);

    const [errorMessage, setErrorMessage] =
        useState("");

    const [loadingData, setLoadingData] =
        useState(true);

    useEffect(() => {
        async function loadFinancialData() {
            try {
                setLoadingData(true);

                const {
                    data: { user },
                    error: userError,
                } = await supabase.auth.getUser();

                if (userError || !user) {
                    setLoadingData(false);
                    return;
                }

                /*
                 * Load the currency selected in Settings.
                 */
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
                        "Analyze currency error:",
                        profileError
                    );
                } else {
                    setCurrency(
                        (profileSettings?.currency as CurrencyCode) ||
                        "INR"
                    );
                }

                /*
                 * Load the user's transactions.
                 */
                const {
                    data,
                    error,
                } = await supabase
                    .from("transactions")
                    .select("*")
                    .eq("user_id", user.id)
                    .order("transaction_date", {
                        ascending: false,
                    });

                if (error) {
                    console.error(
                        "Analyze transactions error:",
                        error
                    );

                    setLoadingData(false);
                    return;
                }

                const transactions = data || [];

                const now = new Date();

                const currentMonth =
                    now.getMonth();

                const currentYear =
                    now.getFullYear();

                const currentMonthTransactions =
                    transactions.filter(
                        (t: any) => {
                            const date = new Date(
                                t.transaction_date ||
                                t.created_at
                            );

                            return (
                                date.getMonth() ===
                                currentMonth &&
                                date.getFullYear() ===
                                currentYear
                            );
                        }
                    );

                const monthlyIncome =
                    currentMonthTransactions
                        .filter(
                            (t: any) =>
                                t.type ===
                                "income"
                        )
                        .reduce(
                            (
                                sum: number,
                                t: any
                            ) =>
                                sum +
                                Number(
                                    t.amount || 0
                                ),
                            0
                        );

                const monthlyExpense =
                    currentMonthTransactions
                        .filter(
                            (t: any) =>
                                t.type ===
                                "expense"
                        )
                        .reduce(
                            (
                                sum: number,
                                t: any
                            ) =>
                                sum +
                                Number(
                                    t.amount || 0
                                ),
                            0
                        );

                const totalSavings =
                    transactions
                        .filter(
                            (t: any) =>
                                t.type ===
                                "income"
                        )
                        .reduce(
                            (
                                sum: number,
                                t: any
                            ) =>
                                sum +
                                Number(
                                    t.amount || 0
                                ),
                            0
                        ) -
                    transactions
                        .filter(
                            (t: any) =>
                                t.type ===
                                "expense"
                        )
                        .reduce(
                            (
                                sum: number,
                                t: any
                            ) =>
                                sum +
                                Number(
                                    t.amount || 0
                                ),
                            0
                        );

                if (monthlyIncome > 0) {
                    setSalary(
                        monthlyIncome.toString()
                    );
                }

                if (monthlyExpense > 0) {
                    setMonthlyExpenses(
                        monthlyExpense.toString()
                    );
                }

                if (totalSavings > 0) {
                    setCurrentSavings(
                        Math.max(
                            0,
                            totalSavings
                        ).toString()
                    );
                }
            } catch (error) {
                console.error(
                    "Load financial data error:",
                    error
                );
            } finally {
                setLoadingData(false);
            }
        }

        loadFinancialData();
    }, []);

    function resetEvaluation() {
        setHasEvaluated(false);
        setErrorMessage("");
    }

    const analysis = useMemo(() => {
        const monthlySalary =
            parseAmount(salary);

        const expenses =
            parseAmount(monthlyExpenses);

        const savings =
            parseAmount(currentSavings);

        const price =
            parseAmount(investmentPrice);

        const downPaymentNeeded =
            parseAmount(downPayment);

        const emi =
            parseAmount(expectedEmi);

        const plannedSaving =
            parseAmount(monthlySavingPlan);

        const availableBeforeInvestment =
            monthlySalary - expenses;

        const balanceAfterEmi =
            monthlySalary -
            expenses -
            emi;

        const emiToIncomeRatio =
            monthlySalary > 0
                ? (emi / monthlySalary) * 100
                : 0;

        const expenseToIncomeRatio =
            monthlySalary > 0
                ? (expenses / monthlySalary) * 100
                : 0;

        const savingsGap = Math.max(
            downPaymentNeeded - savings,
            0
        );

        const autoSavingCapacity =
            Math.max(
                availableBeforeInvestment *
                0.5,
                0
            );

        const monthlySavingCapacity =
            plannedSaving > 0
                ? plannedSaving
                : autoSavingCapacity;

        const monthsNeededToSave =
            savingsGap > 0 &&
                monthlySavingCapacity > 0
                ? Math.ceil(
                    savingsGap /
                    monthlySavingCapacity
                )
                : 0;

        const minimumComfortBalance =
            monthlySalary * 0.2;

        const idealEmergencyFund =
            expenses * 6;

        const emergencyFundGap =
            Math.max(
                idealEmergencyFund -
                savings,
                0
            );

        const hasRequiredDetails =
            monthlySalary > 0 &&
            expenses > 0 &&
            price > 0 &&
            emi > 0;

        let riskLevel: RiskLevel =
            "Enter Details";

        let score = 0;

        let suggestion =
            "Enter your details and press Evaluate Investment to analyze affordability.";

        let savingAdvice =
            "After evaluation, SpendX will suggest whether you can proceed now or should save for some time before making the investment.";

        if (!hasRequiredDetails) {
            riskLevel = "Enter Details";
            score = 0;
        } else if (balanceAfterEmi <= 0) {
            riskLevel = "Not Affordable";
            score = 15;

            suggestion =
                "This investment is not affordable right now because your expenses and EMI are equal to or higher than your monthly income.";

            savingAdvice =
                monthsNeededToSave > 0
                    ? `It is better to wait and save for around ${monthsNeededToSave} more month${monthsNeededToSave ===
                        1
                        ? ""
                        : "s"
                    } before making this investment.`
                    : "It is better to reduce your expenses, increase savings, or choose a lower-cost option before investing.";
        } else if (
            emiToIncomeRatio > 40 ||
            balanceAfterEmi <
            minimumComfortBalance
        ) {
            riskLevel = "Risky";
            score = 40;

            suggestion =
                "You may technically manage this investment, but your monthly budget will become tight after paying the EMI.";

            savingAdvice =
                monthsNeededToSave > 0
                    ? `Save for at least ${monthsNeededToSave} more month${monthsNeededToSave ===
                        1
                        ? ""
                        : "s"
                    } before making this investment. This can reduce pressure on your monthly budget.`
                    : "Even if you already have the down payment, it is safer to build more savings before making this investment.";
        } else if (
            emiToIncomeRatio > 25 ||
            expenseToIncomeRatio > 65
        ) {
            riskLevel = "Moderate";
            score = 70;

            suggestion =
                "This investment looks possible, but you should be careful because a good part of your income will go into expenses and EMI.";

            savingAdvice =
                monthsNeededToSave > 0
                    ? `You can consider saving for ${monthsNeededToSave} month${monthsNeededToSave ===
                        1
                        ? ""
                        : "s"
                    } before investing.`
                    : "Keep a proper emergency fund ready before finalizing this investment.";
        } else {
            riskLevel = "Safe";
            score = 88;

            suggestion =
                "This investment looks manageable based on your current income, expenses, savings, and expected EMI.";

            savingAdvice =
                emergencyFundGap > 0
                    ? `Before investing, try to build your emergency fund closer to ${formatCurrencyValue(
                        idealEmergencyFund,
                        currency
                    )}.`
                    : "Your budget looks comfortable, but still compare interest rates, hidden charges, and avoid unnecessary extra loans.";
        }

        if (
            hasRequiredDetails &&
            savingsGap > 0 &&
            riskLevel !== "Not Affordable"
        ) {
            score = Math.max(
                score - 10,
                0
            );
        }

        if (
            hasRequiredDetails &&
            emergencyFundGap > 0 &&
            riskLevel !== "Not Affordable"
        ) {
            score = Math.max(
                score - 8,
                0
            );
        }

        return {
            monthlySalary,
            expenses,
            savings,
            price,
            downPaymentNeeded,
            emi,
            availableBeforeInvestment,
            balanceAfterEmi,
            emiToIncomeRatio,
            expenseToIncomeRatio,
            savingsGap,
            monthsNeededToSave,
            monthlySavingCapacity,
            idealEmergencyFund,
            emergencyFundGap,
            riskLevel,
            score,
            suggestion,
            savingAdvice,
            hasRequiredDetails,
        };
    }, [
        salary,
        monthlyExpenses,
        currentSavings,
        investmentPrice,
        downPayment,
        expectedEmi,
        monthlySavingPlan,
        currency,
    ]);

    function handleEvaluate(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (
            !analysis.hasRequiredDetails
        ) {
            setHasEvaluated(false);

            setErrorMessage(
                "Please enter monthly income, monthly expenses, investment price, and expected EMI."
            );

            return;
        }

        setErrorMessage("");
        setHasEvaluated(true);
    }

    const displayRiskLevel: RiskLevel =
        hasEvaluated
            ? analysis.riskLevel
            : "Enter Details";

    const displayScore =
        hasEvaluated
            ? analysis.score
            : 0;

    const displaySuggestion =
        hasEvaluated
            ? analysis.suggestion
            : "Enter your details and press Evaluate Investment to analyze affordability.";

    const displaySavingAdvice =
        hasEvaluated
            ? analysis.savingAdvice
            : "After evaluation, SpendX will suggest whether you can proceed now or should save for some time before making the investment.";

    const InvestmentIcon =
        getInvestmentIcon(
            investmentType
        );

    const riskStyles =
        getRiskStyles(
            displayRiskLevel
        );

    const RiskIcon =
        riskStyles.icon;

    const chartItems: Array<{
        label: string;
        value: number;
        tone: ChartTone;
    }> = hasEvaluated
            ? [
                {
                    label: "Monthly income",
                    value:
                        analysis.monthlySalary,
                    tone: "emerald",
                },
                {
                    label: "Current expenses",
                    value:
                        analysis.expenses,
                    tone: "emerald",
                },
                {
                    label: "Expected EMI",
                    value: analysis.emi,
                    tone: "emerald",
                },
                {
                    label: "Balance after EMI",
                    value: Math.max(
                        analysis.balanceAfterEmi,
                        0
                    ),
                    tone: "emerald",
                },
                {
                    label: "Suggested saving",
                    value:
                        analysis.monthlySavingCapacity,
                    tone: "emerald",
                },
            ]
            : [];

    const maxChartValue =
        chartItems.length
            ? Math.max(
                ...chartItems.map(
                    (item) =>
                        item.value
                ),
                1
            )
            : 1;

    return (
        <AuthGuard>
            <div className="sx-screen">
                <TopHeader />

                <main className="mx-auto max-w-7xl px-6 pt-36 pb-36">
                    <div className="mb-10 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
                        <div>
                            <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300">
                                <TrendingUp
                                    size={14}
                                    className="shrink-0"
                                />

                                <span>
                                    Smart Investment
                                    Analyzer
                                </span>
                            </div>

                            <h1 className="font-mono text-4xl font-bold tracking-tight text-white">
                                Analyze Investment
                            </h1>

                            <p className="mt-2 max-w-2xl text-zinc-400">
                                Check whether a
                                house, bike, car,
                                business plan, or
                                any big purchase
                                fits your current
                                budget.
                            </p>
                        </div>

                        <div
                            className={`inline-flex w-fit items-center justify-center gap-2 whitespace-nowrap rounded-2xl border px-5 py-3 text-sm font-bold ${riskStyles.badge}`}
                        >
                            <RiskIcon
                                size={17}
                                className="shrink-0"
                            />

                            <span>
                                {displayRiskLevel}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
                        <form
                            onSubmit={
                                handleEvaluate
                            }
                            className="sx-card rounded-3xl p-6"
                        >
                            <div className="mb-6 flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                                    {loadingData ? (
                                        <Loader2
                                            size={20}
                                            className="animate-spin"
                                        />
                                    ) : (
                                        <InvestmentIcon
                                            size={20}
                                            className="shrink-0"
                                        />
                                    )}
                                </div>

                                <div>
                                    <h2 className="font-mono text-lg font-bold sx-title">
                                        Investment
                                        Details
                                    </h2>

                                    <p className="text-xs sx-muted">
                                        {loadingData
                                            ? "Loading your financial data..."
                                            : "Enter the details, then press Evaluate Investment."}
                                    </p>
                                </div>
                            </div>

                            {errorMessage && (
                                <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                                    {
                                        errorMessage
                                    }
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-xs font-semibold sx-muted">
                                        Monthly Salary /
                                        Income{" "}
                                        <span className="text-emerald-400">
                                            *
                                        </span>
                                    </label>

                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={
                                            salary
                                        }
                                        onChange={(
                                            event
                                        ) => {
                                            setSalary(
                                                event
                                                    .target
                                                    .value
                                            );
                                            resetEvaluation();
                                        }}
                                        placeholder="e.g. 50000"
                                        className="sx-field w-full rounded-2xl px-4 py-3 text-sm placeholder:text-muted-foreground"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-semibold sx-muted">
                                        Current Monthly
                                        Expenses{" "}
                                        <span className="text-emerald-400">
                                            *
                                        </span>
                                    </label>

                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={
                                            monthlyExpenses
                                        }
                                        onChange={(
                                            event
                                        ) => {
                                            setMonthlyExpenses(
                                                event
                                                    .target
                                                    .value
                                            );
                                            resetEvaluation();
                                        }}
                                        placeholder="e.g. 25000"
                                        className="sx-field w-full rounded-2xl px-4 py-3 text-sm placeholder:text-muted-foreground"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-semibold sx-muted">
                                        Current Savings
                                    </label>

                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={
                                            currentSavings
                                        }
                                        onChange={(
                                            event
                                        ) => {
                                            setCurrentSavings(
                                                event
                                                    .target
                                                    .value
                                            );
                                            resetEvaluation();
                                        }}
                                        placeholder="e.g. 200000"
                                        className="sx-field w-full rounded-2xl px-4 py-3 text-sm placeholder:text-muted-foreground"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-semibold sx-muted">
                                        Investment Type
                                    </label>

                                    <select
                                        value={
                                            investmentType
                                        }
                                        onChange={(
                                            event
                                        ) => {
                                            setInvestmentType(
                                                event
                                                    .target
                                                    .value as InvestmentType
                                            );
                                            resetEvaluation();
                                        }}
                                        className="sx-field w-full rounded-2xl px-4 py-3 text-sm"
                                    >
                                        <option value="House">
                                            House
                                        </option>

                                        <option value="Car">
                                            Car
                                        </option>

                                        <option value="Bike">
                                            Bike
                                        </option>

                                        <option value="Business">
                                            Business
                                        </option>

                                        <option value="Other">
                                            Other
                                        </option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-semibold sx-muted">
                                        Investment Name
                                    </label>

                                    <input
                                        type="text"
                                        value={
                                            investmentName
                                        }
                                        onChange={(
                                            event
                                        ) => {
                                            setInvestmentName(
                                                event
                                                    .target
                                                    .value
                                            );
                                            resetEvaluation();
                                        }}
                                        placeholder="e.g. Apartment / Bike / Car"
                                        className="sx-field w-full rounded-2xl px-4 py-3 text-sm placeholder:text-muted-foreground"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-semibold sx-muted">
                                        Investment Price{" "}
                                        <span className="text-emerald-400">
                                            *
                                        </span>
                                    </label>

                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={
                                            investmentPrice
                                        }
                                        onChange={(
                                            event
                                        ) => {
                                            setInvestmentPrice(
                                                event
                                                    .target
                                                    .value
                                            );
                                            resetEvaluation();
                                        }}
                                        placeholder="e.g. 800000"
                                        className="sx-field w-full rounded-2xl px-4 py-3 text-sm placeholder:text-muted-foreground"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-semibold sx-muted">
                                        Down Payment
                                    </label>

                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={
                                            downPayment
                                        }
                                        onChange={(
                                            event
                                        ) => {
                                            setDownPayment(
                                                event
                                                    .target
                                                    .value
                                            );
                                            resetEvaluation();
                                        }}
                                        placeholder="e.g. 150000"
                                        className="sx-field w-full rounded-2xl px-4 py-3 text-sm placeholder:text-muted-foreground"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-semibold sx-muted">
                                        Expected Monthly
                                        EMI{" "}
                                        <span className="text-emerald-400">
                                            *
                                        </span>
                                    </label>

                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={
                                            expectedEmi
                                        }
                                        onChange={(
                                            event
                                        ) => {
                                            setExpectedEmi(
                                                event
                                                    .target
                                                    .value
                                            );
                                            resetEvaluation();
                                        }}
                                        placeholder="e.g. 12000"
                                        className="sx-field w-full rounded-2xl px-4 py-3 text-sm placeholder:text-muted-foreground"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="mb-2 block text-xs font-semibold sx-muted">
                                        Monthly Saving
                                        Plan Optional
                                    </label>

                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={
                                            monthlySavingPlan
                                        }
                                        onChange={(
                                            event
                                        ) => {
                                            setMonthlySavingPlan(
                                                event
                                                    .target
                                                    .value
                                            );
                                            resetEvaluation();
                                        }}
                                        placeholder="e.g. 10000. Leave empty to auto-calculate."
                                        className="sx-field w-full rounded-2xl px-4 py-3 text-sm placeholder:text-muted-foreground"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <button
                                        type="submit"
                                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                                    >
                                        <Calculator
                                            size={17}
                                        />

                                        Evaluate
                                        Investment
                                    </button>
                                </div>
                            </div>
                        </form>

                        <aside className="space-y-6">
                            <section
                                className={`sx-card rounded-3xl p-6 shadow-2xl ${riskStyles.card}`}
                            >
                                <div className="mb-5 flex items-center justify-between gap-4">
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold uppercase tracking-widest sx-muted">
                                            Affordability
                                            Score
                                        </p>

                                        <h2 className="mt-1 font-mono text-4xl font-bold sx-title">
                                            {
                                                displayScore
                                            }
                                            /100
                                        </h2>
                                    </div>

                                    <div
                                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${riskStyles.iconBox}`}
                                    >
                                        <RiskIcon
                                            size={26}
                                            className="shrink-0"
                                        />
                                    </div>
                                </div>

                                <div className="h-3 overflow-hidden rounded-full bg-muted">
                                    <div
                                        className={`h-full rounded-full transition-all duration-300 ${riskStyles.progress}`}
                                        style={{
                                            width: `${displayScore}%`,
                                        }}
                                    />
                                </div>

                                <p className="mt-5 text-sm leading-6 sx-title">
                                    {
                                        displaySuggestion
                                    }
                                </p>
                            </section>

                            <section className="sx-card rounded-3xl p-6 shadow-2xl">
                                <h3 className="mb-5 font-mono text-base font-bold sx-title">
                                    Financial
                                    Snapshot
                                </h3>

                                <div className="space-y-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <span className="flex items-center gap-2 text-sm sx-muted">
                                            <Wallet
                                                size={15}
                                                className="shrink-0"
                                            />

                                            Monthly Balance
                                            Before EMI
                                        </span>

                                        <strong className="shrink-0 font-mono text-sm sx-title">
                                            {hasEvaluated
                                                ? formatCurrencyValue(
                                                    analysis.availableBeforeInvestment,
                                                    currency
                                                )
                                                : "—"}
                                        </strong>
                                    </div>

                                    <div className="flex items-start justify-between gap-4">
                                        <span className="flex items-center gap-2 text-sm sx-muted">
                                            <Calculator
                                                size={15}
                                                className="shrink-0"
                                            />

                                            Balance After
                                            EMI
                                        </span>

                                        <strong
                                            className={`shrink-0 font-mono text-sm ${hasEvaluated &&
                                                analysis.balanceAfterEmi <=
                                                0
                                                ? "text-red-500"
                                                : "text-emerald-500"
                                                }`}
                                        >
                                            {hasEvaluated
                                                ? formatCurrencyValue(
                                                    analysis.balanceAfterEmi,
                                                    currency
                                                )
                                                : "—"}
                                        </strong>
                                    </div>

                                    <div className="flex items-start justify-between gap-4">
                                        <span className="flex items-center gap-2 text-sm sx-muted">
                                            <TrendingUp
                                                size={15}
                                                className="shrink-0"
                                            />

                                            EMI to Income
                                            Ratio
                                        </span>

                                        <strong className="shrink-0 font-mono text-sm sx-title">
                                            {hasEvaluated
                                                ? `${analysis.emiToIncomeRatio.toFixed(
                                                    1
                                                )}%`
                                                : "—"}
                                        </strong>
                                    </div>

                                    <div className="flex items-start justify-between gap-4">
                                        <span className="flex items-center gap-2 text-sm sx-muted">
                                            <PiggyBank
                                                size={15}
                                                className="shrink-0"
                                            />

                                            Savings Gap
                                        </span>

                                        <strong className="shrink-0 font-mono text-sm sx-title">
                                            {hasEvaluated
                                                ? formatCurrencyValue(
                                                    analysis.savingsGap,
                                                    currency
                                                )
                                                : "—"}
                                        </strong>
                                    </div>

                                    <div className="flex items-start justify-between gap-4">
                                        <span className="flex items-center gap-2 text-sm sx-muted">
                                            <ShieldCheck
                                                size={15}
                                                className="shrink-0"
                                            />

                                            Emergency Fund
                                            Target
                                        </span>

                                        <strong className="shrink-0 font-mono text-sm sx-title">
                                            {hasEvaluated
                                                ? formatCurrencyValue(
                                                    analysis.idealEmergencyFund,
                                                    currency
                                                )
                                                : "—"}
                                        </strong>
                                    </div>
                                </div>
                            </section>

                            <section className="sx-card rounded-3xl p-6 shadow-2xl">
                                <div className="mb-6 flex items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                                        <TrendingUp
                                            size={18}
                                            className="shrink-0"
                                        />
                                    </div>

                                    <div>
                                        <h3 className="font-mono text-base font-bold sx-title">
                                            Budget
                                            Breakdown
                                        </h3>

                                        <p className="text-xs sx-muted">
                                            Visual view of
                                            your monthly
                                            cash flow.
                                        </p>
                                    </div>
                                </div>

                                {!hasEvaluated ? (
                                    <div className="sx-panel rounded-2xl p-5 text-sm sx-muted">
                                        Press Evaluate
                                        Investment to
                                        generate the
                                        graph.
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {chartItems.map(
                                            (
                                                item
                                            ) => {
                                                const barColor =
                                                    getBarColor();

                                                const width =
                                                    getBarWidth(
                                                        item.value,
                                                        maxChartValue
                                                    );

                                                return (
                                                    <div
                                                        key={
                                                            item.label
                                                        }
                                                    >
                                                        <div className="mb-2 flex items-center justify-between gap-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />

                                                                <span className="text-xs font-semibold text-zinc-400">
                                                                    {
                                                                        item.label
                                                                    }
                                                                </span>
                                                            </div>

                                                            <span className="font-mono text-xs font-bold text-white">
                                                                {formatCurrencyValue(
                                                                    item.value,
                                                                    currency
                                                                )}
                                                            </span>
                                                        </div>

                                                        <div className="h-4 overflow-hidden rounded-full border border-emerald-500/[0.08] bg-emerald-500/[0.06]">
                                                            <div
                                                                className="h-full rounded-full transition-all duration-700"
                                                                style={{
                                                                    width,
                                                                    backgroundColor:
                                                                        barColor,
                                                                    minWidth:
                                                                        item.value >
                                                                            0
                                                                            ? "10px"
                                                                            : "0px",
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        )}
                                    </div>
                                )}
                            </section>
                        </aside>
                    </div>

                    <section className="mt-8 sx-card rounded-3xl p-6 shadow-2xl">
                        <div className="mb-5 flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
                                <PiggyBank
                                    size={20}
                                    className="shrink-0"
                                />
                            </div>

                            <div>
                                <h2 className="font-mono text-lg font-bold sx-title">
                                    SpendX
                                    Suggestion
                                </h2>

                                <p className="text-xs sx-muted">
                                    Practical advice
                                    before making
                                    the investment.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                            <div className="sx-panel rounded-2xl p-5">
                                <p className="text-xs sx-muted">
                                    Suggested Waiting
                                    Time
                                </p>

                                <h3 className="mt-2 font-mono text-2xl font-bold sx-title">
                                    {hasEvaluated
                                        ? analysis.monthsNeededToSave >
                                            0
                                            ? `${analysis.monthsNeededToSave} month${analysis.monthsNeededToSave ===
                                                1
                                                ? ""
                                                : "s"
                                            }`
                                            : "Down payment ready"
                                        : "Evaluate first"}
                                </h3>
                            </div>

                            <div className="sx-panel rounded-2xl p-5">
                                <p className="text-xs sx-muted">
                                    Suggested Monthly
                                    Saving
                                </p>

                                <h3 className="mt-2 font-mono text-2xl font-bold sx-title">
                                    {hasEvaluated
                                        ? formatCurrencyValue(
                                            analysis.monthlySavingCapacity,
                                            currency
                                        )
                                        : "Evaluate first"}
                                </h3>
                            </div>

                            <div className="sx-panel rounded-2xl p-5">
                                <p className="text-xs sx-muted">
                                    Investment Type
                                </p>

                                <h3 className="mt-2 truncate font-mono text-2xl font-bold sx-title">
                                    {
                                        investmentName.trim() ||
                                        investmentType
                                    }
                                </h3>
                            </div>
                        </div>

                        <div className="mt-6 sx-panel rounded-2xl p-5">
                            <p className="text-sm leading-7 sx-title">
                                {
                                    displaySavingAdvice
                                }
                            </p>
                        </div>

                        <p className="mt-4 text-xs leading-6 sx-muted">
                            This is only a
                            budget-based estimate.
                            Before taking a large
                            loan or making a big
                            investment, compare
                            interest rates, check
                            hidden charges, and keep
                            an emergency fund.
                        </p>
                    </section>
                </main>

                <LiquidGlassNavbar />
            </div>
        </AuthGuard>
    );
}