const express = require('express');
const router = express.Router();
const orderDao = require('../dao/orderDao');
const inventoryDao = require('../dao/inventoryDao');

// -------------------- DASHBOARD --------------------
router.get('/dashboard', async (req, res) => {
    try {
        const [summary, recentOrders, lowStock] = await Promise.all([
            orderDao.getTodaySummary(),
            orderDao.getRecentOrders(),
            inventoryDao.getLowStockItems()
        ]);

        res.render('manager/dashboard', {
            salesToday: Number(summary.sales_today ?? 0).toFixed(2),
            ordersToday: Number(summary.orders_today ?? 0),
            avgOrderToday: Number(summary.avg_order_today ?? 0).toFixed(2),
            recentOrders,
            lowStock
        });
    } catch (err) {
        console.error('Error loading manager dashboard:', err);
        res.status(500).send('Database error');
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
            items: []
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

router.get('/reports', (req, res) => {
    res.render('manager/reports', buildDefaultReportsViewData());
});

// X-report
router.get('/reports/x', async (req, res) => {
    const reportsViewData = buildDefaultReportsViewData('x-report');
    const date = req.query.date || new Date().toISOString().slice(0, 10);
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


// -------------------- INVENTORY --------------------
router.get('/inventory', (req, res) => {
    res.render('manager/inventory', {
        statusMessage: '',
        inventoryItems: [
        { name: 'Boba Pearls', onHand: 25, parLevel: 20, reorder: 20 },
        { name: 'Milk', onHand: 12, parLevel: 15, reorder: 15 },
        { name: 'Brown Sugar Syrup', onHand: 18, parLevel: 10, reorder: 10 }
        ]
    });
});

// TEST: Mock post to add inventory item
router.post('/inventory/add', (req, res) => {
    const { itemName, onHand, reorder } = req.body;

    res.render('manager/inventory', {
        statusMessage: `Added item: ${itemName}`,
        inventoryItems: [
        { name: itemName, onHand, parLevel: reorder, reorder },
        { name: 'Milk', onHand: 12, parLevel: 15, reorder: 15 }
        ]
    });
});

// TEST: Mock post to update quantity of an item
router.post('/inventory/update-quantity', (req, res) => {
    const { itemName, onHand } = req.body;

    res.render('manager/inventory', {
        statusMessage: `Updated quantity for ${itemName} to ${onHand}`,
        inventoryItems: [
        { name: itemName, onHand, parLevel: 20, reorder: 20 },
        { name: 'Milk', onHand: 12, parLevel: 15, reorder: 15 }
        ]
    });
});

// TEST: Mock post to delete an inventory item
router.post('/inventory/delete', (req, res) => {
    const { deleteName } = req.body;

    res.render('manager/inventory', {
        statusMessage: `Deleted item: ${deleteName}`,
        inventoryItems: [
        { name: 'Milk', onHand: 12, parLevel: 15, reorder: 15 }
        ]
    });
});

// -------------------- MENU --------------------
router.get('/menu', (req, res) => {
    // TEST: mock data
    res.render('manager/menu', {
        statusMessage: '',
        selectedItem: {
        menu_item_id: 1,
        name: 'Classic Milk Tea'
        },
        categories: ['Milk Tea', 'Tea', 'Fruit Tea', 'Smoothie', 'Matcha', 'Energy', 'Sour', 'ADDON', 'SEASONAL'],
        ingredients: [
        { ingredient_id: 1, name: 'Milk' },
        { ingredient_id: 2, name: 'Boba Pearls' },
        { ingredient_id: 3, name: 'Brown Sugar Syrup' }
        ],
        recipeLines: ['Milk (200)', 'Boba Pearls (50)', 'Brown Sugar Syrup (20)'],
        menuItems: [
        { menu_item_id: 1, name: 'Classic Milk Tea', category: 'Milk Tea', base_price: '6.00', active: true },
        { menu_item_id: 2, name: 'Taro Smoothie', category: 'Smoothie', base_price: '6.50', active: true },
        { menu_item_id: 3, name: 'Sakura Seasonal Tea', category: 'SEASONAL', base_price: '6.75', active: false }
        ]
    });

    // let menu = []
    // pool
    //     .query('SELECT * FROM menu_items;')
    //     .then(query_res => {
    //         for (let i = 0; i < query_res.rowCount; i++) {
    //             menu.push(query_res.rows[i]);
    //         }
    //         const data = {menu: menu};
    //         console.log(manu);
    //         res.render('name', menu);
    //     })
    //     .catch(err => {
    //         console.error('Error fetching teammembers:', err);
    //         res.status(500).send('Database error');
    //     });
});

// TODO: Add update price logic
router.post('/menu/update-price', (req, res) => {
  const { menuItemId, newPrice } = req.body;

  res.render('manager/menu', {

  });
});

// TODO: Add toggle active logic
router.post('/menu/toggle-active', (req, res) => {
  const { menuItemId } = req.body;

  res.render('manager/menu', {

  });
});

// TODO: Add menu item logic
router.post('/menu/add', (req, res) => {
  const { name, category, basePrice, description, active } = req.body;

  res.render('manager/menu', {

  });
});

// TODO: Add add recipe ingredient logic
router.post('/menu/add-recipe-ingredient', (req, res) => {
  const { menuItemId, ingredientId, qtyRequired } = req.body;

  res.render('manager/menu', {

  });
});

// TODO: Add show menu recipe logic
router.get('/menu/recipe', (req, res) => {
  const { menuItemId } = req.query;

  res.render('manager/menu', {

  });
});

// TODO: Add manager create ingredient logic
router.post('/menu/create-ingredient', (req, res) => {
  const { ingredientName } = req.body;

  res.render('manager/menu', {

  });
});

// -------------------- EMPLOYEES --------------------
router.get('/employees', (req, res) => {
    // TEST: mock data
    res.render('manager/employees', {
    statusMessage: '',
    roles: ['CASHIER', 'MANAGER'],
    selectedEmployee: {
        employee_id: 1,
        first_name: 'Ed',
        last_name: 'D'
    },
    employees: [
        {
        employee_id: 1,
        first_name: 'Ed',
        last_name: 'D',
        username: 'ed',
        role: 'MANAGER',
        hourly_wage: '13.00',
        active: true,
        join_date: '2026-02-25'
        },
        {
        employee_id: 2,
        first_name: 'kilroy',
        last_name: 'kilroy',
        username: 'kilroy',
        role: 'MANAGER',
        hourly_wage: '12.50',
        active: true,
        join_date: '2026-03-04'
        }
    ]
  });
});

// TODO: Add update-role logic
router.post('/employees/update-role', (req, res) => {
  const { employeeId, role } = req.body;

  res.render('manager/employees', {
    
  });
});

// TODO: Add update-wage logic
router.post('/employees/update-wage', (req, res) => {
  const { employeeId, hourlyWage } = req.body;

  res.render('manager_employees', {

  });
});

// TODO: Add toggle-active logic
router.post('/employees/toggle-active', (req, res) => {
  const { employeeId } = req.body;

  res.render('manager/employees', {

  });
});

// TODO: Add add employee logic
router.post('/employees/add', (req, res) => {
  const { firstName, lastName, username, role, joinDate, hourlyWage, active } = req.body;

  res.render('manager/employees', {

  });
});

module.exports = router;
