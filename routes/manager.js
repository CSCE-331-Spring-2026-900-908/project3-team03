const express = require('express');
const router = express.Router();
const orderDao = require('../dao/orderDao');
const inventoryDao = require('../dao/inventoryDao');
const menuItemDao = require('../dao/MenuItemDao');
const employeeDao = require('../dao/employeeDao');
const { fetchCollegeStationWeather } = require('../utils/weather');
const drinkStyle = require('../utils/drinkStyle');

// Hard-coded category example just for user convenience
const MENU_CATEGORIES = [
    'Milk Tea',
    'Tea',
    'Fruit Tea',
    'Smoothie',
    'Matcha',
    'Energy',
    'Sour',
    'Specialty',
    'ADDON',
    'SEASONAL'
];

// -------------------- DASHBOARD --------------------
router.get('/dashboard', async (req, res) => {
    try {
        const [summary, recentOrders, lowStock, weather] = await Promise.all([
            orderDao.getTodaySummary(),
            orderDao.getRecentOrders(),
            inventoryDao.getLowStockItems(),
            fetchCollegeStationWeather()
        ]);

        res.render('manager/dashboard', {
            salesToday: Number(summary.sales_today ?? 0).toFixed(2),
            ordersToday: Number(summary.orders_today ?? 0),
            avgOrderToday: Number(summary.avg_order_today ?? 0).toFixed(2),
            recentOrders,
            lowStock,
            weather
        });
    } catch (err) {
        console.error('Error loading manager dashboard:', err);
        res.status(500).render('manager/dashboard', {
            salesToday: '0.00',
            ordersToday: 0,
            avgOrderToday: '0.00',
            recentOrders: [],
            lowStock: [],
            weather: await fetchCollegeStationWeather()
        });
    }
});

// -------------------- REPORTS --------------------
// Data holders for all report tabs
function buildDefaultReportsViewData(activeTab = 'x-report') {
    return {
        activeTab,
        xReport: {
            date: '',
            beginHour: 8,
            endHour: 17,
            status: '',
            orders: 0,
            discards: 0,
            sales: '0.00',
            cardPayments: 0,
            cashPayments: 0,
            avgRevenue: '0.00'
        },
        salesReport: {
            startDate: '',
            endDate: '',
            status: '',
            items: [],
            totalRevenue: '0.00'
        },
        usageReport: {
            startDate: '',
            endDate: '',
            status: '',
            items: [],
            chartData: []
        },
        zReport: {
            businessDay: 'today',
            closed: false,
            status: '',
            sales: '0.00',
            tax: '0.00',
            totalCash: '0.00',
            cardPayments: 0,
            cashPayments: 0,
            adjustments: '0.00',
            sig1: '',
            sig2: '',
            notes: ''
        }
    };
}

// Initialize X-report 
function buildXReportRange(dateString, beginHour, endHour) {
    const startTime = new Date(`${dateString}T00:00:00`);
    startTime.setHours(beginHour, 0, 0, 0);

    const endTime = new Date(`${dateString}T00:00:00`);
    endTime.setHours(endHour + 1, 0, 0, 0);

    return { startTime, endTime };
}

function buildDateRange(dateString) {
    const startTime = new Date(`${dateString}T00:00:00`);
    const endTime = new Date(`${dateString}T00:00:00`);
    endTime.setDate(endTime.getDate() + 1);

    return { startTime, endTime };
}

function getLocalDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

router.get('/reports', (req, res) => {
    res.render('manager/reports', buildDefaultReportsViewData());
});

