const pool = require('../db/pool');

// ------------------------ DASHBOARD QUERIES ------------------------
function getTodayBounds() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return { start, end };
}

function normalizePercentValue(value, fallback = 0) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();

        if (normalized === 'none') {
            return 0;
        }

        if (normalized === 'light') {
            return 25;
        }

        if (normalized === 'medium') {
            return 50;
        }

        if (normalized === 'full') {
            return 100;
        }

        const parsed = Number.parseInt(normalized.replace('%', ''), 10);
        if (!Number.isNaN(parsed)) {
            return parsed;
        }
    }

    return fallback;
}

function getDrinkField(drink, snakeCaseKey, camelCaseKey, fallback = null) {
    if (drink[snakeCaseKey] !== undefined) {
        return drink[snakeCaseKey];
    }

    if (camelCaseKey && drink[camelCaseKey] !== undefined) {
        return drink[camelCaseKey];
    }

    return fallback;
}

function normalizeAddonEntries(addons) {
    if (!addons) {
        return [];
    }

    if (Array.isArray(addons)) {
        return addons
            .map(addon => ({
                menuItemId: Number(addon.id ?? addon.menu_item_id ?? addon.menuItemId),
                quantity: Number(addon.quantity) || 0
            }))
            .filter(addon => addon.menuItemId && addon.quantity > 0);
    }

    return Object.entries(addons)
        .map(([menuItemId, quantity]) => ({
            menuItemId: Number(menuItemId),
            quantity: Number(quantity) || 0
        }))
        .filter(addon => addon.menuItemId && addon.quantity > 0);
}

async function getTodaySummary() {
    const { start, end } = getTodayBounds();

    const result = await pool.query(`
        SELECT
            COALESCE(SUM(total), 0)::numeric(10,2) AS sales_today,
            COUNT(*)::int AS orders_today,
            COALESCE(AVG(total), 0)::numeric(10,2) AS avg_order_today
        FROM orders
        WHERE status = 'PAID'
          AND created_at >= $1
          AND created_at < $2
    `, [start, end]);

    return result.rows[0];
}

async function getRecentOrders(limit = 10) {
    const { start, end } = getTodayBounds();

    const result = await pool.query(`
        SELECT
            order_id,
            employee_id,
            created_at,
            status,
            COALESCE(payment_method, '-') AS payment_method,
            total::numeric(10,2) AS total
        FROM orders
        WHERE created_at >= $1
          AND created_at < $2
        ORDER BY created_at DESC
        LIMIT $3
    `, [start, end, limit]);

    return result.rows.map(order => ({
        ...order,
        created_at: new Date(order.created_at)
    }));
}

// ------------------------ REPORTS QUERIES ------------------------
// X-report
async function getXReportSummary(startTime, endTime) {
    const [salesResult, discardsResult] = await Promise.all([
        pool.query(`
            SELECT
                COUNT(*)::int AS orders,
                COALESCE(SUM(total), 0)::numeric(10,2) AS sales,
                COUNT(*) FILTER (WHERE payment_method = 'CARD')::int AS card_payments,
                COUNT(*) FILTER (WHERE payment_method = 'CASH')::int AS cash_payments,
                COALESCE(AVG(total), 0)::numeric(10,2) AS avg_revenue
            FROM orders
            WHERE status = 'PAID'
              AND created_at >= $1
              AND created_at < $2
        `, [startTime, endTime]),
        pool.query(`
            SELECT COUNT(*)::int AS discards
            FROM orders
            WHERE status = 'CANCELED'
              AND created_at >= $1
              AND created_at < $2
        `, [startTime, endTime])
    ]);

    return {
        ...salesResult.rows[0],
        discards: discardsResult.rows[0].discards
    };
}

