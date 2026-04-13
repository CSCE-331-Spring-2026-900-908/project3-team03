const express = require('express');
const router = express.Router();
const employeeDao = require('../Dao/employeeDao');

// -------------------- DASHBOARD --------------------
router.get('/dashboard', (req, res) => {
    res.render('manager/dashboard', {
        salesToday: '245.50',
        ordersToday: 18,
        avgOrderToday: '13.64',
        
        // TEST: mock data
        recentOrders: [
        {
            order_id: 101,
            created_at: '10:25 AM',
            status: 'PAID',
            payment_method: 'CARD',
            total: '12.50'
        },
        {
            order_id: 102,
            created_at: '10:40 AM',
            status: 'SERVED',
            payment_method: 'CASH',
            total: '9.75'
        }
        ],

        // TEST: mock data
        lowStock: [
        { name: 'Boba Pearls', quantity: 5, reorder_point: 20 },
        { name: 'Milk', quantity: 8, reorder_point: 15 }
        ]
    });
});

// -------------------- REPORTS --------------------
router.get('/reports', (req, res) => {
    res.render('manager/reports', {
        // TEST: mock data
        xReport: {
        date: '',
        beginHour: 8,
        endHour: 17,
        status: '',
        orders: 12,
        discards: 1,
        sales: '142.50',
        cardPayments: 8,
        cashPayments: 4,
        avgRevenue: '11.88'
        },

        // TEST: mock data
        salesReport: {
        startDate: '',
        endDate: '',
        status: '',
        items: [
            { name: 'Classic Milk Tea', qty: 8, revenue: '48.00' },
            { name: 'Taro Smoothie', qty: 4, revenue: '28.00' }
        ],
        totalRevenue: '76.00'
        },

        // TEST: mock data
        usageReport: {
        startDate: '',
        endDate: '',
        status: '',
        items: [
            { name: 'Milk', used: 12, unit: 'cups' },
            { name: 'Boba Pearls', used: 7, unit: 'scoops' }
        ]
        },

        // TEST: mock data
        zReport: {
        businessDay: 'today',
        closed: false,
        status: '',
        sales: '142.50',
        tax: '11.76',
        totalCash: '48.00',
        cardPayments: 8,
        cashPayments: 4,
        adjustments: '0.00',
        sig1: '',
        sig2: '',
        notes: ''
        }
    });
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
router.get('/employees', async (req, res) => {
  try {
    const employees = await employeeDao.getAllEmployees();
    res.render('manager/employees', {
      statusMessage: '',
      roles: ['CASHIER', 'MANAGER'],
      selectedEmployee: null,
      employees
    });
  } catch (err) {
    console.error('Error fetching employees:', err);
    res.status(500).send('Database error');
  }
});

// Select employee route
router.post('/employees/select', async (req, res) => {
  const { employeeId } = req.body;
  try {
    const employees = await employeeDao.getAllEmployees();
    const selectedEmployee = employees.find(emp => emp.employee_id == employeeId) || null;
    
    res.render('manager/employees', {
      statusMessage: selectedEmployee ? `Selected employee: ${selectedEmployee.first_name} ${selectedEmployee.last_name}` : 'Employee not found',
      roles: ['CASHIER', 'MANAGER'],
      selectedEmployee,
      employees
    });
  } catch (err) {
    console.error('Error selecting employee:', err);
    res.status(500).send('Database error');
  }
});

// Update employee role logic
router.post('/employees/update-role', async (req, res) => {
  const { employeeId, role } = req.body;
  try {
    const updatedEmployee = await employeeDao.updateEmployee(employeeId, { role });
    const employees = await employeeDao.getAllEmployees();
    res.render('manager/employees', {
      statusMessage: `Updated role for employee ID ${employeeId} to ${role}`,
      roles: ['CASHIER', 'MANAGER'],
      selectedEmployee: updatedEmployee,
      employees
    });
  } catch (err) {
    console.error('Error updating employee role:', err);
    res.status(500).send('Database error');
  }
});

// Update employee wage logic
router.post('/employees/update-wage', async (req, res) => {
  const { employeeId, hourlyWage } = req.body;
  try {
    const updatedEmployee = await employeeDao.updateEmployee(employeeId, { hourly_wage: Number(hourlyWage) });
    const employees = await employeeDao.getAllEmployees();
    res.render('manager/employees', {
      statusMessage: `Updated hourly wage for employee ID ${employeeId} to $${hourlyWage}`,
      roles: ['CASHIER', 'MANAGER'],
      selectedEmployee: updatedEmployee,
      employees
    });
  } catch (err) {
    console.error('Error updating employee wage:', err);
    res.status(500).send('Database error');
  }
});

// Toggle employee active status logic
router.post('/employees/toggle-active', async (req, res) => {
  const { employeeId } = req.body;
  try {
    const employee = await employeeDao.getEmployeeById(employeeId);
    if (!employee) {
      return res.status(404).send('Employee not found');
    }
    
    const newActiveStatus = !employee.active;
    const updatedEmployee = await employeeDao.setEmployeeActive(employeeId, newActiveStatus);
    
    const employees = await employeeDao.getAllEmployees();
    res.render('manager/employees', {
      statusMessage: `Employee ID ${employeeId} is now ${newActiveStatus ? 'active' : 'inactive'}`,
      roles: ['CASHIER', 'MANAGER'],
      selectedEmployee: updatedEmployee,
      employees
    });
  } catch (err) {
    console.error('Error toggling employee active status:', err);
    res.status(500).send('Database error');
  }
});

// Add employee logic
router.post('/employees/add', async (req, res) => {
  const { firstName, lastName, username, role, joinDate, hourlyWage, active } = req.body;
  try {
    await employeeDao.createEmployee({
      first_name: firstName,
      last_name: lastName,
      username,
      role,
      join_date: joinDate || null,
      hourly_wage: Number(hourlyWage) || 0,
      active: active === 'on' || active === 'true' || active === '1'
    });

    const employees = await employeeDao.getAllEmployees();
    res.render('manager/employees', {
      statusMessage: `Added employee ${firstName} ${lastName}`,
      roles: ['CASHIER', 'MANAGER'],
      selectedEmployee: null,
      employees
    });
  } catch (err) {
    console.error('Error adding employee:', err);
    res.status(500).send('Database error');
  }
});

module.exports = router;