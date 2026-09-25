"use client";

type SuggestedQuestionsProps = {
    onSelect: (question: string) => void;
};

const questions = [
    // =========================
    // GENERAL SPENDING
    // =========================

    "How much did I spend today?",
    "How much did I spend yesterday?",
    "How much did I spend this week?",
    "How much did I spend this month?",
    "How much did I spend last week?",
    "How much did I spend last month?",
    "How much did I spend this year?",
    "How much did I spend in the last 7 days?",
    "How much did I spend in the last 30 days?",
    "What is my total spending?",

    // =========================
    // SPENDING OVER DIFFERENT PERIODS
    // =========================

    "What are my expenses today?",
    "What are my expenses this week?",
    "What are my expenses this month?",
    "What were my expenses yesterday?",
    "What were my expenses last week?",
    "What were my expenses last month?",
    "What were my expenses this year?",
    "How much have I spent recently?",
    "How much have I spent over the last 7 days?",
    "How much have I spent over the last 30 days?",

    // =========================
    // TOP CATEGORIES
    // =========================

    "Where did I spend the most this month?",
    "Where did I spend the most this week?",
    "Where did I spend the most last month?",
    "Where do I spend the most money?",
    "What are my top spending categories?",
    "What are my biggest spending categories?",
    "Which category costs me the most?",
    "Which category did I spend the most on this month?",
    "Which category did I spend the most on this week?",
    "Which category did I spend the most on last month?",

    // =========================
    // CATEGORY SPENDING
    // =========================

    "How much did I spend on food today?",
    "How much did I spend on food this week?",
    "How much did I spend on food this month?",
    "How much did I spend on food last month?",
    "How much did I spend on shopping this week?",
    "How much did I spend on shopping this month?",
    "How much did I spend on shopping last month?",
    "How much did I spend on transport this week?",
    "How much did I spend on transport this month?",
    "How much did I spend on transport last month?",

    // =========================
    // MORE CATEGORY QUESTIONS
    // =========================

    "How much did I spend on entertainment this month?",
    "How much did I spend on entertainment last month?",
    "How much did I spend on bills this month?",
    "How much did I spend on bills last month?",
    "How much did I spend on groceries this month?",
    "How much did I spend on groceries last month?",
    "How much did I spend on travel this month?",
    "How much did I spend on travel last month?",
    "How much did I spend on health this month?",
    "How much did I spend on health last month?",

    // =========================
    // BIGGEST EXPENSES
    // =========================

    "What was my biggest expense today?",
    "What was my biggest expense this week?",
    "What was my biggest expense this month?",
    "What was my biggest expense last month?",
    "What was my biggest expense this year?",
    "What is my biggest expense of all time?",
    "What was my most expensive transaction today?",
    "What was my most expensive transaction this week?",
    "What was my most expensive transaction this month?",
    "What was my most expensive transaction last month?",

    // =========================
    // LARGE TRANSACTIONS
    // =========================

    "Show me my largest expense.",
    "Show me my largest transaction.",
    "What did I spend the most money on?",
    "Which transaction cost me the most?",
    "Which expense was the largest this month?",
    "Which expense was the largest last month?",
    "What is the highest amount I have spent?",
    "What is my biggest transaction this year?",
    "What is my largest purchase this month?",
    "What is my largest purchase last month?",

    // =========================
    // INCOME
    // =========================

    "How much did I earn today?",
    "How much did I earn this week?",
    "How much did I earn this month?",
    "How much did I earn last month?",
    "How much did I earn this year?",
    "How much income did I receive today?",
    "How much income did I receive this week?",
    "How much income did I receive this month?",
    "How much income did I receive last month?",
    "What is my total income?",

    // =========================
    // MORE INCOME QUESTIONS
    // =========================

    "Show me my income this month.",
    "Show me my income this week.",
    "Show me my income last month.",
    "What was my income this month?",
    "What was my income last month?",
    "How much money came in this month?",
    "How much money came in last month?",
    "How much money did I receive this year?",
    "How much have I earned so far?",
    "What is my total earnings?",

    // =========================
    // SAVINGS
    // =========================

    "How much did I save today?",
    "How much did I save this week?",
    "How much did I save this month?",
    "How much did I save last month?",
    "How much did I save this year?",
    "What are my savings this month?",
    "What are my savings this year?",
    "What is my current savings?",
    "Did I save money this month?",
    "Did I save money last month?",

    // =========================
    // SAVINGS & BALANCE
    // =========================

    "How much money do I have left this month?",
    "How much money is left after my expenses?",
    "How much did I keep after spending this month?",
    "What is my income minus expenses this month?",
    "What is my income minus expenses this year?",
    "How much did I spend compared with my income?",
    "How much of my income did I spend?",
    "How much of my income did I save?",
    "What is my net savings this month?",
    "What is my net savings this year?",

    // =========================
    // RECENT TRANSACTIONS
    // =========================

    "Show me my recent transactions.",
    "What are my latest transactions?",
    "Show me my recent expenses.",
    "Show me my recent income.",
    "What did I spend money on recently?",
    "What were my latest expenses?",
    "What were my latest transactions?",
    "Show my latest spending.",
    "Show my latest expenses.",
    "Show my latest income transactions.",

    // =========================
    // AVERAGE SPENDING
    // =========================

    "What is my average expense?",
    "What is my average spending?",
    "What is my average spending this week?",
    "What is my average spending this month?",
    "What is my average spending last month?",
    "What is my average expense this month?",
    "What is my average expense this week?",
    "What is my average expense last month?",
    "How much do I spend on average?",
    "What is my average transaction amount?",

    // =========================
    // COMPARISONS
    // =========================

    "How does my spending compare with last month?",
    "How does my spending compare with last week?",
    "Did I spend more this month than last month?",
    "Did I spend less this month than last month?",
    "Did I spend more this week than last week?",
    "Did I spend less this week than last week?",
    "Is my spending increasing?",
    "Is my spending decreasing?",
    "How has my spending changed?",
    "How has my spending changed compared with last month?",

    // =========================
    // FINAL GENERAL QUESTIONS
    // =========================

    "What are my biggest expenses?",
    "What are my most common expenses?",
    "What do I spend most of my money on?",
    "Which expenses take up most of my money?",
    "Can you summarize my spending this month?",
    "Can you summarize my expenses?",
    "Can you summarize my finances this month?",
    "Give me an overview of my spending.",
    "Give me an overview of my expenses.",
    "Give me an overview of my financial activity.",
];

export default function SuggestedQuestions({
    onSelect,
}: SuggestedQuestionsProps) {
    return (
        <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider sx-muted">
                Suggested questions
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
                {questions.map(
                    (question) => (
                        <button
                            key={question}
                            type="button"
                            onClick={() =>
                                onSelect(
                                    question
                                )
                            }
                            className="rounded-2xl border border-border bg-card/30 px-4 py-3 text-left text-sm sx-muted transition-colors hover:bg-card/60 hover:sx-title"
                        >
                            {question}
                        </button>
                    )
                )}
            </div>
        </div>
    );
}