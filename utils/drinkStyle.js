const fs = require('fs/promises');
const path = require('path');
const pool = require('../db/pool');

const drinkCsvPath = path.resolve(__dirname, '..', 'images', 'DrinkColorData.csv');
const headers = [
    'drink',
    'category',
    'lid_color',
    'straw_main',
    'straw_shadow',
    'liquid_top',
    'liquid_mid',
    'liquid_bottom',
    'accent_type',
    'accent_color',
    'boba_color'
];
let setupPromise = null;

const accentTypes = ['none', 'seeds', 'cube', 'syrup', 'powder', 'caramel'];

const defaultStylesByCategory = {
    'Milk Tea': {
        category: 'milk',
        lid_color: '#d9b78f',
        straw_main: '#f4f4f4',
        straw_shadow: '#d9d9d9',
        liquid_top: '#f4dfc4',
        liquid_mid: '#d2a172',
        liquid_bottom: '#9b633a',
        accent_type: 'syrup',
        accent_color: '#7a4324',
        boba_color: '#1a0f0b'
    },
    Tea: {
        category: 'tea',
        lid_color: '#78a66a',
        straw_main: '#6ec1e4',
        straw_shadow: '#3a8fb7',
        liquid_top: '#d7f4c5',
        liquid_mid: '#93c96d',
        liquid_bottom: '#4d7a34',
        accent_type: 'none',
        accent_color: '#93c96d',
        boba_color: '#1a0f0b'
    },
    'Fruit Tea': {
        category: 'fruit',
        lid_color: '#ff9f64',
        straw_main: '#7ed957',
        straw_shadow: '#4faf3b',
        liquid_top: '#ffe2a8',
        liquid_mid: '#ffad5b',
        liquid_bottom: '#d96b30',
        accent_type: 'cube',
        accent_color: '#ffd166',
        boba_color: '#1a0f0b'
    },
    Smoothie: {
        category: 'fruit',
        lid_color: '#d173a5',
        straw_main: '#7ed957',
        straw_shadow: '#4faf3b',
        liquid_top: '#ffd1e3',
        liquid_mid: '#e76f9f',
        liquid_bottom: '#974c78',
        accent_type: 'seeds',
        accent_color: '#3a3a3a',
        boba_color: '#1a0f0b'
    },
    Matcha: {
        category: 'tea',
        lid_color: '#7ed957',
        straw_main: '#6ec1e4',
        straw_shadow: '#3a8fb7',
        liquid_top: '#c8f2a7',
        liquid_mid: '#6ccb63',
        liquid_bottom: '#3e8f3a',
        accent_type: 'none',
        accent_color: '#6ccb63',
        boba_color: '#1a0f0b'
    },
    Energy: {
        category: 'tea',
        lid_color: '#ff9f1c',
        straw_main: '#6ec1e4',
        straw_shadow: '#3a8fb7',
        liquid_top: '#ffd6a5',
        liquid_mid: '#ff9f1c',
        liquid_bottom: '#d97706',
        accent_type: 'syrup',
        accent_color: '#f5b54c',
        boba_color: '#1a0f0b'
    },
    Sour: {
        category: 'tea',
        lid_color: '#ff3c38',
        straw_main: '#6ec1e4',
        straw_shadow: '#3a8fb7',
        liquid_top: '#ffce54',
        liquid_mid: '#ff6b35',
        liquid_bottom: '#8c1d18',
        accent_type: 'syrup',
        accent_color: '#c94f3d',
        boba_color: '#1a0f0b'
    },
    Specialty: {
        category: 'specialty',
        lid_color: '#80ffdb',
        straw_main: '#f4f4f4',
        straw_shadow: '#d9d9d9',
        liquid_top: '#cfffe5',
        liquid_mid: '#80ffdb',
        liquid_bottom: '#2ec4b6',
        accent_type: 'cube',
        accent_color: '#d8f3c4',
        boba_color: '#1a0f0b'
    },
    SEASONAL: {
        category: 'seasonal',
        lid_color: '#f59e0b',
        straw_main: '#f4f4f4',
        straw_shadow: '#d9d9d9',
        liquid_top: '#ffe3a3',
        liquid_mid: '#f59e0b',
        liquid_bottom: '#b45309',
        accent_type: 'syrup',
        accent_color: '#b9783f',
        boba_color: '#1a0f0b'
    }
};

