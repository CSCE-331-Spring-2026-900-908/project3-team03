const { pool } = require('../db');

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
    submitOrder,
    updateInventory
};