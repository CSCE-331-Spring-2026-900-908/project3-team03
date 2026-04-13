const express = require('express');
const router = express.Router();
const menuItemDAO = require('../Dao/MenuItemDAO');

console.log('BEGIN TESTING');
menuItemDAO.get_price(1).then((lava_flow_price) => {
    console.log("LAVA FLOW PRICE: ", lava_flow_price);
});

menuItemDAO.is_addon(1).then((active) => {
    console.log("LAVA FLOW IS ADDON: ", active);
});

menuItemDAO.get_recipe_lines(1).then((recipe_lines) => {
    console.log('LAVA FLOW RECIPE LINES: ', recipe_lines);
});

menuItemDAO.toggle_active(1).then(() => {
    console.log("LAVA FLOW ACTIVE TOGGLED");
});

menuItemDAO.update_price(1, 6.37).then(() => {
    console.log("LAVA FLOW PRICE UPDATED");
});