// X-report
router.get('/reports/x', async (req, res) => {
    const reportsViewData = buildDefaultReportsViewData('x-report');
    const date = req.query.date || getLocalDateString();
    const beginHour = Number.parseInt(req.query.beginHour, 10);
    const endHour = Number.parseInt(req.query.endHour, 10);

    reportsViewData.xReport.date = date;
    reportsViewData.xReport.beginHour = Number.isNaN(beginHour) ? 8 : beginHour;
    reportsViewData.xReport.endHour = Number.isNaN(endHour) ? 17 : endHour;

    if (Number.isNaN(beginHour) || Number.isNaN(endHour)) {
        reportsViewData.xReport.status = 'Select a valid begin hour and end hour.';
        return res.render('manager/reports', reportsViewData);
    }

    if (!date) {
        reportsViewData.xReport.status = 'Select a date for the X-report.';
        return res.render('manager/reports', reportsViewData);
    }

    if (beginHour < 0 || beginHour > 23 || endHour < 0 || endHour > 23) {
        reportsViewData.xReport.status = 'Hours must be between 0 and 23.';
        return res.render('manager/reports', reportsViewData);
    }

    if (beginHour > endHour) {
        reportsViewData.xReport.status = 'Begin hour must be earlier than or equal to end hour.';
        return res.render('manager/reports', reportsViewData);
    }

    try {
        const { startTime, endTime } = buildXReportRange(date, beginHour, endHour);
        const summary = await orderDao.getXReportSummary(startTime, endTime);

        reportsViewData.xReport = {
            date,
            beginHour,
            endHour,
            status: `Generated X-report for ${date}, ${beginHour}:00-${endHour}:59.`,
            orders: Number(summary.orders ?? 0),
            discards: Number(summary.discards ?? 0),
            sales: Number(summary.sales ?? 0).toFixed(2),
            cardPayments: Number(summary.card_payments ?? 0),
            cashPayments: Number(summary.cash_payments ?? 0),
            avgRevenue: Number(summary.avg_revenue ?? 0).toFixed(2)
        };

        res.render('manager/reports', reportsViewData);
    } catch (err) {
        console.error('Error loading X-report:', err);
        reportsViewData.xReport.status = 'Could not generate the X-report.';
        res.status(500).render('manager/reports', reportsViewData);
    }
});

// Sales report
router.get('/reports/sales', async (req, res) => {
    const reportsViewData = buildDefaultReportsViewData('sales-report');
    const { startDate, endDate } = req.query;

    reportsViewData.salesReport.startDate = startDate || '';
    reportsViewData.salesReport.endDate = endDate || '';

    if (!startDate || !endDate) {
        reportsViewData.salesReport.status = 'Select both a start date and end date.';
        return res.render('manager/reports', reportsViewData);
    }

    if (startDate > endDate) {
        reportsViewData.salesReport.status = 'Start date must be earlier than or equal to end date.';
        return res.render('manager/reports', reportsViewData);
    }

    try {
        const startTime = new Date(`${startDate}T00:00:00`);
        const endTime = new Date(`${endDate}T00:00:00`);
        endTime.setDate(endTime.getDate() + 1);

        const rows = await orderDao.getSalesReport(startTime, endTime);

        reportsViewData.salesReport.items = rows.map(row => ({
            name: row.name,
            qty: Number(row.total_quantity ?? 0),
            revenue: Number(row.total_revenue ?? 0).toFixed(2)
        }));

        reportsViewData.salesReport.totalRevenue = rows
            .reduce((sum, row) => sum + Number(row.total_revenue ?? 0), 0)
            .toFixed(2);

        reportsViewData.salesReport.status =
            `Generated sales report for ${startDate} through ${endDate}.`;

        res.render('manager/reports', reportsViewData);
    } catch (err) {
        console.error('Error loading sales report:', err);
        reportsViewData.salesReport.status = 'Could not generate the sales report.';
        res.status(500).render('manager/reports', reportsViewData);
    }
});

