import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
}

if (!openaiApiKey) {
    throw new Error("Missing OPENAI_API_KEY");
}

const openai = new OpenAI({
    apiKey: openaiApiKey,
});

export async function POST(request: Request) {
    try {
        const authorization = request.headers.get("authorization");

        if (!authorization?.startsWith("Bearer ")) {
            return Response.json(
                { error: "Authentication required." },
                { status: 401 }
            );
        }

        const accessToken = authorization.replace("Bearer ", "").trim();

        if (!accessToken) {
            return Response.json(
                { error: "Authentication required." },
                { status: 401 }
            );
        }

        const supabase = createClient(
            supabaseUrl!,
            supabaseAnonKey!,
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                },
            }
        );

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return Response.json(
                { error: "Invalid or expired session." },
                { status: 401 }
            );
        }

        const body = await request.json();
        const question = String(body?.question || "").trim();

        if (!question) {
            return Response.json(
                { error: "Please enter a question." },
                { status: 400 }
            );
        }

        const { data: transactions, error: transactionsError } =
            await supabase
                .from("transactions")
                .select(
                    "amount, type, category, transaction_mode, transaction_date"
                )
                .eq("user_id", user.id)
                .order("transaction_date", {
                    ascending: false,
                });

        if (transactionsError) {
            console.error(
                "AI transactions error:",
                transactionsError
            );

            return Response.json(
                { error: "Unable to load your transaction data." },
                { status: 500 }
            );
        }

        const userTransactions = transactions || [];

        const totalIncome = userTransactions
            .filter((transaction) => transaction.type === "income")
            .reduce(
                (sum, transaction) => sum + Number(transaction.amount || 0),
                0
            );

        const totalExpenses = userTransactions
            .filter((transaction) => transaction.type === "expense")
            .reduce(
                (sum, transaction) => sum + Number(transaction.amount || 0),
                0
            );

        const balance = totalIncome - totalExpenses;

        const categoryTotals: Record<string, number> = {};

        userTransactions
            .filter((transaction) => transaction.type === "expense")
            .forEach((transaction) => {
                const category = transaction.category || "Other";

                categoryTotals[category] =
                    (categoryTotals[category] || 0) +
                    Number(transaction.amount || 0);
            });

        const financialContext = {
            totalIncome,
            totalExpenses,
            balance,
            expenseByCategory: categoryTotals,
            transactionCount: userTransactions.length,
            recentTransactions: userTransactions.slice(0, 20),
        };

        const response = await openai.responses.create({
            model: "gpt-5-mini",
            instructions: `
You are SpendX AI, a personal finance assistant inside the SpendX application.

Your job is to help the user understand their recorded financial transactions.

Rules:
- Only use the financial data provided to you.
- Never invent transactions, amounts, categories, income, or expenses.
- If the provided data is insufficient to answer a question, clearly say so.
- Do not claim that you can access the user's bank account.
- Do not claim that you can make payments, transfers, investments, or other financial transactions.
- Clearly distinguish recorded facts from suggestions.
- Give practical, concise answers.
- Use Indian Rupees (₹) when discussing monetary amounts.
- When appropriate, explain calculations briefly.
- This is a budgeting and spending-analysis assistant, not a licensed financial advisor.

The user's financial data is:
${JSON.stringify(financialContext, null, 2)}
            `,
            input: question,
        });

        return Response.json({
            answer: response.output_text,
        });
    } catch (error) {
        console.error("AI chat error:", error);

        return Response.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unknown server error.",
            },
            { status: 500 }
        );
    }
}