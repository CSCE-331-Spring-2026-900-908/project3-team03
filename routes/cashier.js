const express = require('express');
const router = express.Router();
const drinkDao = require('../Dao/drinkDao');
const MenuItemDAO = require('../Dao/MenuItemDAO');
const orderDao = require('../Dao/orderDao');

// Initialize session cart if it doesn't exist
const initializeCart = (req) => {
  if (!req.session.cart) {
    req.session.cart = {
      orderId: null,
      drinks: []
    };
  }
};

// -------------------- MENU --------------------
router.get('/menu', async (req, res) => {
  try {
    initializeCart(req);
    console.log('Cashier: Loading menu page');
    
    const menuItems = await MenuItemDAO.get_active_menu_items();
    console.log('Cashier: Retrieved', menuItems.length, 'active menu items');
    
    res.render('cashier/menu', {
      menuItems: menuItems || [],
      cartCount: req.session.cart.drinks.length,
      statusMessage: ''
    });
  } catch (err) {
    console.error('Cashier: Error loading menu:', err.message);
    res.render('cashier/menu', {
      menuItems: [],
      cartCount: 0,
      statusMessage: 'Error loading menu items'
    });
  }
});

// -------------------- CUSTOMIZE --------------------
router.get('/customize', async (req, res) => {
  try {
    initializeCart(req);
    const { menuItemId } = req.query;
    
    console.log('Cashier: Customize page for menu item:', menuItemId);
    
    let selectedItem = null;
    if (menuItemId) {
      selectedItem = await MenuItemDAO.get_price(menuItemId);
      console.log('Cashier: Selected item price:', selectedItem);
    }
    
    res.render('cashier/customize', {
      menuItemId: menuItemId || null,
      selectedItem: selectedItem || null,
      cartCount: req.session.cart.drinks.length,
      statusMessage: ''
    });
  } catch (err) {
    console.error('Cashier: Error in customize:', err.message);
    res.render('cashier/customize', {
      menuItemId: null,
      selectedItem: null,
      cartCount: 0,
      statusMessage: 'Error loading item details'
    });
  }
});

// Add drink to cart
router.post('/customize/add-to-cart', async (req, res) => {
  try {
    initializeCart(req);
    const { menuItemId, iceAmount, sugarAmount, specialNotes, basePrice } = req.body;
    
    console.log('Cashier: Adding to cart:', { menuItemId, iceAmount, sugarAmount, specialNotes, basePrice });
    
    if (!menuItemId || !basePrice) {
      console.error('Cashier: Missing required fields for add-to-cart');
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }
    
    // Create drink object and add to session cart
    const newDrink = {
      drinkId: req.session.cart.drinks.length + 1, // Temp ID for UI
      menuItemId,
      iceAmount: iceAmount || 'medium',
      sugarAmount: sugarAmount || '50%',
      specialNotes: specialNotes || '',
      basePrice: Number(basePrice)
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
    req.session.cart = {
      orderId: null,
      drinks: []
    };
    
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