// Usage report
router.get('/reports/usage', async (req, res) => {
    const reportsViewData = buildDefaultReportsViewData('usage-report');
    const { startDate, endDate } = req.query;

    reportsViewData.usageReport.startDate = startDate || '';
    reportsViewData.usageReport.endDate = endDate || '';

    if (!startDate || !endDate) {
        reportsViewData.usageReport.status = 'Select both a start date and end date.';
        return res.render('manager/reports', reportsViewData);
    }

    if (startDate > endDate) {
        reportsViewData.usageReport.status = 'Start date must be earlier than or equal to end date.';
        return res.render('manager/reports', reportsViewData);
    }

    try {
        const startTime = new Date(`${startDate}T00:00:00`);
        const endTime = new Date(`${endDate}T00:00:00`);
        endTime.setDate(endTime.getDate() + 1);

        const rows = await inventoryDao.getUsageReport(startTime, endTime);

        reportsViewData.usageReport.items = rows.map(row => ({
            name: row.ingredient_name,
            used: Number(row.used_amount ?? 0).toFixed(3),
            unit: row.unit
        }));

        const maxUsedAmount = rows.reduce(
            (max, row) => Math.max(max, Number(row.used_amount ?? 0)),
            0
        );

        reportsViewData.usageReport.chartData = rows.map(row => {
            const usedAmount = Number(row.used_amount ?? 0);
            return {
                name: row.ingredient_name,
                unit: row.unit,
                used: usedAmount.toFixed(3),
                widthPercent: maxUsedAmount > 0
                    ? ((usedAmount / maxUsedAmount) * 100).toFixed(1)
                    : '0.0'
            };
        });

        reportsViewData.usageReport.status =
            `Generated usage report for ${startDate} through ${endDate}.`;

        res.render('manager/reports', reportsViewData);
    } catch (err) {
        console.error('Error loading usage report:', err);
        reportsViewData.usageReport.status = 'Could not generate the usage report.';
        res.status(500).render('manager/reports', reportsViewData);
    }
});

// Z-report
router.post('/reports/z', async (req, res) => {
    const reportsViewData = buildDefaultReportsViewData('z-report');
    const businessDay = getLocalDateString();
    const sig1 = (req.body.sig1 || '').trim();
    const sig2 = (req.body.sig2 || '').trim();
    const notes = (req.body.notes || '').trim();

    reportsViewData.zReport.businessDay = businessDay;
    reportsViewData.zReport.sig1 = sig1;
    reportsViewData.zReport.sig2 = sig2;
    reportsViewData.zReport.notes = notes;

    if (!sig1) {
        reportsViewData.zReport.status = 'Employee signature #1 is required to generate the Z-report.';
        return res.render('manager/reports', reportsViewData);
    }

    try {
        const { startTime, endTime } = buildDateRange(businessDay);
        const summary = await orderDao.getZReportSummary(startTime, endTime);

        reportsViewData.zReport = {
            businessDay,
            closed: true,
            status: `Generated Z-report for ${businessDay}.`,
            sales: Number(summary.sales ?? 0).toFixed(2),
            tax: Number(summary.tax ?? 0).toFixed(2),
            totalCash: Number(summary.total_cash ?? 0).toFixed(2),
            cardPayments: Number(summary.card_payments ?? 0),
            cashPayments: Number(summary.cash_payments ?? 0),
            adjustments: Number(summary.adjustments ?? 0).toFixed(2),
            sig1,
            sig2,
            notes
        };

        res.render('manager/reports', reportsViewData);
    } catch (err) {
        console.error('Error loading Z-report:', err);
        reportsViewData.zReport.status = 'Could not generate the Z-report.';
        res.status(500).render('manager/reports', reportsViewData);
    }
});


// -------------------- INVENTORY --------------------
// Load inventory items
async function renderInventoryPage(res, statusMessage = '') {
    const inventoryRows = await inventoryDao.getInventoryItems();

    res.render('manager/inventory', {
        statusMessage,
        inventoryItems: inventoryRows.map(item => ({
            name: item.name,
            unit: item.unit,
            category: item.category,
            onHand: Number(item.quantity ?? 0).toFixed(2),
            parLevel: Number(item.reorder_point ?? 0).toFixed(2),
            reorder: Number(item.reorder_point ?? 0).toFixed(2)
        }))
    });
}

router.get('/inventory', async (req, res) => {
    try {
        await renderInventoryPage(res);
    } catch (err) {
        console.error('Error loading inventory:', err);
        res.status(500).send('Database error');
    }
});

// Add inventory item
router.post('/inventory/add', async (req, res) => {
    const { itemName, unit, category, onHand, reorder } = req.body;

    if (!itemName || !unit || !category || onHand === '' || reorder === '') {
        try {
            await renderInventoryPage(res, 'Name, unit, category, quantity, and reorder point are required.');
        } catch (err) {
            console.error('Error loading inventory after validation failure:', err);
            res.status(500).send('Database error');
        }
        return;
    }

    try {
        const createdItem = await inventoryDao.createInventoryItem({
            name: itemName.trim(),
            unit: unit.trim(),
            category: category.trim(),
            quantity: Number(onHand),
            reorderPoint: Number(reorder)
        });

        await renderInventoryPage(res, `Added item: ${createdItem.name}`);
    } catch (err) {
        console.error('Error adding inventory item:', err);
        await renderInventoryPage(res, 'Could not add inventory item.');
    }
});

