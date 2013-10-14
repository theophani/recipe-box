function build_box (ingredients, recipes) {
  var box = {
    ingredients: {},
    recipes: {}
  };

  function createRecipeLiteral (key) {
    return {
      ingredients: [],
      key: key
    };
  }

  Object.keys(ingredients).forEach(function (key) {
    var ingredient = {
      "also_with": [],
      "recipes": [],
      "name": key
    };

    ingredients[key].forEach(function (recipeKey) {
      var recipe = box.recipes[recipeKey] || createRecipeLiteral(recipeKey);

      if (!box.recipes[recipeKey]) {
        box.recipes[recipeKey] = recipe;
      }

      ingredient.recipes.push(recipe);

      box.ingredients[key] = ingredient;
    });
  });

  Object.keys(recipes).forEach(function (key) {
    var recipe = box.recipes[key];

    recipes[key].forEach(function (ingredientKey) {
      recipe.ingredients.push(box.ingredients[ingredientKey]);
    });

    recipe.ingredients.forEach(function (ingredient) {
      recipe.ingredients.forEach(function (partner_ingredient) {
        var same = ingredient == partner_ingredient;
        if (!same && ingredient.also_with.indexOf(partner_ingredient) < 0) {
          ingredient.also_with.push(partner_ingredient);
        }
      });
    });
  });

  return box;
}

function values_per_key (pairs, key_name, value_name) {
  return pairs.reduce(function (results, pair) {
    results[pair[key_name]] = results[pair[key_name]] || [];
    results[pair[key_name]].push(pair[value_name]);
    return results;
  }, {});
}

function make_item (ingredient) {
  var item = document.createElement('li');
  item.innerHTML = ingredient;
  item.className = "ingredient";
  return item;
};

function display_ingredients (ingredients) {
  var list = document.createElement('ul');
  var items =   Object.keys(ingredients).sort().map(make_item);
  items.forEach(function (item) { list.appendChild(item); });
  document.body.appendChild(list);
  list.addEventListener('ingredient:clicked', function (e) {
    console.log(e, e.detail);
  });
  list.addEventListener('click', function (e) {
    if (e.target.tagName !== 'LI') return;
    var ingredient = e.target.innerHTML;
    var detail = { ingredient: ingredient };
    var ev = new CustomEvent('ingredient:clicked', { detail: detail, bubbles: true });
    list.dispatchEvent(ev);
  });
}

function prepare_ingredients (recipe_ingredients) {
  var ingredients = values_per_key(recipe_ingredients, "ingredient", "r_id");
  var recipes = values_per_key(recipe_ingredients, "r_id", "ingredient");
  var box = build_box(ingredients, recipes);

  display_ingredients(ingredients);
  console.log(box)
}

ajax({
  url: "/recipe_ingredients.json",
  success: prepare_ingredients,
  error: function () { console.log(arguments) }
});
