(function () {
    const pageData = window.kioskPageData || {};
    const menuData = pageData.menuData || { categories: {}, addons: [] };
    const drinkStyleMap = pageData.drinkStyleMap || {};
    const sugarOptions = ['0%', '25%', '50%', '75%', '100%'];
    const iceOptions = ['No Ice', 'Light Ice', 'Regular Ice', 'Extra Ice'];
    const categoryTabs = document.getElementById('categoryTabs');
    const menuGrid = document.getElementById('menuGrid');
    const addonGrid = document.getElementById('addonGrid');
    const qtyValueEl = document.getElementById('qtyValue');
    const orderListEl = document.getElementById('orderList');
    const orderTotalEl = document.getElementById('orderTotal');
    const resultOverlayEl = document.getElementById('resultOverlay');
    const resultCardEl = document.getElementById('resultCard');
    const resultTitleEl = document.getElementById('resultTitle');
    const resultMessageEl = document.getElementById('resultMessage');
    const resultTicketEl = document.getElementById('resultTicket');
    const resultOkBtn = document.getElementById('resultOkBtn');
    const customizeOverlay = document.getElementById('customizeOverlay');
    const customizeDrinkTitleEl = document.getElementById('customizeDrinkTitle');
    const customizeDrinkPriceEl = document.getElementById('customizeDrinkPrice');
    const sugarGrid = document.getElementById('sugarGrid');
    const iceGrid = document.getElementById('iceGrid');
    const modalDrinkPreviewMount = document.getElementById('modalDrinkPreviewMount');
    const previewWaveOverlay = document.getElementById('previewWaveOverlay');
    const addonCategoryTabs = document.getElementById('addonCategoryTabs');
    const closeCustomizeBtn = document.getElementById('closeCustomize');
    const cancelCustomizeBtn = document.getElementById('cancelCustomize');
    const saveCustomizeBtn = document.getElementById('saveCustomize');
    const originalSize = parseFloat(getComputedStyle(document.documentElement).fontSize);

    const cubeStackLayers = [
        { id: 'Cube_Topping_Stack_0', scale: 1.0, insertBehind: false },
        { id: 'Cube_Topping_Stack_1', scale: 0.82, insertBehind: true },
        { id: 'Cube_Topping_Stack_2', scale: 0.64, insertBehind: true }
    ];

    const addonStackConfigs = {
        cube: {
            sourceId: 'Cube_Topping',
            hideSource: true,
            layers: cubeStackLayers
        },
        ball: {
            sourceId: 'Bobba',
            hideSource: false,
            layers: [
                { id: 'Bobba_Stack_0', scale: 1.0, insertBehind: false },
                { id: 'Bobba_Stack_1', scale: 0.82, insertBehind: true },
                { id: 'Bobba_Stack_2', scale: 0.64, insertBehind: true }
            ]
        },
        seeds: {
            sourceId: 'Seeds',
            hideSource: false,
            layers: [
                { id: 'Seeds_Stack_0', scale: 1.0, insertBehind: false },
                { id: 'Seeds_Stack_1', scale: 0.82, insertBehind: true },
                { id: 'Seeds_Stack_2', scale: 0.64, insertBehind: true }
            ]
        },
        syrup: {
            sourceId: 'Syrup',
            hideSource: false,
            layers: [
                { id: 'Syrup_Stack_0', scale: 1.0, insertBehind: false },
                { id: 'Syrup_Stack_1', scale: 0.88, insertBehind: true },
                { id: 'Syrup_Stack_2', scale: 0.76, insertBehind: true }
            ]
        }
    };

    const addonCategoryOrder = ['ball', 'seeds', 'cube', 'syrup', 'extras'];
    const addonCategoryLabels = {
        ball: 'Ball',
        seeds: 'Seeds',
        cube: 'Cube',
        syrup: 'Syrup',
        extras: 'Extras'
    };

    const addonCategoryTabColors = {
        ball: '#f8d8e8',
        seeds: '#dff2d8',
        cube: '#ffe4d6',
        syrup: '#dff4ff',
        extras: '#fdecc8'
    };

    const categoryTabColors = {
        'Milk Tea': '#f8d8e8',
        'Tea': '#dff2d8',
        'Fruit Tea': '#ffe4d6',
        'Smoothie': '#f9e2ff',
        'Specialty': '#fdecc8',
        'Energy': '#fff4b8',
        'Sour': '#e1f7e7',
        'Matcha': '#d7f0d3',
        'SEASONAL': '#dff4ff',
        'Seasonal': '#dff4ff'
    };

    const addonVisualMap = {
        'boba': { type: 'ball', color: '#2f1707' },
        'strawberry popping boba': { type: 'ball', color: '#f28aa5' },
        'eye of newt': { type: 'ball', color: '#7f5aa2' },
        'jelly coffee': { type: 'cube', color: '#6f4e37' },
        'jelly grass': { type: 'cube', color: '#1f1f1f' },
        'jelly tuna': { type: 'cube', color: '#f1b6a8' },
        'aloe vera': { type: 'cube', color: '#d8f3c4' },
        'milk foam': { type: 'syrup', color: '#fff7dc' },
        'milk oat': { type: 'syrup', color: '#efe6d6' },
        'honey': { type: 'syrup', color: '#f5c542' },
        'chamoy': { type: 'syrup', color: '#c94f3d' },
        'lemon juice': { type: 'syrup', color: '#f6e27a' },
        'cocoa powder': { type: 'syrup', color: '#7a4a2f' },
        'taro': { type: 'syrup', color: '#b9a0dc' },
        'yogurt base': { type: 'syrup', color: '#f5f2ea' },
        'syrup chocolate': { type: 'syrup', color: '#6b3e26' },
        'syrup strawberry': { type: 'syrup', color: '#f07f93' },
        'syrup mango': { type: 'syrup', color: '#f5b54c' },
        'syrup caramel': { type: 'syrup', color: '#b9783f' },
        'syrup vanilla': { type: 'syrup', color: '#f1dfb3' },
        'syrup brown sugar': { type: 'syrup', color: '#8b5a3c' },
        'seeds chia': { type: 'seeds', color: '#3a3a3a' },
        'basil seeds': { type: 'seeds', color: '#2f3b2f' }
    };

    let currentCategory = Object.keys(menuData.categories)[0] || null;
    let currentAddonCategory = 'ball';
    let selectedDrink = null;
    let selectedAddons = [];
    let cubeAddonOrder = [];
    let selectedSugar = '100%';
    let selectedIce = 'Regular Ice';
    let quantity = 1;
    let order = [];
    let drinkSvgTemplate = null;
    let customizationDraft = null;
    let editingOrderIndex = null;
    const menuPreviewCache = new Map();
    let previewWaveTimer = null;
    let previewWaveCleanupTimer = null;
    let resultOverlayTimer = null;

    function normalizeAddonName(name) {
        return String(name || '').trim().toLowerCase();
    }

    function translateName(name) {
        return name;
    }

    function getAddonVisualConfig(name) {
        const normalizedName = normalizeAddonName(name);
        if (addonVisualMap[normalizedName]) {
            return addonVisualMap[normalizedName];
        }

        if (normalizedName.includes('boba') || normalizedName.includes('newt')) {
            return { type: 'ball', color: '#2f1707' };
        }

        if (normalizedName.includes('seed')) {
            return { type: 'seeds', color: '#2f3b2f' };
        }

        if (normalizedName.includes('jelly') || normalizedName.includes('aloe')) {
            return { type: 'cube', color: '#d8f3c4' };
        }

        if (
            normalizedName.includes('syrup') ||
            normalizedName.includes('foam') ||
            normalizedName.includes('honey') ||
            normalizedName.includes('juice') ||
            normalizedName.includes('powder') ||
            normalizedName.includes('taro') ||
            normalizedName.includes('milk') ||
            normalizedName.includes('yogurt')
        ) {
            return { type: 'syrup', color: '#c58940' };
        }

        return { type: 'cube', color: '#d8f3c4' };
    }

    function getAddonDisplayCategory(name) {
        const normalizedName = normalizeAddonName(name);

        if (
            normalizedName.includes('foam') ||
            normalizedName === 'milk oat' ||
            normalizedName === 'taro' ||
            normalizedName === 'chamoy' ||
            normalizedName === 'cocoa powder' ||
            normalizedName === 'yogurt base'
        ) {
            return 'extras';
        }

        return getAddonVisualConfig(name).type;
    }

    function extractDrinkSvgTemplate(svgAssetText) {
        const parser = new DOMParser();
        const assetDoc = parser.parseFromString(svgAssetText, 'text/html');
        const svg = assetDoc.querySelector('svg');
        return svg ? svg.cloneNode(true) : null;
    }

    function createDrinkSvgInstance() {
        return drinkSvgTemplate ? drinkSvgTemplate.cloneNode(true) : null;
    }

    function getGroupFromSvg(svgRoot, id) {
        if (!svgRoot) return null;
        return svgRoot.querySelector(`#${CSS.escape(id)}`);
    }

    function setLayerVisibleOnSvg(svgRoot, groupId, isVisible) {
        const group = getGroupFromSvg(svgRoot, groupId);
        if (!group) return;
        group.style.display = isVisible ? '' : 'none';
    }

    function setGroupFillOnSvg(svgRoot, groupId, color) {
        const group = getGroupFromSvg(svgRoot, groupId);
        if (!group) return;

        const shapes = group.querySelectorAll('path, rect, circle, ellipse, polygon, polyline');
        shapes.forEach((shape) => {
            shape.setAttribute('fill', color);
        });
    }

    function ensureClonedLayerOnSvg(svgRoot, sourceId, newId, scale = 1, insertBehind = false) {
        if (!svgRoot) return null;

        const existing = getGroupFromSvg(svgRoot, newId);
        if (existing) return existing;

        const source = getGroupFromSvg(svgRoot, sourceId);
        if (!source || !source.parentNode) return null;

        const clone = source.cloneNode(true);
        clone.setAttribute('id', newId);
        clone.style.display = 'none';
        clone.style.transformBox = 'fill-box';
        clone.style.transformOrigin = 'center';
        clone.style.transform = `scale(${scale})`;

        if (insertBehind) {
            source.parentNode.insertBefore(clone, source);
        } else {
            source.parentNode.appendChild(clone);
        }

        return clone;
    }

    function resetAddonStackOnSvg(svgRoot, stackType) {
        const stackConfig = addonStackConfigs[stackType];
        if (!stackConfig) return;

        stackConfig.layers.forEach((layer) => setLayerVisibleOnSvg(svgRoot, layer.id, false));
    }

    function setupAddonLayersOnSvg(svgRoot) {
        if (!svgRoot) return;

        Object.entries(addonStackConfigs).forEach(([stackType, stackConfig]) => {
            stackConfig.layers.forEach((layer) => {
                ensureClonedLayerOnSvg(svgRoot, stackConfig.sourceId, layer.id, layer.scale, layer.insertBehind);
            });

            if (stackConfig.hideSource) {
                setLayerVisibleOnSvg(svgRoot, stackConfig.sourceId, false);
            }

            resetAddonStackOnSvg(svgRoot, stackType);
        });
    }

    function setLiquidGradientOnSvg(svgRoot, topColor, midColor, bottomColor) {
        if (!svgRoot) return;

        const stops = svgRoot.querySelectorAll('#linear-gradient stop');
        if (stops.length < 3) return;

        stops[0].setAttribute('stop-color', bottomColor);
        stops[1].setAttribute('stop-color', midColor);
        stops[2].setAttribute('stop-color', topColor);
    }

    function setBobbaOnSvg(svgRoot, enabled, color = null) {
        setLayerVisibleOnSvg(svgRoot, 'Bobba', enabled);
        if (enabled && color) setGroupFillOnSvg(svgRoot, 'Bobba', color);
    }

    function setSeedsOnSvg(svgRoot, enabled, color = null) {
        setLayerVisibleOnSvg(svgRoot, 'Seeds', enabled);
        if (enabled && color) setGroupFillOnSvg(svgRoot, 'Seeds', color);
    }

    function setSyrupOnSvg(svgRoot, enabled, color = null) {
        setLayerVisibleOnSvg(svgRoot, 'Syrup', enabled);
        if (enabled && color) setGroupFillOnSvg(svgRoot, 'Syrup', color);
    }

    function applyDrinkStyleToSvg(svgRoot, drinkConfig) {
        if (!svgRoot || !drinkConfig) return;

        if (drinkConfig.lid_color) setGroupFillOnSvg(svgRoot, 'Lid', drinkConfig.lid_color);
        if (drinkConfig.straw_color) setGroupFillOnSvg(svgRoot, 'Straw', drinkConfig.straw_color);

        if (drinkConfig.liquid_top && drinkConfig.liquid_mid && drinkConfig.liquid_bottom) {
            setLiquidGradientOnSvg(
                svgRoot,
                drinkConfig.liquid_top,
                drinkConfig.liquid_mid,
                drinkConfig.liquid_bottom
            );
        }

        setBobbaOnSvg(svgRoot, !!drinkConfig.show_bobba, drinkConfig.bobba_color || null);
        setSeedsOnSvg(svgRoot, !!drinkConfig.show_seeds, drinkConfig.seeds_color || null);
        setSyrupOnSvg(svgRoot, !!drinkConfig.show_syrup, drinkConfig.syrup_color || null);

        Object.entries(addonStackConfigs).forEach(([stackType, stackConfig]) => {
            if (stackConfig.hideSource) {
                setLayerVisibleOnSvg(svgRoot, stackConfig.sourceId, false);
            }
            resetAddonStackOnSvg(svgRoot, stackType);
        });
    }

    function renderAddonStackOnSvg(svgRoot, stackType, addonNames) {
        if (!svgRoot) return;

        const stackConfig = addonStackConfigs[stackType];
        if (!stackConfig) return;

        if (stackConfig.hideSource) {
            setLayerVisibleOnSvg(svgRoot, stackConfig.sourceId, false);
        }

        resetAddonStackOnSvg(svgRoot, stackType);

        addonNames.slice(0, stackConfig.layers.length).forEach((addonName, index) => {
            const layerId = stackConfig.layers[index].id;
            const color = getAddonVisualConfig(addonName).color || '#d8f3c4';

            setGroupFillOnSvg(svgRoot, layerId, color);
            setLayerVisibleOnSvg(svgRoot, layerId, true);
        });
    }

    function applyAddonsToSvg(svgRoot, drink, addons, cubeNames) {
        if (!svgRoot || !drink) return;

        const baseStyle = drinkStyleMap[drink.name];
        if (!baseStyle) return;

        applyDrinkStyleToSvg(svgRoot, baseStyle);

        const ballAddons = addons.filter((addon) => getAddonVisualConfig(addon.name).type === 'ball');
        const seedAddons = addons.filter((addon) => getAddonVisualConfig(addon.name).type === 'seeds');
        const syrupAddons = addons.filter((addon) => getAddonVisualConfig(addon.name).type === 'syrup');

        renderAddonStackOnSvg(svgRoot, 'cube', cubeNames);

        if (ballAddons.length > 0) {
            renderAddonStackOnSvg(svgRoot, 'ball', ballAddons.map((addon) => addon.name));
        }

        if (seedAddons.length > 0) {
            renderAddonStackOnSvg(svgRoot, 'seeds', seedAddons.map((addon) => addon.name));
        }

        const visibleSyrupAddons = syrupAddons.filter((addon) => {
            const normalizedName = normalizeAddonName(addon.name);
            return !['taro', 'chamoy', 'milk oat', 'milk foam', 'cocoa powder', 'yogurt base'].includes(normalizedName);
        });

        if (visibleSyrupAddons.length > 0) {
            renderAddonStackOnSvg(svgRoot, 'syrup', visibleSyrupAddons.map((addon) => addon.name));
        }

        let gradientTop = baseStyle.liquid_top;
        let gradientMid = baseStyle.liquid_mid;
        let gradientBottom = baseStyle.liquid_bottom;

        syrupAddons.forEach((addon) => {
            const normalizedName = normalizeAddonName(addon.name);

            if (normalizedName.includes('foam') || normalizedName === 'milk oat') {
                gradientTop = normalizedName === 'milk oat' ? '#efe6d6' : '#fff7dc';
            }

            if (normalizedName === 'taro') {
                gradientTop = '#c7b0e8';
            }

            if (normalizedName === 'chamoy') {
                gradientTop = '#f08a6c';
            }

            if (normalizedName === 'cocoa powder') {
                gradientTop = '#8b5a3c';
                gradientMid = '#6f4630';
            }

            if (normalizedName === 'yogurt base') {
                gradientBottom = '#f5f2ea';
            }
        });

        if (
            gradientTop !== baseStyle.liquid_top ||
            gradientMid !== baseStyle.liquid_mid ||
            gradientBottom !== baseStyle.liquid_bottom
        ) {
            setLiquidGradientOnSvg(svgRoot, gradientTop, gradientMid, gradientBottom);
        }
    }

    function svgToDataUrl(svgRoot) {
        const serialized = new XMLSerializer().serializeToString(svgRoot);
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
    }

    function renderModalPreviewFromCurrentSvg() {
        if (!modalDrinkPreviewMount) return;

        if (!selectedDrink) {
            modalDrinkPreviewMount.innerHTML = '<div class="muted">Choose a drink to preview it here.</div>';
            return;
        }

        const modalSvg = createDrinkSvgInstance();
        if (!modalSvg) {
            modalDrinkPreviewMount.innerHTML = '<div class="muted">Could not load preview.</div>';
            return;
        }

        setupAddonLayersOnSvg(modalSvg);
        applyAddonsToSvg(modalSvg, selectedDrink, selectedAddons, cubeAddonOrder);

        const img = document.createElement('img');
        img.alt = `${selectedDrink.name} preview`;
        img.src = svgToDataUrl(modalSvg);

        modalDrinkPreviewMount.innerHTML = '';
        modalDrinkPreviewMount.appendChild(img);
    }

    function animateAddonPreviewUpdate() {
        if (!previewWaveOverlay) {
            updateDrinkPreviewForAddons();
            return;
        }

        if (previewWaveTimer) {
            clearTimeout(previewWaveTimer);
        }

        if (previewWaveCleanupTimer) {
            clearTimeout(previewWaveCleanupTimer);
        }

        previewWaveOverlay.classList.remove('is-animating');
        void previewWaveOverlay.offsetWidth;
        previewWaveOverlay.classList.add('is-animating');

        previewWaveTimer = setTimeout(() => {
            updateDrinkPreviewForAddons();
        }, 175);

        previewWaveCleanupTimer = setTimeout(() => {
            previewWaveOverlay.classList.remove('is-animating');
        }, 360);
    }

    function createMenuDrinkPreviewDataUrl(drink) {
        const cacheKey = drink.name;
        if (menuPreviewCache.has(cacheKey)) {
            return menuPreviewCache.get(cacheKey);
        }

        const svgRoot = createDrinkSvgInstance();
        if (!svgRoot) return '';

        setupAddonLayersOnSvg(svgRoot);
        applyAddonsToSvg(svgRoot, drink, [], []);

        const dataUrl = svgToDataUrl(svgRoot);
        menuPreviewCache.set(cacheKey, dataUrl);
        return dataUrl;
    }

    // Show svg image preview in the "My order" menu
    function createOrderItemPreviewDataUrl(item) {
        const svgRoot = createDrinkSvgInstance();
        if (!svgRoot) return '';

        setupAddonLayersOnSvg(svgRoot);
        applyAddonsToSvg(
            svgRoot,
            {
                id: item.drinkId,
                name: item.name,
                price: item.basePrice
            },
            item.addons || [],
            item.cubeAddonOrder || []
        );

        return svgToDataUrl(svgRoot);
    }

    async function loadDrinkSvg() {
        try {
            const response = await fetch('/images/DrinkFoundation.svg');
            const svgAssetText = await response.text();

            if (!response.ok) {
                throw new Error(`Drink SVG request failed: ${response.status}`);
            }

            drinkSvgTemplate = extractDrinkSvgTemplate(svgAssetText);
            if (!drinkSvgTemplate) {
                throw new Error('Could not find SVG markup in DrinkFoundation asset');
            }

            menuPreviewCache.clear();
            renderMenu();
            renderModalPreviewFromCurrentSvg();
        } catch (err) {
            console.error('Could not load drink SVG:', err);
            if (modalDrinkPreviewMount) {
                modalDrinkPreviewMount.innerHTML = '<div class="muted">Could not load drink preview</div>';
            }
        }
    }

    function clearDrinkPreviewLayers() {
        renderModalPreviewFromCurrentSvg();
    }

    function isCubeAddonName(name) {
        return getAddonVisualConfig(name).type === 'cube';
    }

    function syncCubeAddonOrder() {
        const selectedCubeNames = selectedAddons
            .filter((addon) => isCubeAddonName(addon.name))
            .map((addon) => addon.name);

        cubeAddonOrder = cubeAddonOrder.filter((name) => selectedCubeNames.includes(name));

        selectedCubeNames.forEach((name) => {
            if (!cubeAddonOrder.includes(name)) {
                cubeAddonOrder.push(name);
            }
        });
    }

    function updateDrinkPreviewForAddons() {
        if (!selectedDrink) {
            clearDrinkPreviewLayers();
            return;
        }

        const baseStyle = drinkStyleMap[selectedDrink.name];
        if (!baseStyle) {
            clearDrinkPreviewLayers();
            return;
        }

        syncCubeAddonOrder();
        renderModalPreviewFromCurrentSvg();
    }

    function money(value) {
        return value.toFixed(2);
    }

    function getCategoryTabColor(category) {
        return categoryTabColors[category] || '#fff5ee';
    }

    function getVisibleAddonCategories() {
        const categories = addonCategoryOrder.filter((category) =>
            menuData.addons.some((addon) => getAddonDisplayCategory(addon.name) === category)
        );

        return categories.length ? categories : ['ball'];
    }

    function renderAddonCategoryTabs() {
        if (!addonCategoryTabs) return;

        const visibleCategories = getVisibleAddonCategories();
        if (!visibleCategories.includes(currentAddonCategory)) {
            currentAddonCategory = visibleCategories[0];
        }

        addonCategoryTabs.innerHTML = '';

        visibleCategories.forEach((category) => {
            const button = document.createElement('button');
            button.className = 'addon-category-tab' + (category === currentAddonCategory ? ' active' : '');
            button.type = 'button';
            button.textContent = addonCategoryLabels[category] || category;
            button.style.backgroundColor = addonCategoryTabColors[category] || '#eef6fb';
            button.onclick = () => {
                currentAddonCategory = category;
                renderAddonCategoryTabs();
                renderAddons();
            };
            addonCategoryTabs.appendChild(button);
        });
    }

    function getDefaultCustomization(drink) {
        return {
            drink,
            addons: [],
            cubeAddonOrder: [],
            sugar: '100%',
            ice: 'Regular Ice'
        };
    }

    function getOrderItemTotal(drink, addons, itemQuantity) {
        const addonTotal = addons.reduce((sum, addon) => sum + addon.price, 0);
        return (drink.price + addonTotal) * itemQuantity;
    }

    function syncCubeOrderForAddons(addons, savedCubeOrder = []) {
        const selectedCubeNames = addons
            .filter((addon) => isCubeAddonName(addon.name))
            .map((addon) => addon.name);

        const cubeOrder = savedCubeOrder.filter((name) => selectedCubeNames.includes(name));
        selectedCubeNames.forEach((name) => {
            if (!cubeOrder.includes(name)) {
                cubeOrder.push(name);
            }
        });

        return cubeOrder;
    }

    function buildOrderItem(drink) {
        const addons = [...selectedAddons];
        const finalCubeOrder = syncCubeOrderForAddons(addons, [...cubeAddonOrder]);

        return {
            drinkId: drink.id,
            name: drink.name,
            basePrice: drink.price,
            addons,
            cubeAddonOrder: finalCubeOrder,
            sugar: selectedSugar,
            ice: selectedIce,
            quantity,
            total: getOrderItemTotal(drink, addons, quantity)
        };
    }

    function openCustomizeModal(drink, existingItem = null, orderIndex = null) {
        customizationDraft = existingItem
            ? {
                drink,
                addons: [...existingItem.addons],
                cubeAddonOrder: [...(existingItem.cubeAddonOrder || [])],
                sugar: existingItem.sugar,
                ice: existingItem.ice
            }
            : getDefaultCustomization(drink);
        selectedDrink = drink;
        selectedAddons = [...customizationDraft.addons];
        cubeAddonOrder = [...customizationDraft.cubeAddonOrder];
        selectedSugar = customizationDraft.sugar;
        selectedIce = customizationDraft.ice;
        quantity = existingItem ? existingItem.quantity : 1;
        editingOrderIndex = orderIndex;

        customizeDrinkTitleEl.textContent = `Customize ${drink.name}`;
        customizeDrinkPriceEl.textContent = `$${money(drink.price)}`;
        saveCustomizeBtn.textContent = editingOrderIndex === null ? 'Add to order' : 'Save changes';
        customizeOverlay.classList.remove('hidden');

        renderSugarOptions();
        renderIceOptions();
        renderAddonCategoryTabs();
        renderAddons();
        renderQuantity();
        renderMenu();
        updateDrinkPreviewForAddons();
    }

    function closeCustomizeModal() {
        customizeOverlay.classList.add('hidden');
    }

    function saveCustomization() {
        if (!customizationDraft || !selectedDrink) return;

        customizationDraft.addons = [...selectedAddons];
        customizationDraft.cubeAddonOrder = [...cubeAddonOrder];
        customizationDraft.sugar = selectedSugar;
        customizationDraft.ice = selectedIce;

        const orderItem = buildOrderItem(selectedDrink);
        if (editingOrderIndex === null) {
            order.push(orderItem);
        } else {
            order[editingOrderIndex] = orderItem;
        }

        closeCustomizeModal();
        clearCurrentSelection();
        hideResultOverlay();
        renderQuantity();
        renderMenu();
        renderOrder();
    }

    function cancelCustomization() {
        closeCustomizeModal();
        clearCurrentSelection();
        renderAddons();
        renderQuantity();
        renderMenu();
    }

    function clearCurrentSelection() {
        selectedDrink = null;
        selectedAddons = [];
        cubeAddonOrder = [];
        selectedSugar = '100%';
        selectedIce = 'Regular Ice';
        customizationDraft = null;
        quantity = 1;
        editingOrderIndex = null;
        saveCustomizeBtn.textContent = 'Done';
        clearDrinkPreviewLayers();
    }

    function renderChoiceButtons(container, options, selectedValue, onSelect) {
        container.innerHTML = '';

        options.forEach((option) => {
            const button = document.createElement('button');
            button.className = 'choice-btn' + (option === selectedValue ? ' selected' : '');
            button.type = 'button';
            button.textContent = option;
            button.onclick = () => onSelect(option);
            container.appendChild(button);
        });
    }

    function renderSugarOptions() {
        renderChoiceButtons(sugarGrid, sugarOptions, selectedSugar, (option) => {
            selectedSugar = option;
            renderSugarOptions();
            renderQuantity();
        });
    }

    function renderIceOptions() {
        renderChoiceButtons(iceGrid, iceOptions, selectedIce, (option) => {
            selectedIce = option;
            renderIceOptions();
            renderQuantity();
        });
    }

    function renderTabs() {
        categoryTabs.innerHTML = '';

        const visibleCategories = Object.keys(menuData.categories).filter((category) => category.toUpperCase() !== 'ADDON');

        if (!currentCategory || !visibleCategories.length) {
            categoryTabs.innerHTML = '<div class="muted">No categories available</div>';
            return;
        }

        if (!visibleCategories.includes(currentCategory)) {
            currentCategory = visibleCategories[0] || null;
        }

        visibleCategories.forEach((category) => {
            const button = document.createElement('button');
            button.className = 'tab-btn' + (category === currentCategory ? ' active' : '');
            button.type = 'button';
            button.textContent = category;
            button.style.backgroundColor = getCategoryTabColor(category);
            button.onclick = () => {
                currentCategory = category;
                renderTabs();
                renderMenu();
            };
            categoryTabs.appendChild(button);
        });
    }

    function renderMenu() {
        menuGrid.innerHTML = '';

        if (!currentCategory || !menuData.categories[currentCategory] || menuData.categories[currentCategory].length === 0) {
            menuGrid.innerHTML = '<div class="muted">No items in this category</div>';
            return;
        }

        menuData.categories[currentCategory].forEach((item) => {
            const isSelected = selectedDrink && selectedDrink.id === item.id;
            const previewUrl = createMenuDrinkPreviewDataUrl(item);
            const button = document.createElement('button');
            button.className = 'item-btn' + (isSelected ? ' selected' : '');
            button.type = 'button';
            button.innerHTML = `
                <div class="item-btn-content">
                    ${previewUrl ? `<img class="menu-drink-thumb" src="${previewUrl}" alt="${item.name} preview">` : ''}
                    <div class="item-btn-copy">
                        <h3>${item.name}</h3>
                        <p>$${money(item.price)}</p>
                    </div>
                </div>
            `;
            button.onclick = () => {
                openCustomizeModal(item);
            };
            menuGrid.appendChild(button);
        });
    }

    function renderAddons() {
        addonGrid.innerHTML = '';

        const filteredAddons = menuData.addons.filter(
            (addon) => getAddonDisplayCategory(addon.name) === currentAddonCategory
        );

        if (filteredAddons.length === 0) {
            addonGrid.innerHTML = '<div class="muted">No add ons in this category</div>';
            return;
        }

        filteredAddons.forEach((addon) => {
            const button = document.createElement('button');
            button.className = 'addon-btn' + (selectedAddons.some((a) => a.id === addon.id) ? ' selected' : '');
            button.type = 'button';
            button.textContent = `${translateName(addon.name)} +$${money(addon.price)}`;
            button.onclick = () => {
                const exists = selectedAddons.some((a) => a.id === addon.id);

                if (exists) {
                    selectedAddons = selectedAddons.filter((a) => a.id !== addon.id);
                } else {
                    selectedAddons.push(addon);
                }

                renderAddons();
                renderQuantity();
                animateAddonPreviewUpdate();
            };
            addonGrid.appendChild(button);
        });
    }

    function renderQuantity() {
        qtyValueEl.textContent = quantity;
    }

    function hideResultOverlay() {
        if (resultOverlayTimer) {
            clearTimeout(resultOverlayTimer);
            resultOverlayTimer = null;
        }

        resultOverlayEl.classList.add('hidden');
        resultCardEl.classList.remove('success', 'error', 'info');
        resultTitleEl.textContent = '';
        resultMessageEl.textContent = '';
        resultTicketEl.textContent = '';
        resultTicketEl.classList.add('hidden');
    }

    function showResultOverlay({ title, message, type = 'info', ticketNumber = null, autoDismissMs = null }) {
        if (resultOverlayTimer) {
            clearTimeout(resultOverlayTimer);
            resultOverlayTimer = null;
        }

        resultCardEl.classList.remove('success', 'error', 'info');
        resultCardEl.classList.add(type);
        resultTitleEl.textContent = title;
        resultMessageEl.textContent = message;

        if (ticketNumber) {
            resultTicketEl.textContent = `Ticket #${ticketNumber}`;
            resultTicketEl.classList.remove('hidden');
        } else {
            resultTicketEl.textContent = '';
            resultTicketEl.classList.add('hidden');
        }

        resultOverlayEl.classList.remove('hidden');

        if (autoDismissMs) {
            resultOverlayTimer = setTimeout(() => {
                hideResultOverlay();
            }, autoDismissMs);
        }
    }

    // ------------ Functions for "cart-my order" section ------------
    function getItemEditSummary(item) {
        const optionParts = [
            `Sugar: ${item.sugar}`,
            `Ice: ${item.ice}`
        ];

        if (item.addons.length > 0) {
            optionParts.push(`Add ons: ${item.addons.map((addon) => translateName(addon.name)).join(', ')}`);
        }

        return optionParts.join(' | ');
    }

    function updateOrderItemQuantity(index, nextQuantity) {
        if (!order[index]) return;

        order[index].quantity = Math.max(1, nextQuantity);
        order[index].total = getOrderItemTotal(
            { price: order[index].basePrice },
            order[index].addons,
            order[index].quantity
        );

        renderOrder();
    }

    function openOrderItemEditor(index) {
        const item = order[index];
        if (!item) return;

        openCustomizeModal(
            {
                id: item.drinkId,
                name: item.name,
                price: item.basePrice
            },
            item,
            index
        );
    }

    function renderOrder() {
        if (order.length === 0) {
            orderListEl.innerHTML = '<div class="muted">Your order is empty</div>';
            orderTotalEl.textContent = '0.00';
            return;
        }

        orderListEl.innerHTML = '';
        let total = 0;

        order.forEach((item, index) => {
            total += item.total;
            const previewUrl = createOrderItemPreviewDataUrl(item);

            const div = document.createElement('div');
            div.className = 'order-item';
            div.innerHTML = `
                <button class="order-item-edit" type="button">
                    <div class="order-item-main">
                        ${previewUrl ? `<img class="order-item-thumb" src="${previewUrl}" alt="${item.name} preview">` : ''}
                        <div class="order-item-details">
                            <h3>${item.quantity} x ${translateName(item.name)}</h3>
                            <div class="order-item-copy">${getItemEditSummary(item)}</div>
                            <div class="order-item-price-row">
                                <strong>$${money(item.total)}</strong>
                                <span class="order-item-hint">Tap to edit</span>
                            </div>
                        </div>
                    </div>
                </button>
                <div class="order-item-actions">
                    <div class="qty-row cart-qty-row">
                        <span>Qty</span>
                        <button class="qty-btn order-qty-btn" type="button" data-action="decrease">-</button>
                        <strong>${item.quantity}</strong>
                        <button class="qty-btn order-qty-btn" type="button" data-action="increase">+</button>
                    </div>
                    <button class="cart-btn danger order-remove-btn" type="button">Remove</button>
                </div>
            `;

            div.querySelector('.order-item-edit').onclick = () => openOrderItemEditor(index);
            div.querySelector('[data-action="decrease"]').onclick = (event) => {
                event.stopPropagation();
                updateOrderItemQuantity(index, item.quantity - 1);
            };
            div.querySelector('[data-action="increase"]').onclick = (event) => {
                event.stopPropagation();
                updateOrderItemQuantity(index, item.quantity + 1);
            };
            div.querySelector('.order-remove-btn').onclick = (event) => {
                event.stopPropagation();
                removeOrderItem(index);
            };

            orderListEl.appendChild(div);
        });

        orderTotalEl.textContent = money(total);
    }

    function removeOrderItem(index) {
        order.splice(index, 1);
        renderOrder();
    }

    // --------------- Order confirmation overlay ---------------
    async function submitOrder() {
        if (order.length === 0) {
            showResultOverlay({
                title: 'Order not submitted',
                message: 'Your order is empty. Please add at least one drink before checking out.',
                type: 'error'
            });
            return;
        }

        const payload = { order };
        showResultOverlay({
            title: 'Submitting order...',
            message: 'Please wait while we send your order to the kitchen.',
            type: 'info'
        });

        try {
            const res = await fetch('/kiosk/submitOrder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok && data.success) {
                showResultOverlay({
                    title: 'Order confirmed',
                    message: 'Enjoy your boba!',
                    type: 'success',
                    ticketNumber: data.orderId || null,
                    autoDismissMs: 8000
                });
                order = [];
                renderOrder();
            } else {
                showResultOverlay({
                    title: 'Order not submitted',
                    message: data.message || 'Something went wrong while submitting your order. Please try again.',
                    type: 'error'
                });
            }
        } catch (err) {
            console.error(err);
            showResultOverlay({
                title: 'Connection problem',
                message: 'Unable to reach the server. Please try again.',
                type: 'error'
            });
        }
    }

    function bindEvents() {
        document.getElementById('minusQty').onclick = () => {
            if (quantity > 1) {
                quantity -= 1;
                renderQuantity();
            }
        };

        document.getElementById('plusQty').onclick = () => {
            quantity += 1;
            renderQuantity();
        };

        document.getElementById('clearOrder').onclick = () => {
            order = [];
            cancelCustomization();
            hideResultOverlay();
            renderOrder();
        };

        document.getElementById('checkoutOrder').onclick = submitOrder;
        resultOkBtn.onclick = hideResultOverlay;
        closeCustomizeBtn.onclick = cancelCustomization;
        cancelCustomizeBtn.onclick = cancelCustomization;
        saveCustomizeBtn.onclick = saveCustomization;
        customizeOverlay.onclick = (event) => {
            if (event.target === customizeOverlay) {
                cancelCustomization();
            }
        };
    }

    function initAccessibilityControls() {
        const lens = document.getElementById('screenMagnifier');
        const lensContent = document.getElementById('screenMagnifierContent');
        const zoom = 2;
        const lensSize = 220;
        let magnifierOn = false;

        window.googleTranslateElementInit = function googleTranslateElementInit() {
            new google.translate.TranslateElement({ pageLanguage: 'en' }, 'google_translate_element');
        };

        window.toggleHighContrast = function toggleHighContrast() {
            document.body.classList.toggle('high-contrast');
        };

        window.toggleLowContrast = function toggleLowContrast() {
            document.body.classList.toggle('low-contrast');
        };

        window.toggleFontSize = function toggleFontSize() {
            const currentSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
            if (currentSize !== 20) {
                document.documentElement.style.fontSize = '20px';
            } else {
                document.documentElement.style.fontSize = `${originalSize}px`;
            }
        };

        function buildClone() {
            const clone = document.body.cloneNode(true);
            const oldLens = clone.querySelector('#screenMagnifier');
            if (oldLens) oldLens.remove();

            lensContent.innerHTML = '';
            lensContent.appendChild(clone);
        }

        function updateMagnifier(event) {
            if (!magnifierOn) return;

            const mouseX = event.clientX;
            const mouseY = event.clientY;
            const pageX = event.pageX;
            const pageY = event.pageY;

            lens.style.display = 'block';
            lens.style.left = `${mouseX + 20}px`;
            lens.style.top = `${mouseY + 20}px`;

            lensContent.style.transform = `scale(${zoom})`;
            lensContent.style.left = `${-(pageX * zoom - lensSize / 2)}px`;
            lensContent.style.top = `${-(pageY * zoom - lensSize / 2)}px`;
        }

        function hideMagnifier() {
            lens.style.display = 'none';
        }

        buildClone();

        document.addEventListener('mousemove', updateMagnifier);
        document.addEventListener('mouseleave', hideMagnifier);
        window.addEventListener('scroll', buildClone);
        window.addEventListener('resize', buildClone);
        setInterval(buildClone, 1000);

        window.toggleScreenMagnifier = function toggleScreenMagnifier() {
            magnifierOn = !magnifierOn;
            if (!magnifierOn) lens.style.display = 'none';
        };
    }

    function init() {
        bindEvents();
        initAccessibilityControls();

        if (Object.keys(menuData.categories).length > 0) {
            renderTabs();
            renderMenu();
            renderAddons();
            renderQuantity();
            renderOrder();
        } else {
            document.querySelector('.section-title').textContent = 'No menu items available';
        }

        loadDrinkSvg();
    }

    init();
})();
