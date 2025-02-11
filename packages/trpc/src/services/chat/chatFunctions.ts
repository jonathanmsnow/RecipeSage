import { Prisma } from "@prisma/client";
import { RunnableToolFunction } from "openai/lib/RunnableFunction";

export const initBuildRecipe = (
  userId: string,
  result: Prisma.RecipeUncheckedCreateInput[],
): RunnableToolFunction<{
  title: unknown;
  yield: unknown;
  activeTime: unknown;
  totalTime: unknown;
  ingredients: unknown;
  instructions: unknown;
}> => ({
  type: "function",
  function: {
    name: "displayRecipe",
    description:
      "Displays a recipe in-app to the user. This must always be used any time you use ingredients or instructions in your response.",
    parse: JSON.parse,
    function: (args) => {
      console.log("buildRecipe called with", args);

      const recipe: Prisma.RecipeUncheckedCreateInput = {
        userId,
        fromUserId: null,
        title: typeof args.title === "string" ? args.title : "Unnamed",
        description: "",
        folder: "main",
        source: "RecipeSage Cooking Assistant",
        url: "",
        rating: null,
        yield: typeof args.yield === "string" ? args.yield : "",
        activeTime: typeof args.activeTime === "string" ? args.activeTime : "",
        totalTime: typeof args.totalTime === "string" ? args.totalTime : "",
        ingredients: Array.isArray(args.ingredients)
          ? args.ingredients.join("\n")
          : "",
        instructions: Array.isArray(args.instructions)
          ? args.instructions.join("\n")
          : "",
        notes: "",
      };

      result.push(recipe);

      // Return the same thing GPT sent us so that it replies to user with what it built
      // If we don't do this, ChatGPT will create a new (different) recipe and reply with that
      return args;
    },
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "The title of the recipe",
        },
        yield: {
          type: "string",
          description: `The yield of the recipe. E.g. "2 servings" or "6 cupcakes"`,
        },
        activeTime: {
          type: "string",
          description: "The amount of time spent actively preparing the recipe",
        },
        totalTime: {
          type: "string",
          description:
            "The total amount of time it will take to cook the recipe including prep",
        },
        ingredients: {
          type: "array",
          items: {
            type: "string",
            description: "An ingredient required for the recipe",
          },
        },
        instructions: {
          type: "array",
          items: {
            type: "string",
            description: "An instruction for the recipe",
          },
        },
      },
      required: ["title", "ingredients", "instructions"],
    },
  },
});