// Update quantity for an inventory item
router.post('/inventory/update-quantity', async (req, res) => {
    const { itemName, onHand } = req.body;

    if (!itemName || onHand === '') {
        try {
            await renderInventoryPage(res, 'Item name and quantity are required.');
        } catch (err) {
            console.error('Error loading inventory after validation failure:', err);
            res.status(500).send('Database error');
        }
        return;
    }

    try {
        const updatedItem = await inventoryDao.updateInventoryQuantityByName(itemName.trim(), Number(onHand));

        if (!updatedItem) {
            await renderInventoryPage(res, `No active inventory item found with name: ${itemName}`);
            return;
        }

        await renderInventoryPage(res, `Updated quantity for ${updatedItem.name} to ${Number(updatedItem.quantity).toFixed(2)}`);
    } catch (err) {
        console.error('Error updating inventory quantity:', err);
        await renderInventoryPage(res, 'Could not update inventory quantity.');
    }
});

// Delete inventory item by name
router.post('/inventory/delete', async (req, res) => {
    const { deleteName } = req.body;

    if (!deleteName) {
        try {
            await renderInventoryPage(res, 'Ingredient name is required.');
        } catch (err) {
            console.error('Error loading inventory after validation failure:', err);
            res.status(500).send('Database error');
        }
        return;
    }

    try {
        const deactivatedItem = await inventoryDao.deactivateInventoryItemByName(deleteName.trim());

        if (!deactivatedItem) {
            await renderInventoryPage(res, `No active inventory item found with name: ${deleteName}`);
            return;
        }

        await renderInventoryPage(res, `Deleted item: ${deactivatedItem.name}`);
    } catch (err) {
        console.error('Error deleting inventory item:', err);
        await renderInventoryPage(res, 'Could not delete inventory item.');
    }
});

// -------------------- MENU --------------------
// Load menu items
async function renderMenuPage(res, {
    statusMessage = '',
    selectedItemId = null
} = {}) {
    const menuItems = await menuItemDao.get_all_menu_items();
    const ingredients = await menuItemDao.get_all_ingredients();

    let selectedItem = null;
    let selectedDrinkStyle = null;
    let recipeLines = [];

    if (selectedItemId) {
        selectedItem = await menuItemDao.get_menu_item_by_id(selectedItemId);

        if (selectedItem) {
            recipeLines = await menuItemDao.get_recipe_lines(selectedItem.menu_item_id);
        }
    }

    if (!selectedItem && menuItems.length > 0) {
        selectedItem = menuItems[0];
        recipeLines = await menuItemDao.get_recipe_lines(selectedItem.menu_item_id);
    }

    if (selectedItem && selectedItem.category !== 'ADDON') {
        selectedDrinkStyle = await drinkStyle.getDrinkStyleForDrink(selectedItem.name, selectedItem.category);
    }

    res.render('manager/menu', {
        statusMessage,
        selectedItem,
        selectedDrinkStyle,
        defaultDrinkStyle: drinkStyle.getDefaultDrinkStyle('Specialty'),
        accentTypes: drinkStyle.accentTypes,
        categories: MENU_CATEGORIES,
        ingredients,
        recipeLines,
        menuItems: menuItems.map(item => ({
            ...item,
            base_price: Number(item.base_price ?? 0).toFixed(2)
        }))
    });
}

router.get('/menu', async (req, res) => {
    try {
        const selectedItemId = req.query.menuItemId ? Number(req.query.menuItemId) : null;
        await renderMenuPage(res, { selectedItemId });
    } catch (err) {
        console.error('Error loading manager menu:', err);
        res.status(500).send('Database error');
    }
});

