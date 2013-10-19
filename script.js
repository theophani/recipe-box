function values_per_key (pairs, key_name, value_name) {
  return pairs.reduce(function (results, pair) {
    results[pair[key_name]] = results[pair[key_name]] || [];
    results[pair[key_name]].push(pair[value_name]);
    return results;
  }, {});
}

function build_box (recipe_ingredients) {
  var ingredients = values_per_key(recipe_ingredients, "ingredient", "r_id");
  var recipes = values_per_key(recipe_ingredients, "r_id", "ingredient");

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

function prepare_ingredients (recipe_ingredients) {
  var box = build_box(recipe_ingredients);
  ingredients_list(box);
}

function ingredients_list (box) {
  var selected = [];
  var also_with_selected = [];
  var ul = document.createElement('ul');
  var items;

  function toggle (ingredient) {
    var index = selected.indexOf(ingredient);
    also_with_selected = [];
    if (index < 0) {
      selected.push(ingredient);
    } else {
      selected.splice(index, 1);
    }
    selected.forEach(function(item) {
      item.also_with.forEach(function (ingredient) {
        also_with_selected.push(ingredient);
      });
    });
  }

  function ingredient_class (ingredient) {
    var also_with = 0;

    if (!selected.length) {
      return "ingredient";
    }

    if (selected.indexOf(ingredient) > -1) {
      return "ingredient selected";
    }

    also_with = also_with_selected.filter(function (selected) {
      return selected === ingredient;
    });

    if (also_with.length === selected.length) {
      return "ingredient also_with_selected";
    } else {
      return "ingredient";
    }
  }

  function render () {
    var any_selected = !!selected.length;
    ul.className = any_selected ? "filtered" : "";
    items.forEach(function (item) {
      var ingredientKey = item.dataset.ingredientKey;
      var ingredient = box.ingredients[ingredientKey];
      item.className = ingredient_class(ingredient);
    });
  }

  function make_item (ingredient) {
    var item = document.createElement('li');
    item.innerHTML = ingredient;
    item.className = "ingredient";
    item.dataset.ingredientKey = ingredient;
    return item;
  }

  items = Object.keys(box.ingredients).sort().map(make_item);
  items.forEach(function (li) { ul.appendChild(li); });
  document.body.appendChild(ul);

  ul.addEventListener('click', function (e) {
    if (e.target.tagName !== 'LI') return;
    var ingredient = box.ingredients[e.target.dataset.ingredientKey];
    toggle(ingredient);
    render();
  });
}

ajax({
  url: "/recipe_ingredients.json",
  success: prepare_ingredients,
  error: function () { console.log(arguments) }
});
