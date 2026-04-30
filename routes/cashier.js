const express = require('express');
const router = express.Router();
const drinkDao = require('../dao/drinkDao');
const MenuItemDAO = require('../dao/MenuItemDao');
const orderDao = require('../dao/orderDao');
const { fetchCollegeStationWeather } = require('../utils/weather');



// Initialize session cart if it doesn't exist
const initializeCart = (req) => {
  if (!req.session.cart) {
    req.session.cart = {
      orderId: null,
      drinks: []
    };
  }
};

async function getAddonName(id) {
  //console.log("in getAddonName");
  const active_addon_list = await MenuItemDAO.get_active_addons()
  //console.log(active_addon_list);
  
  for (let i = 0; i < active_addon_list.length; i++) {
    item = active_addon_list[i];
    //console.log(item);
    if (item.menu_item_id == id) {
      //console.log('name is', item.name);
      return item.name;
    }
  }
}

async function getAddonPrice(id) {
  const active_addon_list = await MenuItemDAO.get_active_addons()
  //console.log(active_addon_list);
  
  for (let i = 0; i < active_addon_list.length; i++) {
    item = active_addon_list[i];
    //console.log(item);
    if (item.menu_item_id == id) {
      //console.log('name is', item.name);
      return parseFloat(item.base_price);
    }
  }
}

async function getAddonList(idsToQuants) {
  strings = [];

  for (let i = 0; i < idsToQuants.length; i++) {
    var item = idsToQuants[i];
    let name = await getAddonName(item.id);
    let quant = item.quantity;
    if (quant > 0) {
      strings.push("".concat(name, " (", quant, ")"));
    }
  }
  /*
  idsToQuants.forEach(async item => {
    //console.log(item);
    let name = "PLACEHOLDER";
    name = await getAddonName(item.id);

    let quant = item.quantity;
    if (quant > 0) {
      //console.log(quant);
      strings.push("".concat(name, " (", quant, ")"));
    }
  });
  */
  return strings;
}

async function getTotalCostOfAddons(idsToQuants) {
  total = 0;
  for (let i = 0; i < idsToQuants.length; i++) {
    let item = idsToQuants[i];
    item_price = await getAddonPrice(item.id);
    total = total + (item.quantity * item_price);
  }
  return total;
}

function objToMap(obj) {
  newMap = new Map();
  for (const item in obj) {
    if (item.quantity > 0) {
      newMap.set(item.id, item.quantity);
    }
  }
  return newMap;
}

// -------------------- MENU --------------------
router.get('/menu', async (req, res) => {
  try {
    initializeCart(req);
    console.log('Cashier: Loading menu page');
    
    const [menuItems, weather] = await Promise.all([
      MenuItemDAO.get_active_drink_items(),
      fetchCollegeStationWeather()
    ]);
    console.log('Cashier: Retrieved', menuItems.length, 'active drink items');

    const categories = {};
    menuItems.forEach(item => {
        if (!categories[item.category]) {
            categories[item.category] = [];
        }
        categories[item.category].push({
            id: item.menu_item_id,
            name: item.name,
            price: parseFloat(item.base_price)
        });
    });

    const addon_list = await MenuItemDAO.get_active_addons();
    console.log('Cashier: Retrieved', addon_list.length, 'active addons');

    const temp = [];
    addon_list.forEach((item) => {
      temp.push({
        id: item.menu_item_id,
        name: item.name,
        price: parseFloat(item.base_price)
      })
    });

    const drinksWithDetails = await Promise.all(
      req.session.cart.drinks.map(async (drink) => {
        const menuItem = await MenuItemDAO.get_all_menu_items()
          .then(items => items.find(item => item.menu_item_id == drink.menuItemId));
        return {
          ...drink,
          menuItemName: menuItem ? menuItem.name : 'Unknown Item'
        };
      })
    );
    
    res.render('cashier/menu', {
      menuItems: menuItems || [],
      categories: categories,
      cartCount: req.session.cart.drinks.length,
      drinks: drinksWithDetails,
      addons: temp,
      statusMessage: '',
      weather
    });
  } catch (err) {
    console.error('Cashier: Error loading menu:', err.message);
    res.render('cashier/menu', {
      menuItems: [],
      cartCount: 0,
      categories: {},
      statusMessage: 'Error loading menu items',
      weather: await fetchCollegeStationWeather()
    });
  }
});

