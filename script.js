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
  ingredients_list.initialize(box);
}

var ingredients_list = {
  initialize: function (box) {
    var self = this;
    this.box = box;
    this.selected = [];
    this.ul = document.createElement('ul');
    this.items = Object.keys(this.box.ingredients).sort().map(this.make_item);
    this.items.forEach(function (li) { self.ul.appendChild(li); });

    document.body.appendChild(this.ul);

    this.ul.addEventListener('click', function (e) {
      if (e.target.tagName !== 'LI') return;
      var ingredient = self.box.ingredients[e.target.dataset.ingredientKey];
      self.toggle(ingredient);
      self.render();
    });
  },
  toggle: function (ingredient) {
    var index = this.selected.indexOf(ingredient);
    also_with_selected = [];
    if (index < 0) {
      this.selected.push(ingredient);
    } else {
      this.selected.splice(index, 1);
    }
    this.selected.forEach(function(selected) {
      selected.also_with.forEach(function (ingredient) {
        also_with_selected.push(ingredient);
      });
    });
    this.also_with_selected = also_with_selected;
  },
  ingredient_class: function (ingredient) {
    var selected = this.selected
    var also_with_selected = this.also_with_selected;
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
  },
  render: function () {
    var self = this;
    var any_selected = !!this.selected.length;
    this.ul.className = any_selected ? "filtered" : "";
    this.items.forEach(function (item) {
      var ingredientKey = item.dataset.ingredientKey;
      var ingredient = self.box.ingredients[ingredientKey];
      item.className = self.ingredient_class(ingredient);
    });
  },
  make_item: function (ingredient) {
    var item = document.createElement('li');
    item.innerHTML = ingredient;
    item.className = "ingredient";
    item.dataset.ingredientKey = ingredient;
    return item;
  }
};

ajax({
  url: "/recipe_ingredients.json",
  success: prepare_ingredients,
  error: function () { console.log(arguments) }
});