// Update price of a menu item
router.post('/menu/update-price', async (req, res) => {
  const menuItemId = Number(req.body.menuItemId);
  const newPrice = Number(req.body.newPrice);

  if (!menuItemId || Number.isNaN(newPrice) || newPrice < 0) {
    try {
      await renderMenuPage(res, {
        selectedItemId: menuItemId || null,
        statusMessage: 'Select a valid menu item and enter a valid price.'
      });
    } catch (err) {
      console.error('Error loading menu after update-price validation failure:', err);
      res.status(500).send('Database error');
    }
    return;
  }

  try {
    await menuItemDao.update_price(menuItemId, newPrice);
    await renderMenuPage(res, {
      selectedItemId: menuItemId,
      statusMessage: `Updated price for menu item #${menuItemId}.`
    });
  } catch (err) {
    console.error('Error updating menu item price:', err);
    res.status(500).send('Database error');
  }
});

// Change manu item status
router.post('/menu/toggle-active', async (req, res) => {
  const menuItemId = Number(req.body.menuItemId);

  if (!menuItemId) {
    try {
      await renderMenuPage(res, {
        statusMessage: 'Select a menu item to toggle.'
      });
    } catch (err) {
      console.error('Error loading menu after toggle validation failure:', err);
      res.status(500).send('Database error');
    }
    return;
  }

  try {
    await menuItemDao.toggle_active(menuItemId);
    await renderMenuPage(res, {
      selectedItemId: menuItemId,
      statusMessage: `Toggled active status for menu item #${menuItemId}.`
    });
  } catch (err) {
    console.error('Error toggling menu item active status:', err);
    res.status(500).send('Database error');
  }
});

// Add menu item by name
router.post('/menu/add', async (req, res) => {
  const { name, category, basePrice, description, active } = req.body;
  const parsedBasePrice = Number(basePrice);

  if (!name || !category || Number.isNaN(parsedBasePrice) || parsedBasePrice < 0) {
    try {
      await renderMenuPage(res, {
        statusMessage: 'Name, category, and a valid base price are required.'
      });
    } catch (err) {
      console.error('Error loading menu after add validation failure:', err);
      res.status(500).send('Database error');
    }
    return;
  }

  try {
    const createdItem = await menuItemDao.insert_menu_item(
      name.trim(),
      category.trim(),
      parsedBasePrice,
      description?.trim() || null,
      active === 'on'
    );

    if (category.trim() !== 'ADDON') {
      await drinkStyle.upsertDrinkStyle({
        drink: createdItem.name,
        category: req.body.styleCategory,
        lid_color: req.body.lidColor,
        straw_main: req.body.strawMain,
        straw_shadow: req.body.strawShadow,
        liquid_top: req.body.liquidTop,
        liquid_mid: req.body.liquidMid,
        liquid_bottom: req.body.liquidBottom,
        accent_type: req.body.accentType,
        accent_color: req.body.accentColor,
        boba_color: req.body.bobaColor
      }, category.trim());
    }

    await renderMenuPage(res, {
      selectedItemId: createdItem.menu_item_id,
      statusMessage: `Added menu item: ${createdItem.name}`
    });
  } catch (err) {
    console.error('Error adding menu item:', err);
    res.status(500).send('Database error');
  }
});

// Update drink SVG color data
router.post('/menu/update-drink-style', async (req, res) => {
  const menuItemId = Number(req.body.menuItemId);

  if (!menuItemId) {
    try {
      await renderMenuPage(res, {
        statusMessage: 'Select a drink before updating SVG colors.'
      });
    } catch (err) {
      console.error('Error loading menu after drink-style validation failure:', err);
      res.status(500).send('Database error');
    }
    return;
  }

  try {
    const selectedItem = await menuItemDao.get_menu_item_by_id(menuItemId);

    if (!selectedItem || selectedItem.category === 'ADDON') {
      await renderMenuPage(res, {
        selectedItemId: menuItemId,
        statusMessage: 'SVG colors can only be edited for drinks, not add-ons.'
      });
      return;
    }

    await drinkStyle.upsertDrinkStyle({
      drink: selectedItem.name,
      category: req.body.styleCategory,
      lid_color: req.body.lidColor,
      straw_main: req.body.strawMain,
      straw_shadow: req.body.strawShadow,
      liquid_top: req.body.liquidTop,
      liquid_mid: req.body.liquidMid,
      liquid_bottom: req.body.liquidBottom,
      accent_type: req.body.accentType,
      accent_color: req.body.accentColor,
      boba_color: req.body.bobaColor
    }, selectedItem.category);

    await renderMenuPage(res, {
      selectedItemId: menuItemId,
      statusMessage: `Updated SVG colors for ${selectedItem.name}.`
    });
  } catch (err) {
    console.error('Error updating drink style:', err);
    res.status(500).send('Database error');
  }
});