// -------------------- CUSTOMIZE --------------------
router.get('/customize', async (req, res) => {
  try {
    initializeCart(req);
    const { menuItemId } = req.query;
    
    console.log('Cashier: Customize page for menu item:', menuItemId);

    const addon_list = await MenuItemDAO.get_active_addons();
    console.log('Cashier: Retrieved', addon_list.length, 'active addons');

    const temp = [];
    addon_list.forEach((item) => {
      temp.push({
        id: item.menu_item_id,
        name: item.name,
        price: parseFloat(item.base_price)
      })
    });
    
    let selectedItem = null;
    if (menuItemId) {
      selectedItem = await MenuItemDAO.get_price(menuItemId);
      console.log('Cashier: Selected item price:', selectedItem);
    }
    
    res.render('cashier/customize', {
      menuItemId: menuItemId || null,
      selectedItem: selectedItem || null,
      cartCount: req.session.cart.drinks.length,
      addons: temp,
      statusMessage: ''
    });
  } catch (err) {
    console.error('Cashier: Error in customize:', err.message);
    res.render('cashier/customize', {
      menuItemId: null,
      selectedItem: null,
      cartCount: 0,
      addons: null,
      statusMessage: 'Error loading item details'
    });
  }
});

// Add drink to cart
router.post('/menu/add-to-cart', async (req, res) => {
  try {
    initializeCart(req);
    const { menuItemId, iceAmount, sugarAmount, specialNotes, basePrice, idsToQuants } = req.body;
    
    console.log('Cashier: Adding to cart:', { menuItemId, iceAmount, sugarAmount, specialNotes, basePrice, idsToQuants });
    
    if (!menuItemId || !basePrice) {
      console.error('Cashier: Missing required fields for add-to-cart');
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }
    
    addonStrings = await getAddonList(idsToQuants);

    // Create drink object and add to session cart
    const newDrink = {
      drinkId: req.session.cart.drinks.length + 1, // Temp ID for UI
      menuItemId,
      iceAmount: iceAmount,
      sugarAmount: sugarAmount,
      specialNotes: specialNotes || '',
      basePrice: Number(basePrice),
      addons: idsToQuants,
      addonStrings: addonStrings
    };

    
    
    req.session.cart.drinks.push(newDrink);
    console.log('Cashier: Drink added to cart. Cart size:', req.session.cart.drinks.length);
    
    res.json({ 
      success: true, 
      message: 'Item added to cart',
      cartCount: req.session.cart.drinks.length
    });
  } catch (err) {
    console.error('Cashier: Error adding to cart:', err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error adding item to cart' 
    });
  }
});

