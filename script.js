function build_also_with_lookup (recipes, ingredients) {
  var also_with = {};

  for (var ingredient in recipes) {
    if (!also_with[ingredient]) {
      also_with[ingredient] = [];
    }
    recipes[ingredient].forEach(function (recipe) {
      ingredients[recipe].forEach(function (partner_ingredient) {
        if (also_with[ingredient].indexOf(partner_ingredient) < 0) {
          also_with[ingredient].push(partner_ingredient);
        }
      });
    });
  }

  return also_with;
};

function recipes_per_ingredient (ingredients, item) {
  ingredients[item.ingredient] = ingredients[item.ingredient] || [];
  ingredients[item.ingredient].push(item.r_id);
  return ingredients;
}

function ingredients_per_recipe (recipes, item) {
  recipes[item.r_id] = recipes[item.r_id] || [];
  recipes[item.r_id].push(item.ingredient);
  return recipes;
}

function display_ingredients (recipe_ingredients) {
  var ingredients = recipe_ingredients.reduce(recipes_per_ingredient, {});
  var recipes = recipe_ingredients.reduce(ingredients_per_recipe, {});
  var also_with = build_also_with_lookup(ingredients, recipes);
}

ajax({
  url: "/recipe_ingredients.json",
  success: display_ingredients,
  error: function () { console.log(arguments) }
});