function parseSimpleCsv(text) {
    const lines = text.trim().split(/\r?\n/);
    const csvHeaders = lines[0].split(',').map(h => h.trim());

    return lines.slice(1).filter(Boolean).map(line => {
        const values = line.split(',').map(v => v.trim());
        const row = {};

        csvHeaders.forEach((h, i) => {
            row[h] = values[i] ?? '';
        });

        return row;
    });
}

function formatCsv(rows) {
    return [
        headers.join(','),
        ...rows.map(row => headers.map(header => row[header] ?? '').join(','))
    ].join('\n') + '\n';
}

let drinkStyleTableReady = null;

async function ensureDrinkStyleTable() {
    if (drinkStyleTableReady) {
        return drinkStyleTableReady;
    }

    drinkStyleTableReady = (async () => {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS drink_style (
                drink_style_id SERIAL PRIMARY KEY,
                drink TEXT NOT NULL UNIQUE,
                category TEXT NOT NULL,
                lid_color TEXT NOT NULL,
                straw_main TEXT NOT NULL,
                straw_shadow TEXT NOT NULL,
                liquid_top TEXT NOT NULL,
                liquid_mid TEXT NOT NULL,
                liquid_bottom TEXT NOT NULL,
                accent_type TEXT NOT NULL,
                accent_color TEXT,
                boba_color TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);

        const countResult = await pool.query('SELECT COUNT(*)::int AS count FROM drink_style');
        if (Number(countResult.rows[0]?.count || 0) === 0) {
            const csvRows = await getDrinkStyleRowsFromCsv();
            await writeDrinkStyleRowsToDb(csvRows);
        }
    })();

    return drinkStyleTableReady;
}

async function getDrinkStyleRowsFromCsv() {
    const csv = await fs.readFile(drinkCsvPath, 'utf8');
    return parseSimpleCsv(csv);
}

async function writeDrinkStyleRowsToDb(rows) {
    for (const row of rows) {
        const style = normalizeDrinkStyleInput(row, row.category);
        if (!style.drink) continue;

        await pool.query(`
            INSERT INTO drink_style (
                drink,
                category,
                lid_color,
                straw_main,
                straw_shadow,
                liquid_top,
                liquid_mid,
                liquid_bottom,
                accent_type,
                accent_color,
                boba_color
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (drink)
            DO UPDATE SET
                category = EXCLUDED.category,
                lid_color = EXCLUDED.lid_color,
                straw_main = EXCLUDED.straw_main,
                straw_shadow = EXCLUDED.straw_shadow,
                liquid_top = EXCLUDED.liquid_top,
                liquid_mid = EXCLUDED.liquid_mid,
                liquid_bottom = EXCLUDED.liquid_bottom,
                accent_type = EXCLUDED.accent_type,
                accent_color = EXCLUDED.accent_color,
                boba_color = EXCLUDED.boba_color,
                updated_at = NOW()
        `, [
            style.drink,
            style.category,
            style.lid_color,
            style.straw_main,
            style.straw_shadow,
            style.liquid_top,
            style.liquid_mid,
            style.liquid_bottom,
            style.accent_type,
            style.accent_color,
            style.boba_color
        ]);
    }
}

async function getDrinkStyleRowsFromDb() {
    await ensureDrinkStyleTable();

    const result = await pool.query(`
        SELECT
            drink,
            category,
            lid_color,
            straw_main,
            straw_shadow,
            liquid_top,
            liquid_mid,
            liquid_bottom,
            accent_type,
            accent_color,
            boba_color
        FROM drink_style
        ORDER BY drink
    `);

    return result.rows;
}