// Add ingredients to a single menu item
router.post('/menu/add-recipe-ingredient', async (req, res) => {
  const menuItemId = Number(req.body.menuItemId);
  const ingredientId = Number(req.body.ingredientId);
  const qtyRequired = Number(req.body.qtyRequired);

  if (!menuItemId || !ingredientId || Number.isNaN(qtyRequired) || qtyRequired <= 0) {
    try {
      await renderMenuPage(res, {
        selectedItemId: menuItemId || null,
        statusMessage: 'Select an ingredient and enter a valid recipe quantity.'
      });
    } catch (err) {
      console.error('Error loading menu after recipe validation failure:', err);
      res.status(500).send('Database error');
    }
    return;
  }

  try {
    await menuItemDao.add_recipe_ingredient(menuItemId, ingredientId, qtyRequired);
    await renderMenuPage(res, {
      selectedItemId: menuItemId,
      statusMessage: 'Recipe ingredient saved.'
    });
  } catch (err) {
    console.error('Error adding recipe ingredient:', err);
    res.status(500).send('Database error');
  }
});

// Get the ingredent count of a single menu item
router.get('/menu/recipe', async (req, res) => {
  const selectedItemId = req.query.menuItemId ? Number(req.query.menuItemId) : null;

  try {
    await renderMenuPage(res, {
      selectedItemId,
      statusMessage: selectedItemId ? `Viewing recipe for menu item #${selectedItemId}.` : ''
    });
  } catch (err) {
    console.error('Error loading menu recipe:', err);
    res.status(500).send('Database error');
  }
});

// Create ingredient with all of its fields
router.post('/menu/create-ingredient', async (req, res) => {
  const { ingredientName, ingredientUnit, ingredientCategory, menuItemId } = req.body;
  const selectedItemId = menuItemId ? Number(menuItemId) : null;

  if (!ingredientName || !ingredientUnit || !ingredientCategory) {
    try {
      await renderMenuPage(res, {
        selectedItemId,
        statusMessage: 'Ingredient name, unit, and category are required.'
      });
    } catch (err) {
      console.error('Error loading menu after ingredient validation failure:', err);
      res.status(500).send('Database error');
    }
    return;
  }

  try {
    const createdIngredient = await menuItemDao.create_ingredient(
      ingredientName.trim(),
      ingredientUnit.trim(),
      ingredientCategory.trim()
    );

    await renderMenuPage(res, {
      selectedItemId,
      statusMessage: `Created ingredient: ${createdIngredient.name}`
    });
  } catch (err) {
    console.error('Error creating ingredient:', err);
    res.status(500).send('Database error');
  }
});

// -------------------- EMPLOYEES --------------------
// Load employees table
async function renderEmployeesPage(res, {
    statusMessage = '',
    selectedEmployeeId = null
} = {}) {
    const employees = await employeeDao.getAllEmployees();
    let selectedEmployee = null;

    if (selectedEmployeeId) {
        selectedEmployee = employees.find(
            employee => Number(employee.employee_id) === Number(selectedEmployeeId)
        ) || null;
    }

    if (!selectedEmployee && employees.length > 0) {
        selectedEmployee = employees[0];
    }

    res.render('manager/employees', {
        statusMessage,
        roles: ['CASHIER', 'MANAGER'],
        selectedEmployee,
        employees: employees.map(employee => ({
            ...employee,
            hourly_wage: Number(employee.hourly_wage ?? 0).toFixed(2)
        }))
    });
}

router.get('/employees', async (req, res) => {
  try {
    const selectedEmployeeId = req.query.employeeId ? Number(req.query.employeeId) : null;
    await renderEmployeesPage(res, { selectedEmployeeId });
  } catch (err) {
    console.error('Error fetching employees:', err);
    res.status(500).send('Database error');
  }
});

