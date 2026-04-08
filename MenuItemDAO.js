const { Pool } = require('pg');

class MenuItemDAO {
    constructor(pool){
        this.pool = pool;
    }

    get_all_menu_items() {
        
    }

    get_active_menu_items() {

    }

    get_ingredients(menu_item_id) {

    }

    get_price(menu_item_id) {

    }

    is_addon(menu_item_id) {

    }

    toggle_active(menu_item_id) {

    }

    update_price(menu_item_id, new_price) {

    }

    insert_menu_item(name, category, base_price, description, active) {

    }

    add_recipe_ingredient(menu_item_id, ingredient_id, qty_required) {

    }

    get_recipe_lines(menu_item_id) {

    }
}

const menuDAO = new MenuDao(pool);

module.exports menuDAO;