// Sales report
async function getSalesReport(startTime, endTime) {
    const result = await pool.query(`
        SELECT
            m.name,
            SUM(d.quantity)::int AS total_quantity,
            COALESCE(SUM(d.quantity * m.base_price), 0)::numeric(10,2) AS total_revenue
        FROM orders o
        JOIN drink d ON o.order_id = d.order_id
        JOIN menu_item m ON d.menu_item_id = m.menu_item_id
        WHERE o.created_at >= $1
          AND o.created_at < $2
          AND o.status = 'PAID'
        GROUP BY m.name
        ORDER BY total_quantity DESC, m.name ASC
    `, [startTime, endTime]);

    return result.rows;
}

// Z-report
async function getZReportSummary(startTime, endTime) {
    const [totalsResult, cashResult, cardResult, adjustmentsResult] = await Promise.all([
        pool.query(`
            SELECT
                COALESCE(SUM(subtotal), 0)::numeric(10,2) AS sales,
                COALESCE(SUM(tax), 0)::numeric(10,2) AS tax
            FROM orders
            WHERE created_at >= $1
              AND created_at < $2
              AND status = 'PAID'
        `, [startTime, endTime]),
        pool.query(`
            SELECT
                COALESCE(SUM(total), 0)::numeric(10,2) AS total_cash,
                COUNT(*)::int AS cash_payments
            FROM orders
            WHERE created_at >= $1
              AND created_at < $2
              AND status = 'PAID'
              AND payment_method = 'CASH'
        `, [startTime, endTime]),
        pool.query(`
            SELECT COUNT(*)::int AS card_payments
            FROM orders
            WHERE created_at >= $1
              AND created_at < $2
              AND status = 'PAID'
              AND payment_method = 'CARD'
        `, [startTime, endTime]),
        pool.query(`
            SELECT COALESCE(SUM(total), 0)::numeric(10,2) AS adjustments
            FROM orders
            WHERE created_at >= $1
              AND created_at < $2
              AND status = 'CANCELED'
        `, [startTime, endTime])
    ]);

    return {
        ...totalsResult.rows[0],
        ...cashResult.rows[0],
        ...cardResult.rows[0],
        ...adjustmentsResult.rows[0]
    };
}

module.exports = {
    getTodaySummary,
    getRecentOrders,
    getXReportSummary,
    getSalesReport,
    getZReportSummary
};

// ------------------------ CASHIER ------------------------
async function submitOrder(order) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const drinks = order.drinks || [];
        let computedSubtotal = 0;

        for (const drink of drinks) {
            const drinkQuantity = Number(getDrinkField(drink, 'quantity', 'quantity', 1)) || 1;
            const drinkBasePrice = Number(getDrinkField(drink, 'base_price', 'basePrice', 0)) || 0;
            const addonEntries = normalizeAddonEntries(drink.addons);

            computedSubtotal += drinkBasePrice * drinkQuantity;

            for (const addon of addonEntries) {
                const addonPriceRes = await client.query(`
                    SELECT base_price
                    FROM menu_item
                    WHERE menu_item_id = $1
                `, [addon.menuItemId]);

                const addonBasePrice = Number(addonPriceRes.rows[0]?.base_price ?? 0) || 0;
                computedSubtotal += drinkQuantity * addon.quantity * addonBasePrice;
            }
        }

        // 8.25% tax rate
        const computedTax = Number((computedSubtotal * 0.0825).toFixed(2));
        const computedTotal = Number((computedSubtotal + computedTax).toFixed(2));

        const orderSubtotal = Number(order.subtotal);
        const orderTax = Number(order.tax);
        const orderTotal = Number(order.total);

        // Insert order
        const res = await client.query(`
            INSERT INTO orders 
            (created_at, status, payment_method, employee_id, notes, subtotal, tax, total) 
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8) 
            RETURNING order_id
        `, [
            order.created_at,
            order.status || 'PAID',
            order.payment_method,
            order.employee_id,
            order.notes,
            Number.isFinite(orderSubtotal) && orderSubtotal > 0 ? orderSubtotal : computedSubtotal,
            Number.isFinite(orderTax) && orderTax >= 0 ? orderTax : computedTax,
            Number.isFinite(orderTotal) && orderTotal > 0 ? orderTotal : computedTotal
        ]);

        const orderId = res.rows[0].order_id;

        for (const drink of drinks) {
            const drinkQuantity = Number(getDrinkField(drink, 'quantity', 'quantity', 1)) || 1;
            const addons = normalizeAddonEntries(drink.addons);
            const menuItemId = Number(getDrinkField(drink, 'menu_item_id', 'menuItemId'));
            const basePrice = Number(getDrinkField(drink, 'base_price', 'basePrice', 0)) || 0;

            const drinkRes = await client.query(`
                INSERT INTO drink 
                (order_id, menu_item_id, quantity, ice_amount, sugar_amount, special_notes, base_price) 
                VALUES ($1,$2,$3,$4,$5,$6,$7) 
                RETURNING drink_id
            `, [
                orderId,
                menuItemId,
                drinkQuantity,
                normalizePercentValue(getDrinkField(drink, 'ice_amount', 'iceAmount', 50), 50),
                normalizePercentValue(getDrinkField(drink, 'sugar_amount', 'sugarAmount', 50), 50),
                getDrinkField(drink, 'special_notes', 'specialNotes', null),
                basePrice
            ]);

            const drinkId = drinkRes.rows[0].drink_id;

            for (const addon of addons) {
                await client.query(`
                    INSERT INTO drink_addon 
                    (drink_id, menu_item_id, quantity) 
                    VALUES ($1,$2,$3)
                `, [drinkId, addon.menuItemId, addon.quantity]);
            }
        }

        await client.query('COMMIT');
        return { success: true, orderId };

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        return { success: false };

    } finally {
        client.release();
    }
}