// Update employee role 
router.post('/employees/update-role', async (req, res) => {
  const employeeId = Number(req.body.employeeId);
  const role = req.body.role;

  if (!employeeId || !role) {
    try {
      await renderEmployeesPage(res, {
        selectedEmployeeId: employeeId || null,
        statusMessage: 'Select an employee and a valid role.'
      });
    } catch (err) {
      console.error('Error loading employees after role validation failure:', err);
      res.status(500).send('Database error');
    }
    return;
  }

  try {
    const updatedEmployee = await employeeDao.updateEmployee(employeeId, { role });
    await renderEmployeesPage(res, {
      selectedEmployeeId: updatedEmployee?.employee_id || employeeId,
      statusMessage: `Updated role for employee ID ${employeeId} to ${role}`
    });
  } catch (err) {
    console.error('Error updating employee role:', err);
    res.status(500).send('Database error');
  }
});

// Update employee wage 
router.post('/employees/update-wage', async (req, res) => {
  const employeeId = Number(req.body.employeeId);
  const hourlyWage = Number(req.body.hourlyWage);

  if (!employeeId || Number.isNaN(hourlyWage) || hourlyWage < 0) {
    try {
      await renderEmployeesPage(res, {
        selectedEmployeeId: employeeId || null,
        statusMessage: 'Select an employee and enter a valid hourly wage.'
      });
    } catch (err) {
      console.error('Error loading employees after wage validation failure:', err);
      res.status(500).send('Database error');
    }
    return;
  }

  try {
    const updatedEmployee = await employeeDao.updateEmployee(employeeId, { hourly_wage: hourlyWage });
    await renderEmployeesPage(res, {
      selectedEmployeeId: updatedEmployee?.employee_id || employeeId,
      statusMessage: `Updated hourly wage for employee ID ${employeeId} to $${hourlyWage.toFixed(2)}`
    });
  } catch (err) {
    console.error('Error updating employee wage:', err);
    res.status(500).send('Database error');
  }
});

// Toggle employee active status 
router.post('/employees/toggle-active', async (req, res) => {
  const employeeId = Number(req.body.employeeId);

  if (!employeeId) {
    try {
      await renderEmployeesPage(res, {
        statusMessage: 'Select an employee to toggle.'
      });
    } catch (err) {
      console.error('Error loading employees after toggle validation failure:', err);
      res.status(500).send('Database error');
    }
    return;
  }

  try {
    const employee = await employeeDao.getEmployeeById(employeeId);
    if (!employee) {
      await renderEmployeesPage(res, {
        statusMessage: `Employee ID ${employeeId} not found.`
      });
      return;
    }
    
    const newActiveStatus = !employee.active;
    const updatedEmployee = await employeeDao.setEmployeeActive(employeeId, newActiveStatus);

    await renderEmployeesPage(res, {
      selectedEmployeeId: updatedEmployee?.employee_id || employeeId,
      statusMessage: `Employee ID ${employeeId} is now ${newActiveStatus ? 'active' : 'inactive'}`
    });
  } catch (err) {
    console.error('Error toggling employee active status:', err);
    res.status(500).send('Database error');
  }
});

// Add employee 
router.post('/employees/add', async (req, res) => {
  const { firstName, lastName, username, role, joinDate, hourlyWage, active } = req.body;
  try {
    if (!firstName || !lastName || !username || !role) {
      await renderEmployeesPage(res, {
        statusMessage: 'Missing required fields: first name, last name, username, and role.'
      });
      return;
    }

    const newEmployee = await employeeDao.createEmployee({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      username: username.trim(),
      role: role.trim(),
      join_date: joinDate || null,
      hourly_wage: Number(hourlyWage) || 0,
      active: active === 'on' || active === 'true' || active === '1'
    });

    await renderEmployeesPage(res, {
      selectedEmployeeId: newEmployee.employee_id,
      statusMessage: `Added employee ${newEmployee.first_name} ${newEmployee.last_name}`
    });
  } catch (err) {
    console.error('Error adding employee:', err.message);
    try {
      await renderEmployeesPage(res, {
        statusMessage: `Error adding employee: ${err.message}`
      });
    } catch (renderErr) {
      console.error('Error reloading employees after add failure:', renderErr);
      res.status(500).send('Database error');
    }
  }
});

module.exports = router;
