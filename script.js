function pushState (selected) {
  var selected_ingredients = selected.map(function (i) {
    return i.name;
  });
  var search = "?ingredients=" + selected_ingredients.join(':');
  var pageState = { selected_ingredients: selected_ingredients };
  var pageUrl = selected.length ? search : "";
  window.history.pushState(pageState, "", pageUrl);
}

function values_per_key (pairs, key_name, value_name) {
  return pairs.reduce(function (results, pair) {
    results[pair[key_name]] = results[pair[key_name]] || [];
    results[pair[key_name]].push(pair[value_name]);
    return results;
  }, {});
}

function ingredients_lists(object) {
  return Object.keys(object).map(function (key) {
    return object[key].ingredients;
  });
}

function is_subset (subset) {
  return function (superset) {
    return subset.every(function (i) {
      return superset.some(function (j) {
        return i === j;
      });
    });
  };
}

function concat (a, b) {
  return a.concat(b);
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

    also_with_selected = ingredients_lists(box.recipes)
      .filter(is_subset(selected))
      .reduce(concat, []);
  }

  function ingredient_class (ingredient) {
    if (!selected.length) {
      return "ingredient";
    }

    if (selected.indexOf(ingredient) > -1) {
      return "ingredient selected";
    }

    if (also_with_selected.indexOf(ingredient) > -1) {
      return "ingredient also_with_selected";
    }

    return "ingredient";
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

  function set_selected (selected_ingredients) {
    selected = []; // reset all
    selected_ingredients.forEach(function (name) {
      toggle(box.ingredients[name]);
    });
    broadcast();
  }

  function init_from_query () {
    var matches = window.location.search.match(/ingredients=(.*)/);
    if (matches) {
      set_selected(decodeURIComponent(matches[1]).split(":"));
    }
  }

  function broadcast () {
    var data = { detail: { selected_ingredients: selected } };
    var evt = new CustomEvent('ingredient:selected', data)
    document.dispatchEvent(evt);
  }

  items = Object.keys(box.ingredients).sort().map(make_item);
  items.forEach(function (li) { ul.appendChild(li); });
  document.querySelector('.ingredients_list').appendChild(ul);

  document.addEventListener('ingredient:selected', function (e) {
    render();
  });

  window.onpopstate = function (e) {
    var selected_ingredients = e.state ? e.state.selected_ingredients : [];
    set_selected(selected_ingredients);
  };

  ul.addEventListener('click', function (e) {
    if (e.target.tagName !== 'LI') return;
    var ingredient = box.ingredients[e.target.dataset.ingredientKey];
    toggle(ingredient);
    pushState(selected);
    broadcast();
  });

  init_from_query();
}

function recipes_list (box) {
  var ul = document.createElement('ul');
  var items = [];
  var selected_ingredients = [];
  var selected_recipe = false;
  var template =  '<h1>TITLE</h1>';
      template += '<div class="ingredients">INGREDIENTS</div>';

  function toggle (recipe) {
    if (selected_recipe === recipe) {
      selected_recipe = false;
    } else {
      selected_recipe = recipe;
    }
  }

  function recipe_class (recipe) {
    if (recipe === selected_recipe) {
      return "recipe selectable selected";
    }

    if (!selected_ingredients.length) {
      return "recipe";
    }

    if (is_subset(selected_ingredients)(recipe.ingredients)) {
      return "recipe selectable";
    }

    return "recipe";
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

  function make_item (recipeKey) {
    var recipe = box.recipes[recipeKey];
    var item = document.createElement('li');
    var html = template
                .replace(/TITLE/, recipe.title)
                .replace(/INGREDIENTS/, recipe.ingredients.map(function (i) {
                  return '<span>' + i.name + '</span>';
                }, []).join(' '));
    item.innerHTML = html;
    item.className = recipe_class(recipe);
    item.dataset.recipeKey = recipeKey;
    return item;
  }

  function put_in_box (recipes) {
    Object.keys(recipes).forEach(function (key) {
      var recipe = recipes[key];
      if (box.recipes[key]) {
        box.recipes[key].title = recipe.title;
        box.recipes[key].contents = recipe.contents;
        box.recipes[key].recommended = recipe.recommended;
        box.recipes[key].remark = recipe.remark;
      } else {
        console.log(recipe.title + ' (id ' + recipe.r_id + ') is missing!');
      }
    });
  }

  function display_recipes () {
    items = Object.keys(box.recipes).sort().map(make_item);
    items.forEach(function (li) { ul.appendChild(li); });
    document.querySelector('.recipes_list').appendChild(ul);
  }

  function set_selected (selected) {
    selected_ingredients = selected.map(function (name) {
      return box.ingredients[name];
    });
    render();
  }

  function init_from_query () {
    var matches = window.location.search.match(/ingredients=(.*)/);
    if (matches) {
      set_selected(decodeURIComponent(matches[1]).split(":"));
    }
  }

  function prepare_recipes (recipes) {
    put_in_box(recipes);
    display_recipes();
    init_from_query();
  }

  function broadcast () {
    var data = { detail: { selected_recipe: selected_recipe } };
    var evt = new CustomEvent('recipe:selected', data)
    document.dispatchEvent(evt);
  }

  document.addEventListener('ingredient:selected', function (e) {
    selected_ingredients = e.detail.selected_ingredients;
    render();
  });

  ul.addEventListener('click', function (e) {
    var li = e.target;
    while (li.tagName !== 'LI' && li !== ul) {
      li = li.parentElement;
    }
    var recipe = box.recipes[li.dataset.recipeKey];
    toggle(recipe);
    render();
    broadcast();
  });

  ajax({
    url: "/recipes.json",
    success: prepare_recipes,
    error: function () { console.log(arguments) }
  });
}

function recipe_viewer () {
  var template =  '<h1>TITLE</h1>';
      template +=  'RECOMMENDED';
      // template += '<div class="ingredients">INGREDIENTS</div>';
      template += '<blockquote class="remark">REMARK</blockquote>';
      template += '<div class="contents">CONTENTS</div>';
  var recommended_template = '<span class="recommended">Tiffany Recommends</span>'
  var viewer = document.querySelector('.recipe_viewer');
  var recipe = false;

  function render () {
    if (!recipe) {
      document.body.className = "";
      return;
    }
    var html = template
                .replace(/TITLE/, recipe.title)
                .replace(/INGREDIENTS/, recipe.ingredients.map(function (i) {
                  return '<span>' + i.name + '</span>';
                }, []).join(' '))
                .replace(/RECOMMENDED/, recipe.recommended ? recommended_template : "")
                .replace(/REMARK/, recipe.remark ? recipe.remark : "")
                .replace(/CONTENTS/, recipe.contents);
    viewer.innerHTML = html;
    document.body.className = "viewing_recipe";
  }

  document.addEventListener('recipe:selected', function (e) {
    recipe = e.detail.selected_recipe;
    render();
  });
}

function prepare_ingredients (recipe_ingredients) {
  var box = build_box(recipe_ingredients);
  ingredients_list(box);
  recipes_list(box);
  recipe_viewer();
}

ajax({
  url: "/recipe_ingredients.json",
  success: prepare_ingredients,
  error: function () { console.log(arguments) }
});
