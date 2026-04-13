const pool = require('../db/pool');

// ------------------------ DASHBOARD QUERIES ------------------------
function getTodayBounds() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return { start, end };
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
        created_at: new Date(order.created_at).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        })
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

        // Insert order
        const res = await client.query(`
            INSERT INTO orders 
            (created_at, status, payment_method, employee_id, notes, subtotal, tax, total) 
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8) 
            RETURNING order_id
        `, [
            order.created_at,
            order.status,
            order.payment_method,
            order.employee_id,
            order.notes,
            order.subtotal,
            order.tax,
            order.total
        ]);

        const orderId = res.rows[0].order_id;

        
        for (const drink of order.drinks) {
            const drinkRes = await client.query(`
                INSERT INTO drink 
                (order_id, menu_item_id, quantity, ice_amount, sugar_amount, special_notes, base_price) 
                VALUES ($1,$2,$3,$4,$5,$6,$7) 
                RETURNING drink_id
            `, [
                orderId,
                drink.menu_item_id,
                drink.quantity,
                drink.ice_amount,
                drink.sugar_amount,
                drink.special_notes,
                drink.base_price
            ]);

            const drinkId = drinkRes.rows[0].drink_id;

            for (const addonId in drink.addons) {
                const qty = drink.addons[addonId];

                await client.query(`
                    INSERT INTO drink_addon 
                    (drink_id, menu_item_id, quantity) 
                    VALUES ($1,$2,$3)
                `, [drinkId, addonId, qty]);
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

        for (const drink of order.drinks) {

          
            const baseIngredients = await menuItemDAO.getIngredients(drink.menu_item_id);

            for (const id in baseIngredients) {
                if (!ingredients[id]) ingredients[id] = 0;
                ingredients[id] += baseIngredients[id];
            }

            
            for (const addonId in drink.addons) {
                const addonQty = drink.addons[addonId];
                const addonIngredients = await menuItemDAO.getIngredients(addonId);

                for (const id in addonIngredients) {
                    if (!ingredients[id]) ingredients[id] = 0;
                    ingredients[id] += addonQty * addonIngredients[id];
                }
            }
        }

        
        for (const id in ingredients) {
            const used = ingredients[id];

            const qtyRes = await client.query(`
                SELECT quantity FROM ingredient WHERE ingredient_id = $1
            `, [id]);

            let current = qtyRes.rows[0].quantity;
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