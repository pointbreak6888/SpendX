const categoryAliases: Record<string, string[]> = {
    Food: [
        "food",
        "restaurant",
        "restaurants",
        "dining",
        "lunch",
        "dinner",
        "meal",
        "meals",
        "eating",
    ],

    Transport: [
        "transport",
        "transportation",
        "travel",
        "uber",
        "taxi",
        "bus",
        "train",
        "fuel",
        "petrol",
        "diesel",
    ],

    Shopping: [
        "shopping",
        "shop",
        "purchase",
        "purchases",
    ],

    Entertainment: [
        "entertainment",
        "movie",
        "movies",
        "games",
        "gaming",
    ],

    Bills: [
        "bill",
        "bills",
        "utilities",
        "electricity",
        "water",
        "internet",
        "phone",
    ],

    Health: [
        "health",
        "medical",
        "medicine",
        "medicines",
        "doctor",
        "hospital",
    ],

    Education: [
        "education",
        "college",
        "school",
        "course",
        "courses",
        "books",
    ],
};

export function detectCategory(
    question: string
): string | null {
    const text = question.toLowerCase();

    for (const [category, aliases] of Object.entries(
        categoryAliases
    )) {
        if (
            aliases.some((alias) =>
                text.includes(alias)
            )
        ) {
            return category;
        }
    }

    return null;
}