// -------------------- MODIFY --------------------
router.get('/modify', async (req, res) => {
  try {
    initializeCart(req);
    const { drinkid } = req.query;

    console.log(drinkid);

    //console.log("first drink: ", req.session.cart.drinks[0]);

    //console.log("first drink id: ",req.session.cart.drinks[0].menuItemId);

    let menuItemId = req.session.cart.drinks[drinkid-1].menuItemId;
    const sugarAmount = req.session.cart.drinks[drinkid-1].sugarAmount;
    const iceAmount = req.session.cart.drinks[drinkid-1].iceAmount;
    const drinkAddons = req.session.cart.drinks[drinkid-1].addons;


    //console.log("first drink id: ",req.session.cart.drinks[0].menuItemId);


    console.log('Cashier: Modify page for drink id:', drinkid);

    const addon_list = await MenuItemDAO.get_active_addons();
    console.log('Cashier: Retrieved', addon_list.length, 'active addons');

    const temp = [];
    addon_list.forEach((item) => {
      temp.push({
        id: item.menu_item_id,
        name: item.name,
        price: parseFloat(item.base_price)
      })
    });
    
    let selectedItem = null;
    if (menuItemId) {
      selectedItem = await MenuItemDAO.get_price(menuItemId);
      console.log('Cashier: Selected item price:', selectedItem);
    }

    //console.log("hi");
    
    res.render('cashier/modify', {
      drinkId: drinkid,
      menuItemId: menuItemId,
      drinkSugarAmount: sugarAmount,
      drinkIceAmount: iceAmount,
      drinkAddons: drinkAddons,
      selectedItem: selectedItem || null,
      cartCount: req.session.cart.drinks.length,
      addons: temp,
      statusMessage: ''
    });
  } catch (err) {
    console.error('Cashier: Error in modify:', err.message);
    res.render('cashier/modify', {
      menuItemId: null,
      selectedItem: null,
      cartCount: 0,
      addons: null,
      statusMessage: 'Error loading item details'
    });
  }
});

// Add drink to cart TODO
router.post('/menu/update-in-cart', async (req, res) => {
  try {
    initializeCart(req);
    const { drinkId, menuItemId, iceAmount, sugarAmount, specialNotes, basePrice, idsToQuants } = req.body;
    
    console.log('Cashier: updating in cart:', { drinkId, menuItemId, iceAmount, sugarAmount, specialNotes, basePrice, idsToQuants });
    
    if (!menuItemId || !basePrice) {
      console.error('Cashier: Missing required fields for add-to-cart');
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    console.log("Old drink: ", req.session.cart.drinks[0]);
    
    addonStrings = await getAddonList(idsToQuants);

    // Create drink object and add to session cart
    const updatedDrink = {
      drinkId: drinkId,
      menuItemId,
      iceAmount: iceAmount,
      sugarAmount: sugarAmount,
      specialNotes: specialNotes || '',
      basePrice: Number(basePrice),
      addons: idsToQuants,
      addonStrings: addonStrings
    };

    //console.log("Cashier: updated drink: ", updatedDrink);

    //console.log("about to set ice amount");
    req.session.cart.drinks[drinkId-1] = updatedDrink;
    
    //req.session.cart.drinks.push(newDrink);
    console.log('Cashier: Drink updated in cart. Cart size:', req.session.cart.drinks.length);
    
    res.json({ 
      success: true, 
      message: 'Item updated in cart',
      cartCount: req.session.cart.drinks.length
    });
  } catch (err) {
    console.error('Cashier: Error updating cart item:', err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating cart item' 
    });
  }
});


// -------------------- CHECKOUT --------------------
router.get('/checkout', async (req, res) => {
  try {
    initializeCart(req);
    console.log('Cashier: Loading checkout page with', req.session.cart.drinks.length, 'drinks');
    
    // Get menu item details for each drink in cart
    const drinksWithDetails = await Promise.all(
      req.session.cart.drinks.map(async (drink) => {
        const menuItem = await MenuItemDAO.get_all_menu_items()
          .then(items => items.find(item => item.menu_item_id == drink.menuItemId));
        return {
          ...drink,
          menuItemName: menuItem ? menuItem.name : 'Unknown Item'
        };
      })
    );
    
    const cartTotal = drinksWithDetails.reduce((sum, drink) => sum + drink.basePrice, 0);
    
    res.render('cashier/checkout', {
      drinks: drinksWithDetails,
      cartTotal: cartTotal.toFixed(2),
      cartCount: req.session.cart.drinks.length,
      statusMessage: ''
    });
  } catch (err) {
    console.error('Cashier: Error loading checkout:', err.message);
    res.render('cashier/checkout', {
      drinks: [],
      cartTotal: '0.00',
      cartCount: 0,
      statusMessage: 'Error loading cart'
    });
  }
});