async function updateInventory(order, menuItemDAO, inventoryItemDAO) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const ingredients = {};
        const getIngredients = menuItemDAO.get_ingredients || menuItemDAO.getIngredients;

        if (!getIngredients) {
            throw new Error('menuItemDAO is missing get_ingredients/getIngredients');
        }

        for (const drink of order.drinks) {
            const drinkQuantity = Number(drink.quantity) || 1;
            const addons = drink.addons || {};

            const baseIngredients = await getIngredients.call(menuItemDAO, drink.menu_item_id);

            for (const ingredient of baseIngredients) {
                const ingredientId = Number(ingredient.ingredient_id);
                const quantityRequired = Number(ingredient.quantity_required) || 0;

                if (!ingredients[ingredientId]) {
                    ingredients[ingredientId] = 0;
                }

                ingredients[ingredientId] += drinkQuantity * quantityRequired;
            }

            for (const addonId in addons) {
                const addonQty = Number(addons[addonId]) || 0;

                if (addonQty <= 0) {
                    continue;
                }

                const addonIngredients = await getIngredients.call(menuItemDAO, addonId);

                for (const ingredient of addonIngredients) {
                    const ingredientId = Number(ingredient.ingredient_id);
                    const quantityRequired = Number(ingredient.quantity_required) || 0;

                    if (!ingredients[ingredientId]) {
                        ingredients[ingredientId] = 0;
                    }

                    ingredients[ingredientId] += drinkQuantity * addonQty * quantityRequired;
                }
            }
        }

        for (const id in ingredients) {
            const used = ingredients[id];

            const qtyRes = await client.query(`
                SELECT quantity FROM ingredient WHERE ingredient_id = $1
            `, [id]);

            if (qtyRes.rows.length === 0) {
                continue;
            }

            let current = Number(qtyRes.rows[0].quantity) || 0;
            let newQty = current - used;

            if (newQty < 0) newQty = 0;

            await client.query(`
                UPDATE ingredient 
                SET quantity = $1 
                WHERE ingredient_id = $2
            `, [newQty, id]);
        }

        await client.query('COMMIT');
        return true;

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        return false;

    } finally {
        client.release();
    }
}

module.exports = {
    getTodaySummary,
    getRecentOrders,
    getXReportSummary,
    getSalesReport,
    getZReportSummary,
    submitOrder,
    updateInventory
};
