class MenuItem {
    menu_item_id = -1;
    name = "foot juice";
    category = "none";
    base_price = 0.0;
    active = false;

    constructor(menu_item_id, name, category, base_price, active) {
        this.menu_item_id = menu_item_id;
        this.name = name;
        this.category = category;
        this.base_price = base_price;
        this.active = active;
    }

    get_id() { return this.menu_item_id; }

    get_name() { return this.name; }

    get_category() { return this.category; }

    get_base_price() { return this.base_price; }

    is_active() { return this.active; }
    
}