// Remove drink from cart
router.post('/checkout/remove-drink', (req, res) => {
  try {
    initializeCart(req);
    const { drinkIndex } = req.body;
    
    console.log('Cashier: Removing drink at index:', drinkIndex);
    
    if (drinkIndex >= 0 && drinkIndex < req.session.cart.drinks.length) {
      req.session.cart.drinks.splice(drinkIndex, 1);
      console.log('Cashier: Drink removed. Cart size:', req.session.cart.drinks.length);
      
      res.json({ 
        success: true, 
        message: 'Item removed from cart',
        cartCount: req.session.cart.drinks.length
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: 'Invalid drink index' 
      });
    }
  } catch (err) {
    console.error('Cashier: Error removing drink:', err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error removing item' 
    });
  }
});

// -------------------- CONFIRM --------------------
router.get('/confirm', (req, res) => {
  try {
    initializeCart(req);
    console.log('Cashier: Loading confirm page with', req.session.cart.drinks.length, 'drinks');
    
    const cartTotal = req.session.cart.drinks.reduce((sum, drink) => sum + drink.basePrice, 0);
    
    res.render('cashier/confirm', {
      drinks: req.session.cart.drinks,
      cartTotal: cartTotal.toFixed(2),
      cartCount: req.session.cart.drinks.length,
      statusMessage: ''
    });
  } catch (err) {
    console.error('Cashier: Error loading confirm:', err.message);
    res.render('cashier/confirm', {
      drinks: [],
      cartTotal: '0.00',
      cartCount: 0,
      statusMessage: 'Error loading order confirmation'
    });
  }
});

router.post('/menu/clear-cart', (req, res) => {
  try {
    initializeCart(req);
    req.session.cart = {
      orderId: null,
      drinks: []
    };

    return res.json({success: true});

  } catch (err) {
    console.error('Menu: Error clearing cart:', err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error finalizing order' 
    });
  }
});

router.post('/checkout/clear-cart', (req, res) => {
  try {
    initializeCart(req);
    req.session.cart = {
      orderId: null,
      drinks: []
    };

    return res.json({success: true});

  } catch (err) {
    console.error('Checkout: Error clearing cart:', err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error finalizing order' 
    });
  }
});

// Finalize order
router.post('/confirm/finalize-order', async (req, res) => {
  try {
    initializeCart(req);
    
    if (req.session.cart.drinks.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cart is empty' 
      });
    }
    
    console.log('Cashier: Finalizing order with', req.session.cart.drinks.length, 'drinks');
    
    // TODO: Save order to database using orderDao
    // For now, just clear the cart and return success

    const order = {
      created_at: new Date(),
      status: "PAID",
      payment_method: "CARD",
      employee_id: 1,
      notes: "",
      subtotal: 0,
      tax: 0,
      total: 0,
      drinks: req.session.cart.drinks.map(item => ({
        menu_item_id: item.menuItemId,
        quantity: 1,
        ice_amount: item.iceAmount, 
        sugar_amount: item.sugarAmount, 
        special_notes: "",
        base_price: item.basePrice,
        addons: objToMap(item.addons)
      }))
    }

    const result = await orderDao.submitOrder(order);
    //console.log("about to null cart");
    req.session.cart = {
      orderId: null,
      drinks: []
    };
    if (!result.success) {
        return res.json({ success: false });
    }

    await orderDao.updateInventory(order, MenuItemDAO, null);

    //res.json({ success: true, orderId: result.orderId });

    
   
    
    res.json({ 
      success: true, 
      message: 'Order confirmed',
      redirectUrl: '/cashier/menu'
    });
  } catch (err) {
    console.error('Cashier: Error finalizing order:', err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error finalizing order' 
    });
  }
});

module.exports = router;
