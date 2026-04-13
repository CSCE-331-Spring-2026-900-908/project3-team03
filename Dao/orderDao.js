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

module.exports = {
    getTodaySummary,
    getRecentOrders,
    getXReportSummary
};