async function getDrinkStyleRows() {
    try {
        return await getDrinkStyleRowsFromDb();
    } catch (err) {
        console.error('Drink style database unavailable; falling back to CSV:', err.message);
        return getDrinkStyleRowsFromCsv();
    }
}

function buildDrinkStyleMap(rows) {
    const map = {};

    rows.forEach(row => {
        const type = (row.accent_type || '').toLowerCase();

        map[row.drink] = {
            lid_color: row.lid_color,
            straw_color: row.straw_main,
            straw_shadow: row.straw_shadow,
            liquid_top: row.liquid_top,
            liquid_mid: row.liquid_mid,
            liquid_bottom: row.liquid_bottom,

            show_bobba: false,
            bobba_color: row.boba_color,

            show_seeds: type === 'seeds',
            seeds_color: row.accent_color,

            show_cube_topping: type === 'cube' || type === 'cube_topping',
            cube_topping_color: row.accent_color,

            show_syrup: type === 'syrup' || type === 'powder' || type === 'caramel',
            syrup_color: row.accent_color
        };
    });

    return map;
}

async function getDrinkStyleMap() {
    return buildDrinkStyleMap(await getDrinkStyleRows());
}

function getDefaultDrinkStyle(category) {
    const defaults = defaultStylesByCategory[category] || defaultStylesByCategory.Specialty;
    return { ...defaults };
}

function normalizeColor(value, fallback) {
    const color = String(value || '').trim();
    return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toUpperCase() : fallback;
}

function normalizeDrinkStyleInput(input, fallbackCategory) {
    const defaults = getDefaultDrinkStyle(fallbackCategory);
    const accentType = accentTypes.includes(String(input.accent_type || '').toLowerCase())
        ? String(input.accent_type).toLowerCase()
        : defaults.accent_type;

    return {
        drink: String(input.drink || '').trim(),
        category: String(input.category || defaults.category).trim() || defaults.category,
        lid_color: normalizeColor(input.lid_color, defaults.lid_color),
        straw_main: normalizeColor(input.straw_main, defaults.straw_main),
        straw_shadow: normalizeColor(input.straw_shadow, defaults.straw_shadow),
        liquid_top: normalizeColor(input.liquid_top, defaults.liquid_top),
        liquid_mid: normalizeColor(input.liquid_mid, defaults.liquid_mid),
        liquid_bottom: normalizeColor(input.liquid_bottom, defaults.liquid_bottom),
        accent_type: accentType,
        accent_color: normalizeColor(input.accent_color, defaults.accent_color),
        boba_color: normalizeColor(input.boba_color, defaults.boba_color)
    };
}

async function getDrinkStyleForDrink(drinkName, category) {
    const rows = await getDrinkStyleRows();
    const row = rows.find(item => item.drink === drinkName);
    return row || {
        drink: drinkName,
        ...getDefaultDrinkStyle(category)
    };
}

async function upsertDrinkStyle(input, fallbackCategory) {
    const style = normalizeDrinkStyleInput(input, fallbackCategory);
    if (!style.drink) {
        throw new Error('Drink name is required for drink style.');
    }

    try {
        await ensureDrinkStyleTable();
        await writeDrinkStyleRowsToDb([style]);
    } catch (err) {
        console.error('Could not save drink style to database; saving CSV only:', err.message);
    }

    const rows = await getDrinkStyleRowsFromCsv();
    const index = rows.findIndex(row => row.drink === style.drink);

    if (index >= 0) {
        rows[index] = style;
    } else {
        rows.push(style);
    }

    await fs.writeFile(drinkCsvPath, formatCsv(rows), 'utf8');
    return style;
}

module.exports = {
    accentTypes,
    getDefaultDrinkStyle,
    getDrinkStyleForDrink,
    getDrinkStyleMap,
    upsertDrinkStyle
};
