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
