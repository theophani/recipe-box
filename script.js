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

function ingredients_list (box) {
  var selected = [];
  var also_with_selected = [];
  var ul = document.createElement('ul');
  var items;

  function toggle (ingredient) {
    var index = selected.indexOf(ingredient);

    if (index < 0) {
      selected.push(ingredient);
    } else {
      selected.splice(index, 1);
    }

    also_with_selected = Object.keys(box.recipes).map(function (key) {
      return box.recipes[key];
    }).filter(function (recipe) {
      return selected.every(function (item) {
        return recipe.ingredients.some(function (ingredient) {
          return ingredient === item;
        });
      });
    }).reduce(function (combined, recipe) {
      return combined.concat(recipe.ingredients);
    }, []);
  }

  function ingredient_class (ingredient) {
    var also_with;

    if (!selected.length) {
      return "ingredient";
    }

    if (selected.indexOf(ingredient) > -1) {
      return "ingredient selected";
    }

    if (also_with_selected.indexOf(ingredient) > -1) {
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

  function broadcast () {
    var data = { detail: { selected_ingredients: selected } };
    var evt = new CustomEvent('ingredient:selected', data)
    document.dispatchEvent(evt);
  }

  items = Object.keys(box.ingredients).sort().map(make_item);
  items.forEach(function (li) { ul.appendChild(li); });
  document.querySelector('.ingredients_list').appendChild(ul);

  ul.addEventListener('click', function (e) {
    if (e.target.tagName !== 'LI') return;
    var ingredient = box.ingredients[e.target.dataset.ingredientKey];
    toggle(ingredient);
    render();
    broadcast();
  });
}

function recipes_list (box) {
  var ul = document.createElement('ul');
  var items;

  function recipe_class (recipe) {
    var has_selected = 0;

    if (!selected_ingredients.length) {
      return "recipe";
    }

    selected_ingredients.forEach(function (ingredient) {
      if (recipe.ingredients.indexOf(ingredient) > -1) {
        has_selected++;
      }
    });

    if (has_selected === selected_ingredients.length) {
      return "recipe selected";
    } else {
      return "recipe";
    }
  }

  function render () {
    var any_selected = !!selected_ingredients.length;
    ul.className = any_selected ? "filtered" : "";
    items.forEach(function (item) {
      var recipeKey = item.dataset.recipeKey;
      var recipe = box.recipes[recipeKey];
      item.className = recipe_class(recipe);
    });
  }

  function make_item (recipe) {
    var item = document.createElement('li');
    item.innerHTML = recipe;
    item.className = "recipe";
    item.dataset.recipeKey = recipe;
    return item;
  }

  items = Object.keys(box.recipes).sort().map(make_item);
  items.forEach(function (li) { ul.appendChild(li); });
  document.querySelector('.recipes_list').appendChild(ul);

  document.addEventListener('ingredient:selected', function (e) {
    selected_ingredients = e.detail.selected_ingredients;
    render();
  });
}

function prepare_ingredients (recipe_ingredients) {
  var box = build_box(recipe_ingredients);
  ingredients_list(box);
  recipes_list(box);
}

ajax({
  url: "/recipe_ingredients.json",
  success: prepare_ingredients,
  error: function () { console.log(arguments) }
});
