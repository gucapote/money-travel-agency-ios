
// mta-ui.js - Money Travel Agency UI rendering (canonical v1)

if (window.__mta_ui_loaded) {
    console.warn('mta-ui.js already loaded; skipping duplicate execution.');
} else {
    window.__mta_ui_loaded = true;

// ============================================================================
// POPUP CONTROL FUNCTIONS
// ============================================================================
const showPopup = (popupId) => {
    const popupEl = document.getElementById(popupId);
    if (popupEl) {
        popupEl.classList.remove('mta-hidden');
    }
};

const closePopup = (popupId) => {
    const popupEl = document.getElementById(popupId);
    if (popupEl) {
        popupEl.classList.add('mta-hidden');
    }
};

/**
 * Initialize Arrival Registration Form
 */
window.initializeArrivalForm = () => {
    const form = document.getElementById('income-form');
    if (!form) return;
    
    // Reset form
    form.reset();
    
    // Set arrival dates to today
    const landingDateInput = document.getElementById('group-landing-date');
    if (landingDateInput) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        landingDateInput.value = `${year}-${month}-${day}`;
    }
    const restrictedLandingDateInput = document.getElementById('restricted-landing-date');
    if (restrictedLandingDateInput) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        restrictedLandingDateInput.value = `${year}-${month}-${day}`;
    }
    
    // Set default to Open Transit (external)
    const typeOpenRadio = document.getElementById('type-open');
    if (typeOpenRadio) typeOpenRadio.checked = true;
    
    // Show Open Transit fields, hide Restricted Transit fields
    const openTransitFields = document.getElementById('open-transit-fields');
    const restrictedTransitFields = document.getElementById('restricted-transit-fields');
    if (openTransitFields) openTransitFields.classList.remove('mta-hidden');
    if (restrictedTransitFields) restrictedTransitFields.classList.add('mta-hidden');
    
    // Set required attributes correctly for Open Transit
    const landingTerminal = document.getElementById('group-landing-terminal');
    const incomeAmount = document.getElementById('income-amount');
    if (landingTerminal) landingTerminal.setAttribute('required', 'required');
    if (incomeAmount) incomeAmount.setAttribute('required', 'required');
    
    // Remove required from restricted transit fields
    const creditAirport = document.getElementById('group-credit-airport');
    const restrictedAmount = document.getElementById('restricted-amount');
    if (creditAirport) creditAirport.removeAttribute('required');
    if (restrictedAmount) restrictedAmount.removeAttribute('required');
    const arrivalName = document.getElementById('group-name');
    if (arrivalName) arrivalName.value = viewState.defaultArrivalName || '';
    const arrivalGroupName = document.getElementById('group-group-name');
    if (arrivalGroupName) arrivalGroupName.value = viewState.defaultArrivalGroupName || '';
    
    // Ensure amount fields are visible for non-extendable
    const amountGroup = document.getElementById('non-extendable-amount-group');
    const restrictedFirstTravelGroup = document.getElementById('restricted-first-travel-group');
    if (amountGroup) amountGroup.classList.remove('mta-hidden');
    if (restrictedFirstTravelGroup) restrictedFirstTravelGroup.classList.add('mta-hidden');

    const cargoPanel = document.getElementById('arrival-cargo-panel');
    if (cargoPanel) cargoPanel.classList.add('mta-hidden');
    renderArrivalCargoRows([]);
    syncArrivalAmountInputsWithCargo();
    if (window.updateArrivalGroupNameFieldVisibility) {
        window.updateArrivalGroupNameFieldVisibility('external');
    }
    if (window.positionArrivalCargoBlock) {
        window.positionArrivalCargoBlock('external');
    }
    applyCurrentUIPreferences();
};

const getArrivalCargoRowsContainer = () => document.getElementById('arrival-cargo-rows');

const getArrivalCargoItems = () => {
    const container = getArrivalCargoRowsContainer();
    if (!container) return [];

    return Array.from(container.querySelectorAll('.mta-arrival-cargo-row')).map(row => ({
        productId: row.querySelector('[data-cargo-field="product"]')?.value || '',
        quantity: Number(row.querySelector('[data-cargo-field="quantity"]')?.value || 0),
        unitPrice: Number(row.querySelector('[data-cargo-field="unitPrice"]')?.value || 0),
        amount: Number(row.querySelector('[data-cargo-field="amount"]')?.value || 0)
    })).filter(item => item.productId);
};

const calculateArrivalCargoTotal = (cargoItems = getArrivalCargoItems()) => {
    return cargoItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
};

const getArrivalAmountInputs = () => ({
    openAmountInput: document.getElementById('income-amount'),
    restrictedAmountInput: document.getElementById('restricted-amount'),
    type: document.querySelector('input[name="group-type"]:checked')?.value || 'external',
    isExtendable: document.getElementById('group-extendable')?.checked || false
});

const syncArrivalAmountInputsWithCargo = () => {
    const cargoItems = getArrivalCargoItems();
    const hasCargo = cargoItems.length > 0;
    const cargoRowsCount = getArrivalCargoRowsContainer()?.querySelectorAll('.mta-arrival-cargo-row').length || 0;
    const cargoTotal = Number(calculateArrivalCargoTotal(cargoItems).toFixed(2));
    const { openAmountInput, restrictedAmountInput, type } = getArrivalAmountInputs();
    const isLiability = type === 'liability';
    const shouldUseCargo = hasCargo && !isLiability;
    const addCargoBtn = document.getElementById('arrival-add-cargo-item');
    const addCargoRowBtn = document.getElementById('arrival-add-cargo-row-btn');

    if (addCargoBtn) {
        addCargoBtn.disabled = isLiability;
        addCargoBtn.classList.toggle('mta-hidden', isLiability || cargoRowsCount > 0);
    }
    if (addCargoRowBtn) {
        addCargoRowBtn.disabled = isLiability;
        addCargoRowBtn.classList.toggle('mta-hidden', isLiability || cargoRowsCount === 0);
    }

    if (openAmountInput) {
        openAmountInput.readOnly = shouldUseCargo;
        if (shouldUseCargo && type !== 'liability') {
            openAmountInput.value = cargoTotal ? String(cargoTotal) : '';
        }
    }

    if (restrictedAmountInput) {
        restrictedAmountInput.readOnly = false;
    }
    const cargoPanel = document.getElementById('arrival-cargo-panel');
    if (cargoPanel) {
        cargoPanel.classList.toggle('mta-hidden', isLiability || cargoRowsCount === 0);
    }
    const cargoBlock = document.getElementById('arrival-cargo-block');
    if (cargoBlock) {
        cargoBlock.classList.toggle('mta-hidden', isLiability || !viewState.salesMode);
    }
};

const buildArrivalCargoRow = (item = {}) => {
    const activeProducts = getActiveProducts ? getActiveProducts() : [];
    const selectedProductId = item.productId || '';
    const quantity = Number(item.quantity || 1);
    const unitPrice = Number(item.unitPrice || 0);
    const amount = Number(item.amount || (quantity * unitPrice));
    const options = [`<option value="">${t('arrival.selectProduct')}</option>`]
        .concat(activeProducts.map(product => (
            `<option value="${product.id}" ${product.id === selectedProductId ? 'selected' : ''}>${getProductOptionLabel(product)}</option>`
        )))
        .join('');

    return `
        <div class="mta-arrival-cargo-row mb-2 p-2 border rounded">
            <div class="form-row">
                <div class="form-group col-md-12">
                    <label class="small mb-1">${t('arrival.product')}</label>
                    <select class="form-control form-control-sm" data-cargo-field="product">${options}</select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group col-6">
                    <label class="small mb-1">${t('arrival.quantity')}</label>
                    <div class="mta-cargo-quantity-row">
                        <div class="mta-cargo-quantity-segment">
                            <button type="button" class="btn btn-outline-secondary btn-sm w-100" data-cargo-action="decreaseQuantity" aria-label="${t('arrival.decreaseQuantity')}">-</button>
                        </div>
                        <div class="mta-cargo-quantity-segment">
                            <input type="number" class="form-control form-control-sm text-center" data-cargo-field="quantity" min="1" step="1" value="${Math.max(1, Math.round(quantity))}" readonly>
                        </div>
                        <div class="mta-cargo-quantity-segment">
                            <button type="button" class="btn btn-outline-secondary btn-sm w-100" data-cargo-action="increaseQuantity" aria-label="${t('arrival.increaseQuantity')}">+</button>
                        </div>
                    </div>
                </div>
                <div class="form-group col-6">
                    <label class="small mb-1">${t('arrival.amountLabel')}</label>
                    <input type="number" class="form-control form-control-sm" data-cargo-field="amount" readonly value="${Number(amount.toFixed(2))}">
                </div>
            </div>
            <input type="hidden" data-cargo-field="unitPrice" value="${unitPrice}">
        </div>
    `;
};

const bindArrivalCargoRowEvents = (row) => {
    const productSelect = row.querySelector('[data-cargo-field="product"]');
    const quantityInput = row.querySelector('[data-cargo-field="quantity"]');
    const unitPriceInput = row.querySelector('[data-cargo-field="unitPrice"]');
    const amountInput = row.querySelector('[data-cargo-field="amount"]');
    const decreaseBtn = row.querySelector('[data-cargo-action="decreaseQuantity"]');
    const increaseBtn = row.querySelector('[data-cargo-action="increaseQuantity"]');

    const recalc = () => {
        const quantity = Number(quantityInput?.value || 0);
        const unitPrice = Number(unitPriceInput?.value || 0);
        if (amountInput) {
            amountInput.value = Number((quantity * unitPrice).toFixed(2));
        }
        syncArrivalAmountInputsWithCargo();
        if (typeof window.syncEditArrivalAmountWithCargo === 'function') {
            window.syncEditArrivalAmountWithCargo();
        }
    };

    if (productSelect) {
        productSelect.addEventListener('change', () => {
            const product = getProductById ? getProductById(productSelect.value) : null;
            if (product && unitPriceInput) {
                unitPriceInput.value = Number(product.defaultUnitPrice || 0);
            }
            recalc();
        });
    }
    if (decreaseBtn && quantityInput) {
        decreaseBtn.addEventListener('click', () => {
            const currentQuantity = Number(quantityInput.value || 1) || 1;
            const nextQuantity = currentQuantity - 1;
            if (nextQuantity <= 0) {
                row.remove();
                syncArrivalAmountInputsWithCargo();
                if (typeof window.syncEditArrivalAmountWithCargo === 'function') {
                    window.syncEditArrivalAmountWithCargo();
                }
                return;
            }
            quantityInput.value = nextQuantity;
            recalc();
        });
    }
    if (increaseBtn && quantityInput) {
        increaseBtn.addEventListener('click', () => {
            const nextQuantity = (Number(quantityInput.value || 1) || 1) + 1;
            quantityInput.value = nextQuantity;
            recalc();
        });
    }
};

window.renderArrivalCargoRows = (items = []) => {
    const container = getArrivalCargoRowsContainer();
    if (!container) return;

    container.innerHTML = '';
    items.forEach(item => {
        container.insertAdjacentHTML('beforeend', buildArrivalCargoRow(item));
    });
    container.querySelectorAll('.mta-arrival-cargo-row').forEach(bindArrivalCargoRowEvents);
    syncArrivalAmountInputsWithCargo();
};

window.addArrivalCargoRow = () => {
    if (!window.isSalesModeEnabled()) {
        return;
    }
    const type = document.querySelector('input[name="group-type"]:checked')?.value || 'external';
    if (type === 'liability') return;
    const container = getArrivalCargoRowsContainer();
    if (!container) return;
    if (typeof getActiveProducts === 'function' && getActiveProducts().length === 0) {
        showMessage(t('arrival.noProductsAvailable'), 'error');
        return;
    }
    container.insertAdjacentHTML('beforeend', buildArrivalCargoRow());
    const row = container.lastElementChild;
    if (row) bindArrivalCargoRowEvents(row);
    syncArrivalAmountInputsWithCargo();
};

const getEditArrivalCargoRowsContainer = () => document.getElementById('edit-arrival-cargo-rows');

window.getEditArrivalCargoItems = () => {
    const container = getEditArrivalCargoRowsContainer();
    if (!container) return [];
    return Array.from(container.querySelectorAll('.mta-arrival-cargo-row')).map(row => ({
        productId: row.querySelector('[data-cargo-field="product"]')?.value || '',
        quantity: Number(row.querySelector('[data-cargo-field="quantity"]')?.value || 0),
        unitPrice: Number(row.querySelector('[data-cargo-field="unitPrice"]')?.value || 0),
        amount: Number(row.querySelector('[data-cargo-field="amount"]')?.value || 0)
    })).filter(item => item.productId && item.quantity > 0 && item.unitPrice >= 0 && item.amount >= 0);
};

window.syncEditArrivalAmountWithCargo = () => {
    const amountInput = document.getElementById('edit-group-amount');
    if (!amountInput) return;
    const cargoItems = window.getEditArrivalCargoItems();
    if (cargoItems.length > 0) {
        const total = Number(cargoItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0).toFixed(2));
        amountInput.value = total ? String(total) : '';
        amountInput.readOnly = true;
    } else {
        amountInput.readOnly = false;
    }
};

window.addEditArrivalCargoRow = (item = {}) => {
    const container = getEditArrivalCargoRowsContainer();
    if (!container) return;
    if (typeof getActiveProducts === 'function' && getActiveProducts().length === 0) {
        showMessage(t('arrival.noProductsAvailable'), 'error');
        return;
    }
    container.insertAdjacentHTML('beforeend', buildArrivalCargoRow(item));
    const row = container.lastElementChild;
    if (row) bindArrivalCargoRowEvents(row);
    window.syncEditArrivalAmountWithCargo();
};

window.renderEditArrivalCargoRows = (items = []) => {
    const container = getEditArrivalCargoRowsContainer();
    if (!container) return;
    container.innerHTML = '';
    items.forEach(item => window.addEditArrivalCargoRow(item));
    window.syncEditArrivalAmountWithCargo();
};

window.positionArrivalCargoBlock = (type = document.querySelector('input[name="group-type"]:checked')?.value || 'external') => {
    const cargoBlock = document.getElementById('arrival-cargo-block');
    const anchor = document.getElementById('open-arrival-cargo-anchor');
    if (!cargoBlock || !anchor) return;
    anchor.appendChild(cargoBlock);
    cargoBlock.classList.toggle('mta-hidden', type === 'liability' || !viewState.salesMode);
};

window.getArrivalCargoItems = getArrivalCargoItems;
window.syncArrivalAmountInputsWithCargo = syncArrivalAmountInputsWithCargo;
window.isSalesModeEnabled = () => viewState.salesMode === true;

const getProductCodeLabel = (product) => {
    if (!product) return t('unknown');
    return String(product.code || product.name || t('unknown')).trim();
};

const getProductOptionLabel = (product) => {
    const code = getProductCodeLabel(product);
    const name = String(product?.name || '').trim();
    return name && name !== code ? `${code} - ${name}` : code;
};

const setProductFormReadOnly = (readOnly) => {
    ['product-code', 'product-name', 'product-default-unit-price'].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.disabled = readOnly;
    });
    const formActions = document.getElementById('product-form-actions');
    const readActions = document.getElementById('product-read-actions');
    if (formActions) formActions.classList.toggle('mta-hidden', readOnly);
    if (readActions) readActions.classList.toggle('mta-hidden', !readOnly);
};

const getPassengerGroupArrivalAnchorFlight = (groupId, flights, terminals) => {
    const arrivalFlights = flights
        .filter(f => f.passengerGroupId === groupId && isArrivalBornInitialAllocation(f, terminals))
        .sort((a, b) => {
            const dateCompare = getFlightSortDateValue(a) - getFlightSortDateValue(b);
            if (dateCompare !== 0) return dateCompare;
            const createdCompare = getFlightCreatedAtValue(a) - getFlightCreatedAtValue(b);
            if (createdCompare !== 0) return createdCompare;
            return (a.id || '').localeCompare(b.id || '');
        });
    return arrivalFlights[0] || null;
};

window.showProductManager = () => {
    if (!window.isSalesModeEnabled()) {
        return;
    }
    const form = document.getElementById('product-form');
    const title = document.getElementById('product-modal-title');
    const submitBtn = document.getElementById('product-submit-btn');
    const editId = document.getElementById('product-edit-id');
    const viewMode = document.getElementById('product-view-mode');
    const codeInput = document.getElementById('product-code');
    const nameInput = document.getElementById('product-name');
    const priceInput = document.getElementById('product-default-unit-price');

    if (form) form.reset();
    if (title) title.textContent = t('productManager');
    if (submitBtn) submitBtn.textContent = t('save');
    if (editId) editId.value = '';
    if (viewMode) viewMode.value = 'edit';
    if (codeInput) codeInput.value = '';
    if (nameInput) nameInput.value = '';
    if (priceInput) priceInput.value = '0';
    setProductFormReadOnly(false);
    showPopup('create-product-popup');
};

window.showProductDetails = (productId) => {
    const product = getProductById(productId);
    if (!product) return;

    const title = document.getElementById('product-modal-title');
    const editId = document.getElementById('product-edit-id');
    const viewMode = document.getElementById('product-view-mode');
    const codeInput = document.getElementById('product-code');
    const nameInput = document.getElementById('product-name');
    const priceInput = document.getElementById('product-default-unit-price');
    const editBtn = document.getElementById('product-read-edit-btn');
    const deleteBtn = document.getElementById('product-read-delete-btn');

    if (title) title.textContent = t('productManager');
    if (editId) editId.value = product.id;
    if (viewMode) viewMode.value = 'read';
    if (codeInput) codeInput.value = product.code || '';
    if (nameInput) nameInput.value = product.name || '';
    if (priceInput) priceInput.value = String(product.defaultUnitPrice || 0);
    if (editBtn) editBtn.onclick = () => window.showEditProductForm(product.id);
    if (deleteBtn) {
        deleteBtn.onclick = () => window.handleDeleteProduct(product.id, product.name);
        deleteBtn.classList.toggle('mta-hidden', !window.isDeleteEnabledMode());
    }
    setProductFormReadOnly(true);
    showPopup('create-product-popup');
};

window.showEditProductForm = (productId) => {
    const product = getProductById(productId);
    if (!product) return;

    const title = document.getElementById('product-modal-title');
    const submitBtn = document.getElementById('product-submit-btn');
    const editId = document.getElementById('product-edit-id');
    const viewMode = document.getElementById('product-view-mode');
    const codeInput = document.getElementById('product-code');
    const nameInput = document.getElementById('product-name');
    const priceInput = document.getElementById('product-default-unit-price');

    if (title) title.textContent = `${t('edit')} ${t('productManager')}`;
    if (submitBtn) submitBtn.textContent = t('save');
    if (editId) editId.value = product.id;
    if (viewMode) viewMode.value = 'edit';
    if (codeInput) codeInput.value = product.code || '';
    if (nameInput) nameInput.value = product.name || '';
    if (priceInput) priceInput.value = String(product.defaultUnitPrice || 0);
    setProductFormReadOnly(false);
    showPopup('create-product-popup');
};

window.handleDeleteProduct = (productId, productName) => {
    if (!window.isDeleteEnabledMode()) return;
    if (!confirm(t('ui.messages.confirmDeleteProduct').replace('{name}', productName))) {
        return;
    }
    try {
        deleteProduct(productId);
        closePopup('create-product-popup');
        showMessage(t('ui.messages.productDeleted'));
        if (typeof populateArrivalFormSelects === 'function') {
            populateArrivalFormSelects();
        }
        if (typeof renderArrivalCargoRows === 'function') {
            renderArrivalCargoRows(getArrivalCargoItems());
        }
        updateAll();
    } catch (error) {
        const message = error && error.message === 'Cannot delete product used in arrival cargo'
            ? t('ui.messages.productDeleteBlockedArrivals')
            : error.message;
        showMessage(message, 'error');
    }
};

window.populateArrivalFormSelects = () => {
    const landingTerminalSelect = document.getElementById('group-landing-terminal');
    const creditAirportSelect = document.getElementById('group-credit-airport');
    const firstTravelSelect = document.getElementById('group-first-travel-to');
    const restrictedFirstTravelSelect = document.getElementById('restricted-first-travel-to');
    const defaultArrivalNameInput = document.getElementById('default-arrival-name');
    const defaultArrivalGroupNameInput = document.getElementById('default-arrival-group-name');
    const defaultArrivalTerminalSelect = document.getElementById('default-arrival-terminal');

    const terminals = getTerminals();
    const airports = getAirports();
    const terminalById = terminals.reduce((acc, term) => {
        acc[term.id] = term;
        return acc;
    }, {});
    const incomeTerminals = terminals.filter(t => t.type === 'Income' && t.status !== 'inactive');
    const transitTerminals = terminals.filter(t => t.type === 'Transit' && t.status !== 'inactive');
    const creditAirports = airports.filter(a => a.type === 'credit' && a.status !== 'inactive');

    if (landingTerminalSelect) {
        landingTerminalSelect.innerHTML = `<option value="">${t("arrival.selectLandingTerminal")}</option>`;
        incomeTerminals.forEach(term => {
            const airport = airports.find(a => a.id === term.airportId);
            const option = document.createElement('option');
            option.value = term.id;
            option.textContent = `${airport?.name || ''} / ${term.name}`;
            landingTerminalSelect.appendChild(option);
        });
        const hasSavedDefault = viewState.defaultArrivalTerminalId && incomeTerminals.some(term => term.id === viewState.defaultArrivalTerminalId);
        if (hasSavedDefault) {
            landingTerminalSelect.value = viewState.defaultArrivalTerminalId;
        } else if (incomeTerminals.length === 1) {
            landingTerminalSelect.value = incomeTerminals[0].id;
        }
    }

    if (defaultArrivalTerminalSelect) {
        defaultArrivalTerminalSelect.innerHTML = `<option value="">${t('ui.tools.noDefaultArrivalTerminal')}</option>`;
        incomeTerminals.forEach(term => {
            const airport = airports.find(a => a.id === term.airportId);
            const option = document.createElement('option');
            option.value = term.id;
            option.textContent = `${airport?.name || ''} / ${term.name}`;
            defaultArrivalTerminalSelect.appendChild(option);
        });
        const hasSavedDefault = viewState.defaultArrivalTerminalId && incomeTerminals.some(term => term.id === viewState.defaultArrivalTerminalId);
        if (!hasSavedDefault) {
            viewState.defaultArrivalTerminalId = '';
        }
        defaultArrivalTerminalSelect.value = viewState.defaultArrivalTerminalId || '';
    }

    if (defaultArrivalNameInput) {
        defaultArrivalNameInput.value = viewState.defaultArrivalName || '';
    }

    if (defaultArrivalGroupNameInput) {
        defaultArrivalGroupNameInput.value = viewState.defaultArrivalGroupName || '';
    }

    if (creditAirportSelect) {
        creditAirportSelect.innerHTML = `<option value="">${t("arrival.selectCreditAirport")}</option>`;
        creditAirports.forEach(airport => {
            const option = document.createElement('option');
            option.value = airport.id;
            option.textContent = airport.name;
            creditAirportSelect.appendChild(option);
        });
    }

    if (firstTravelSelect) {
        firstTravelSelect.innerHTML = `<option value="">${t("arrival.selectFirstTravel")}</option>`;
        transitTerminals.forEach(term => {
            const airport = airports.find(a => a.id === term.airportId);
            const option = document.createElement('option');
            option.value = term.id;
            option.textContent = `${airport?.name || ''} / ${term.name}`;
            firstTravelSelect.appendChild(option);
        });
    }

    if (restrictedFirstTravelSelect) {
        restrictedFirstTravelSelect.innerHTML = `<option value="">${t("arrival.selectFirstTravel")}</option>`;
        transitTerminals.forEach(term => {
            const airport = airports.find(a => a.id === term.airportId);
            const option = document.createElement('option');
            option.value = term.id;
            option.textContent = `${airport?.name || ''} / ${term.name}`;
            restrictedFirstTravelSelect.appendChild(option);
        });
    }
};

window.showRegisterArrivalForm = () => {
    initializeArrivalForm();
    populateArrivalFormSelects();
    updateAllSelects();
    showPopup('register-arrival-popup');
};

window.updateArrivalGroupNameFieldVisibility = (type = null) => {
    const effectiveType = type || document.querySelector('input[name="group-type"]:checked')?.value || 'external';
    const wrap = document.getElementById('arrival-group-name-group');
    const input = document.getElementById('group-group-name');
    const show = effectiveType !== 'liability';
    if (wrap) {
        wrap.classList.toggle('mta-hidden', !show);
    }
    if (!show && input) {
        input.value = '';
    }
};

window.showCreatePassengerForm = () => {
    // Route to new flight journey selector modal
    showFlightJourneyModal();
};

/**
 * Helper functions for accessing data in UI context
 */
window.getAllTerminals = () => getTerminals ? getTerminals() : [];
window.getAllPassengerGroups = () => getPassengerGroups ? getPassengerGroups() : [];
window.getAllAirports = () => getAirports ? getAirports() : [];

window.showCreateAirportForm = () => {
    const form = document.getElementById('airport-form');
    const title = document.getElementById('airport-modal-title');
    const submitBtn = document.getElementById('airport-submit-btn');
    const editId = document.getElementById('airport-edit-id');
    const nameInput = document.getElementById('airport-name');
    const typeSelect = document.getElementById('airport-type');
    const statusGroup = document.getElementById('airport-status-group');
    const statusSelect = document.getElementById('airport-status');

    if (form) form.reset();
    if (title) title.textContent = t('newAirport') || 'New Airport';
    if (submitBtn) submitBtn.textContent = t('save') || 'Save';
    if (editId) editId.value = '';
    if (nameInput) nameInput.disabled = false;
    if (typeSelect) {
        typeSelect.disabled = false;
        typeSelect.value = 'standard';
    }
    if (statusGroup) statusGroup.classList.add('mta-hidden');
    if (statusSelect) statusSelect.value = 'active';
    showPopup('create-airport-popup');
};

window.showEditAirportForm = (airportId) => {
    const airport = getAirportById(airportId);
    if (!airport) return;
    const details = document.getElementById('details');
    if (details && !details.classList.contains('mta-hidden')) {
        closeDetails();
    }

    const title = document.getElementById('airport-modal-title');
    const submitBtn = document.getElementById('airport-submit-btn');
    const editId = document.getElementById('airport-edit-id');
    const nameInput = document.getElementById('airport-name');
    const typeSelect = document.getElementById('airport-type');
    const statusGroup = document.getElementById('airport-status-group');
    const statusSelect = document.getElementById('airport-status');

    if (title) title.textContent = `${t('edit') || 'Edit'} ${t('airports') || 'Airport'}`;
    if (submitBtn) submitBtn.textContent = t('save') || 'Save';
    if (editId) editId.value = airport.id;
    if (nameInput) {
        nameInput.value = airport.name || '';
        nameInput.disabled = false;
    }
    if (typeSelect) {
        typeSelect.value = airport.type || 'standard';
        typeSelect.disabled = true;
    }
    if (statusGroup) statusGroup.classList.remove('mta-hidden');
    if (statusSelect) statusSelect.value = airport.status || 'active';

    showPopup('create-airport-popup');
};

const updateTerminalFormState = () => {
    const airportSelect = document.getElementById('terminal-airport');
    const typeSelect = document.getElementById('terminal-type');
    const returnableGroup = document.getElementById('terminal-returnable-group');
    const returnableCheckbox = document.getElementById('terminal-returnable');
    const creditMessage = document.getElementById('terminal-credit-airport-message');
    const submitBtn = document.getElementById('terminal-submit-btn');
    const nameInput = document.getElementById('terminal-name');
    const aliasInput = document.getElementById('terminal-code');

    if (!airportSelect || !typeSelect || !returnableGroup || !returnableCheckbox || !creditMessage || !submitBtn || !nameInput || !aliasInput) {
        return;
    }

    const airports = getAirports();
    const selectedAirport = airports.find(a => a.id === airportSelect.value);
    const isCreditAirport = !!(selectedAirport && selectedAirport.type === 'credit');
    const isExpenseType = typeSelect.value === 'Expense';

    returnableGroup.classList.toggle('mta-hidden', !isExpenseType);
    if (!isExpenseType) {
        returnableCheckbox.checked = false;
    }

    creditMessage.classList.toggle('mta-hidden', !isCreditAirport);
    submitBtn.disabled = isCreditAirport;
    typeSelect.disabled = isCreditAirport;
    nameInput.disabled = isCreditAirport;
    aliasInput.disabled = isCreditAirport;

    if (isCreditAirport) {
        returnableCheckbox.checked = false;
        returnableGroup.classList.add('mta-hidden');
    }
};

window.showCreateTerminalForm = () => {
    const airports = getAirports().filter(a => a.status === 'active');
    const select = document.getElementById('terminal-airport');
    const title = document.getElementById('terminal-modal-title');
    const submitBtn = document.getElementById('terminal-submit-btn');
    const editId = document.getElementById('terminal-edit-id');
    select.innerHTML = `<option value="">${t("selectAirport")}</option>` +
        airports.map(a => `<option value="${a.id}">${a.name}${a.type === 'credit' ? ' (credit)' : ''}</option>`).join('');
    const typeSelect = document.getElementById('terminal-type');
    const nameInput = document.getElementById('terminal-name');
    const aliasInput = document.getElementById('terminal-code');
    const returnableCheckbox = document.getElementById('terminal-returnable');
    if (title) title.innerHTML = `&#128682; ${t('newTerminal') || 'New Terminal'}`;
    if (submitBtn) submitBtn.textContent = t('save') || 'Save';
    if (editId) editId.value = '';
    if (select) select.disabled = false;
    if (typeSelect) typeSelect.value = '';
    if (nameInput) nameInput.value = '';
    if (aliasInput) aliasInput.value = '';
    if (typeSelect) typeSelect.disabled = false;
    if (nameInput) nameInput.disabled = false;
    if (aliasInput) aliasInput.disabled = false;
    if (returnableCheckbox) returnableCheckbox.checked = false;
    if (select) select.onchange = updateTerminalFormState;
    if (typeSelect) typeSelect.onchange = updateTerminalFormState;
    showPopup('create-terminal-popup');
    updateTerminalFormState();
};

window.showEditTerminalForm = (terminalId) => {
    const terminal = getTerminalById(terminalId);
    if (!terminal) return;
    const details = document.getElementById('details');
    if (details && !details.classList.contains('mta-hidden')) {
        closeDetails();
    }

    const airports = getAirports().filter(a => a.status === 'active' || a.id === terminal.airportId);
    const select = document.getElementById('terminal-airport');
    const title = document.getElementById('terminal-modal-title');
    const submitBtn = document.getElementById('terminal-submit-btn');
    const editId = document.getElementById('terminal-edit-id');
    const typeSelect = document.getElementById('terminal-type');
    const nameInput = document.getElementById('terminal-name');
    const aliasInput = document.getElementById('terminal-code');
    const returnableCheckbox = document.getElementById('terminal-returnable');

    if (select) {
        select.innerHTML = `<option value="">${t("selectAirport")}</option>` +
            airports.map(a => `<option value="${a.id}">${a.name}${a.type === 'credit' ? ' (credit)' : ''}</option>`).join('');
        select.value = terminal.airportId;
        select.disabled = true;
        select.onchange = updateTerminalFormState;
    }
    if (title) title.innerHTML = `&#128682; ${t('edit') || 'Edit'} ${t('terminals') || 'Terminal'}`;
    if (submitBtn) submitBtn.textContent = t('save') || 'Save';
    if (editId) editId.value = terminal.id;
    if (typeSelect) {
        typeSelect.value = terminal.type;
        typeSelect.disabled = true;
        typeSelect.onchange = updateTerminalFormState;
    }
    if (nameInput) {
        nameInput.value = terminal.name || '';
        nameInput.disabled = false;
    }
    if (aliasInput) {
        aliasInput.value = terminal.alias || '';
        aliasInput.disabled = false;
    }
    if (returnableCheckbox) {
        returnableCheckbox.checked = !!terminal.returnable;
    }

    showPopup('create-terminal-popup');
    updateTerminalFormState();
};

window.closePopup = closePopup;

// Mobile navigation helpers
const toggleMobileMenu = () => {
    const btn = document.getElementById('mobile-nav-toggle');
    const nav = document.getElementById('mobile-nav');
    if (!btn || !nav) return;
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    if (expanded) {
        btn.setAttribute('aria-expanded', 'false');
        nav.classList.add('d-none');
    } else {
        btn.setAttribute('aria-expanded', 'true');
        nav.classList.remove('d-none');
        const first = nav.querySelector('a');
        if (first) first.focus();
    }
};

const closeMobileMenu = () => {
    const btn = document.getElementById('mobile-nav-toggle');
    const nav = document.getElementById('mobile-nav');
    if (!btn || !nav) return;
    btn.setAttribute('aria-expanded', 'false');
    nav.classList.add('d-none');
};

// Expose mobile menu functions to global scope
window.toggleMobileMenu = toggleMobileMenu;
window.closeMobileMenu = closeMobileMenu;

// Language switching
const syncCurrentLanguageState = () => {
    const { getCurrentLanguage } = window.__mta_i18n || {};
    if (typeof getCurrentLanguage === 'function') {
        window.__mta_current_lang = getCurrentLanguage();
    } else if (!window.__mta_current_lang) {
        window.__mta_current_lang = 'en';
    }
    return window.__mta_current_lang;
};

window.setLanguage = (lang) => {
    const { setLanguage, getCurrentLanguage } = window.__mta_i18n || {};
    if (setLanguage) {
        setLanguage(lang);
        window.__mta_current_lang = getCurrentLanguage();
        updateLanguageButtons();
        updateUILabels();
        if (window.updateAll) window.updateAll();
    }
};

syncCurrentLanguageState();

const updateLanguageButtons = () => {
    const currentLang = syncCurrentLanguageState();
    document.querySelectorAll('.language-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-lang') === currentLang);
    });
};

const updateUILabels = () => {
    syncCurrentLanguageState();
    // Update all translatable elements
    document.querySelectorAll('.translatable[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translated = window.t(key);
        const explicitIcon = el.getAttribute('data-icon');
        
        // Extract emoji from the beginning of the current text
        const currentText = el.textContent.trim();
        const emojiRegex = /^(\p{Emoji}+)\s*/u;
        const emojiMatch = currentText.match(emojiRegex);
        const emoji = explicitIcon || (emojiMatch ? emojiMatch[1] : '');
        
        // Update text based on element type
        if (el.tagName === 'H5' || el.tagName === 'H4' || el.tagName === 'H6') {
            // For headers, preserve emoji and uppercase the translation
            el.textContent = emoji ? `${emoji} ${translated.toUpperCase()}` : translated.toUpperCase();
        } else if (el.tagName === 'BUTTON' || el.tagName === 'LABEL' || el.tagName === 'A') {
            // For buttons/labels/links, preserve emoji and keep case
            el.textContent = emoji ? `${emoji} ${translated}` : translated;
        } else if (translated.includes('<br>')) {
            el.innerHTML = translated;
        } else {
            // For other elements, just use the translation
            el.textContent = translated;
        }
    });
    document.querySelectorAll('.translatable-placeholder[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.setAttribute('placeholder', window.t(key));
    });
    if (typeof window.updateDevDataToggleLabel === 'function') {
        window.updateDevDataToggleLabel();
    }
};

const WELCOME_MODAL_STORAGE_KEY = 'mta-show-welcome-modal-v1';
let welcomeModalDismissedForSession = false;

const shouldSkipWelcomeModal = () => {
    if (welcomeModalDismissedForSession) return true;
    if (typeof localStorage === 'undefined') return false;
    try {
        const saved = localStorage.getItem(WELCOME_MODAL_STORAGE_KEY);
        return saved === 'false';
    } catch (error) {
        console.warn('Failed to read welcome modal preference:', error);
        return false;
    }
};

const closeWelcomeModal = () => {
    const modal = document.getElementById('welcome-modal');
    const startupCheckbox = document.getElementById('welcome-modal-show-on-startup');
    if (!modal) return;

    if (startupCheckbox && typeof localStorage !== 'undefined') {
        try {
            localStorage.setItem(WELCOME_MODAL_STORAGE_KEY, startupCheckbox.checked ? 'true' : 'false');
        } catch (error) {
            console.warn('Failed to persist welcome modal preference:', error);
        }
    }

    welcomeModalDismissedForSession = true;
    modal.classList.add('mta-hidden');
};

const showWelcomeModalIfNeeded = () => {
    const modal = document.getElementById('welcome-modal');
    const startupCheckbox = document.getElementById('welcome-modal-show-on-startup');
    if (!modal || shouldSkipWelcomeModal()) return;

    if (startupCheckbox) {
        startupCheckbox.checked = true;
    }

    modal.classList.remove('mta-hidden');
};

window.closeWelcomeModal = closeWelcomeModal;
window.showWelcomeModalIfNeeded = showWelcomeModalIfNeeded;

const showMessage = (message, type = 'success') => {
    alert(message);
};
window.showMessage = showMessage;
window.toggleHelpTooltip = (buttonEl, helpKey) => {
    if (!buttonEl) return;

    const parent = buttonEl.closest('.mta-help-anchor') || buttonEl.parentElement;
    if (!parent) return;

    document.querySelectorAll('.mta-help-tooltip').forEach((tooltip) => {
        if (tooltip.parentElement !== parent) {
            tooltip.classList.add('mta-hidden');
        }
    });

    let tooltip = parent.querySelector('.mta-help-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'mta-help-tooltip mta-hidden';
        parent.appendChild(tooltip);
    }

    tooltip.textContent = t(helpKey);
    tooltip.classList.toggle('mta-hidden');
};

document.addEventListener('click', (event) => {
    if (event.target.closest('.mta-help-icon, .mta-help-tooltip')) {
        return;
    }
    document.querySelectorAll('.mta-help-tooltip').forEach((tooltip) => {
        tooltip.classList.add('mta-hidden');
    });
});

const getAllocatedAmountForGroup = (groupId, flights, terminals) => {
    const terminalById = terminals.reduce((acc, t) => {
        acc[t.id] = t;
        return acc;
    }, {});

    return flights
        .filter(f => f.passengerGroupId === groupId && f.status === 'Completed')
        .filter(f => {
            const origin = f.originTerminalId ? terminalById[f.originTerminalId] : null;
            return origin && origin.type === 'Income';
        })
        .reduce((sum, f) => sum + (f.amount || 0), 0);
};

const getRiskWarningsForFlight = (flight) => {
    try {
        return checkRiskPatterns(flight) || [];
    } catch (e) {
        return [];
    }
};

const getSemaphoreColor = (item, terminalsOrType, optionalTerminals) => {
    // Support both old and new signatures:
    // New: getSemaphoreColor(flight, terminals)
    // Old: getSemaphoreColor(item, itemType, terminals) [for terminals only]
    
    const terminals = optionalTerminals || terminalsOrType;
    const itemType = typeof terminalsOrType === 'string' ? terminalsOrType : 'flight';
    
    if (itemType === 'flight' && item.destinationTerminalId) {
        const allFlights = typeof getFlights === 'function' ? getFlights() : [];
        if (item.sourceFlightId) {
            return getDepartureLegPresentation(item, terminals).color;
        }
        return getDepartureRootPresentation(item, allFlights, terminals).color;
    } else if (itemType === 'terminal') {
        // Terminal semaphore logic (existing behavior)
        if (item.type === 'Transit') return 'yellow';
        if (item.type === 'Expense' && !item.returnable) return 'red';
        if (item.type === 'Expense' && item.returnable) return 'orange';
        return 'green';
    }
    
    return 'green';
};

// ============================================================================
// PHASE 2 IMPROVEMENTS: UI HELPERS
// ============================================================================

/**
 * Get Origin Display Name (PHASE 2 Improvement 1)
 * Handles External Injection case:
 *   If flight is Completed with null origin and Income destination -> "Outside Airport"
 *   Otherwise shows actual origin or "Not Set" for Planned flights
 */
const getOriginDisplayName = (flight, terminals, airports) => {
    // Check if this is an External Injection (Completed, null origin, Income destination)
    if (flight && flight.status === 'Completed' && flight.originTerminalId === null && flight.destinationTerminalId) {
        const destTerminal = terminals.find(t => t.id === flight.destinationTerminalId);
        if (destTerminal && destTerminal.type === 'Income') {
            return t("outsideAirport");
        }
    }
    
    // Normal case: show terminal name or "Not Set"
    if (!flight.originTerminalId) return t("notSet");
    const origin = terminals.find(t => t.id === flight.originTerminalId);
    if (!origin) return t("unknown");
    const airport = airports.find(a => a.id === origin.airportId);
    return `${airport?.name || ''} / ${origin.name}`;
};

/**
 * Format Amount with Running Balance (PHASE 2 Improvement 4 - Compact Format)
 * Compact format: $100.00 (T.100) where T = Total running balance
 * For Planned flights: just show amount
 */
const formatAmountWithBalance = (flight) => {
    const amount = formatCurrency(flight.amount || 0);
    if (flight.status === 'Completed' && flight._runningBalance !== undefined) {
        // Extract numeric value from formatted currency for compact display
        const balance = flight._runningBalance;
        return `${amount} (T.${Math.abs(balance).toFixed(2).replace(/\.?0+$/, '')})`;
    }
    return amount;
};

/**
 * Format Remaining Passengers Indicator (PG Detail View)
 * Displays [R] marker followed by remaining amount for Completed flights only
 * Format: $900.00   [R]1300 or [R]-200 (can be negative for overspend)
 * For Planned flights: shows --
 * Represents: RemainingPassengersAfterFlight = PG.totalAmount - SUM(Completed outgoing flights up to this one) + SUM(Completed return flights)
 * Only used in PassengerGroup detail view for semantic clarity
 */
const formatRemainingPassengersIndicator = (flight) => {
    if (flight.status === 'Completed' && flight._runningBalance !== undefined) {
        const remaining = flight._runningBalance.toFixed(2).replace(/\.?0+$/, '');
        return `<span style="color: #007bff; font-weight: 500;">[R]${remaining}</span>`;
    }
    if (flight.status === 'Planned') {
        return '<span style="color: #6c757d; font-weight: 500;">[P] --</span>';
    }
    return '<em style="color: #6c757d;">--</em>';
};

/**
 * Format Amount with Planned Icon (displays [P] for planned flights)
 */
const formatAmountWithIcon = (flight) => {
    const amount = formatCurrency(flight.amount || 0);
    if (flight.status === 'Planned') {
        return `<span style="color: #6c757d;">[P] ${amount}</span>`;
    }
    if (isReturnFlight(flight, getTerminals())) {
        return `<span>[RETURN] ${amount}</span>`;
    }
    return amount;
};

/**
 * Check if flight is a return flight (origin is Expense terminal)
 * Return flights can only originate from Expense terminals (per AI-README)
 */
const isReturnFlight = (flight, terminals) => {
    if (!flight.originTerminalId) return false;
    const originTerminal = terminals.find(t => t.id === flight.originTerminalId);
    return originTerminal && originTerminal.type === 'Expense';
};

/**
 * Get semaphore color for airport based on type
 * standard = green (success)
 * credit = red (danger)
 */
const getAirportSemaphoreColor = (airport) => {
    if (airport.type === 'credit') return 'red';
    return 'green'; // standard
};

/**
 * Get airport type label for display using i18n
 * Standard = "Normal Conditions"
 * Credit = "Meteorological Alert"
 */
const getAirportTypeLabel = (airport) => {
    if (airport.type === 'credit') return t('meteorologicalAlert');
    return t('normalConditions');
};

/**
 * Get passenger group semaphore color for display
 * External = green (Available Fuel)
 * Liability = red (Restricted Fuel)
 */
const getPassengerGroupSemaphoreColor = (group) => {
    if (group.type === 'liability') return 'red';
    return 'green'; // external
};

/**
 * Get passenger group type label for display using i18n
 * External = "Available Fuel"
 * Liability = "Restricted Fuel"
 */
const getPassengerGroupTypeLabel = (group) => {
    if (group.type === 'liability') return t('restrictedFuel');
    return t('availableFuel');
};

/**
 * Get terminal semaphore color for display
 * Income = green (success)
 * Expense (non-returnable) = red (danger)
 * Expense (returnable) = orange (warning)
 * Transit = yellow (info)
 */
const getTerminalSemaphoreColor = (terminal) => {
    if (terminal.type === 'Income') return 'green';
    if (terminal.type === 'Expense') {
        return terminal.returnable ? 'orange' : 'red';
    }
    if (terminal.type === 'Transit') return 'yellow';
    return 'yellow';
};

/**
 * Calculate total planned commitment for an airport
 * Sum of terminal planned commitments for terminals in that airport
 */
const getAirportTotalPlannedCommitment = (airportId, flights, terminals) => {
    const airportTerminals = terminals.filter(t => t.airportId === airportId);
    return airportTerminals.reduce(
        (sum, terminal) => sum + getTerminalPlannedCommitment(terminal.id, flights),
        0
    );
};

/**
 * Calculate planned commitment for a specific terminal
 * Sum of all planned flight amounts TO that terminal
 */
const getTerminalPlannedCommitment = (terminalId, flights) => {
    return flights
        .filter(f => f.status === 'Planned' && f.destinationTerminalId === terminalId)
        .reduce((sum, f) => sum + (f.amount || 0), 0);
};

/**
 * Format Amount with Return Icon (PG Detail View)
 */
const formatAmountWithReturnIcon = (flight, terminals) => {
    const amount = formatCurrency(flight.amount || 0);
    if (flight.status === 'Planned') {
        return `<span style="color: #6c757d;">[P] ${amount}</span>`;
    }
    if (isReturnFlight(flight, terminals)) {
        return `[RETURN] ${amount}`;
    }
    return amount;
};

const getFlightSortDateValue = (flight) => {
    const businessDate = String(flight?.date || flight?.createdAt || '').slice(0, 10);
    const ts = new Date(`${businessDate}T00:00:00.000Z`).getTime();
    return Number.isNaN(ts) ? 0 : ts;
};

const getFlightCreatedAtValue = (flight) => {
    const ts = new Date(flight?.createdAt || '').getTime();
    return Number.isNaN(ts) ? 0 : ts;
};

/**
 * Deterministic related-item ordering
 * Primary: business date DESC
 * Secondary: createdAt DESC
 * Tertiary: ordinal DESC
 * Final: id DESC
 */
const sortRelatedFlights = (flights) => {
    return flights.slice().sort((a, b) => {
        const dateCompare = getFlightSortDateValue(b) - getFlightSortDateValue(a);
        if (dateCompare !== 0) return dateCompare;
        const createdCompare = getFlightCreatedAtValue(b) - getFlightCreatedAtValue(a);
        if (createdCompare !== 0) return createdCompare;
        const ordinalCompare = (b.ordinal || 0) - (a.ordinal || 0);
        if (ordinalCompare !== 0) return ordinalCompare;
        return (b.id || '').localeCompare(a.id || '');
    });
};

/**
 * Calculate Pending Commitment for a Planned root flight
 * = Flight amount - Sum of completed child flight amounts
 * Only applies to Planned flights
 */
const calculatePendingCommitment = (rootFlight, flights) => {
    if (rootFlight.status !== 'Planned') return 0;

    if (typeof calculatePendingCommitmentForPlanned === 'function') {
        return calculatePendingCommitmentForPlanned(rootFlight, flights, getTerminals());
    }

    // Fallback kept deterministic for environments where data-model helper is unavailable.
    const childFlights = flights.filter(f => f.sourceFlightId === rootFlight.id && f.status === 'Completed');
    return Math.max(0, (rootFlight.amount || 0) - childFlights.reduce((sum, f) => sum + (f.amount || 0), 0));
};

/**
 * Get Flight Type Label for display
 * "One-way" = Planned flight with no return child
 * "Roundtrip" = Completed flight with a return flight child
 * "Return" = Return flight (Completed, originTerminalId is Expense)
 */
const getFlightTypeLabel = (flight, flights, terminals) => {
    const allFlights = typeof getFlights === 'function' ? getFlights() : flights;
    if (flight.sourceFlightId) {
        return getDepartureLegPresentation(flight, terminals).label;
    }
    if (isArrivalBornInitialAllocation(flight, terminals)) {
        return t('arrivalFlightLabel') || 'Arrival';
    }
    return getDepartureRootPresentation(flight, allFlights || [], terminals).label;
};

const getRootFlightTypeLabel = (flight, flights, terminals) => {
    const destTerminal = terminals.find(t => t.id === flight.destinationTerminalId);
    if (destTerminal && destTerminal.type === 'Expense' && destTerminal.returnable) {
        return t('roundtripLabel') || 'Roundtrip';
    }

    const hasReturnChild = flights.some(f =>
        f.sourceFlightId === flight.id && isReturnFlight(f, terminals)
    );

    return hasReturnChild ? (t('roundtripLabel') || 'Roundtrip') : (t('oneWayLabel') || 'One-way');
};

const isArrivalBornInitialAllocation = (flight, terminals) => {
    if (flight.sourceFlightId) return false;
    if (flight.originTerminalId !== null) return false;
    if (flight.status !== 'Completed') return false;
    const destTerminal = terminals.find(t => t.id === flight.destinationTerminalId);
    return !!(destTerminal && destTerminal.type === 'Income');
};

const getDepartureRootPresentation = (flight, flights, terminals) => {
    if (isArrivalBornInitialAllocation(flight, terminals)) {
        return { color: 'green', label: t('arrivalFlightLabel') || 'Arrival' };
    }

    const destTerminal = terminals.find(t => t.id === flight.destinationTerminalId);
    if (destTerminal && destTerminal.type === 'Expense' && destTerminal.returnable) {
        return { color: 'orange', label: t('roundtripLabel') || 'Roundtrip' };
    }

    const hasReturnChild = flights.some(f =>
        f.sourceFlightId === flight.id && isReturnFlight(f, terminals)
    );
    if (hasReturnChild) {
        return { color: 'orange', label: t('roundtripLabel') || 'Roundtrip' };
    }

    if (destTerminal && destTerminal.type === 'Transit') {
        return { color: 'yellow', label: t('departureRootOneWayConnection') || 'One-way (Connection)' };
    }

    return { color: 'red', label: t('oneWayLabel') || 'One-way' };
};

const getDepartureLegPresentation = (flight, terminals) => {
    if (isReturnFlight(flight, terminals)) {
        return { color: 'green', label: t('departureLegReturned') || 'Returned' };
    }

    const destTerminal = terminals.find(t => t.id === flight.destinationTerminalId);
    if (destTerminal && destTerminal.type === 'Transit') {
        return { color: 'yellow', label: t('departureLegToDestinationTransfer') || 'To Destination (Transfer)' };
    }
    if (destTerminal && destTerminal.type === 'Expense') {
        if (destTerminal.returnable) {
            return { color: 'orange', label: t('departureLegToDestinationRoundtrip') || 'To Destination (Roundtrip)' };
        }
        return { color: 'red', label: t('departureLegToDestination') || 'To Destination' };
    }
    if (destTerminal && destTerminal.type === 'Income') {
        return { color: 'green', label: t('departureLegReturned') || 'Returned' };
    }

    return { color: 'red', label: t('departureLegToDestination') || 'To Destination' };
};

/**
 * Get Legs Count Display for root flight
 * "Direct" if no child flights, "Legs (N)" if has children
 */
const getLegsCountDisplay = (rootFlight, flights) => {
    const childFlights = flights.filter(f => f.sourceFlightId === rootFlight.id && !isReturnFlight(f, getTerminals()));
    if (childFlights.length === 0) {
        if (!rootFlight.originTerminalId) {
            return {
                text: `${t('requiresOriginLabel') || 'Requires Origin'}!`,
                helpKey: 'ui.help.requiresOrigin'
            };
        }
        return { text: t('directLabel') || 'Direct', helpKey: null };
    }
    return { text: `${t('legsLabel') || 'Legs'} (${childFlights.length})`, helpKey: null };
};

// ============================================================================
// UI UPDATE FUNCTIONS
// ============================================================================
// ============================================================================
// DASHBOARD UTILITIES
// ============================================================================

const updateDashboard = () => {
    const flightBoard = document.getElementById('flight-board');
    if (!flightBoard) return;

    // Get metrics
    const { groups, terminals, filteredFlights, filteredGroups } = getDashboardMetricsSnapshot();

    // Build summary blocks
    const blocks = [];
    const renderMetricHeader = (labelKey, helpKey) => `
        <span>${t(labelKey)}</span>
        <span class="mta-help-anchor">
            <button
                type="button"
                class="mta-help-icon"
                title="${t(helpKey)}"
                aria-label="${t(helpKey)}"
                onclick="event.stopPropagation(); toggleHelpTooltip(this, '${helpKey}');"
            >?</button>
        </span>
    `;

    // 1. Total Arrivals
    const totalArrivals = filteredGroups.reduce((sum, group) => sum + (Number(group.totalAmount) || 0), 0);
    blocks.push(`
        <div class="control-tower-block">
            <div class="block-header">${renderMetricHeader("totalArrivals", "ui.help.totalArrivals")}</div>
            <div class="block-amount">${formatCurrency(totalArrivals)}</div>
        </div>
    `);

    // 2. Waiting Passengers
    const waitingTotal = (typeof calculateWaitingPassengers === 'function')
        ? calculateWaitingPassengers(terminals, filteredFlights)
        : 0;
    blocks.push(`
        <div class="control-tower-block">
            <div class="block-header">${renderMetricHeader("waitingPassengers", "ui.help.waitingPassengers")}</div>
            <div class="block-amount">${formatCurrency(waitingTotal)}</div>
        </div>
    `);

    // 3. One-way Travelers
    const oneWayTotal = (typeof calculateOneWayTravelers === 'function')
        ? calculateOneWayTravelers(terminals, filteredFlights)
        : getOneWayTravelersTotal();
    blocks.push(`
        <div class="control-tower-block">
            <div class="block-header">${renderMetricHeader("oneWayTravelers", "ui.help.oneWayTravelers")}</div>
            <div class="block-amount">${formatCurrency(oneWayTotal)}</div>
        </div>
    `);

    // 4. Roundtrip Travelers
    const roundtripTotal = (typeof calculateRoundtripTravelers === 'function')
        ? calculateRoundtripTravelers(terminals, filteredFlights)
        : getAssetsTotal();
    blocks.push(`
        <div class="control-tower-block">
            <div class="block-header">${renderMetricHeader("roundtripTravelers", "ui.help.roundtripTravelers")}</div>
            <div class="block-amount">${formatCurrency(roundtripTotal)}</div>
        </div>
    `);

    // 5. Returned Travelers
    const returnedTotal = (typeof calculateReturnedTravelers === 'function')
        ? calculateReturnedTravelers(terminals, filteredFlights)
        : 0;
    blocks.push(`
        <div class="control-tower-block">
            <div class="block-header">${renderMetricHeader("returnedTravelers", "ui.help.returnedTravelers")}</div>
            <div class="block-amount">${formatCurrency(returnedTotal)}</div>
        </div>
    `);

    // 6. Reservations = sum of PendingCommitment across Planned flights
    const reservationsTotal = (typeof calculatePlannedSpending === 'function')
        ? calculatePlannedSpending(groups, filteredFlights)
        : filteredFlights
            .filter(f => f.status === 'Planned')
            .reduce((sum, f) => sum + calculatePendingCommitment(f, filteredFlights), 0);
    blocks.push(`
        <div class="control-tower-block">
            <div class="block-header">${renderMetricHeader("reservationsLabel", "ui.help.reservations")}</div>
            <div class="block-amount">${formatCurrency(reservationsTotal)}</div>
        </div>
    `);

    flightBoard.innerHTML = `
        <div class="control-tower-grid">
            ${blocks.join('')}
        </div>
    `;
};


const updateVarianceSummary = () => {
    const summary = getVarianceSummary();
    const varianceDiv = document.getElementById('variance-summary');
    if (!summary || summary.count === 0) {
        varianceDiv.innerHTML = `<p class="text-muted">${t("noPlannedFlightsWithFinalAmounts")}</p>`;
        return;
    }
};

/**
 * Get localized date header string based on current language
 * Returns format like "Monday, March 30, 2026" (English) or "Lunes, 30 de Marzo de 2026" (Spanish)
 */
const getLocalizedDateHeader = (date) => {
    const currentLang = getCurrentLanguage();
    const localeMap = { 
        'en': 'en-US', 
        'es': 'es-ES' 
    };
    const locale = localeMap[currentLang] || 'en-US';
    
    return date.toLocaleDateString(locale, { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
};

const updatePassengerGroupsList = () => {
    const groups = getPassengerGroups();
    const list = document.getElementById('passenger-groups-list');
    const flights = getFlights();
    const terminals = getTerminals();

    if (groups.length === 0) {
        if (list) list.innerHTML = `<p class="text-muted">${t("noPassengerGroups")}</p>`;
    } else {
        if (list) list.innerHTML = groups.map(g => {
            const allocated = getAllocatedAmountForGroup(g.id, flights, terminals);
            const available = Math.max(0, (g.totalAmount || 0) - allocated);
            const created = new Date(g.createdAt).toLocaleDateString();
            const rawType = g.type || 'external';
            const typeLabel = rawType.toLowerCase() === 'external' ? t("external") : rawType;
            const statusBadge = allocated === 0 ? 'info' : allocated >= (g.totalAmount || 0) ? 'success' : 'warning';

            return `
                <div class="card mb-2">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-1">${g.name} <span class="badge badge-${statusBadge}">${typeLabel}</span></h6>
                                <small class="text-muted">${created}</small>
                            </div>
                            <div class="text-right">
                                <div><strong>${t("available")}:  ${formatCurrency(available)}</strong></div>
                                <button class="btn btn-sm btn-info mt-1" onclick="showGroupDetails('${g.id}')">${t("details")}</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
};

// ============================================================================
// HELPER FUNCTIONS FOR ARRIVALS
// ============================================================================

// Get the label for a flight's amount based on destination type
const getFlightAmountLabel = (flight, terminals) => {
    // Check if it's a return flight (origin is Expense terminal)
    const originTerminal = terminals.find(t => t.id === flight.originTerminalId);
    if (originTerminal && originTerminal.type === 'Expense') {
        return t('returned');
    }
    
    // Check destination terminal type
    const destTerminal = terminals.find(t => t.id === flight.destinationTerminalId);
    if (destTerminal && destTerminal.type === 'Transit') {
        return t('transferred');
    }
    
    // Default to Travelers (Expense destination)
    return t('travelers');
};

const getFlightRouteDisplay = (flight, terminalById) => {
    const origin = flight.originTerminalId ? terminalById[flight.originTerminalId] : null;
    const originName = origin ? (origin.alias || origin.name) : null;
    const dest = flight.destinationTerminalId ? terminalById[flight.destinationTerminalId] : null;
    const destName = dest ? (dest.alias || dest.name) : t("notSet");

    if (flight.status === 'Planned') {
        if (!originName) {
            return `${t('toDestinationLabel') || 'To'} ${destName}`;
        }
        return `${originName} -> ${destName}`;
    }

    if (!flight.originTerminalId) {
        return `${t('outsideAirport')} -> ${destName}`;
    }

    return `${originName} -> ${destName}`;
};

const getFlightDisplayTitle = (flight, terminalById) => {
    const trimmedName = typeof flight.name === 'string' ? flight.name.trim() : '';
    return trimmedName || getFlightRouteDisplay(flight, terminalById);
};

const getChronologicalFlightOrder = (flights) => {
    return flights.slice().sort((a, b) => {
        const dateCompare = getFlightSortDateValue(a) - getFlightSortDateValue(b);
        if (dateCompare !== 0) return dateCompare;
        const createdCompare = getFlightCreatedAtValue(a) - getFlightCreatedAtValue(b);
        if (createdCompare !== 0) return createdCompare;
        const ordinalCompare = (a.ordinal || 0) - (b.ordinal || 0);
        if (ordinalCompare !== 0) return ordinalCompare;
        return (a.id || '').localeCompare(b.id || '');
    });
};

// Get expand/collapse control text
const getExpandControlText = (itemId) => {
    const relatedEl = document.getElementById(`related-${itemId}`) || 
                      document.getElementById(`subflight-${itemId}`);
    const isExpanded = relatedEl && !relatedEl.classList.contains('mta-hidden');
    return isExpanded ? t('expandedControl') : t('collapsedControl');
};

// ============================================================================
// EXPANSION STATE MANAGEMENT (Simple toggle for related items visibility)
// ============================================================================
const toggleItemExpansion = (itemType, itemId, toggleEl = null) => {
    let relatedEl = document.getElementById(`related-${itemId}`) || 
                    document.getElementById(`subflight-${itemId}`) ||
                    document.getElementById(`related-terminal-${itemId}`) ||
                    document.getElementById(`related-airport-${itemId}`);
    
    if (!relatedEl) return;
    
    relatedEl.classList.toggle('mta-hidden');

    // Keep inline expand/collapse labels in sync with current state.
    if (toggleEl) {
        const expanded = !relatedEl.classList.contains('mta-hidden');
        const baseLabel = (toggleEl.textContent || '').replace(/\s*[v\^>]\s*$/, '').trim();
        toggleEl.textContent = `${baseLabel} ${expanded ? '^' : 'v'}`;
    }
};

/**
 * Update expand icon direction based on visibility state
 * Used after rendering to ensure icons reflect current expansion state
 */
const updateExpandIcons = () => {
    const expandIcons = document.querySelectorAll('.mta-expand-icon');
    expandIcons.forEach(icon => {
        const toggle = icon.closest('.mta-expand-toggle');
        if (!toggle) return;
        
        // Get the parent container to find the related element
        const container = toggle.closest('.mta-canonical-item--container');
        if (!container) return;
        
        const flightId = container.id.replace('root-flight-', '');
        const relatedEl = document.getElementById(`subflight-${flightId}`);
        if (!relatedEl) return;
        
        // Update icon based on visibility
        if (relatedEl.classList.contains('mta-hidden')) {
            icon.textContent = 'v'; // Down arrow when collapsed
        } else {
            icon.textContent = '^'; // Up arrow when expanded
        }
    });
};

/**
 * Show "Add Leg" dialog for root flight
 * Uses a proper modal with radio buttons for leg type selection
 */
window.showAddLegDialog = (rootFlightId) => {
    const modal = document.getElementById('add-leg-modal');
    if (!modal) return;
    
    // Store the current flight ID
    modal.dataset.rootFlightId = rootFlightId;
    
    // Reset radio selection to "To destination"
    const toDestRadio = document.getElementById('add-leg-to-destination');
    if (toDestRadio) toDestRadio.checked = true;
    
    // Show modal
    modal.classList.remove('mta-hidden');
};

/**
 * Close the Add Leg modal
 */
window.closeAddLegModal = () => {
    window.currentFlightContext = null;
    const modal = document.getElementById('add-leg-modal');
    if (modal) modal.classList.add('mta-hidden');
};

window.closeLegDestModal = () => {
    window.currentFlightContext = null;
    const modal = document.getElementById('flight-leg-dest-form-modal');
    if (modal) modal.classList.add('mta-hidden');
};

window.closeLegReturnModal = () => {
    window.currentFlightContext = null;
    const modal = document.getElementById('flight-leg-return-form-modal');
    if (modal) modal.classList.add('mta-hidden');
};

/**
 * Handle Add Leg modal submission - routes to appropriate form
 */
window.submitAddLeg = () => {
    submitAddLegMode();
};

// Initialize Add Leg modal event listeners
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('add-leg-modal');
    if (modal) {
        // Close modal when clicking outside the modal content
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeAddLegModal();
            }
        });
        
        // Close modal when pressing Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modal.classList.contains('mta-hidden')) {
                closeAddLegModal();
            }
        });
    }

    const terminalAirportSelect = document.getElementById('terminal-airport');
    const terminalTypeSelect = document.getElementById('terminal-type');
    if (terminalAirportSelect) {
        terminalAirportSelect.addEventListener('change', updateTerminalFormState);
    }
    if (terminalTypeSelect) {
        terminalTypeSelect.addEventListener('change', updateTerminalFormState);
    }
});

/**
 * FLIGHT MODAL SYSTEM - 4 Explicit Journey Type Modes
 * 
 * Mode 1: Direct Flight (status=Completed, with passengerGroupId, originTerminalId)
 * Mode 2: Planned Flight (status=Planned, no passengerGroupId, no originTerminalId, destination=Expense)
 * Mode 3: Leg->Destination (child of Planned, pays to destination)
 * Mode 4: Leg->Return (child of Planned/Direct, returns from Expense)
 */

window.currentFlightContext = {
    mode: null,
    parentFlightId: null
};

/**
 * Show unified flight form (SIMPLIFIED 3-MODE SELECTOR)
 */
window.showFlightForm = () => {
    // Reset form to default state
    const form = document.getElementById('flight-form');
    if (form) form.reset();
    
    // Set default travel mode to 'tickets'
    const ticketsRadio = document.getElementById('travel-mode-tickets');
    if (ticketsRadio) ticketsRadio.checked = true;
    
    // Set date field to today
    // Input type="date" expects: YYYY-MM-DD (extracted from ISO)
    const dateField = document.getElementById('flight-form-date');
    const ordinalField = document.getElementById('flight-form-ordinal');
    const ordinalGroup = document.getElementById('ordinal-field-group');
    const editIdField = document.getElementById('flight-form-edit-id');
    const titleEl = document.querySelector('#flight-form-modal h5');
    if (dateField) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        dateField.value = `${year}-${month}-${day}`; // YYYY-MM-DD format for input
    }
    if (ordinalField) {
        ordinalField.value = '';
    }
    if (ordinalGroup) {
        ordinalGroup.classList.add('mta-hidden');
    }
    if (editIdField) {
        editIdField.value = '';
    }
    if (titleEl) {
        titleEl.textContent = t('createFlight');
    }
    document.querySelectorAll('input[name="travel-mode"]').forEach(radio => {
        radio.disabled = false;
    });
    
    // Populate all terminal and liability group selects
    populateTerminalSelects('flight-form');
    populateLiabilityGroups();
    
    // Update visibility based on default mode (tickets)
    updateFlightFormTravelMode();
    
    const modal = document.getElementById('flight-form-modal');
    if (modal) modal.classList.remove('mta-hidden');
};

window.showEditFlightForm = (flightId) => {
    const flight = getFlightById(flightId);
    if (!flight) return;
    if (flight.status !== 'Planned') {
        showMessage('Only planned departures can be edited.', 'error');
        return;
    }

    const details = document.getElementById('details');
    if (details && !details.classList.contains('mta-hidden')) {
        closeDetails();
    }

    window.showFlightForm();

    const editIdField = document.getElementById('flight-form-edit-id');
    const titleEl = document.querySelector('#flight-form-modal h5');
    const reserveRadio = document.getElementById('travel-mode-reserve');
    const dateField = document.getElementById('flight-form-date');
    const destinationField = document.getElementById('flight-form-destination-terminal');
    const nameField = document.getElementById('flight-form-name');
    const amountField = document.getElementById('flight-form-amount');
    const ordinalField = document.getElementById('flight-form-ordinal');
    const ordinalGroup = document.getElementById('ordinal-field-group');

    if (editIdField) {
        editIdField.value = flight.id;
    }
    if (titleEl) {
        titleEl.textContent = `${t('edit')} ${t('createFlight')}`;
    }
    if (reserveRadio) {
        reserveRadio.checked = true;
    }
    document.querySelectorAll('input[name="travel-mode"]').forEach(radio => {
        radio.disabled = true;
    });
    if (typeof window.updateFlightFormTravelMode === 'function') {
        window.updateFlightFormTravelMode();
    }
    if (dateField) {
        dateField.value = String(flight.date || '').slice(0, 10);
    }
    if (destinationField) {
        destinationField.value = flight.destinationTerminalId || '';
    }
    if (nameField) {
        nameField.value = flight.name || '';
    }
    if (amountField) {
        amountField.value = flight.amount || '';
    }
    if (ordinalGroup) {
        ordinalGroup.classList.remove('mta-hidden');
    }
    if (ordinalField) {
        ordinalField.value = flight.ordinal ?? '';
    }
};

/**
 * Close unified flight form
 */
window.closeFlightForm = () => {
    const modal = document.getElementById('flight-form-modal');
    if (modal) modal.classList.add('mta-hidden');
};

/**
 * Update Flight Form Field Visibility Based on Travel Mode
 * Handles 3 mutually exclusive modes:
 * 1. "tickets" (I've got tickets) - Terminal-Funded, Completed
 * 2. "tab" (Put it on my tab) - Liability-Funded, Completed
 * 3. "reserve" (Reserve for later) - Planned
 */
window.updateFlightFormTravelMode = () => {
    const travelMode = document.querySelector('input[name="travel-mode"]:checked')?.value;
    const ticketsSection = document.getElementById('mode-tickets-section');
    const tabSection = document.getElementById('mode-tab-section');
    const originTerminal = document.getElementById('flight-form-origin-terminal');
    const liabilityGroup = document.getElementById('flight-form-liability-group');
    const dateFieldGroup = document.getElementById('date-field-group');
    
    if (travelMode === 'tickets') {
        // Mode 1: Terminal-Funded (I've got tickets)
        if (ticketsSection) ticketsSection.classList.remove('mta-hidden');
        if (tabSection) tabSection.classList.add('mta-hidden');
        if (originTerminal) originTerminal.removeAttribute('disabled');
        if (liabilityGroup) liabilityGroup.setAttribute('disabled', 'disabled');
        if (dateFieldGroup) dateFieldGroup.style.display = 'block';
    } else if (travelMode === 'tab') {
        // Mode 2: Liability-Funded (Put it on my tab)
        if (ticketsSection) ticketsSection.classList.add('mta-hidden');
        if (tabSection) tabSection.classList.remove('mta-hidden');
        if (originTerminal) originTerminal.setAttribute('disabled', 'disabled');
        if (liabilityGroup) liabilityGroup.removeAttribute('disabled');
        if (dateFieldGroup) dateFieldGroup.style.display = 'block';
    } else if (travelMode === 'reserve') {
        // Mode 3: Planned (Reserve for later)
        if (ticketsSection) ticketsSection.classList.add('mta-hidden');
        if (tabSection) tabSection.classList.add('mta-hidden');
        if (originTerminal) originTerminal.setAttribute('disabled', 'disabled');
        if (liabilityGroup) liabilityGroup.setAttribute('disabled', 'disabled');
        if (dateFieldGroup) dateFieldGroup.style.display = 'block';
    }
    
    // Clear values when switching modes to avoid confusion
    if (originTerminal && travelMode !== 'tickets') originTerminal.value = '';
    if (liabilityGroup && travelMode !== 'tab') liabilityGroup.value = '';
};

/**
 * Populate Liability Passenger Groups for "Put it on my tab" mode
 * Only includes extendable liabilities with metaphorical airport labels
 */
window.populateLiabilityGroups = () => {
    const groups = getAllPassengerGroups();
    const airports = getAllAirports ? getAllAirports() : [];
    const liabilitySelect = document.getElementById('flight-form-liability-group');
    
    if (!liabilitySelect) return;
    
    // Clear and reset dropdown
    liabilitySelect.innerHTML = '<option value="">Select origin arrival...</option>';
    
    // Filter for extendable liabilities only
    const extendableLiabilities = groups.filter(g => g.type === 'liability' && g.extendable === true);
    
    if (extendableLiabilities.length === 0) {
        return; // No liabilities to display
    }
    
    extendableLiabilities.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g.id;
        
        // Use metaphorical label: "[Airport Name] Origin Arrivals" or fallback to name
        let label = g.name;
        if (g.creditAirportId && airports && airports.length > 0) {
            const airport = airports.find(a => a.id === g.creditAirportId);
            if (airport) {
                label = `${airport.name} ${t('origin')} ${t('arrivals')}`;
            }
        }
        
        opt.textContent = label;
        liabilitySelect.appendChild(opt);
    });
};

/**
 * Legacy function name compatibility - maps to new unified form
 */
window.showFlightJourneyModal = () => {
    window.showFlightForm();
};

/**
 * Legacy function name compatibility
 */
window.closeFlightJourneyModal = () => {
    window.closeFlightForm();
};

/**
 * Legacy function name compatibility
 */
window.proceedToFlightForm = () => {
    // This is no longer needed in unified flow
    // Travel mode selector is now in the same form
};

/**
 * Legacy function name compatibility - maps to direct flight form
 */
window.showDirectFlightForm = () => {
    window.showFlightForm();
};

/**
 * Legacy function name compatibility - maps to planned flight form
 */
window.showPlannedFlightForm = () => {
    window.showFlightForm();
};

/**
 * Legacy function name compatibility
 */
window.updateDirectFlightFundingMode = () => {
    window.updateFlightFormTravelMode();
};

/**
 * Legacy function name compatibility
 */
window.populateDirectLiabilityGroups = () => {
    window.populateLiabilityGroups();
};

/**
 * Back button (no longer used in unified flow)
 */
window.backToFlightJourney = () => {
    // In unified flow, there's no back - just cancel
    window.closeFlightForm();
};

/**
 * Close leg destination form
 */
window.closeLegDestModal = () => {
    const modal = document.getElementById('flight-leg-dest-form-modal');
    if (modal) modal.classList.add('mta-hidden');
};

/**
 * Close leg return form
 */
window.closeLegReturnModal = () => {
    const modal = document.getElementById('flight-leg-return-form-modal');
    if (modal) modal.classList.add('mta-hidden');
};

/**
 * Populate terminal dropdowns for Direct flight (with passenger groups)
 */
window.populateTerminalSelects = (formType) => {
    const terminals = getAllTerminals();
    const groups = getAllPassengerGroups();
    
    if (formType === 'flight-form') {
        // Unified flight form: populate origin terminals (for "I've got tickets" mode)
        const originSelect = document.getElementById('flight-form-origin-terminal');
        if (originSelect) {
            originSelect.innerHTML = '<option value="">Select origin terminal...</option>';
            // Filter terminals with balance > 0 and format with balance display
            terminals
                .filter(t => {
                    if (t.type === 'Expense') return false;
                    const balance = getMoneyAtTerminal(t.id);
                    return balance > 0;
                })
                .forEach(t => {
                    const balance = getMoneyAtTerminal(t.id);
                    const opt = document.createElement('option');
                    opt.value = t.id;
                    opt.textContent = `${t.name} - ${formatCurrency(balance)}`;
                    originSelect.appendChild(opt);
                });
        }
        
        // Populate destination terminals (all terminals for completed modes, Expense only for planned)
        const destSelect = document.getElementById('flight-form-destination-terminal');
        if (destSelect) {
            destSelect.innerHTML = '<option value="">Select destination terminal...</option>';
            // For unified form, show all terminals - validation happens in form submission
            terminals.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.id;
                opt.textContent = `${t.alias} (${t.name}) - ${t.type}`;
                destSelect.appendChild(opt);
            });
        }
    } else if (formType === 'direct') {
        // Legacy support for old direct form structure
        // Note: direct-passenger-group is now hidden (auto-calculated)
        // Populate origin terminals (for "I've got tickets" mode)
        const originSelect = document.getElementById('direct-origin-terminal');
        if (originSelect) {
            originSelect.innerHTML = '<option value="">Select origin terminal...</option>';
            terminals
                .filter(t => t.type === 'Income' || t.type === 'Transit')
                .forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.id;
                opt.textContent = `${t.alias} (${t.name}) - ${t.type}`;
                originSelect.appendChild(opt);
            });
        }
        
        // Populate destination terminals
        const destSelect = document.getElementById('direct-destination-terminal');
        if (destSelect) {
            destSelect.innerHTML = '<option value="">Select destination terminal...</option>';
            terminals.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.id;
                opt.textContent = `${t.alias} (${t.name}) - ${t.type}`;
                destSelect.appendChild(opt);
            });
        }
    } else if (formType === 'leg-dest') {
        // Populate passenger groups for leg
        const groupSelect = document.getElementById('leg-dest-passenger-group');
        if (groupSelect) {
            groupSelect.innerHTML = '<option value="">Select passenger group...</option>';
            groups.forEach(g => {
                const opt = document.createElement('option');
                opt.value = g.id;
                opt.textContent = g.name;
                groupSelect.appendChild(opt);
            });
        }
        
        // Populate origin terminals (where money comes from)
        const originSelect = document.getElementById('leg-dest-origin-terminal');
        if (originSelect) {
            originSelect.innerHTML = '<option value="">Select origin terminal...</option>';
            terminals.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.id;
                opt.textContent = `${t.alias} (${t.name}) - ${t.type}`;
                originSelect.appendChild(opt);
            });
        }
    }
};

/**
 * Populate planned flight destination selects (Expense only)
 */
window.populatePlannedDestinationSelects = () => {
    const terminals = getAllTerminals();
    const expenseTerminals = terminals.filter(t => t.type === 'Expense');
    
    const destSelect = document.getElementById('planned-destination-terminal');
    if (destSelect) {
        destSelect.innerHTML = '<option value="">Select expense destination...</option>';
        expenseTerminals.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = `${t.alias} (${t.name})`;
            destSelect.appendChild(opt);
        });
    }
};

/**
 * Populate leg return destination selects
 */
window.populateLegReturnDestinationSelects = () => {
    const terminals = getAllTerminals();
    
    const destSelect = document.getElementById('leg-return-destination-terminal');
    if (destSelect) {
        destSelect.innerHTML = '<option value="">Select destination terminal...</option>';
        terminals.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = `${t.alias} (${t.name}) - ${t.type}`;
            destSelect.appendChild(opt);
        });
    }
};

/**
 * Update flight modal flow from Add Leg
 */
window.submitAddLegMode = () => {
    const modal = document.getElementById('add-leg-modal');
    const rootFlightId = modal?.dataset.rootFlightId;
    const toDestRadio = document.getElementById('add-leg-to-destination');
    
    if (!rootFlightId) {
        closeAddLegModal();
        return;
    }
    
    const legType = toDestRadio?.checked ? 'toDestination' : 'return';
    
    if (legType === 'toDestination') {
        showLegDestinationForm(rootFlightId);
    } else {
        showLegReturnForm(rootFlightId);
    }
};

/**
 * Show leg to destination form
 */
window.showLegDestinationForm = (rootFlightId) => {
    // Close the Add Leg modal
    closeAddLegModal();
    
    // Reset and populate the leg destination form
    const form = document.getElementById('flight-leg-dest-form');
    if (form) form.reset();
    
    // Set date to today
    const dateField = document.getElementById('leg-dest-date');
    if (dateField) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        dateField.value = `${year}-${month}-${day}`;
    }
    
    // Store root flight ID in the window context so form submission can access it
    window.currentFlightContext = { parentFlightId: rootFlightId };
    
    const modal = document.getElementById('flight-leg-dest-form-modal');
    if (modal) {
        modal.classList.remove('mta-hidden');
    }
    
    // Populate passenger groups and terminals
    populateLegDestinationFormSelects(rootFlightId);
};

/**
 * Show leg return form
 */
window.showLegReturnForm = (rootFlightId) => {
    // Close the Add Leg modal
    closeAddLegModal();
    
    // Reset and populate the leg return form
    const form = document.getElementById('flight-leg-return-form');
    if (form) form.reset();
    
    // Set date to today
    const dateField = document.getElementById('leg-return-date');
    if (dateField) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        dateField.value = `${year}-${month}-${day}`;
    }
    
    // Store root flight ID in the window context so form submission can access it
    window.currentFlightContext = { parentFlightId: rootFlightId };
    
    const modal = document.getElementById('flight-leg-return-form-modal');
    if (modal) {
        modal.classList.remove('mta-hidden');
    }
    
    // Populate terminals
    populateLegReturnFormSelects(rootFlightId);
};

/**
 * Populate leg destination form selects
 */
const populateLegDestinationFormSelects = (rootFlightId) => {
    const flights = getFlights();
    const rootFlight = flights.find(f => f.id === rootFlightId);
    
    if (!rootFlight) return;
    
    const terminals = getTerminals();
    const destTerminal = terminals.find(t => t.id === rootFlight.destinationTerminalId);
    
    // Display destination terminal (read-only)
    const destDisplay = document.getElementById('leg-dest-terminal-display');
    if (destDisplay && destTerminal) {
        destDisplay.value = destTerminal.name;
    }
    
    // Populate origin terminals - show Income and Transit terminals with positive balance
    const originSelect = document.getElementById('leg-dest-origin-terminal');
    if (originSelect) {
        originSelect.innerHTML = '<option value="">Select origin terminal...</option>';
        
        terminals
            .filter(t => (t.type === 'Income' || t.type === 'Transit'))
            .forEach(t => {
                // Calculate terminal balance from completed flights
                const inflows = flights
                    .filter(f => f.status === 'Completed' && f.destinationTerminalId === t.id)
                    .reduce((sum, f) => sum + (f.amount || 0), 0);
                
                const outflows = flights
                    .filter(f => f.status === 'Completed' && f.originTerminalId === t.id)
                    .reduce((sum, f) => sum + (f.amount || 0), 0);
                
                const balance = inflows - outflows;
                
                // Show only terminals with positive balance
                if (balance > 0) {
                    const option = document.createElement('option');
                    option.value = t.id;
                    option.textContent = `${t.name} - ${formatCurrency(balance)}`;
                    originSelect.appendChild(option);
                }
            });
    }
};

/**
 * Populate leg return form selects
 */
const populateLegReturnFormSelects = (rootFlightId) => {
    const flights = getFlights();
    const rootFlight = flights.find(f => f.id === rootFlightId);
    
    if (!rootFlight) return;
    
    const terminals = getTerminals();
    const destTerminal = terminals.find(t => t.id === rootFlight.destinationTerminalId);
    
    // Display origin terminal (set to destination from root flight - Expense)
    const originDisplay = document.getElementById('leg-return-origin-display');
    if (originDisplay && destTerminal) {
        originDisplay.value = destTerminal.name + ' (Expense)';
    }
    
    // Populate destination terminals
    const destSelect = document.getElementById('leg-return-destination-terminal');
    if (destSelect) {
        destSelect.innerHTML = '<option value="">Select where money returns...</option>';
        terminals
            .filter(t => t.type !== 'Expense') // Can return to Income or Transit
            .forEach(t => {
                const option = document.createElement('option');
                option.value = t.id;
                option.textContent = t.name;
                destSelect.appendChild(option);
            });
    }
};

// View state tracking
const viewState = {
    terminals: 'terminals-flights',
    arrivals: 'arrivals-groups',
    arrivalTypeFilter: 'all',
    arrivalCargoView: 'last-7-days',
    arrivalCargoProductFilter: 'all',
    groupArrivals: false,
    departureViewFilter: 'reservations',
    departureSemaphoreFilter: 'all',
    terminalTypeFilter: 'all',
    airportTypeFilter: 'all',
    dashboardPeriodFilter: 'all',
    ledgerMode: false,
    salesMode: false,
    deleteEnabledMode: false,
    defaultArrivalName: '',
    defaultArrivalGroupName: '',
    defaultArrivalTerminalId: '',
    devDataVisible: false
};

const UIPREFERENCES_STORAGE_KEY = 'mta-ui-preferences-v1';

const loadCurrentUIPreferences = () => {
    if (typeof localStorage === 'undefined') return;
    try {
        const raw = localStorage.getItem(UIPREFERENCES_STORAGE_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (saved && typeof saved === 'object') {
            if (saved.terminalsView === 'terminals-flights' || saved.terminalsView === 'airports-terminals') {
                viewState.terminals = saved.terminalsView;
            }
            if (saved.arrivalsView === 'arrivals-groups' || saved.arrivalsView === 'arrivals-cargo') {
                viewState.arrivals = saved.arrivalsView;
            }
            if (['all', 'open', 'restricted'].includes(saved.arrivalTypeFilter)) {
                viewState.arrivalTypeFilter = saved.arrivalTypeFilter;
            }
            if (['last-7-days', 'last-12-months', 'by-year'].includes(saved.arrivalCargoView)) {
                viewState.arrivalCargoView = saved.arrivalCargoView;
            }
            if (typeof saved.arrivalCargoProductFilter === 'string' && saved.arrivalCargoProductFilter.trim()) {
                viewState.arrivalCargoProductFilter = saved.arrivalCargoProductFilter;
            }
            viewState.groupArrivals = saved.groupArrivals === true;
            if (['all', 'reservations', 'completed', 'returned'].includes(saved.departureViewFilter)) {
                viewState.departureViewFilter = saved.departureViewFilter;
            }
            if (['all', 'connection', 'oneway', 'roundtrip'].includes(saved.departureSemaphoreFilter)) {
                viewState.departureSemaphoreFilter = saved.departureSemaphoreFilter;
            }
            if (['all', 'checkin', 'connection', 'checkout-oneway', 'checkout-roundtrip'].includes(saved.terminalTypeFilter)) {
                viewState.terminalTypeFilter = saved.terminalTypeFilter;
            }
            if (['all', 'normal', 'alert'].includes(saved.airportTypeFilter)) {
                viewState.airportTypeFilter = saved.airportTypeFilter;
            }
            viewState.ledgerMode = saved.ledgerMode === true;
            viewState.salesMode = saved.salesMode === true;
            viewState.deleteEnabledMode = saved.deleteEnabledMode === true || saved.allowFlightCrud === true;
            if (typeof saved.defaultArrivalName === 'string') {
                viewState.defaultArrivalName = saved.defaultArrivalName;
            }
            if (typeof saved.defaultArrivalGroupName === 'string') {
                viewState.defaultArrivalGroupName = saved.defaultArrivalGroupName;
            }
            if (typeof saved.defaultArrivalTerminalId === 'string') {
                viewState.defaultArrivalTerminalId = saved.defaultArrivalTerminalId;
            }
            viewState.devDataVisible = saved.devDataVisible === true;
        }
    } catch (error) {
        console.warn('Failed to load UI preferences:', error);
    }
};

const applyCurrentUIPreferences = () => {
    const ledgerToggle = document.getElementById('ledger-mode-toggle');
    if (ledgerToggle) {
        ledgerToggle.classList.toggle('active', viewState.ledgerMode);
    }
    const deleteEnabledModeToggle = document.getElementById('delete-enabled-mode-toggle');
    if (deleteEnabledModeToggle) {
        deleteEnabledModeToggle.classList.toggle('active', viewState.deleteEnabledMode);
    }
    const defaultArrivalTerminalSelect = document.getElementById('default-arrival-terminal');
    if (defaultArrivalTerminalSelect) {
        defaultArrivalTerminalSelect.value = viewState.defaultArrivalTerminalId || '';
    }
    const defaultArrivalNameInput = document.getElementById('default-arrival-name');
    if (defaultArrivalNameInput) {
        defaultArrivalNameInput.value = viewState.defaultArrivalName || '';
    }
    const defaultArrivalGroupNameInput = document.getElementById('default-arrival-group-name');
    if (defaultArrivalGroupNameInput) {
        defaultArrivalGroupNameInput.value = viewState.defaultArrivalGroupName || '';
    }

    const devDataEl = document.getElementById('dev-data');
    if (devDataEl) {
        devDataEl.classList.toggle('mta-hidden', !viewState.devDataVisible);
    }

    const arrivalsTypeFilter = document.getElementById('arrivals-type-filter');
    const dashboardPeriodFilter = document.getElementById('dashboard-period-filter');
    const arrivalsCargoFilter = document.getElementById('arrivals-cargo-filter');
    const arrivalsCargoViewSelect = document.getElementById('arrivals-cargo-view-select');
    const arrivalsViewSeparator = document.getElementById('arrivals-view-separator');
    const arrivalsViewSwitch = document.getElementById('arrivals-view-switch');
    const arrivalsGroupToggleWrap = document.getElementById('arrivals-group-toggle-wrap');
    const arrivalsGroupToggle = document.getElementById('arrivals-group-toggle');
    const newArrivalBtn = document.getElementById('btn-new-arrival');
    const productManagerBtn = document.getElementById('btn-product-manager');
    const salesModeToggle = document.getElementById('sales-mode-toggle');
    const cargoBlock = document.getElementById('arrival-cargo-block');
    const departuresViewSelect = document.getElementById('departures-view-select');
    const departuresSemaphoreFilter = document.getElementById('departures-semaphore-filter');
    const newTerminalBtn = document.getElementById('btn-new-terminal');
    const newAirportBtn = document.getElementById('btn-new-airport');
    const viewSwitchBtn = document.getElementById('terminals-view-switch');
    const terminalsTypeFilter = document.getElementById('terminals-type-filter');
    const airportsTypeFilter = document.getElementById('airports-type-filter');
    if (arrivalsTypeFilter) {
        arrivalsTypeFilter.querySelectorAll('.mta-filter-toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-filter') === viewState.arrivalTypeFilter);
        });
        arrivalsTypeFilter.classList.toggle('mta-hidden', viewState.arrivals !== 'arrivals-groups');
    }
    if (arrivalsGroupToggleWrap) {
        arrivalsGroupToggleWrap.classList.toggle('mta-hidden', !viewState.salesMode || viewState.arrivals !== 'arrivals-groups');
    }
    if (dashboardPeriodFilter) {
        dashboardPeriodFilter.querySelectorAll('.mta-filter-toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-filter') === viewState.dashboardPeriodFilter);
        });
    }
    if (arrivalsGroupToggle) {
        arrivalsGroupToggle.checked = viewState.groupArrivals === true;
    }
    if (arrivalsCargoFilter) {
        arrivalsCargoFilter.classList.toggle('mta-hidden', !viewState.salesMode || viewState.arrivals !== 'arrivals-cargo');
    }
    if (arrivalsCargoViewSelect) {
        arrivalsCargoViewSelect.classList.toggle('mta-hidden', !viewState.salesMode || viewState.arrivals !== 'arrivals-cargo');
        arrivalsCargoViewSelect.value = viewState.arrivalCargoView;
    }
    if (arrivalsViewSeparator) {
        arrivalsViewSeparator.classList.toggle('mta-hidden', !viewState.salesMode || viewState.arrivals !== 'arrivals-cargo');
    }
    if (newArrivalBtn) {
        newArrivalBtn.classList.toggle('mta-hidden', viewState.arrivals !== 'arrivals-groups');
    }
    if (productManagerBtn) {
        productManagerBtn.classList.toggle('mta-hidden', !viewState.salesMode || viewState.arrivals !== 'arrivals-cargo');
    }
    if (arrivalsViewSwitch) {
        const targetView = viewState.arrivals === 'arrivals-groups' ? 'arrivals-cargo' : 'arrivals-groups';
        const labelKey = viewState.arrivals === 'arrivals-groups' ? 'ui.toggleView.goToCargo' : 'ui.toggleView.backToArrivals';
        arrivalsViewSwitch.classList.toggle('mta-hidden', !viewState.salesMode);
        arrivalsViewSwitch.setAttribute('data-target-view', targetView);
        arrivalsViewSwitch.setAttribute('data-i18n', labelKey);
        arrivalsViewSwitch.textContent = t(labelKey);
    }
    if (cargoBlock) {
        const arrivalType = document.querySelector('input[name="group-type"]:checked')?.value || 'external';
        cargoBlock.classList.toggle('mta-hidden', !viewState.salesMode || arrivalType === 'liability');
    }
    if (salesModeToggle) {
        salesModeToggle.classList.toggle('active', viewState.salesMode);
    }
    if (departuresViewSelect) {
        departuresViewSelect.value = viewState.departureViewFilter;
    }
    if (departuresSemaphoreFilter) {
        departuresSemaphoreFilter.classList.remove('mta-hidden');
        departuresSemaphoreFilter.querySelectorAll('.mta-filter-toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-filter') === viewState.departureSemaphoreFilter);
        });
    }
    if (newTerminalBtn) {
        newTerminalBtn.classList.toggle('mta-hidden', viewState.terminals !== 'terminals-flights');
    }
    if (newAirportBtn) {
        newAirportBtn.classList.toggle('mta-hidden', viewState.terminals !== 'airports-terminals');
    }
    if (viewSwitchBtn) {
        const targetView = viewState.terminals === 'terminals-flights' ? 'airports-terminals' : 'terminals-flights';
        const labelKey = viewState.terminals === 'terminals-flights' ? 'ui.toggleView.goToAirports' : 'ui.toggleView.backToTerminals';
        viewSwitchBtn.setAttribute('data-target-view', targetView);
        viewSwitchBtn.setAttribute('data-i18n', labelKey);
        viewSwitchBtn.textContent = t(labelKey);
    }
    if (terminalsTypeFilter) {
        terminalsTypeFilter.classList.toggle('mta-hidden', viewState.terminals !== 'terminals-flights');
        terminalsTypeFilter.querySelectorAll('.mta-filter-toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-filter') === viewState.terminalTypeFilter);
        });
    }
    if (airportsTypeFilter) {
        airportsTypeFilter.classList.toggle('mta-hidden', viewState.terminals !== 'airports-terminals');
        airportsTypeFilter.querySelectorAll('.mta-filter-toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-filter') === viewState.airportTypeFilter);
        });
    }
};

window.persistCurrentUIPreferences = () => {
    if (typeof localStorage === 'undefined') return;
    const preferences = {
        terminalsView: viewState.terminals,
        arrivalsView: viewState.arrivals,
        arrivalTypeFilter: viewState.arrivalTypeFilter,
        arrivalCargoView: viewState.arrivalCargoView,
        arrivalCargoProductFilter: viewState.arrivalCargoProductFilter,
        groupArrivals: viewState.groupArrivals,
        departureViewFilter: viewState.departureViewFilter,
        departureSemaphoreFilter: viewState.departureSemaphoreFilter,
        terminalTypeFilter: viewState.terminalTypeFilter,
        airportTypeFilter: viewState.airportTypeFilter,
        ledgerMode: viewState.ledgerMode,
        salesMode: viewState.salesMode,
        deleteEnabledMode: viewState.deleteEnabledMode,
        defaultArrivalName: viewState.defaultArrivalName,
        defaultArrivalGroupName: viewState.defaultArrivalGroupName,
        defaultArrivalTerminalId: viewState.defaultArrivalTerminalId,
        devDataVisible: viewState.devDataVisible
    };

    localStorage.setItem(UIPREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
};

loadCurrentUIPreferences();

const getDashboardMonthKeyFromDate = (value) => {
    const businessDate = String(value || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(businessDate)) {
        return '';
    }
    return businessDate.slice(0, 7);
};

const getDashboardMonthKeys = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const lastMonthDate = new Date(currentYear, currentMonth - 2, 1);
    return {
        currentMonth: `${currentYear}-${String(currentMonth).padStart(2, '0')}`,
        lastMonth: `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`
    };
};

const flightMatchesDashboardPeriod = (flight, period = viewState.dashboardPeriodFilter) => {
    if (period === 'all') return true;
    const monthKey = getDashboardMonthKeyFromDate(flight?.date || flight?.createdAt);
    if (!monthKey) return false;
    const { currentMonth, lastMonth } = getDashboardMonthKeys();
    if (period === 'current-month') return monthKey === currentMonth;
    if (period === 'last-month') return monthKey === lastMonth;
    return true;
};

const getDashboardFilteredFlights = (flights, period = viewState.dashboardPeriodFilter) => {
    if (period === 'all') return flights.slice();
    return flights.filter(flight => flightMatchesDashboardPeriod(flight, period));
};

const getDashboardFilteredPassengerGroups = (groups, flights, terminals, period = viewState.dashboardPeriodFilter) => {
    if (period === 'all') return groups.slice();
    return groups.filter(group => {
        const anchorFlight = getPassengerGroupArrivalAnchorFlight(group.id, flights, terminals);
        return !!(anchorFlight && flightMatchesDashboardPeriod(anchorFlight, period));
    });
};

const getDashboardMetricsSnapshot = () => {
    const groups = getPassengerGroups();
    const flights = getFlights();
    const terminals = getTerminals();
    const filteredFlights = getDashboardFilteredFlights(flights, viewState.dashboardPeriodFilter);
    const filteredGroups = getDashboardFilteredPassengerGroups(groups, flights, terminals, viewState.dashboardPeriodFilter);

    return {
        groups,
        flights,
        terminals,
        filteredFlights,
        filteredGroups
    };
};

const arrivalMatchesTypeFilter = (group) => {
    switch (viewState.arrivalTypeFilter) {
        case 'open':
            return group.type !== 'liability';
        case 'restricted':
            return group.type === 'liability';
        case 'all':
        default:
            return true;
    }
};

const getPassengerGroupAwaitingAmount = (group) => {
    const ledger = getPassengerGroupLedgerWithBalances(group.id);
    if (!ledger.length) {
        return Number(group.totalAmount || 0);
    }
    const lastCompleted = ledger[ledger.length - 1];
    return lastCompleted && lastCompleted._runningBalance !== undefined
        ? Number(lastCompleted._runningBalance || 0)
        : Number(group.totalAmount || 0);
};

const getPassengerGroupDisplayDate = (group, flights) => {
    const groupFlights = flights
        .filter(f => f.passengerGroupId === group.id)
        .sort(compareChronologicalFlights);
    return new Date(groupFlights[0]?.date || group.createdAt);
};

const getArrivalGroupAggregateEntries = (visibleGroups, flights) => {
    if (!viewState.groupArrivals) {
        return visibleGroups.map(group => ({ kind: 'single', group }));
    }

    const grouped = [];
    const groupedMap = new Map();

    visibleGroups.forEach(group => {
        const groupName = group.type !== 'liability' ? String(group.groupName || '').trim() : '';
        if (!groupName) {
            grouped.push({ kind: 'single', group });
            return;
        }
        if (!groupedMap.has(groupName)) {
            const entry = { kind: 'aggregate', groupName, members: [] };
            groupedMap.set(groupName, entry);
            grouped.push(entry);
        }
        groupedMap.get(groupName).members.push(group);
    });

    grouped.forEach(entry => {
        if (entry.kind === 'aggregate') {
            entry.members.sort((a, b) => getPassengerGroupDisplayDate(a, flights) - getPassengerGroupDisplayDate(b, flights));
        }
    });

    return grouped;
};

const buildArrivalFlightsRelatedHtml = (relatedId, relatedFlights, terminals, terminalById) => {
    if (relatedFlights.length === 0) {
        return `<div id="${relatedId}" class="mta-canonical-related mta-hidden"><small class="text-muted">${t("noRelatedFlights")}</small></div>`;
    }

    const flightsByDate = {};
    relatedFlights.forEach(f => {
        const fDate = new Date(f.date || f.createdAt);
        const dateKey = getLocalizedDateHeader(fDate);
        if (!flightsByDate[dateKey]) flightsByDate[dateKey] = [];
        flightsByDate[dateKey].push(f);
    });

    let flightsHtml = '';
    Object.entries(flightsByDate).forEach(([dateKey, flightsForDate]) => {
        flightsHtml += `<div class="mta-canonical-related__header">${dateKey}</div>`;
        flightsForDate.forEach((f) => {
            const visualIndex = relatedFlights.length - relatedFlights.findIndex(flight => flight.id === f.id);
            const flightRoute = getFlightRouteDisplay(f, terminalById);
            const flightTitle = getFlightDisplayTitle(f, terminalById);
            const semaphoreColor = getSemaphoreColor(f, terminals);
            const semaphoreMarkup = `<span class="mta-semaphore mta-semaphore--${semaphoreColor}"></span>`;
            const flightTypeLabel = getFlightTypeLabel(f, relatedFlights, terminals);
            const amountLabel = getFlightAmountLabel(f, terminals);
            const amount = formatCurrency(f.amount || 0);
            const remainingBalance = f._runningBalance !== undefined ? formatCurrency(f._runningBalance) : '—';

            flightsHtml += `
                <div class="mta-canonical-item mta-canonical-item--related">
                    <div class="mta-canonical-item__name"><span class="mta-subitem-index-prefix">#${visualIndex}</span> <span class="mta-details-link" onclick="event.stopPropagation(); showFlightDetails('${f.id}', 'readonly')">${flightTitle}</span></div>
                    <div class="mta-canonical-item__line2">
                        <div class="mta-canonical-item__meta text-muted small">
                            ${semaphoreMarkup}
                            <span class="mta-type-label">${flightTypeLabel}</span> - <span class="mta-route">${flightRoute}</span> - <span class="mta-status">${f.status}</span>
                        </div>
                        <div class="mta-canonical-item__actions">
                            <div>
                                <strong>${amountLabel}: ${amount}</strong>
                            </div>
                            ${viewState.ledgerMode ? `
                            <div class="mta-canonical-item__secondary">
                                Running: ${remainingBalance}
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
    });

    return `<div id="${relatedId}" class="mta-canonical-related mta-hidden">${flightsHtml}</div>`;
};

const buildGroupedArrivalLedgerWithBalances = (members, flights, terminals) => {
    const memberIds = members.map(group => group.id);
    const terminalById = terminals.reduce((acc, terminal) => {
        acc[terminal.id] = terminal;
        return acc;
    }, {});
    const groupedFlights = flights
        .filter(f => memberIds.includes(f.passengerGroupId))
        .sort(compareChronologicalFlights);
    let runningBalance = 0;

    const ledger = groupedFlights.map(flight => {
        const nextFlight = { ...flight };
        if (nextFlight.status === 'Completed') {
            const originTerminal = nextFlight.originTerminalId ? terminalById[nextFlight.originTerminalId] : null;
            const destTerminal = nextFlight.destinationTerminalId ? terminalById[nextFlight.destinationTerminalId] : null;
            const isReturn = originTerminal && originTerminal.type === 'Expense';
            const destType = destTerminal?.type;

            if (nextFlight.originTerminalId === null) {
                runningBalance += Number(nextFlight.amount || 0);
            } else if (isReturn) {
                runningBalance += Number(nextFlight.amount || 0);
            } else if (destType === 'Expense') {
                runningBalance -= Number(nextFlight.amount || 0);
            }
            nextFlight._runningBalance = runningBalance;
        }
        return nextFlight;
    });

    return sortRelatedFlights(ledger);
};

const updateArrivalCargoProductFilterOptions = (groups = [], flights = [], terminals = []) => {
    const filterEl = document.getElementById('arrivals-cargo-filter');
    if (!filterEl) return;

    const activeProducts = typeof getActiveProducts === 'function' ? getActiveProducts().slice() : [];
    activeProducts.sort((a, b) => String(a.code || a.name || '').localeCompare(String(b.code || b.name || '')));

    const allProductsView = buildArrivalCargoPeriods(groups, flights, terminals, 'all');
    const countsByProduct = new Map();
    allProductsView.periods.forEach(period => {
        period.products.forEach(product => {
            countsByProduct.set(product.productId, (countsByProduct.get(product.productId) || 0) + product.totalQuantity);
        });
    });

    const previousValue = viewState.arrivalCargoProductFilter || 'all';
    filterEl.innerHTML = [
        `<button type="button" class="mta-filter-toggle-btn" data-filter="all" onclick="setArrivalCargoProductFilter('all')">${t('ui.products.allProducts')} (${allProductsView.visibleQuantity})</button>`,
        ...activeProducts.map(product => `<button type="button" class="mta-filter-toggle-btn" data-filter="${product.id}" onclick="setArrivalCargoProductFilter('${product.id}')">${getProductCodeLabel(product)} (${countsByProduct.get(product.id) || 0})</button>`)
    ].join('');

    const nextValue = activeProducts.some(product => product.id === previousValue) || previousValue === 'all'
        ? previousValue
        : 'all';
    viewState.arrivalCargoProductFilter = nextValue;
    filterEl.querySelectorAll('.mta-filter-toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-filter') === nextValue);
    });
};

const buildArrivalCargoPeriods = (groups, flights, terminals, selectedProductOverride = null) => {
    const currentLang = window.getCurrentLanguage && window.getCurrentLanguage() === 'es' ? 'es-ES' : 'en-US';
    const activeProducts = typeof getActiveProducts === 'function' ? getActiveProducts().slice() : [];
    activeProducts.sort((a, b) => String(a.code || a.name || '').localeCompare(String(b.code || b.name || '')));

    const selectedProductId = selectedProductOverride || viewState.arrivalCargoProductFilter || 'all';
    const includeAllProducts = selectedProductId === 'all';
    const now = new Date();
    const periodMap = new Map();

    const ensurePeriod = (key, label, startDate) => {
        if (!periodMap.has(key)) {
            const products = new Map();
            const seedProducts = includeAllProducts
                ? activeProducts
                : activeProducts.filter(product => product.id === selectedProductId);
            seedProducts.forEach(product => {
                products.set(product.id, {
                    productId: product.id,
                    productCode: getProductCodeLabel(product),
                    productName: product.name || product.code || t('unknown'),
                    totalAmount: 0,
                    totalQuantity: 0
                });
            });
            periodMap.set(key, { key, label, startDate, products });
        }
        return periodMap.get(key);
    };

    const addDays = (date, days) => {
        const next = new Date(date);
        next.setUTCDate(next.getUTCDate() + days);
        return next;
    };
    const addMonths = (date, months) => {
        const next = new Date(date);
        next.setUTCMonth(next.getUTCMonth() + months);
        return next;
    };

    if (viewState.arrivalCargoView === 'last-7-days') {
        const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        for (let offset = 0; offset < 7; offset += 1) {
            const bucketDate = addDays(startOfToday, -offset);
            const key = bucketDate.toISOString().slice(0, 10);
            const label = getLocalizedDateHeader(bucketDate);
            ensurePeriod(key, label, bucketDate);
        }
    } else if (viewState.arrivalCargoView === 'last-12-months') {
        const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        for (let offset = 0; offset < 12; offset += 1) {
            const bucketDate = addMonths(startOfMonth, -offset);
            const key = bucketDate.toISOString().slice(0, 7);
            const label = bucketDate.toLocaleDateString(currentLang, { month: 'long', year: 'numeric' });
            ensurePeriod(key, label, bucketDate);
        }
    }

    groups
        .filter(group => Array.isArray(group.cargo) && group.cargo.length > 0)
        .forEach(group => {
            const anchorFlight = getPassengerGroupArrivalAnchorFlight(group.id, flights, terminals);
            const anchorDate = new Date(anchorFlight?.date || anchorFlight?.createdAt || group.createdAt);
            if (Number.isNaN(anchorDate.getTime())) {
                return;
            }

            let key = '';
            let label = '';
            let startDate = null;

            if (viewState.arrivalCargoView === 'last-7-days') {
                key = anchorDate.toISOString().slice(0, 10);
                startDate = new Date(Date.UTC(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth(), anchorDate.getUTCDate()));
                label = getLocalizedDateHeader(startDate);
            } else if (viewState.arrivalCargoView === 'last-12-months') {
                key = anchorDate.toISOString().slice(0, 7);
                startDate = new Date(Date.UTC(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth(), 1));
                label = startDate.toLocaleDateString(currentLang, { month: 'long', year: 'numeric' });
            } else {
                key = String(anchorDate.getUTCFullYear());
                startDate = new Date(Date.UTC(anchorDate.getUTCFullYear(), 0, 1));
                label = key;
            }

            const period = ensurePeriod(key, label, startDate);
            group.cargo.forEach(item => {
                if (!includeAllProducts && item.productId !== selectedProductId) {
                    return;
                }
                const product = getProductById(item.productId);
                if (!product) {
                    return;
                }
                if (!period.products.has(item.productId)) {
                    period.products.set(item.productId, {
                        productId: item.productId,
                        productCode: getProductCodeLabel(product),
                        productName: product.name || product.code || t('unknown'),
                        totalAmount: 0,
                        totalQuantity: 0
                    });
                }
                const entry = period.products.get(item.productId);
                entry.totalAmount += Number(item.amount) || 0;
                entry.totalQuantity += Number(item.quantity) || 0;
            });
        });

    const periods = Array.from(periodMap.values())
        .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
        .map(period => {
            let products = Array.from(period.products.values());
            if (!includeAllProducts) {
                products = products.filter(product => product.totalQuantity > 0 || product.productId === selectedProductId);
            }
            products.sort((a, b) => {
                if (b.totalAmount !== a.totalAmount) return b.totalAmount - a.totalAmount;
                return String(a.productCode || '').localeCompare(String(b.productCode || ''));
            });
            const totalAmount = products.reduce((sum, product) => sum + product.totalAmount, 0);
            const totalQuantity = products.reduce((sum, product) => sum + product.totalQuantity, 0);
            return { ...period, products, totalAmount, totalQuantity };
        })
        .filter(period => includeAllProducts || period.totalQuantity > 0);

    const visibleQuantity = periods.reduce((sum, period) => sum + period.totalQuantity, 0);
    return { periods, visibleQuantity };
};

const terminalMatchesTypeFilter = (terminal) => {
    switch (viewState.terminalTypeFilter) {
        case 'checkin':
            return terminal.type === 'Income';
        case 'connection':
            return terminal.type === 'Transit';
        case 'checkout-oneway':
            return terminal.type === 'Expense' && !terminal.returnable;
        case 'checkout-roundtrip':
            return terminal.type === 'Expense' && !!terminal.returnable;
        case 'all':
        default:
            return true;
    }
};

const rootHasReturnLeg = (flight, flights, terminals) => {
    return flights.some(child => child.sourceFlightId === flight.id && isReturnFlight(child, terminals));
};

const getDepartureRootSemaphoreKey = (flight, flights, terminals) => {
    const destTerminal = terminals.find(t => t.id === flight.destinationTerminalId);
    if (destTerminal && destTerminal.type === 'Expense' && destTerminal.returnable) {
        return 'roundtrip';
    }
    if (destTerminal && destTerminal.type === 'Transit') {
        return 'connection';
    }
    return 'oneway';
};

const departureMatchesViewFilter = (flight, flights, terminals) => {
    const pendingCommitment = calculatePendingCommitment(flight, flights);
    switch (viewState.departureViewFilter) {
        case 'reservations':
            return flight.status === 'Planned' && pendingCommitment > 0;
        case 'completed':
            return flight.status === 'Completed' || (flight.status === 'Planned' && pendingCommitment === 0);
        case 'returned':
            return rootHasReturnLeg(flight, flights, terminals);
        case 'all':
        default:
            return true;
    }
};

const departureMatchesSemaphoreFilter = (flight, flights, terminals) => {
    if (viewState.departureSemaphoreFilter === 'all') {
        return true;
    }
    return getDepartureRootSemaphoreKey(flight, flights, terminals) === viewState.departureSemaphoreFilter;
};

const airportMatchesTypeFilter = (airport) => {
    switch (viewState.airportTypeFilter) {
        case 'normal':
            return airport.type !== 'credit';
        case 'alert':
            return airport.type === 'credit';
        case 'all':
        default:
            return true;
    }
};

const updateTerminalTypeFilterLabels = (terminals) => {
    const filterEl = document.getElementById('terminals-type-filter');
    if (!filterEl) return;

    const counts = {
        all: terminals.length,
        checkin: terminals.filter(t => t.type === 'Income').length,
        connection: terminals.filter(t => t.type === 'Transit').length,
        'checkout-oneway': terminals.filter(t => t.type === 'Expense' && !t.returnable).length,
        'checkout-roundtrip': terminals.filter(t => t.type === 'Expense' && !!t.returnable).length
    };

    const labelKeys = {
        all: 'ui.terminalsFilter.all',
        checkin: 'terminalCheckIn',
        connection: 'terminalConnection',
        'checkout-oneway': 'ui.terminalsFilter.checkoutOneWay',
        'checkout-roundtrip': 'ui.terminalsFilter.checkoutRoundtrip'
    };

    filterEl.querySelectorAll('.mta-filter-toggle-btn').forEach(btn => {
        const filter = btn.getAttribute('data-filter');
        const labelKey = labelKeys[filter];
        if (!labelKey) return;
        btn.textContent = `${t(labelKey)} (${counts[filter] || 0})`;
        btn.classList.toggle('active', filter === viewState.terminalTypeFilter);
    });
};

const updateArrivalTypeFilterLabels = (groups) => {
    const filterEl = document.getElementById('arrivals-type-filter');
    if (!filterEl) return;

    const counts = {
        all: groups.length,
        open: groups.filter(g => g.type !== 'liability').length,
        restricted: groups.filter(g => g.type === 'liability').length
    };

    const labelKeys = {
        all: 'ui.filter.all',
        open: 'arrival.openTransit',
        restricted: 'arrival.restrictedTransit'
    };

    filterEl.querySelectorAll('.mta-filter-toggle-btn').forEach(btn => {
        const filter = btn.getAttribute('data-filter');
        const labelKey = labelKeys[filter];
        if (!labelKey) return;
        btn.textContent = `${t(labelKey)} (${counts[filter] || 0})`;
        btn.classList.toggle('active', btn.getAttribute('data-filter') === viewState.arrivalTypeFilter);
    });
};

const updateDepartureSemaphoreFilterLabels = (rootFlights, allFlights, terminals) => {
    const filterEl = document.getElementById('departures-semaphore-filter');
    if (!filterEl) return;

    const counts = {
        all: rootFlights.length,
        connection: rootFlights.filter(f => getDepartureRootSemaphoreKey(f, allFlights, terminals) === 'connection').length,
        oneway: rootFlights.filter(f => getDepartureRootSemaphoreKey(f, allFlights, terminals) === 'oneway').length,
        roundtrip: rootFlights.filter(f => getDepartureRootSemaphoreKey(f, allFlights, terminals) === 'roundtrip').length
    };

    const labelKeys = {
        all: 'ui.filter.all',
        connection: 'departureRootOneWayConnection',
        oneway: 'oneWayLabel',
        roundtrip: 'roundtripLabel'
    };

    filterEl.querySelectorAll('.mta-filter-toggle-btn').forEach(btn => {
        const filter = btn.getAttribute('data-filter');
        const labelKey = labelKeys[filter];
        if (!labelKey) return;
        btn.textContent = `${t(labelKey)} (${counts[filter] || 0})`;
        btn.classList.toggle('active', filter === viewState.departureSemaphoreFilter);
    });
};

const updateAirportTypeFilterLabels = (airports) => {
    const filterEl = document.getElementById('airports-type-filter');
    if (!filterEl) return;

    const counts = {
        all: airports.length,
        normal: airports.filter(a => a.type !== 'credit').length,
        alert: airports.filter(a => a.type === 'credit').length
    };

    const labelKeys = {
        all: 'ui.filter.all',
        normal: 'normalConditions',
        alert: 'meteorologicalAlert'
    };

    filterEl.querySelectorAll('.mta-filter-toggle-btn').forEach(btn => {
        const filter = btn.getAttribute('data-filter');
        const labelKey = labelKeys[filter];
        if (!labelKey) return;
        btn.textContent = `${t(labelKey)} (${counts[filter] || 0})`;
        btn.classList.toggle('active', filter === viewState.airportTypeFilter);
    });
};

const syncDepartureViewSelect = () => {
    const selectEl = document.getElementById('departures-view-select');
    if (!selectEl) return;
    selectEl.value = viewState.departureViewFilter;
    const filterEl = document.getElementById('departures-semaphore-filter');
    if (filterEl) {
        filterEl.classList.remove('mta-hidden');
    }
};

// ============================================================================
// ARRIVALS TAB RENDERING (Always show arrivals-flights)
// ============================================================================
const renderArrivalsCargoView = (groups, flights, terminals, container) => {
    if (!window.isSalesModeEnabled()) {
        container.innerHTML = `<p class="text-muted">${t("noArrivals")}</p>`;
        return;
    }

    const { periods } = buildArrivalCargoPeriods(groups, flights, terminals);
    if (periods.length === 0) {
        container.innerHTML = `<p class="text-muted">${t('ui.products.cargoEmpty')}</p>`;
        return;
    }

    container.innerHTML = periods.map(period => {
        const productsHtml = period.products.map(product => `
            <div class="mta-canonical-item mta-canonical-item--container mb-2">
                <div class="mta-canonical-item__line1">
                    <div class="mta-canonical-item__name font-weight-bold text-center">
                        <span class="mta-details-link" onclick="event.stopPropagation(); showProductDetails('${product.productId}')">${product.productCode} - ${product.productName}</span>
                    </div>
                </div>
                <div class="mta-canonical-item__line2 align-items-center">
                    <div class="mta-canonical-item__meta text-muted small">${product.totalQuantity} x ${formatCurrency(product.totalQuantity > 0 ? product.totalAmount / product.totalQuantity : 0)}</div>
                    <div class="mta-canonical-item__actions">
                        <strong>${formatCurrency(product.totalAmount)}</strong>
                    </div>
                </div>
            </div>
        `).join('');

        return `
            <div class="mta-canonical-related__header d-flex justify-content-between align-items-center">
                <span>${period.label}</span>
                <strong>${formatCurrency(period.totalAmount)}</strong>
            </div>
            ${productsHtml}
        `;
    }).join('');
};

const updateArrivalsTab = () => {
    const groups = getPassengerGroups().slice();
    const flights = getFlights();
    const terminals = getTerminals();
    const container = document.getElementById('arrivals-content');
    const headerTitleText = document.getElementById('arrivals-section-title-text');
    const headerCount = document.getElementById('arrivals-count');
    const arrivalsCargoViewSelect = document.getElementById('arrivals-cargo-view-select');
    if (!container) return;

    const arrivalsTypeFilter = document.getElementById('arrivals-type-filter');
    if (arrivalsTypeFilter) {
        updateArrivalTypeFilterLabels(groups);
    }
    updateArrivalCargoProductFilterOptions(groups, flights, terminals);
    if (arrivalsCargoViewSelect) {
        arrivalsCargoViewSelect.value = viewState.arrivalCargoView;
    }

    const terminalById = terminals.reduce((acc, t) => {
        acc[t.id] = t;
        return acc;
    }, {});

    if (viewState.arrivals === 'arrivals-cargo') {
        const cargoResult = buildArrivalCargoPeriods(groups, flights, terminals);
        if (headerTitleText) {
            headerTitleText.textContent = t('arrival.cargoSummaryLabel').toUpperCase();
        }
        if (headerCount) {
            headerCount.textContent = `(${cargoResult.visibleQuantity})`;
        }
        renderArrivalsCargoView(groups, flights, terminals, container);
        return;
    }

    const visibleGroups = groups.filter(arrivalMatchesTypeFilter);
    const displayEntries = getArrivalGroupAggregateEntries(visibleGroups, flights);

    if (headerTitleText) {
        headerTitleText.textContent = t('arrivals').toUpperCase();
    }
    if (headerCount) {
        headerCount.textContent = `(${displayEntries.length})`;
    }

    if (displayEntries.length === 0) {
        container.innerHTML = `<p class="text-muted">${t("noArrivals")}</p>`;
        return;
    }

    const groupCards = displayEntries.map(entry => {
        if (entry.kind === 'aggregate') {
            const members = entry.members || [];
            const totalAmount = members.reduce((sum, group) => sum + Number(group.totalAmount || 0), 0);
            const totalAwaiting = members.reduce((sum, group) => sum + getPassengerGroupAwaitingAmount(group), 0);
            const groupedFlights = buildGroupedArrivalLedgerWithBalances(members, flights, terminals);
            const totalFlights = groupedFlights.length;
            const earliestDate = members.length ? getPassengerGroupDisplayDate(members[0], flights) : new Date();
            const groupDateKey = getLocalizedDateHeader(earliestDate);
            const safeGroupKey = entry.groupName.replace(/[^a-zA-Z0-9_-]+/g, '-');
            const relatedHtml = buildArrivalFlightsRelatedHtml(`related-${safeGroupKey}`, groupedFlights, terminals, terminalById);

            return {
                id: `aggregate-${safeGroupKey}`,
                dateValue: earliestDate.getTime(),
                createdValue: earliestDate.getTime(),
                dateKey: groupDateKey,
                html: `
                    <div class="mta-canonical-item mta-canonical-item--container">
                        <div class="mta-canonical-item__line1">
                            <div class="mta-canonical-item__name font-weight-bold">${entry.groupName}</div>
                        </div>
                        <div class="mta-canonical-item__line2">
                            <div class="mta-canonical-item__meta text-muted small">
                                <div>${t('arrival.groupedArrivalsLabel')} (${members.length}) - <span>${t("flightsLabel")} (${totalFlights})</span></div>
                                <div><span class="mta-details-link" style="cursor: pointer;" onclick="event.stopPropagation(); toggleItemExpansion('aggregate', '${safeGroupKey}', this)">${t('collapsedControl')}</span></div>
                            </div>
                            <div class="mta-canonical-item__actions">
                                <div><strong>${t('landed')}: ${formatCurrency(totalAmount)}</strong></div>
                                <div><strong>${t('awaiting')}: ${formatCurrency(totalAwaiting)}</strong></div>
                            </div>
                        </div>
                    </div>
                    ${relatedHtml}
                `
            };
        }

        const g = entry.group;
        const flightsWithBalances = getPassengerGroupLedgerWithBalances(g.id);
        const groupFlights = sortRelatedFlights(flightsWithBalances);
        const chronologicalFlights = getChronologicalFlightOrder(groupFlights);
        const anchorFlight = chronologicalFlights[0] || null;
        const groupDateKey = getLocalizedDateHeader(new Date(anchorFlight?.date || anchorFlight?.createdAt || g.createdAt));
        
        // Get remaining from the last completed flight, or total amount if no flights
        let remaining = g.totalAmount || 0;
        const lastCompletedFlight = groupFlights.find(f => f.status === 'Completed');
        if (lastCompletedFlight && lastCompletedFlight._runningBalance !== undefined) {
            remaining = lastCompletedFlight._runningBalance;
        }
        
        // Semaphore for passenger group type
        const pgSemaphoreColor = getPassengerGroupSemaphoreColor(g);
        const pgSemaphoreMarkup = `<span class="mta-semaphore mta-semaphore--${pgSemaphoreColor}"></span>`;
        const pgTypeLabel = getPassengerGroupTypeLabel(g);
        const cargoSummary = window.isSalesModeEnabled() && Array.isArray(g.cargo) && g.cargo.length > 0
            ? g.cargo.map(item => {
                const product = typeof getProductById === 'function' ? getProductById(item.productId) : null;
                return `${product?.name || t('unknown')} (${item.quantity})`;
            }).join(', ')
            : '';
        
        // Main passenger group item - STRICT 2-LINE LAYOUT
        const row = `
            <div class="mta-canonical-item mta-canonical-item--container">
                <div class="mta-canonical-item__line1">
                    <div class="mta-canonical-item__name font-weight-bold"><span class="mta-details-link" onclick="event.stopPropagation(); showGroupDetails('${g.id}', 'view')">${g.name}</span></div>
                </div>
                <div class="mta-canonical-item__line2">
                    <div class="mta-canonical-item__meta text-muted small">
                        <div>
                            ${pgSemaphoreMarkup} ${pgTypeLabel} - <span style="cursor: pointer;">${t("flightsLabel")} (${groupFlights.length})</span>
                        </div>
                        <div>
                            <span class="mta-details-link" style="cursor: pointer;" onclick="event.stopPropagation(); toggleItemExpansion('group', '${g.id}', this)">${t('collapsedControl')}</span>
                        </div>
                    </div>
                    <div class="mta-canonical-item__actions">
                        <div>
                            <strong>${t('landed')}: ${formatCurrency(g.totalAmount || 0)}</strong>
                        </div>
                        <div>
                            <strong>${t('awaiting')}: ${formatCurrency(remaining)}</strong>
                        </div>
                        ${cargoSummary ? `<div class="mta-canonical-item__secondary">${t('arrival.cargoSummaryLabel')}: ${cargoSummary}</div>` : ''}
                    </div>
                </div>
            </div>
        `;
        
        // Related flights section with date grouping and remaining amounts
        let relatedHtml = '';
        if (groupFlights.length === 0) {
            relatedHtml = `<div id="related-${g.id}" class="mta-canonical-related mta-hidden"><small class="text-muted">${t("noRelatedFlights")}</small></div>`;
        } else {
            // Group flights by date
            const flightsByDate = {};
            groupFlights.forEach(f => {
                const fDate = new Date(f.date || f.createdAt);
                const dateKey = getLocalizedDateHeader(fDate);
                if (!flightsByDate[dateKey]) flightsByDate[dateKey] = [];
                flightsByDate[dateKey].push(f);
            });
            
            let flightsHtml = '';
            Object.entries(flightsByDate).forEach(([dateKey, flightsForDate]) => {
                flightsHtml += `<div class="mta-canonical-related__header">${dateKey}</div>`;
                flightsForDate.forEach((f) => {
                    const visualIndex = groupFlights.length - groupFlights.findIndex(flight => flight.id === f.id);
                    const flightRoute = getFlightRouteDisplay(f, terminalById);
                    const flightTitle = getFlightDisplayTitle(f, terminalById);
                    
                    const semaphoreColor = getSemaphoreColor(f, terminals);
                    const semaphoreMarkup = `<span class="mta-semaphore mta-semaphore--${semaphoreColor}"></span>`;
                    
                    // Get the flight type label
                    const flightTypeLabel = getFlightTypeLabel(f, groupFlights, terminals);
                    
                    // Get the appropriate label for the amount
                    const amountLabel = getFlightAmountLabel(f, terminals);
                    const amount = formatCurrency(f.amount || 0);
                    const remainingBalance = f._runningBalance !== undefined ? formatCurrency(f._runningBalance) : '—';
                    
                    flightsHtml += `
                        <div class="mta-canonical-item mta-canonical-item--related">
                            <div class="mta-canonical-item__name"><span class="mta-subitem-index-prefix">#${visualIndex}</span> <span class="mta-details-link" onclick="event.stopPropagation(); showFlightDetails('${f.id}', 'readonly')">${flightTitle}</span></div>
                            <div class="mta-canonical-item__line2">
                                <div class="mta-canonical-item__meta text-muted small">
                                    ${semaphoreMarkup}
                                    <span class="mta-type-label">${flightTypeLabel}</span> - <span class="mta-route">${flightRoute}</span> - <span class="mta-status">${f.status}</span>
                                </div>
                                <div class="mta-canonical-item__actions">
                                    <div>
                                        <strong>${amountLabel}: ${amount}</strong>
                                    </div>
                                    ${viewState.ledgerMode ? `
                                    <div class="mta-canonical-item__secondary">
                                        Running: ${remainingBalance}
                                    </div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                });
            });
            relatedHtml = `<div id="related-${g.id}" class="mta-canonical-related mta-hidden">${flightsHtml}</div>`;
        }

        return {
            id: g.id,
            dateValue: getFlightSortDateValue(anchorFlight || { date: g.createdAt, createdAt: g.createdAt }),
            createdValue: getFlightCreatedAtValue({ createdAt: g.createdAt }),
            dateKey: groupDateKey,
            html: row + relatedHtml
        };
    }).sort((a, b) => {
        const dateCompare = b.dateValue - a.dateValue;
        if (dateCompare !== 0) return dateCompare;
        const createdCompare = b.createdValue - a.createdValue;
        if (createdCompare !== 0) return createdCompare;
        return (b.id || '').localeCompare(a.id || '');
    });

    const groupsByDate = {};
    groupCards.forEach(card => {
        if (!groupsByDate[card.dateKey]) {
            groupsByDate[card.dateKey] = [];
        }
        groupsByDate[card.dateKey].push(card.html);
    });

    container.innerHTML = Object.entries(groupsByDate).map(([dateKey, cards]) => {
        return `<div class="mta-canonical-related__header">${dateKey}</div>${cards.join('')}`;
    }).join('');
};

// ============================================================================
// DEPARTURES TAB RENDERING (Always show flights-subflights)
// ============================================================================
const updateFlightsList = () => {
    const flights = getFlights();
    const terminals = getTerminals();
    const airports = getAirports();
    const list = document.getElementById('flights-list');
    const headerTitleText = document.getElementById('departures-section-title-text');
    if (!list) return;

    // Helper to get terminal display name
    const getTerminalName = (termId) => {
        if (!termId) return t("notSet");
        const term = terminals.find(t => t.id === termId);
        if (!term) return t("unknown");
        const airport = airports.find(a => a.id === term.airportId);
        return `${airport?.name || ''} / ${term.name}`;
    };

    // Departures section shows root departures only.
    let displayFlights = flights.filter(f =>
        !f.sourceFlightId &&
        !isReturnFlight(f, terminals) &&
        !isArrivalBornInitialAllocation(f, terminals)
    );
    syncDepartureViewSelect();
    displayFlights = displayFlights.filter(f => departureMatchesViewFilter(f, flights, terminals));
    const departuresViewCount = displayFlights.length;
    updateDepartureSemaphoreFilterLabels(displayFlights, flights, terminals);
    displayFlights = displayFlights.filter(f => departureMatchesSemaphoreFilter(f, flights, terminals));
    
    // Deterministic sort: business date desc, createdAt desc, ordinal desc, id desc.
    displayFlights.sort((a, b) => {
        const dateCompare = getFlightSortDateValue(b) - getFlightSortDateValue(a);
        if (dateCompare !== 0) return dateCompare;
        const createdCompare = getFlightCreatedAtValue(b) - getFlightCreatedAtValue(a);
        if (createdCompare !== 0) return createdCompare;
        const ordinalCompare = (b.ordinal || 0) - (a.ordinal || 0);
        if (ordinalCompare !== 0) return ordinalCompare;
        return (b.id || '').localeCompare(a.id || '');
    });
    
    // Update section header with count
    if (headerTitleText) {
        headerTitleText.textContent = t('departures').toUpperCase();
    }
    const departuresCount = document.getElementById('departures-count');
    if (departuresCount) {
        departuresCount.textContent = `(${departuresViewCount})`;
    }
    
    // Render root flights with enhanced hierarchical card design
    // First, create a map of ID to flight card & related content
    const flightCardMap = new Map();
    
    // Build terminal lookup map (like Arrivals does)
    const terminalById = terminals.reduce((acc, t) => {
        acc[t.id] = t;
        return acc;
    }, {});
    
    displayFlights.forEach(rootFlight => {
        const route = getFlightRouteDisplay(rootFlight, terminalById);
        const rootTitle = getFlightDisplayTitle(rootFlight, terminalById);
        
        // Flight metadata
        const rootPresentation = getDepartureRootPresentation(rootFlight, flights, terminals);
        const semaphoreColor = rootPresentation.color;
        const semaphoreMarkup = `<span class="mta-semaphore mta-semaphore--${semaphoreColor}"></span>`;
        
        const typeLabel = rootPresentation.label;
        
        // Legs count display: "Direct" or "Legs (N)"
        const legsDisplay = getLegsCountDisplay(rootFlight, flights);
        const legsDisplayMarkup = legsDisplay.helpKey
            ? `
                <span class="mta-legs-count">${legsDisplay.text}</span>
                <span class="mta-help-anchor">
                    <button
                        type="button"
                        class="mta-help-icon"
                        title="${t(legsDisplay.helpKey)}"
                        aria-label="${t(legsDisplay.helpKey)}"
                        onclick="event.stopPropagation(); toggleHelpTooltip(this, '${legsDisplay.helpKey}');"
                    >?</button>
                </span>
            `
            : `<span class="mta-legs-count">${legsDisplay.text}</span>`;
        
        // Subflights: payment legs (exclude return flights)
        const paymentLegs = flights.filter(f => f.sourceFlightId === rootFlight.id && !isReturnFlight(f, terminals));
        const sortedPaymentLegs = sortRelatedFlights(paymentLegs);
        
        // Return child flights
        const returnLegs = flights.filter(f => f.sourceFlightId === rootFlight.id && isReturnFlight(f, terminals));
        const allChildren = sortRelatedFlights([...sortedPaymentLegs, ...returnLegs]);
        const chronologicalChildren = getChronologicalFlightOrder(allChildren);
        const pendingAfterChild = new Map();
        const chronologicalIndexById = new Map();
        let signedCommitted = 0;
        chronologicalChildren.forEach((child, index) => {
            const signedAmount = isReturnFlight(child, terminals) ? -(child.amount || 0) : (child.amount || 0);
            signedCommitted += signedAmount;
            pendingAfterChild.set(child.id, Math.max(0, (rootFlight.amount || 0) - signedCommitted));
            chronologicalIndexById.set(child.id, index + 1);
        });
        
        // Commitment data
        const pendingCommitment = calculatePendingCommitment(rootFlight, flights);
        const reservationsAmount = formatCurrency(rootFlight.amount || 0);
        const pendingAmount = formatCurrency(pendingCommitment);
        const travelersAmount = formatCurrency(rootFlight.amount || 0);
        
        // Build root flight card - matching Arrivals canonical template
        const rootCard = `
            <div class="mta-canonical-item mta-canonical-item--container" id="root-flight-${rootFlight.id}">
                <div class="mta-canonical-item__line1">
                    <div class="mta-canonical-item__name font-weight-bold"><span class="mta-details-link" onclick="event.stopPropagation(); showFlightDetails('${rootFlight.id}', 'readonly')">${rootTitle}</span></div>
                </div>
                <div class="mta-canonical-item__line2">
                    <div class="mta-canonical-item__meta text-muted small">
                        <div>
                            ${semaphoreMarkup}
                            <span class="mta-type-label">${typeLabel}</span> - 
                            <span class="mta-route">${route}</span> - 
                            ${legsDisplayMarkup}
                        </div>
                        <div>
                            <span class="mta-details-link" style="cursor: pointer;" onclick="event.stopPropagation(); toggleItemExpansion('flight', '${rootFlight.id}', this)">${t('howTravelLabel')}</span>
                        </div>
                    </div>
                    <div class="mta-canonical-item__actions">
                        <div>
                            <strong>${rootFlight.status === 'Planned' 
                                ? `${t('reservationsLabel') || 'Reservations'}: ${reservationsAmount}`
                                : `${t('travelersLabel') || 'Travelers'}: ${travelersAmount}`
                            }</strong>
                        </div>
                        ${rootFlight.status === 'Planned' 
                            ? `<div><strong>${t('yetToTravelLabel') || 'Yet to Travel'}: ${pendingAmount}</strong></div>`
                            : ''
                        }
                    </div>
                </div>
            </div>
        `;
        
        // Build children section (subflights and return flights - NO date grouping, only "Add Leg" button)
        let relatedHtml = '';
        if (allChildren.length === 0) {
            // Show "Add Leg" button with empty state message after when no children exist
            relatedHtml = `
                <div id="subflight-${rootFlight.id}" class="mta-canonical-related mta-hidden">
                    <div class="mta-canonical-related__header" onclick="showAddLegDialog('${rootFlight.id}')" style="cursor: pointer; color: #007bff;">+ ${t('addLegLabel') || 'Add Leg'}</div>
                    <small class="text-muted">${t("noRelatedFlights")}</small>
                </div>
            `;
        } else {
            // Build related content with "Add Leg" button and children (no date grouping)
            let relatedContent = '';
            
            // Add "Add Leg" header at the beginning
            relatedContent += `<div class="mta-canonical-related__header" onclick="showAddLegDialog('${rootFlight.id}')" style="cursor: pointer; color: #007bff;">+ ${t('addLegLabel') || 'Add Leg'}</div>`;
            
            // Add all children without date grouping
            allChildren.forEach((child) => {
                const visualIndex = chronologicalIndexById.get(child.id) || 1;
                const childRoute = getFlightRouteDisplay(child, terminalById);
                const childTitle = getFlightDisplayTitle(child, terminalById);
                
                // Child flight metadata
                const childPresentation = getDepartureLegPresentation(child, terminals);
                const childSemaphoreColor = childPresentation.color;
                const childSemaphoreMarkup = `<span class="mta-semaphore mta-semaphore--${childSemaphoreColor}"></span>`;
                
                const childTypeLabel = childPresentation.label;
                
                // Get the appropriate label for the amount (same as Arrivals flights)
                const amountLabel = getFlightAmountLabel(child, terminals);
                const childAmount = formatCurrency(child.amount || 0);
                const remainingBalance = formatCurrency(pendingAfterChild.get(child.id) || 0);
                
                relatedContent += `
                    <div class="mta-canonical-item mta-canonical-item--related">
                        <div class="mta-canonical-item__name"><span class="mta-subitem-index-prefix">#${visualIndex}</span> <span class="mta-details-link" onclick="event.stopPropagation(); showFlightDetails('${child.id}', 'readonly')">${childTitle}</span></div>
                        <div class="mta-canonical-item__line2">
                            <div class="mta-canonical-item__meta text-muted small">
                                ${childSemaphoreMarkup}
                                <span class="mta-type-label">${childTypeLabel}</span> - 
                                <span class="mta-route">${childRoute}</span> - 
                                <span class="mta-status">${child.status}</span>
                            </div>
                            <div class="mta-canonical-item__actions">
                                <div>
                                    <strong>${amountLabel}: ${childAmount}</strong>
                                </div>
                                ${viewState.ledgerMode ? `
                                <div class="mta-canonical-item__secondary">
                                    ${t('yetToTravelLabel') || 'Yet to Travel'}: ${remainingBalance}
                                </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `;
            });
            
            relatedHtml = `<div id="subflight-${rootFlight.id}" class="mta-canonical-related mta-hidden">${relatedContent}</div>`;
        }
        
        // Store as pair with date key for grouping
        const fDate = new Date(rootFlight.date);
        const dateKey = getLocalizedDateHeader(fDate);
        flightCardMap.set(rootFlight.id, { dateKey, rootCard, relatedHtml });
    });
    
    // Group root flights by date
    const flightsByDate = {};
    displayFlights.forEach(f => {
        const cardData = flightCardMap.get(f.id);
        if (cardData) {
            if (!flightsByDate[cardData.dateKey]) flightsByDate[cardData.dateKey] = [];
            flightsByDate[cardData.dateKey].push(cardData);
        }
    });
    
    // Build final HTML with date headers at root level grouping parent flights
    let html = '';
    Object.entries(flightsByDate).forEach(([dateKey, cardPairs]) => {
        html += `<div class="mta-canonical-related__header">${dateKey}</div>`;
        cardPairs.forEach(cardPair => {
            html += cardPair.rootCard + cardPair.relatedHtml;
        });
    });
    
    // Update departures count if no flights
    if (html === '') {
        if (headerTitleText) {
            headerTitleText.textContent = t('departures').toUpperCase();
        }
    }
    
    list.innerHTML = html || `<p class="text-muted">${t("noFlights")}</p>`;
};

// Handle canonical item click: expand if collapsed, open modal if expanded
// Canonical item click: simple toggle of related items visibility
window.handleCanonicalItemClick = (itemType, itemId, element) => {
    toggleItemExpansion(itemType, itemId, element || null);
};
// ============================================================================
// TERMINALS TAB RENDERING
// ============================================================================
window.switchTerminalsView = (view) => {
    viewState.terminals = view;
    applyCurrentUIPreferences();
    window.persistCurrentUIPreferences();
    updateTerminalsList();
};

window.switchArrivalsView = (view) => {
    if (!['arrivals-groups', 'arrivals-cargo'].includes(view)) {
        return;
    }
    if (view === 'arrivals-cargo' && !window.isSalesModeEnabled()) {
        return;
    }
    viewState.arrivals = view;
    applyCurrentUIPreferences();
    window.persistCurrentUIPreferences();
    updateArrivalsTab();
};

window.toggleSalesMode = () => {
    viewState.salesMode = !viewState.salesMode;
    if (!viewState.salesMode && viewState.arrivals === 'arrivals-cargo') {
        viewState.arrivals = 'arrivals-groups';
    }
    applyCurrentUIPreferences();
    window.persistCurrentUIPreferences();
    updateArrivalsTab();
};

window.setArrivalTypeFilter = (filter) => {
    if (!['all', 'open', 'restricted'].includes(filter)) {
        return;
    }
    viewState.arrivalTypeFilter = filter;
    applyCurrentUIPreferences();
    window.persistCurrentUIPreferences();
    updateArrivalsTab();
};

window.setArrivalCargoView = (filter) => {
    if (!['last-7-days', 'last-12-months', 'by-year'].includes(filter)) {
        return;
    }
    viewState.arrivalCargoView = filter;
    applyCurrentUIPreferences();
    window.persistCurrentUIPreferences();
    updateArrivalsTab();
};

window.setArrivalCargoProductFilter = (filter) => {
    viewState.arrivalCargoProductFilter = filter || 'all';
    applyCurrentUIPreferences();
    window.persistCurrentUIPreferences();
    updateArrivalsTab();
};

window.toggleGroupArrivals = (enabled) => {
    viewState.groupArrivals = enabled === true;
    applyCurrentUIPreferences();
    window.persistCurrentUIPreferences();
    updateArrivalsTab();
};

window.setDashboardPeriodFilter = (filter) => {
    if (!['all', 'current-month', 'last-month'].includes(filter)) {
        return;
    }
    viewState.dashboardPeriodFilter = filter;
    applyCurrentUIPreferences();
    updateDashboard();
};

window.setDepartureViewFilter = (filter) => {
    if (!['all', 'reservations', 'completed', 'returned'].includes(filter)) {
        return;
    }
    viewState.departureViewFilter = filter;
    viewState.departureSemaphoreFilter = 'all';
    applyCurrentUIPreferences();
    window.persistCurrentUIPreferences();
    updateFlightsList();
};

window.setDepartureSemaphoreFilter = (filter) => {
    if (!['all', 'connection', 'oneway', 'roundtrip'].includes(filter)) {
        return;
    }
    viewState.departureSemaphoreFilter = filter;
    applyCurrentUIPreferences();
    window.persistCurrentUIPreferences();
    updateFlightsList();
};

window.setTerminalTypeFilter = (filter) => {
    if (!['all', 'checkin', 'connection', 'checkout-oneway', 'checkout-roundtrip'].includes(filter)) {
        return;
    }
    viewState.terminalTypeFilter = filter;
    applyCurrentUIPreferences();
    window.persistCurrentUIPreferences();
    updateTerminalsList();
};

window.setAirportTypeFilter = (filter) => {
    if (!['all', 'normal', 'alert'].includes(filter)) {
        return;
    }
    viewState.airportTypeFilter = filter;
    applyCurrentUIPreferences();
    window.persistCurrentUIPreferences();
    updateTerminalsList();
};

// ============================================================================
// GLOBAL LEDGER MODE TOGGLE
// ============================================================================
window.toggleLedgerMode = () => {
    viewState.ledgerMode = !viewState.ledgerMode;
    const toggle = document.getElementById('ledger-mode-toggle');
    if (toggle) {
        toggle.classList.toggle('active', viewState.ledgerMode);
    }
    window.persistCurrentUIPreferences();
    // Refresh arrivals to show/hide running remaining
    if (window.updateAll) window.updateAll();
};

window.isDeleteEnabledMode = () => viewState.deleteEnabledMode === true;

window.toggleDeleteEnabledMode = () => {
    viewState.deleteEnabledMode = !viewState.deleteEnabledMode;
    const toggle = document.getElementById('delete-enabled-mode-toggle');
    if (toggle) {
        toggle.classList.toggle('active', viewState.deleteEnabledMode);
    }
    window.persistCurrentUIPreferences();
    if (window.updateAll) window.updateAll();
};

window.setDefaultArrivalTerminal = (terminalId) => {
    viewState.defaultArrivalTerminalId = terminalId || '';
    window.persistCurrentUIPreferences();
    applyCurrentUIPreferences();
};

window.setDefaultArrivalName = (name) => {
    viewState.defaultArrivalName = String(name || '').trim();
    window.persistCurrentUIPreferences();
};

window.setDefaultArrivalGroupName = (groupName) => {
    viewState.defaultArrivalGroupName = String(groupName || '').trim();
    window.persistCurrentUIPreferences();
};

window.updateDevDataToggleLabel = () => {
    const devDataEl = document.getElementById('dev-data');
    const toggle = document.getElementById('dev-data-toggle');
    if (!devDataEl || !toggle) return;

    const isVisible = !devDataEl.classList.contains('mta-hidden');
    toggle.classList.toggle('active', isVisible);
    toggle.innerHTML = `&#128202; ${isVisible ? t('ui.tools.hideAllData') : t('ui.tools.showAllData')}`;
};

window.toggleDevData = () => {
    const devDataEl = document.getElementById('dev-data');
    if (!devDataEl) return;
    devDataEl.classList.toggle('mta-hidden');
    viewState.devDataVisible = !devDataEl.classList.contains('mta-hidden');
    window.persistCurrentUIPreferences();
    window.updateDevDataToggleLabel();
};

const updateTerminalsList = () => {
    const view = viewState.terminals;
    const airports = getAirports();
    const terminals = getTerminals();
    const flights = getFlights();
    const container = document.getElementById('terminals-list');
    const headerTitle = document.querySelector('.mta-canonical-section__title[data-i18n="terminals"]');
    const terminalsTypeFilter = document.getElementById('terminals-type-filter');
    const airportsTypeFilter = document.getElementById('airports-type-filter');
    if (!container) return;

    if (terminalsTypeFilter) {
        terminalsTypeFilter.classList.toggle('mta-hidden', view !== 'terminals-flights');
    }
    if (airportsTypeFilter) {
        airportsTypeFilter.classList.toggle('mta-hidden', view !== 'airports-terminals');
    }

    if (view === 'terminals-flights') {
        // Show terminals with their flights as related items using canonical layout
        // Update section header with count
        if (headerTitle) {
            const baseText = `\u{1F3E2} ${t('terminals')}`;
            headerTitle.textContent = `${baseText} (${terminals.length})`;
        }
        updateTerminalTypeFilterLabels(terminals);
        
        if (terminals.length === 0) {
            container.innerHTML = `<p class="text-muted">${t("noTerminals")}</p>`;
            return;
        }

        const flights = getFlights();
        const terminalById = terminals.reduce((acc, currentTerminal) => {
            acc[currentTerminal.id] = currentTerminal;
            return acc;
        }, {});
        const getAirportName = (airportId) => {
            const airport = airports.find(a => a.id === airportId);
            return airport ? airport.name : t("unknown");
        };

        const terminalCards = terminals.filter(terminalMatchesTypeFilter).map(term => {
            const airportName = getAirportName(term.airportId);
            const metaphor = getTerminalMetaphor(term);
            const role = t(metaphor.roleKey);
            const subtype = metaphor.subtypeKey ? t(metaphor.subtypeKey) : null;
            const terminalLabel = subtype ? `${role} (${subtype})` : role;
            const totalAtTerminal = getMoneyAtTerminal(term.id);
            const terminalFlights = sortRelatedFlights(getTerminalLedgerWithBalances(term.id));
            const terminalSemaphoreColor = getSemaphoreColor(term, 'terminal', terminals);
            const terminalSemaphoreMarkup = `<span class="mta-semaphore mta-semaphore--${terminalSemaphoreColor}"></span>`;
            
            const inactiveClass = term.status === 'inactive' ? 'mta-inactive' : '';
            const inactiveBadge = term.status === 'inactive' ? `<span class="badge badge-secondary ml-2">${t("inactive")}</span>` : '';

            const row = `
                <div class="mta-canonical-item mta-canonical-item--container ${inactiveClass}">
                    <div class="mta-canonical-item__line1">
                        <div class="mta-canonical-item__name"><span class="mta-details-link" onclick="event.stopPropagation(); showTerminalDetails('${term.id}', 'readonly')">${term.name}</span> ${inactiveBadge}</div>
                    </div>
                    <div class="mta-canonical-item__line2">
                        <div class="mta-canonical-item__meta text-muted small">
                            ${terminalSemaphoreMarkup}
                            <span>${terminalLabel}</span> - <span>${t("flightsLabel")} (${terminalFlights.length})</span><div><span class="mta-details-link" style="cursor: pointer;" onclick="event.stopPropagation(); toggleItemExpansion('terminal', '${term.id}', this)">${t("whereNowLabel") || "What traffic are we handling? v"}</span></div>
                        </div>
                        <div class="mta-canonical-item__actions">
                            <div>
                                <strong>${t("awaiting")}: ${formatCurrency(totalAtTerminal)}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            let relatedHtml = '';
            if (terminalFlights.length === 0) {
                relatedHtml = `<div id="related-terminal-${term.id}" class="mta-canonical-related mta-hidden"><small class="text-muted">${t("noFlights")}</small></div>`;
            } else {
                // Group flights by date
                const flightsByDate = {};
                terminalFlights.forEach(f => {
                    const fDate = new Date(f.date || f.createdAt);
                    const dateKey = getLocalizedDateHeader(fDate);
                    if (!flightsByDate[dateKey]) flightsByDate[dateKey] = [];
                    flightsByDate[dateKey].push(f);
                });
                
                let dateGroupsHtml = '';
                Object.entries(flightsByDate).forEach(([dateKey, flightsForDate]) => {
                    dateGroupsHtml += `<div class="mta-canonical-related__header">${dateKey}</div>`;
                    flightsForDate.forEach((f) => {
                        const visualIndex = terminalFlights.length - terminalFlights.findIndex(flight => flight.id === f.id);
                        const route = getFlightRouteDisplay(f, terminalById);
                        const title = getFlightDisplayTitle(f, terminalById);
                        
                        const flightSemaphoreColor = getSemaphoreColor(f, terminals);
                        const flightSemaphoreMarkup = `<span class="mta-semaphore mta-semaphore--${flightSemaphoreColor}"></span>`;
                        const flightTypeLabel = getFlightTypeLabel(f, terminalFlights, terminals);
                        const amountLabel = getFlightAmountLabel(f, terminals);
                        const amount = formatCurrency(f.amount || 0);
                        const runningBalance = f._runningBalance !== undefined ? formatCurrency(f._runningBalance) : '--';

                        dateGroupsHtml += `
                            <div class="mta-canonical-item mta-canonical-item--related">
                                <div class="mta-canonical-item__name"><span class="mta-subitem-index-prefix">#${visualIndex}</span> <span class="mta-details-link" onclick="event.stopPropagation(); showFlightDetails('${f.id}', 'readonly')">${title}</span></div>
                                <div class="mta-canonical-item__line2">
                                    <div class="mta-canonical-item__meta text-muted small">
                                        ${flightSemaphoreMarkup}
                                        <span class="mta-type-label">${flightTypeLabel}</span> - <span class="mta-route">${route}</span> - <span class="mta-status">${f.status}</span>
                                    </div>
                                    <div class="mta-canonical-item__actions">
                                        <div>
                                            <strong>${amountLabel}: ${amount}</strong>
                                        </div>
                                        ${viewState.ledgerMode ? `
                                        <div class="mta-canonical-item__secondary">
                                            Running: ${runningBalance}
                                        </div>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                });
                relatedHtml = `<div id="related-terminal-${term.id}" class="mta-canonical-related mta-hidden">${dateGroupsHtml}</div>`;
            }

            return {
                airportName,
                airportId: term.airportId,
                terminalName: term.name || '',
                html: row + relatedHtml
            };
        }).sort((a, b) => {
            const airportCompare = a.airportName.localeCompare(b.airportName);
            if (airportCompare !== 0) return airportCompare;
            const terminalCompare = a.terminalName.localeCompare(b.terminalName);
            if (terminalCompare !== 0) return terminalCompare;
            return (a.airportId || '').localeCompare(b.airportId || '');
        });

        const terminalsByAirport = {};
        terminalCards.forEach(card => {
            if (!terminalsByAirport[card.airportName]) {
                terminalsByAirport[card.airportName] = [];
            }
            terminalsByAirport[card.airportName].push(card.html);
        });

        container.innerHTML = Object.entries(terminalsByAirport).map(([airportName, cards]) => {
            return `<div class="mta-canonical-related__header">${airportName}</div>${cards.join('')}`;
        }).join('');
    } else if (view === 'airports-terminals') {
        // Show airports with their terminals as related items using canonical layout
        // Update section header with count
        if (headerTitle) {
            const baseText = `\u{1F3E2} ${t('airports')}`;
            headerTitle.textContent = `${baseText} (${airports.length})`;
        }
        updateAirportTypeFilterLabels(airports);
        
        if (airports.length === 0) {
            container.innerHTML = `<p class="text-muted">${t("noAirports")}</p>`;
            return;
        }

        const html = airports.filter(airportMatchesTypeFilter).map(airport => {
            const airportTerminals = terminals.filter(t => t.airportId === airport.id);
            const totalPlannedCommitment = getAirportTotalPlannedCommitment(airport.id, flights, terminals);
            const airportRunningReservations = totalPlannedCommitment;
            
            const inactiveClass = airport.status === 'inactive' ? 'mta-inactive' : '';
            const inactiveBadge = airport.status === 'inactive' ? `<span class="badge badge-secondary ml-2">${t("inactive")}</span>` : '';
            const airportSemaphoreColor = getAirportSemaphoreColor(airport);
            const airportSemaphoreMarkup = `<span class="mta-semaphore mta-semaphore--${airportSemaphoreColor}"></span>`;
            const airportTypeLabel = getAirportTypeLabel(airport);

            const row = `
                <div class="mta-canonical-item mta-canonical-item--container ${inactiveClass}" onclick="event.stopPropagation(); handleCanonicalItemClick('airport', '${airport.id}')">
                    <div class="mta-canonical-item__line1">
                        <div class="mta-canonical-item__name"><span class="mta-details-link" onclick="event.stopPropagation(); showAirportDetails('${airport.id}', 'readonly')">${airport.name}</span> ${inactiveBadge}</div>
                    </div>
                    <div class="mta-canonical-item__line2">
                        <div class="mta-canonical-item__meta text-muted small"><div>${airportSemaphoreMarkup} ${airportTypeLabel} - ${t("terminalsLabel")} (${airportTerminals.length})</div><div><span class="mta-details-link" style="cursor: pointer;" onclick="event.stopPropagation(); toggleItemExpansion('airport', '${airport.id}', this)">${t("whereMustGoNowLabel") || "Where must they go now? v"}</span></div></div><div class="mta-canonical-item__actions"><div><strong>${t("reservationsLabel") || "Reservations"}: ${formatCurrency(totalPlannedCommitment)}</strong></div>${viewState.ledgerMode ? `<div class="mta-canonical-item__secondary">Running: ${formatCurrency(airportRunningReservations)}</div>` : ''}</div>
                    </div>
                </div>
            `;

            const relatedHtml = airportTerminals.length === 0
                ? `<div id="related-airport-${airport.id}" class="mta-canonical-related mta-hidden"><small class="text-muted">${t("noTerminals")}</small></div>`
                : `<div id="related-airport-${airport.id}" class="mta-canonical-related mta-hidden">
                    <div class="mta-canonical-related__header">${t("terminalsLabel")} (${airportTerminals.length})</div>
                    ${airportTerminals.map((term, idx) => {
                        const visualIndex = airportTerminals.length - idx;
                        term._visualIndex = visualIndex;
                        const metaphor = getTerminalMetaphor(term);
                        const role = t(metaphor.roleKey);
                        const subtype = metaphor.subtypeKey ? t(metaphor.subtypeKey) : null;
                        const terminalLabel = subtype ? `${role} (${subtype})` : role;
                        // Show planned commitment for THIS terminal only (inbound planned flights)
                        const terminalCommitment = getTerminalPlannedCommitment(term.id, flights);
                        const terminalRunningReservations = airportTerminals
                            .slice(Math.max(0, airportTerminals.length - visualIndex))
                            .reduce((sum, currentTerm) => sum + getTerminalPlannedCommitment(currentTerm.id, flights), 0);
                        const terminalSemaphoreColor = getTerminalSemaphoreColor(term);
                        const terminalSemaphoreMarkup = `<span class="mta-semaphore mta-semaphore--${terminalSemaphoreColor}"></span>`;
                        
                        const termInactiveClass = term.status === 'inactive' ? 'mta-inactive' : '';
                        const termInactiveBadge = term.status === 'inactive' ? `<span class="badge badge-secondary ml-2">${t("inactive")}</span>` : '';

                        return `
                            <div class="mta-canonical-item mta-canonical-item--related ${termInactiveClass}" onclick="event.stopPropagation(); handleCanonicalItemClick('terminal', '${term.id}')">
                                <div class="mta-canonical-item__name"><span class="mta-subitem-index-prefix">#${visualIndex}</span> <span class="mta-details-link" onclick="event.stopPropagation(); showTerminalDetails('${term.id}', 'readonly')">${term.name}</span> ${termInactiveBadge}</div>
                                <div class="mta-canonical-item__line2">
                                    <div class="mta-canonical-item__meta text-muted small">
                                        ${terminalSemaphoreMarkup}
                                        <span>${terminalLabel}</span>
                                    </div>
                                    <div class="mta-canonical-item__actions"><div><strong>${t("reservationsLabel") || "Reservations"}: ${formatCurrency(terminalCommitment)}</strong></div>${viewState.ledgerMode ? `<div class="mta-canonical-item__secondary">Running: ${formatCurrency(terminalRunningReservations)}</div>` : ''}</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                  </div>`;

            return row + relatedHtml;
        }).join('');

        container.innerHTML = html || `<p class="text-muted">${t("noAirports")}</p>`;
    }
};



const renderTerminalFlightsCompact = (terminalId) => {
    const el = document.getElementById(`related-terminal-${terminalId}`);
    if (!el) return;

    const flights = getFlights().filter(f =>
        f.originTerminalId === terminalId || f.destinationTerminalId === terminalId
    );

    if (flights.length === 0) {
        el.innerHTML = `<div class="card card-body p-2"><small class="text-muted">${t("noRelatedFlights")}</small></div>`;
        return;
    }

    const terminals = getTerminals();
    const airports = getAirports();

    const getTerminalName = (termId) => {
        const term = terminals.find(t => t.id === termId);
        if (!term) return t("unknown");
        const airport = airports.find(a => a.id === term.airportId);
        return `${airport?.name || ''} / ${term.name}`;
    };

    const headerHtml = `<div class="d-flex justify-content-between align-items-center mb-2"><div class="mta-canonical-related__section"><strong>${t("flightsLabel")} (${flights.length})</strong></div><div class="mta-canonical-related__actions"></div></div>`;

    const cardsHtml = `<div class="mta-canonical-related mb-2">${flights.map(f => {
        const amount = formatCurrency(f.amount || 0);
        const route = getFlightRouteDisplay(f, terminalById);
        const title = getFlightDisplayTitle(f, terminalById);
        const created = new Date(f.createdAt).toLocaleDateString();
        const status = f.status || t("unknown");
        const statusBadge = {
            'Planned': 'badge-warning',
            'Completed': 'badge-success'
        }[status] || 'badge-secondary';
        const warnings = getRiskWarningsForFlight(f);
        const riskBadge = warnings.length ? ` <span class="badge badge-danger ml-1">${t("risk")}</span>` : '';

        return `
            <div class="mta-canonical-item" data-flight-id="${f.id}" onclick="showFlightDetails('${f.id}')">
                <div class="mta-canonical-item__name">${title}</div>
                <div class="d-flex justify-content-between align-items-center">
                    <div class="mta-canonical-item__meta text-muted small">${route} - ${created}</div>
                    <div class="mta-canonical-item__amount">
                        <span class="badge ${statusBadge} badge-sm">${status}</span>${riskBadge}
                        <strong>${amount}</strong>
                    </div>
                </div>
            </div>
        `;
    }).join('')}</div>`;

    el.innerHTML = headerHtml + cardsHtml;
};

// ============================================================================
// SELECT POPULATION
// ============================================================================
const updateAllSelects = () => {
    const allTerminals = getTerminals();
    const allAirports = getAirports();
    const groups = getPassengerGroups();

    // Filter to active entities only
    const terminals = allTerminals.filter(t => t.status === 'active');
    const airports = allAirports.filter(a => a.status === 'active');

    const originEl = document.getElementById('flight-origin');
    if (originEl) {
        originEl.innerHTML =
            `<option value="">${t("selectOrigin")}</option>` +
            terminals.filter(term => term.type === 'Income' || term.type === 'Transit').map(term => {
                const airport = airports.find(a => a.id === term.airportId) || { name: t("unknown") };
                return `<option value="${term.id}">${airport.name} / ${term.name}</option>`;
            }).join('');
    }

    const destinationEl = document.getElementById('passenger-destination');
    if (destinationEl) {
        destinationEl.innerHTML =
            `<option value="">${t("selectDestination")}</option>` +
            terminals.map(term => {
                const airport = airports.find(a => a.id === term.airportId) || { name: t("unknown") };
                return `<option value="${term.id}">${airport.name} / ${term.name}</option>`;
            }).join('');
    }

    const passengerGroupEl = document.getElementById('passenger-group');
    if (passengerGroupEl) {
        passengerGroupEl.innerHTML =
            `<option value="">${t("selectGroupOrPlanned")}</option>` +
            groups.map(g =>
                `<option value="${g.id}">${g.name} - ${formatCurrency(g.totalAmount)}</option>`
            ).join('');
    }

    const returnDestinationEl = document.getElementById('return-destination-terminal');
    if (returnDestinationEl) {
        const incomeTerminals = terminals.filter(term => term.type === 'Income');
        returnDestinationEl.innerHTML =
            `<option value="">${t("selectDestination")}</option>` +
            incomeTerminals.map(term => {
                const airport = airports.find(a => a.id === term.airportId) || { name: t("unknown") };
                return `<option value="${term.id}">${airport.name} / ${term.name}</option>`;
            }).join('');
    }
};

// ============================================================================
// LEARN TAB RENDERING
// ============================================================================
const renderLearnTab = () => {
    // Quick Start Steps
    const quickstartEl = document.getElementById('quickstart-steps');
    if (quickstartEl) {
        const steps = [1, 2, 3];
        const quickstartHtml = steps.map(step => {
            const id = `quickstart-step-${step}`;
            const titleKey = `ui.learn.quickstart.step${step}.title`;
            const contentKey = `ui.learn.quickstart.step${step}.content`;
            return `
                <div class="learn-item">
                    <div class="learn-item-header" data-target="${id}">
                        <span class="learn-icon">v</span>
                        <span>${t(titleKey)}</span>
                    </div>
                    <div id="${id}" class="learn-item-content mta-hidden">
                        ${t(contentKey)}
                    </div>
                </div>
            `;
        }).join('');
        quickstartEl.innerHTML = quickstartHtml;
        attachLearnItemListeners(quickstartEl);
    }

    // Core Concepts
    const conceptsEl = document.getElementById('core-concepts');
    if (conceptsEl) {
        const concepts = ['arrivals', 'departures', 'reservations', 'credit', 'legs', 'returns'];
        const conceptsHtml = concepts.map(concept => {
            const id = `concept-${concept}`;
            const titleKey = `ui.learn.core.${concept}.title`;
            const contentKey = `ui.learn.core.${concept}.content`;
            return `
                <div class="learn-item">
                    <div class="learn-item-header" data-target="${id}">
                        <span class="learn-icon">v</span>
                        <span>${t(titleKey)}</span>
                    </div>
                    <div id="${id}" class="learn-item-content mta-hidden">
                        ${t(contentKey)}
                    </div>
                </div>
            `;
        }).join('');
        conceptsEl.innerHTML = conceptsHtml;
        attachLearnItemListeners(conceptsEl);
    }

    // How To Read MTA
    const modesEl = document.getElementById('accounting-modes');
    if (modesEl) {
        const modes = ['controlTower', 'sections', 'rule'];
        const modesHtml = modes.map(mode => {
            const id = `mode-${mode}`;
            const titleKey = `ui.learn.reading.${mode}.title`;
            const contentKey = `ui.learn.reading.${mode}.content`;
            return `
                <div class="learn-item">
                    <div class="learn-item-header" data-target="${id}">
                        <span class="learn-icon">v</span>
                        <span>${t(titleKey)}</span>
                    </div>
                    <div id="${id}" class="learn-item-content mta-hidden">
                        ${t(contentKey)}
                    </div>
                </div>
            `;
        }).join('');
        modesEl.innerHTML = modesHtml;
        attachLearnItemListeners(modesEl);
    }
};

const attachLearnItemListeners = (container) => {
    container.querySelectorAll('.learn-item-header').forEach(header => {
        header.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const contentEl = document.getElementById(targetId);
            const iconEl = this.querySelector('.learn-icon');
            
            if (contentEl) {
                const isOpen = !contentEl.classList.contains('mta-hidden');
                if (isOpen) {
                    contentEl.classList.add('mta-hidden');
                    iconEl.textContent = 'v';
                } else {
                    contentEl.classList.remove('mta-hidden');
                    iconEl.textContent = '^';
                }
            }
        });
    });
};

const updateAll = () => {
    syncCurrentLanguageState();
    updateLanguageButtons();
    applyCurrentUIPreferences();
    updateDashboard();
    updateFlightsList();
    updateArrivalsTab();
    updateTerminalsList();
    updateAllSelects();
    renderLearnTab();
    if (typeof window.renderDevData === 'function') {
        window.renderDevData();
    }
    if (typeof window.updateDevDataToggleLabel === 'function') {
        window.updateDevDataToggleLabel();
    }
};

window.updateAll = updateAll;
window.updateAllUI = updateAll;
window.updateArrivalsTab = updateArrivalsTab;
window.updateFlightsList = updateFlightsList;
window.updateTerminalsList = updateTerminalsList;
// ============================================================================
// DETAIL VIEW FUNCTIONS
// ============================================================================
const showFlightDetails = (flightId, mode = 'edit') => {
    const flight = getFlightById(flightId);
    if (!flight) return;

    const terminals = getTerminals();
    const airports = getAirports();
    const childFlights = getFlights().filter(f => f.sourceFlightId === flightId);

    const getTerminalName = (termId) => {
        if (!termId) return t("notSet");
        const term = terminals.find(t => t.id === termId);
        if (!term) return t("unknown");
        const airport = airports.find(a => a.id === term.airportId);
        return `${airport?.name || ''} / ${term.name}`;
    };

    const statusBadge = {
        'Planned': 'warning',
        'Completed': 'success'
    }[flight.status] || 'secondary';

    const groupInfo = flight.passengerGroupId ? (() => {
        const group = getPassengerGroupById(flight.passengerGroupId);
        return `<p><strong>${t("passengerGroup")}: </strong> ${group?.name || t("unknown")}</p>`;
    })() : (mode !== 'readonly' ? `<p><strong>${t("type")}:</strong> ${t("plannedExpenseNoGroup")}</p>
        <button class="btn btn-warning btn-sm" onclick="showAssignGroupForm('${flight.id}')">${t("assignToIncomeGroup")}</button>` : '');

    const warnings = getRiskWarningsForFlight(flight);
    const warningsHtml = warnings.length
        ? `<div class="alert alert-danger"><strong>${t("risk")}:</strong> ${warnings.map(w => w.message).join(' ')}</div>`
        : '';
    const sourceFlightInfo = flight.sourceFlightId ? (() => {
        const sourceFlight = getFlightById(flight.sourceFlightId);
        if (!sourceFlight) {
            return `<p><strong>${t("sourceFlight")}:</strong> ${t("unknown")}</p>`;
        }
        const sourceFlightTitle = sourceFlight.name || t("flight");
        return `<p><strong>${t("sourceFlight")}:</strong> <span class="mta-details-link" style="cursor: pointer;" onclick="showFlightDetails('${sourceFlight.id}', 'readonly')">${sourceFlightTitle}</span></p>`;
    })() : '';

    // PHASE 2A: Return Flight Status Section - only in edit mode
    let returnHtml = '';
    if (mode !== 'readonly') {
        const returnStatus = getFlightReturnStatus(flightId);
        if (returnStatus.isReturnable) {
            const returnBadge = returnStatus.isFullyReturned ? 
                `<span class="badge badge-success">${t("fullyReturned")}</span>` : 
                '';
            returnHtml = `
        <hr>
        <h6>${t("returnFlight")}</h6>
        <p><strong>${t("totalReturned")}:</strong> ${formatCurrency(returnStatus.totalReturned)}</p>
        <p><strong>${t("remainingReturnable")}:</strong> ${formatCurrency(returnStatus.remaining)} ${returnBadge}</p>
        ${returnStatus.isFullyReturned ? '' : `<button class="btn btn-info btn-sm" onclick="showCreateReturnFlightForm('${flight.id}')">${t("createReturn")}</button>`}
        `;
        }
    }

    const canEditFlight = true;
    const canDeleteFlight = window.isDeleteEnabledMode();
    const canModifyStructure = childFlights.length === 0;
    const editButtonHtml = canEditFlight
        ? `<button class="btn btn-primary btn-sm" onclick="showFlightDetails('${flightId}', 'edit')">${t("edit")}</button>`
        : '';
    const deleteButtonHtml = canDeleteFlight
        ? `<button class="btn btn-danger btn-sm" onclick="deleteFlightFromDetails('${flightId}')">${t("delete")}</button>`
        : '';
    const childLegsWarning = !canModifyStructure
        ? `<div class="alert alert-warning small mb-3">This flight has existing legs and cannot be edited or deleted directly.</div>`
        : '';

    if (mode === 'edit') {
        const terminalOptions = terminals.map(term => {
            const airport = airports.find(a => a.id === term.airportId);
            const label = `${airport?.name || ''} / ${term.name}`;
            return `<option value="${term.id}" ${flight.destinationTerminalId === term.id ? 'selected' : ''}>${label}</option>`;
        }).join('');
        const originOptions = [
            `<option value="" ${flight.originTerminalId ? '' : 'selected'}>${t("notSet")}</option>`,
            ...terminals.map(term => {
                const airport = airports.find(a => a.id === term.airportId);
                const label = `${airport?.name || ''} / ${term.name}`;
                return `<option value="${term.id}" ${flight.originTerminalId === term.id ? 'selected' : ''}>${label}</option>`;
            })
        ].join('');

        const html = `
            <h5>${t("flightDetails")}</h5>
            <hr>
            ${childLegsWarning}
            <form id="flight-details-edit-form">
                <div class="form-group">
                    <label><strong>${t("flightId")}</strong></label>
                    <input type="text" class="form-control" value="${flight.id}" readonly>
                </div>
                <div class="form-group">
                    <label><strong>${t("name")}</strong></label>
                    <input type="text" class="form-control" id="flight-details-name" value="${flight.name || ''}" ${!canModifyStructure ? 'disabled' : ''}>
                </div>
                <div class="form-group">
                    <label><strong>${t("status")}</strong></label>
                    <input type="text" class="form-control" value="${flight.status}" readonly>
                </div>
                <div class="form-group">
                    <label><strong>${t("amount")}</strong></label>
                    <input type="number" class="form-control" id="flight-details-amount" step="0.01" value="${flight.amount || 0}" ${!canModifyStructure ? 'disabled' : ''}>
                </div>
                <div class="form-group">
                    <label><strong>${t("date")}</strong></label>
                    <input type="date" class="form-control" id="flight-details-date" value="${String(flight.date || '').slice(0, 10)}" ${!canModifyStructure ? 'disabled' : ''}>
                </div>
                <div class="form-group">
                    <label><strong>${t("departure.ordinal")}</strong></label>
                    <input type="number" class="form-control" id="flight-details-ordinal" min="0" step="1" value="${flight.ordinal ?? 0}" ${!canModifyStructure ? 'disabled' : ''}>
                </div>
                <div class="form-group">
                    <label><strong>${t("origin")}</strong></label>
                    <select class="form-control" id="flight-details-origin" ${!canModifyStructure ? 'disabled' : ''}>${originOptions}</select>
                </div>
                <div class="form-group">
                    <label><strong>${t("destination")}</strong></label>
                    <select class="form-control" id="flight-details-destination" ${!canModifyStructure ? 'disabled' : ''}>${terminalOptions}</select>
                </div>
                ${groupInfo}
                ${sourceFlightInfo}
                <div class="form-group">
                    <label><strong>${t("created")}</strong></label>
                    <input type="text" class="form-control" value="${new Date(flight.createdAt).toLocaleString()}" readonly>
                </div>
                <div class="mta-tools-button-row">
                    ${canModifyStructure ? `<button type="submit" class="btn btn-primary btn-sm">${t("save")}</button>` : ''}
                    <button type="button" class="btn btn-secondary btn-sm" onclick="showFlightDetails('${flightId}', 'readonly')">${t("cancel")}</button>
                </div>
            </form>
        `;

        document.getElementById('details').innerHTML = html;
        document.getElementById('details').classList.remove('mta-hidden');
        document.getElementById('overlay').classList.remove('mta-hidden');

        const form = document.getElementById('flight-details-edit-form');
        if (form && canModifyStructure) {
            form.addEventListener('submit', (event) => {
                event.preventDefault();
                saveFlightDetailsEdit(flightId);
            });
        }
        return;
    }

    const buttonGroup = mode === 'readonly' ? `
        ${editButtonHtml}
        ${deleteButtonHtml}
        <button class="btn btn-secondary btn-sm" onclick="closeDetails()">${t("close")}</button>
    ` : `
        <button class="btn btn-secondary btn-sm" onclick="closeDetails()">${t("close")}</button>
    `;

    const html = `
        <h5>${t("flightDetails")}</h5>
        <hr>
        <p><strong>${t("flightId")}:</strong> ${flight.id}</p>
        <p><strong>${t("name")}:</strong> ${flight.name || t("flight")}</p>
        <p><strong>${t("status")}:</strong> <span class="badge badge-${statusBadge}">${flight.status}</span></p>
        <p><strong>${t("amount")}: </strong> ${formatCurrency(flight.amount || 0)}</p>
        <p><strong>${t("date")}: </strong> ${String(flight.date || '').slice(0, 10) || t("notSet")}</p>
        <p><strong>${t("departure.ordinal")}:</strong> ${flight.ordinal ?? 0}</p>
        ${groupInfo}
        ${sourceFlightInfo}
        <p><strong>${t("origin")}: </strong> ${getOriginDisplayName(flight, terminals, airports)}</p>
        <p><strong>${t("destination")}: </strong> ${getTerminalName(flight.destinationTerminalId)}</p>
        ${childLegsWarning}
        ${warningsHtml}
        ${returnHtml}
        <hr>
        <small class="text-muted">${t("created")}:  ${new Date(flight.createdAt).toLocaleString()}</small>
        <br><br>
        <div class="mta-tools-button-row">${buttonGroup}</div>
    `;

    document.getElementById('details').innerHTML = html;
    document.getElementById('details').classList.remove('mta-hidden');
    document.getElementById('overlay').classList.remove('mta-hidden');
};

window.saveFlightDetailsEdit = (flightId) => {
    try {
        updateFlight(flightId, {
            name: document.getElementById('flight-details-name')?.value || null,
            amount: Number(document.getElementById('flight-details-amount')?.value || 0),
            date: document.getElementById('flight-details-date')?.value || null,
            ordinal: Number(document.getElementById('flight-details-ordinal')?.value || 0),
            originTerminalId: document.getElementById('flight-details-origin')?.value || null,
            destinationTerminalId: document.getElementById('flight-details-destination')?.value || null
        }, { allowCompleted: true });
        showFlightDetails(flightId, 'readonly');
        updateAll();
    } catch (error) {
        showMessage(error.message, 'error');
    }
};

window.deleteFlightFromDetails = (flightId) => {
    if (!window.isDeleteEnabledMode()) return;
    if (!confirm(t('ui.messages.confirmDeleteFlight').replace('{id}', flightId))) {
        return;
    }
    try {
        deleteFlight(flightId, { allowCompleted: true });
        closeDetails();
        updateAll();
    } catch (error) {
        showMessage(error.message, 'error');
    }
};

const showCreateReturnFlightForm = (parentFlightId) => {
    const flight = getFlightById(parentFlightId);
    if (!flight) return;

    const remaining = getRemainingReturnableAmount(parentFlightId);
    
    const html = `
        <h5>${t("createReturn")}</h5>
        <hr>
        <form id="return-flight-form">
            <div class="form-group">
                <label>${t("flight")}:</label>
                <input type="text" class="form-control" value="${flight.name}" disabled>
            </div>
            <div class="form-group">
                <label>${t("remainingReturnable")}:</label>
                <input type="text" class="form-control" value="${formatCurrency(remaining)}" disabled>
            </div>
            <div class="form-group">
                <label>${t("returnAmount")}:</label>
                <input type="number" id="return-amount" class="form-control" placeholder="0.00" step="0.01" min="0.01" max="${remaining}" required>
            </div>
            <hr>
            <button type="submit" class="btn btn-primary btn-sm">${t("createReturn")}</button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="showFlightDetails('${parentFlightId}')">${t("cancel")}</button>
        </form>
    `;

    document.getElementById('details').innerHTML = html;
    
    // Handle form submission
    const form = document.getElementById('return-flight-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const returnAmount = parseFloat(document.getElementById('return-amount').value);
            try {
                createReturnFlight(parentFlightId, returnAmount);
                showMessage(t("returnFlightCreated"));
                closeDetails();
                updateAll();
            } catch (error) {
                showMessage(error.message, 'error');
            }
        });
    }
};

const showGroupDetails = (groupId, mode = 'view') => {
    const group = getPassengerGroupById(groupId);
    if (!group) return;

    const flights = getFlights();
    const terminals = getTerminals();
    
    // Calculate Awaiting: totalAmount - sum of completed Expense flights + sum of Return flights
    const groupFlights = flights.filter(f => f.passengerGroupId === groupId && !f.sourceFlightId);
    let awaiting = group.totalAmount;
    
    groupFlights.forEach(f => {
        const isCompleted = f.status === 'Completed';
        if (isCompleted) {
            const destTerminal = terminals.find(t => t.id === f.destinationTerminalId);
            const originTerminal = terminals.find(t => t.id === f.originTerminalId);
            
            // Return flight: origin is Expense
            if (originTerminal && originTerminal.type === 'Expense') {
                awaiting += (f.amount || 0);
            }
            // Expense flight: destination is Expense (subtract)
            else if (destTerminal && destTerminal.type === 'Expense') {
                awaiting -= (f.amount || 0);
            }
            // Transit flights don't affect awaiting
        }
    });

    const typeLabel = group.type === 'external' ? t('availableFuel') : t('restrictedFuel');
    const landingDate = new Date(group.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const hasEditableCargo = group.type !== 'liability' && Array.isArray(group.cargo) && group.cargo.length > 0;

    if (mode === 'view') {
        // VIEW MODE
        const html = `
            <h5>${t("groupDetails")}</h5>
            <hr>
            <div class="form-group">
                <label class="text-muted small"><strong>${t("type")}</strong></label>
                <p>${typeLabel}</p>
            </div>
            <div class="form-group">
                <label class="text-muted small"><strong>${t("name")}</strong></label>
                <p>${group.name}</p>
            </div>
            ${group.type !== 'liability' ? `
            <div class="form-group">
                <label class="text-muted small"><strong>${t('arrival.groupName')}</strong></label>
                <p>${group.groupName || '-'}</p>
            </div>
            ` : ''}
            <div class="form-group">
                <label class="text-muted small"><strong>${t("arrival.landingDate")}</strong></label>
                <p>${landingDate}</p>
            </div>
            <div class="form-group">
                <label class="text-muted small"><strong>${t("arrival.landedPassengers")}</strong></label>
                <p>${formatCurrency(group.totalAmount)}</p>
            </div>
            <hr>
            <div class="mta-tools-button-row">
                <button class="btn btn-primary btn-sm" onclick="showGroupDetails('${groupId}', 'edit')">${t("edit")}</button>
                ${window.isDeleteEnabledMode() ? `<button class="btn btn-danger btn-sm" onclick="deleteGroup('${groupId}')">${t("delete")}</button>` : ''}
                <button class="btn btn-secondary btn-sm" onclick="closeDetails()">${t("close")}</button>
            </div>
        `;

        document.getElementById('details').innerHTML = html;
        document.getElementById('details').classList.remove('mta-hidden');
        document.getElementById('overlay').classList.remove('mta-hidden');
    } else if (mode === 'edit') {
        // EDIT MODE
        const html = `
            <h5>${t("groupDetails")} - ${t("edit")}</h5>
            <hr>
            <form id="group-edit-form">
                <div class="form-group">
                    <label><strong>${t("type")}</strong> <span class="text-danger">*</span></label>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="edit-group-type" id="edit-type-open" value="external" ${group.type === 'external' ? 'checked' : ''}>
                        <label class="form-check-label" for="edit-type-open">
                            ${t("availableFuel")}
                        </label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="edit-group-type" id="edit-type-liability" value="liability" ${group.type === 'liability' ? 'checked' : ''}>
                        <label class="form-check-label" for="edit-type-liability">
                            ${t("restrictedFuel")}
                        </label>
                    </div>
                </div>
                <div class="form-group">
                    <label><strong>${t("name")}</strong> <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" id="edit-group-name" value="${group.name}" required>
                </div>
                ${group.type !== 'liability' ? `
                <div class="form-group">
                    <label><strong>${t('arrival.groupName')}</strong></label>
                    <input type="text" class="form-control" id="edit-group-group-name" value="${String(group.groupName || '').replace(/"/g, '&quot;')}">
                </div>
                ` : ''}
                <div class="form-group">
                    <label><strong>${t("arrival.landingDate")}</strong></label>
                    <input type="date" class="form-control" id="edit-group-date" value="${new Date(group.createdAt).toISOString().split('T')[0]}">
                </div>
                ${hasEditableCargo ? `
                <div class="form-group">
                    <label><strong>${t('arrival.product')}</strong></label>
                    <div id="edit-arrival-cargo-rows" class="mb-2"></div>
                    <button type="button" class="btn btn-outline-secondary btn-sm" onclick="addEditArrivalCargoRow()">${t('arrival.addCargoRow')}</button>
                </div>
                ` : ''}
                <div class="form-group">
                    <label><strong>${t("arrival.landedPassengers")}</strong> <span class="text-danger">*</span></label>
                    <input type="number" class="form-control" id="edit-group-amount" value="${group.totalAmount}" step="0.01" min="0" required>
                </div>
                <hr>
                <div class="mta-tools-button-row">
                    <button type="button" class="btn btn-primary btn-sm" onclick="saveGroupEdit('${groupId}')">${t("save")}</button>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="showGroupDetails('${groupId}', 'view')">${t("cancel")}</button>
                </div>
            </form>
        `;

        document.getElementById('details').innerHTML = html;
        document.getElementById('details').classList.remove('mta-hidden');
        document.getElementById('overlay').classList.remove('mta-hidden');
        if (hasEditableCargo) {
            window.renderEditArrivalCargoRows(group.cargo);
        }
    }
};

// Save group edits
window.saveGroupEdit = (groupId) => {
    const group = getPassengerGroupById(groupId);
    const name = document.getElementById('edit-group-name').value;
    const typeRadio = document.querySelector('input[name="edit-group-type"]:checked');
    const type = typeRadio?.value;
    const editCargoItems = typeof window.getEditArrivalCargoItems === 'function'
        ? window.getEditArrivalCargoItems()
        : [];
    const cargoPayload = type !== 'liability' && editCargoItems.length > 0 ? editCargoItems : null;
    const cargoTotal = cargoPayload
        ? Number(editCargoItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0).toFixed(2))
        : 0;
    const amount = cargoPayload ? cargoTotal : parseFloat(document.getElementById('edit-group-amount').value);
    const groupName = document.getElementById('edit-group-group-name')?.value || null;

    if (!name) {
        showMessage(t("pleaseEnterGroupName"), 'error');
        return;
    }
    if (!type) {
        showMessage(t("selectType"), 'error');
        return;
    }
    if (!amount || amount <= 0) {
        showMessage(t("insufficientBalance").replace('{available}', '0'), 'error');
        return;
    }

    // Validation: Landed amount must be >= sum of completed expense flights
    const flights = getFlights();
    const terminals = getTerminals();
    const groupFlights = flights.filter(f => f.passengerGroupId === groupId && !f.sourceFlightId);
    let minRequired = 0;
    
    groupFlights.forEach(f => {
        const isCompleted = f.status === 'Completed';
        if (isCompleted) {
            const destTerminal = terminals.find(t => t.id === f.destinationTerminalId);
            if (destTerminal && destTerminal.type === 'Expense') {
                minRequired += (f.amount || 0);
            }
        }
    });

    if (amount < minRequired) {
        showMessage(t("insufficientBalance").replace('{available}', formatCurrency(amount)), 'error');
        return;
    }

    updatePassengerGroup(groupId, { name, type, totalAmount: amount, groupName, cargo: cargoPayload || null });
    showMessage(t("passengerGroupRegistered"));
    closeDetails();
    updateAll();
};

// Delete group
window.deleteGroup = (groupId) => {
    if (!window.isDeleteEnabledMode()) return;
    if (confirm(t('ui.messages.confirmDeleteArrival'))) {
        try {
            deletePassengerGroup(groupId);
            showMessage(t('ui.messages.arrivalDeleted'));
            closeDetails();
            updateAll();
        } catch (error) {
            const message = error && error.message === 'Cannot delete this arrival because flights still depend on its allocated funds. Delete the related flights first or rework allocations before deleting it.'
                ? t('ui.messages.arrivalDeleteBlockedAllocated')
                : error.message;
            showMessage(message, 'error');
        }
    }
};

const showTerminalDetails = (terminalId, mode = 'edit') => {
    const terminal = getTerminalById(terminalId);
    if (!terminal) return;

    const airport = getAirportById(terminal.airportId);

    const metaphor = getTerminalMetaphor(terminal);
    const role = t(metaphor.roleKey);
    const subtype = metaphor.subtypeKey ? t(metaphor.subtypeKey) : null;
    const terminalLabel = subtype ? `${role} (${subtype})` : role;

    const terminalStatus = terminal.status || 'active'; // Default to 'active' for backward compatibility
    const statusBadge = terminalStatus === 'active' ? 'success' : 'secondary';
    const returnableText = terminal.returnable ? `<span class="badge badge-info">${t("returnable")}</span>` : '';

    const html = `
        <h5>${t("terminalDetails")}</h5>
        <hr>
        <p><strong>${t("name")}:</strong> ${terminal.name}</p>
        <p><strong>${t("alias")}:</strong> <code>${terminal.alias}</code></p>
        <p><strong>${t("airport")}:</strong> ${airport?.name || t("unknown")}</p>
        <p><strong>${t("type")}:</strong> ${terminal.type}</p>
        <p><strong>${t("role")}:</strong> ${terminalLabel}</p>
        <p><strong>${t("status")}:</strong> <span class="badge badge-${statusBadge}">${terminalStatus}</span> ${returnableText}</p>
        <p><strong>${t("isDefault")}:</strong> ${terminal.isDefault ? t("yes") : t("no")}</p>
        <hr>
        <small class="text-muted">${t("created")}: ${new Date(terminal.createdAt).toLocaleString()}</small>
        <br><br>
        <div class="mta-tools-button-row">
            <button class="btn btn-primary btn-sm" onclick="showEditTerminalForm('${terminalId}')">${t("edit")}</button>
            ${window.isDeleteEnabledMode() ? `<button class="btn btn-danger btn-sm" onclick="handleDeleteTerminal('${terminalId}', '${terminal.name.replace(/'/g, "\\'")}')">${t("delete")}</button>` : ''}
            <button class="btn btn-secondary btn-sm" onclick="closeDetails()">${t("close")}</button>
        </div>
    `;

    document.getElementById('details').innerHTML = html;
    document.getElementById('details').classList.remove('mta-hidden');
    document.getElementById('overlay').classList.remove('mta-hidden');
};

const showAirportDetails = (airportId, mode = 'edit') => {
    const airport = getAirportById(airportId);
    if (!airport) return;
    
    const airportStatus = airport.status || 'active'; // Default to 'active' for backward compatibility
    const statusBadge = airportStatus === 'active' ? 'success' : 'secondary';

    const html = `
        <h5>${t("airportDetails")}</h5>
        <hr>
        <p><strong>${t("name")}:</strong> ${airport.name}</p>
        <p><strong>${t("type")}:</strong> ${airport.type || 'standard'}</p>
        <p><strong>${t("status")}:</strong> <span class="badge badge-${statusBadge}">${airportStatus}</span></p>
        <hr>
        <small class="text-muted">${t("created")}: ${new Date(airport.createdAt).toLocaleString()}</small>
        <br><br>
        <div class="mta-tools-button-row">
            <button class="btn btn-primary btn-sm" onclick="showEditAirportForm('${airportId}')">${t("edit")}</button>
            ${window.isDeleteEnabledMode() ? `<button class="btn btn-danger btn-sm" onclick="handleDeleteAirport('${airportId}', '${airport.name.replace(/'/g, "\\'")}')">${t("delete")}</button>` : ''}
            <button class="btn btn-secondary btn-sm" onclick="closeDetails()">${t("close")}</button>
        </div>
    `;

    document.getElementById('details').innerHTML = html;
    document.getElementById('details').classList.remove('mta-hidden');
    document.getElementById('overlay').classList.remove('mta-hidden');
};

const closeDetails = () => {
    document.getElementById('details').classList.add('mta-hidden');
    document.getElementById('overlay').classList.add('mta-hidden');
};

window.showFlightDetails = showFlightDetails;
window.showGroupDetails = showGroupDetails;
window.showTerminalDetails = showTerminalDetails;
window.showAirportDetails = showAirportDetails;
window.showCreateReturnFlightForm = showCreateReturnFlightForm;
window.closeDetails = closeDetails;
window.toggleItemExpansion = toggleItemExpansion;

const showAssignGroupForm = (flightId) => {
    const flight = getFlightById(flightId);
    if (!flight) return;

    const groups = getPassengerGroups();

    const html = `
        <h5>${t("assignPlannedFlightToGroup")}</h5>
        <hr>
        <p>${t("amount")}:  <strong>${formatCurrency(flight.amount || 0)}</strong></p>
        <p>${t("currentStatus")}: <span class="badge badge-warning">${t("planned")}</span></p>
        <hr>
        <div class="form-group">
            <label><strong>${t("finalAmount")}: </strong></label>
            <input type="number" class="form-control" id="assign-final-amount"
                   placeholder="${t("enterFinalAmount")}" value="${flight.amount || 0}" step="0.01" min="0">
        </div>
        <div class="form-group">
            <label><strong>${t("selectPassengerGroup")}: </strong></label>
            <select class="form-control" id="assign-group-select">
                <option value="">${t("selectIncomeGroup")}</option>
                ${groups.map(g => `<option value="${g.id}">${g.name} - ${formatCurrency(g.totalAmount)}</option>`).join('')}
            </select>
        </div>
        <hr>
        <button class="btn btn-secondary btn-sm" onclick="closeDetails()">${t("cancel")}</button>
        <button class="btn btn-primary btn-sm" onclick="assignFlightToGroup('${flightId}')">${t("assign")}</button>
    `;

    document.getElementById('details').innerHTML = html;
};

window.showAssignGroupForm = showAssignGroupForm;

// Buy Return Ticket Handler
window.showBuyReturnTicketForm = (terminalId) => {
    const terminal = getTerminalById(terminalId);
    const airport = getAirportById(terminal.airportId);
    const groups = getPassengerGroups();
    const allTerminals = getTerminals();
    const allAirports = getAirports();

    // Filter to active terminals and airports
    const terminals = allTerminals.filter(t => t.status === 'active');
    const airports = allAirports.filter(a => a.status === 'active');

    const balance = getMoneyAtTerminal(terminalId);

    document.getElementById('return-terminal-id').value = terminalId;
    document.getElementById('return-terminal-name').textContent = `${airport.name} / ${terminal.name}`;
    document.getElementById('return-terminal-balance').textContent = formatCurrency(balance);
    document.getElementById('return-amount').max = balance;
    document.getElementById('return-amount').value = '';
    document.getElementById('return-amount').focus();

    const eligibleGroups = groups.filter(g => g.type === 'external');
    document.getElementById('return-group-select').innerHTML =
        `<option value="">${t("selectGroup")}</option>` +
        eligibleGroups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');

    const incomeTerminals = terminals.filter(term => term.type === 'Income');
    const destinationSelect = document.getElementById('return-destination-terminal');
    if (destinationSelect) {
        destinationSelect.innerHTML =
            `<option value="">${t("selectDestination")}</option>` +
            incomeTerminals.map(term => {
                const destAirport = airports.find(a => a.id === term.airportId) || { name: t("unknown") };
                return `<option value="${term.id}">${destAirport.name} / ${term.name}</option>`;
            }).join('');
    }

    showPopup('buy-return-ticket-popup');
};

window.toggleReturnGroupFields = () => {
    const option = document.querySelector('input[name="group-option"]:checked').value;
    const existingField = document.getElementById('return-existing-group-field');
    const newField = document.getElementById('return-new-group-field');
    
    if (existingField) {
        option === 'existing' ? existingField.classList.remove('mta-hidden') : existingField.classList.add('mta-hidden');
    }
    if (newField) {
        option === 'new' ? newField.classList.remove('mta-hidden') : newField.classList.add('mta-hidden');
    }
};

// ============================================================================
// v1 UI STATE MANAGEMENT - ControlTower & Learn sections
// ============================================================================

const UIState = {
    expandedRows: new Set(),
    terminalViewMode: 'terminals',
    accountingMode: 'monthly',
    scrollPositions: {},
    
    toggleRowExpanded: function(rowId) {
        if (this.expandedRows.has(rowId)) {
            this.expandedRows.delete(rowId);
        } else {
            this.expandedRows.add(rowId);
        }
        this.save();
    },
    
    isRowExpanded: function(rowId) {
        return this.expandedRows.has(rowId);
    },
    
    clearExpandedRows: function() {
        this.expandedRows.clear();
        this.save();
    },
    
    toggleTerminalView: function() {
        this.terminalViewMode = this.terminalViewMode === 'terminals' ? 'airports' : 'terminals';
        this.save();
    },
    
    setTerminalViewMode: function(mode) {
        if (mode === 'terminals' || mode === 'airports') {
            this.terminalViewMode = mode;
            this.save();
        }
    },
    
    toggleAccountingMode: function() {
        this.accountingMode = this.accountingMode === 'monthly' ? 'annual' : 'monthly';
        this.save();
    },
    
    setAccountingMode: function(mode) {
        if (mode === 'monthly' || mode === 'annual') {
            this.accountingMode = mode;
            this.save();
        }
    },
    
    saveScrollPosition: function(sectionId, offset) {
        this.scrollPositions[sectionId] = offset;
    },
    
    getScrollPosition: function(sectionId) {
        return this.scrollPositions[sectionId] || 0;
    },
    
    save: function() {
        const state = {
            expandedRows: Array.from(this.expandedRows),
            terminalViewMode: this.terminalViewMode,
            accountingMode: this.accountingMode,
            scrollPositions: this.scrollPositions
        };
        localStorage.setItem('mtaUIState', JSON.stringify(state));
    },
    
    load: function() {
        try {
            const saved = localStorage.getItem('mtaUIState');
            if (saved) {
                const state = JSON.parse(saved);
                this.expandedRows = new Set(state.expandedRows || []);
                this.terminalViewMode = state.terminalViewMode || 'terminals';
                this.accountingMode = state.accountingMode || 'monthly';
                this.scrollPositions = state.scrollPositions || {};
            }
        } catch (error) {
            console.warn('Failed to load UI state:', error);
        }
    },
    
    reset: function() {
        this.expandedRows.clear();
        this.terminalViewMode = 'terminals';
        this.accountingMode = 'monthly';
        this.scrollPositions = {};
        localStorage.removeItem('mtaUIState');
    }
};

UIState.load();

// ============================================================================
// UI COMPONENT HELPERS
// ============================================================================

const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    } catch {
        return dateString;
    }
};

const getI18nString = (key) => {
    if (typeof window.t === 'function') {
        return window.t(key);
    }
    return key;
};

// ============================================================================
// CANONICAL ITEM ROW COMPONENT
// ============================================================================

const createItemRow = (options) => {
    const {
        id,
        name,
        date,
        amount,
        isFormatted = false,
        isExpanded = false,
        onExpand,
        hasChildren = false,
        actions = []
    } = options;
    
    const row = document.createElement('div');
    row.className = 'mta-item-row';
    row.id = `row-${id}`;
    row.dataset.rowId = id;
    
    // Expand icon (left)
    const expandContainer = document.createElement('div');
    expandContainer.className = 'mta-item-row__expand';
    
    if (hasChildren) {
        const expandIcon = document.createElement('button');
        expandIcon.className = 'mta-icon-button mta-expand-toggle';
        expandIcon.setAttribute('aria-expanded', isExpanded.toString());
        expandIcon.setAttribute('aria-label', getI18nString(`ui.expand.toggle`));
        expandIcon.innerHTML = isExpanded ? '^' : 'v';
        expandIcon.onclick = (e) => {
            e.stopPropagation();
            if (onExpand) onExpand(id);
        };
        expandContainer.appendChild(expandIcon);
    } else {
        expandContainer.innerHTML = '<span class="mta-expand-icon"></span>';
    }
    row.appendChild(expandContainer);
    
    // Name
    const nameCell = document.createElement('div');
    nameCell.className = 'mta-item-row__name';
    nameCell.textContent = name;
    row.appendChild(nameCell);
    
    // Date
    if (date) {
        const dateCell = document.createElement('div');
        dateCell.className = 'mta-item-row__date';
        dateCell.textContent = isFormatted ? date : formatDate(date);
        row.appendChild(dateCell);
    }
    
    // Amount
    if (amount !== undefined && amount !== null) {
        const amountCell = document.createElement('div');
        amountCell.className = 'mta-item-row__amount';
        amountCell.textContent = isFormatted ? amount : formatCurrency(amount);
        row.appendChild(amountCell);
    }
    
    // Actions (right)
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'mta-item-row__actions';
    
    const visibleActions = actions.slice(0, 3);
    const overflowActions = actions.slice(3);
    
    visibleActions.forEach(action => {
        const btn = document.createElement('button');
        btn.className = 'mta-icon-button';
        btn.setAttribute('aria-label', getI18nString(action.ariaLabel));
        btn.setAttribute('title', getI18nString(action.tooltip));
        btn.innerHTML = action.icon || '...';
        btn.onclick = (e) => {
            e.stopPropagation();
            if (action.onClick) action.onClick(id);
        };
        actionsContainer.appendChild(btn);
    });
    
    if (overflowActions.length > 0) {
        const overflowBtn = document.createElement('button');
        overflowBtn.className = 'mta-icon-button mta-overflow-menu';
        overflowBtn.setAttribute('aria-label', getI18nString('ui.actions.more'));
        overflowBtn.innerHTML = '...';
        
        const menu = document.createElement('div');
        menu.className = 'mta-overflow-menu__content';
        menu.style.display = 'none';
        
        overflowActions.forEach(action => {
            const item = document.createElement('button');
            item.className = 'mta-overflow-menu__item';
            item.innerHTML = action.icon + ' ' + getI18nString(action.tooltip);
            item.onclick = (e) => {
                e.stopPropagation();
                menu.style.display = 'none';
                if (action.onClick) action.onClick(id);
            };
            menu.appendChild(item);
        });
        
        overflowBtn.onclick = (e) => {
            e.stopPropagation();
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        };
        
        actionsContainer.appendChild(overflowBtn);
        actionsContainer.appendChild(menu);
    }
    
    row.appendChild(actionsContainer);
    return row;
};

// ============================================================================
// EXPANDABLE SECTION COMPONENT
// ============================================================================

const createExpandableSection = (options) => {
    const {
        id,
        title,
        items = [],
        primaryAction,
        secondaryAction,
        renderItem,
        isExpanded = false,
        onToggleExpand
    } = options;
    
    const section = document.createElement('section');
    section.className = 'mta-section expandable-section';
    section.id = `section-${id}`;
    section.dataset.sectionId = id;
    
    // Header
    const header = document.createElement('header');
    header.className = 'mta-section__header';
    
    const titleEl = document.createElement('h2');
    titleEl.className = 'mta-section__title';
    titleEl.textContent = typeof title === 'string' ? title : getI18nString(title);
    header.appendChild(titleEl);
    
    const headerActions = document.createElement('div');
    headerActions.className = 'mta-section__header-actions';
    
    if (secondaryAction) {
        const secondaryBtn = document.createElement('button');
        secondaryBtn.className = 'mta-icon-button mta-section__secondary-action';
        secondaryBtn.setAttribute('aria-label', getI18nString(secondaryAction.ariaLabel));
        secondaryBtn.setAttribute('title', getI18nString(secondaryAction.tooltip));
        secondaryBtn.innerHTML = secondaryAction.icon || '-';
        secondaryBtn.onclick = (e) => {
            e.stopPropagation();
            if (secondaryAction.onClick) secondaryAction.onClick();
        };
        headerActions.appendChild(secondaryBtn);
    }
    
    if (primaryAction) {
        const primaryBtn = document.createElement('button');
        primaryBtn.className = 'mta-icon-button mta-section__primary-action';
        primaryBtn.setAttribute('aria-label', getI18nString(primaryAction.ariaLabel));
        primaryBtn.setAttribute('title', getI18nString(primaryAction.tooltip));
        primaryBtn.innerHTML = primaryAction.icon || '+';
        primaryBtn.onclick = (e) => {
            e.stopPropagation();
            if (primaryAction.onClick) primaryAction.onClick();
        };
        headerActions.appendChild(primaryBtn);
    }
    
    header.appendChild(headerActions);
    section.appendChild(header);
    
    // Content
    const content = document.createElement('div');
    content.className = 'mta-section__content';
    
    const list = document.createElement('div');
    list.className = 'mta-item-list';
    
    items.forEach(itemConfig => {
        let itemEl;
        if (renderItem && typeof renderItem === 'function') {
            itemEl = renderItem(itemConfig);
        } else {
            itemEl = createItemRow(itemConfig);
        }
        list.appendChild(itemEl);
    });
    
    if (items.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'mta-list-empty';
        empty.textContent = getI18nString('ui.noItems');
        list.appendChild(empty);
    }
    
    content.appendChild(list);
    section.appendChild(content);
    
    return section;
};

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

const createStatCard = (options) => {
    const {
        title,
        value,
        unit = 'currency',
        icon = '+'
    } = options;
    
    const card = document.createElement('div');
    card.className = 'mta-stat-card';
    
    const iconEl = document.createElement('span');
    iconEl.className = 'mta-stat-card__icon';
    iconEl.textContent = icon;
    card.appendChild(iconEl);
    
    const titleEl = document.createElement('h3');
    titleEl.className = 'mta-stat-card__title';
    titleEl.textContent = typeof title === 'string' ? title : getI18nString(title);
    card.appendChild(titleEl);
    
    const valueEl = document.createElement('div');
    valueEl.className = 'mta-stat-card__value';
    if (unit === 'currency') {
        valueEl.textContent = formatCurrency(value);
    } else {
        valueEl.textContent = typeof value === 'number' ? value.toLocaleString() : value;
    }
    card.appendChild(valueEl);
    
    return card;
};

// ============================================================================
// CONTROLTOWER RENDERING FUNCTIONS
// ============================================================================

const renderStatsSection = () => {
    const container = document.createElement('section');
    container.className = 'mta-stats-section';
    container.id = 'stats-section';
    
    const header = document.createElement('h2');
    header.className = 'mta-section__title';
    header.textContent = getI18nString('ui.controlTower.stats');
    container.appendChild(header);
    
    const grid = document.createElement('div');
    grid.className = 'mta-stats-grid';
    
    const { groups, terminals, filteredFlights } = getDashboardMetricsSnapshot();
    
    let waitingValue = 0;
    if (typeof calculateWaitingPassengers === 'function') {
        waitingValue = calculateWaitingPassengers(terminals, filteredFlights);
    }
    grid.appendChild(createStatCard({
        title: 'ui.stats.waitingPassengers',
        value: waitingValue,
        unit: 'currency',
        icon: '<'
    }));
    
    let oneWayValue = 0;
    if (typeof calculateOneWayTravelers === 'function') {
        oneWayValue = calculateOneWayTravelers(terminals, filteredFlights);
    }
    grid.appendChild(createStatCard({
        title: 'ui.stats.oneWayTravelers',
        value: oneWayValue,
        unit: 'currency',
        icon: '>'
    }));

    let roundtripValue = 0;
    if (typeof calculateRoundtripTravelers === 'function') {
        roundtripValue = calculateRoundtripTravelers(terminals, filteredFlights);
    }
    grid.appendChild(createStatCard({
        title: 'ui.stats.roundtripTravelers',
        value: roundtripValue,
        unit: 'currency',
        icon: '^'
    }));

    let returnedValue = 0;
    if (typeof calculateReturnedTravelers === 'function') {
        returnedValue = calculateReturnedTravelers(terminals, filteredFlights);
    }
    grid.appendChild(createStatCard({
        title: 'ui.stats.returnedTravelers',
        value: returnedValue,
        unit: 'currency',
        icon: '↺'
    }));
    
    let confirmedValue = 0, scheduledValue = 0;
    if (typeof calculatePlannedSpending === 'function') {
        confirmedValue = calculatePlannedSpending(groups, filteredFlights);
    }
    const reservationCard = document.createElement('div');
    reservationCard.className = 'mta-stat-card';
    reservationCard.innerHTML = `
        <span class="mta-stat-card__icon">$</span>
        <h3 class="mta-stat-card__title">${getI18nString('ui.stats.reservations')}</h3>
        <div class="mta-stat-card__value">
            <div>${getI18nString('ui.stats.confirmed')}: ${confirmedValue}</div>
            <div>${getI18nString('ui.stats.scheduled')}: ${scheduledValue}</div>
        </div>
    `;
    grid.appendChild(reservationCard);
    
    container.appendChild(grid);
    return container;
};

const renderArrivalsSection = () => {
    const groups = getPassengerGroups();
    const flights = getFlights();
    const terminals = getTerminals();
    
    const items = groups.map(group => {
        // PHASE 2B: Get flights with running balances
        const groupFlights = getPassengerGroupLedgerWithBalances(group.id);
        const sortedFlights = groupFlights.sort((a, b) => {
            const aDate = new Date(a.date || a.createdAt).getTime();
            const bDate = new Date(b.date || b.createdAt).getTime();
            return bDate - aDate;
        });
        
        return {
            id: `group-${group.id}`,
            name: group.name,
            amount: group.totalAmount,
            date: null,
            hasChildren: sortedFlights.length > 0,
            isExpanded: UIState.isRowExpanded(`group-${group.id}`),
            onExpand: (id) => {
                UIState.toggleRowExpanded(id);
                renderControlTower();
            },
            childrenContent: sortedFlights.map(flight => {
                // Format date with HH:MM in DD/MM/YY format
                const flightDate = new Date(flight.date || flight.createdAt);
                const shortYear = String(flightDate.getFullYear()).slice(-2);
                const dateStr = `${flightDate.getDate()}/${flightDate.getMonth() + 1}/${shortYear} ${String(flightDate.getHours()).padStart(2, '0')}:${String(flightDate.getMinutes()).padStart(2, '0')}`;
                
                // Format amount with running balance: $100 ($100)
                const flightAmountFormatted = formatCurrency(flight.amount);
                const runningBalanceFormatted = flight.status === 'Completed' && flight._runningBalance !== undefined 
                    ? formatCurrency(flight._runningBalance)
                    : null;
                
                // Create display string: $100 ($200)
                const displayAmount = runningBalanceFormatted !== null 
                    ? `${flightAmountFormatted} (${runningBalanceFormatted})`
                    : flightAmountFormatted;
                
                return {
                    id: `flight-${flight.id}`,
                    name: flight.name,
                    date: dateStr,
                    amount: displayAmount,
                    isFormatted: true,
                    hasChildren: false,
                    actions: [
                        { icon: 'E', tooltip: 'ui.actions.edit', ariaLabel: 'ui.actions.edit', onClick: (id) => console.log('Edit:', id) },
                        { icon: 'X', tooltip: 'ui.actions.delete', ariaLabel: 'ui.actions.delete', onClick: (id) => console.log('Delete:', id) }
                    ]
                };
            })
        };
    });
    
    return createExpandableSection({
        id: 'arrivals',
        title: 'ui.controlTower.arrivals',
        items: items,
        primaryAction: {
            icon: '+',
            tooltip: 'ui.actions.createNew',
            ariaLabel: 'ui.actions.createNew',
            onClick: () => console.log('Create new arrival')
        },
        renderItem: (config) => {
            const row = createItemRow({
                id: config.id,
                name: config.name,
                date: config.date,
                amount: config.amount,
                isFormatted: config.isFormatted,
                hasChildren: config.hasChildren,
                isExpanded: config.isExpanded,
                onExpand: config.onExpand,
                actions: [
                    { icon: 'E', tooltip: 'ui.actions.edit', ariaLabel: 'ui.actions.edit', onClick: (id) => console.log('Edit:', id) },
                    { icon: 'X', tooltip: 'ui.actions.delete', ariaLabel: 'ui.actions.delete', onClick: (id) => console.log('Delete:', id) }
                ]
            });
            
            if (config.isExpanded && config.childrenContent && config.childrenContent.length > 0) {
                const childrenContainer = document.createElement('div');
                childrenContainer.className = 'mta-item-children';
                config.childrenContent.forEach(child => {
                    const childRow = createItemRow(child);
                    childRow.style.marginLeft = '2em';
                    childrenContainer.appendChild(childRow);
                });
                const wrapper = document.createElement('div');
                wrapper.appendChild(row);
                wrapper.appendChild(childrenContainer);
                return wrapper;
            }
            return row;
        }
    });
};

const renderDeparturesSection = () => {
    const flights = getFlights();
    const terminals = getTerminals();
    
    const rootFlights = flights.filter(f => f.sourceFlightId === null)
        .sort((a, b) => {
            const aDate = new Date(a.date || a.createdAt).getTime();
            const bDate = new Date(b.date || b.createdAt).getTime();
            return bDate - aDate;
        });
    
    const items = rootFlights.map(flight => {
        const children = flights.filter(f => f.sourceFlightId === flight.id)
            .sort((a, b) => {
                const aDate = new Date(a.date || a.createdAt).getTime();
                const bDate = new Date(b.date || b.createdAt).getTime();
                return bDate - aDate;
            });
        
        let rolledForwardState = null;
        if (typeof deriveRolledForwardState === 'function') {
            rolledForwardState = deriveRolledForwardState(flight.id, flights);
        }
        
        const displayName = flight.name + (rolledForwardState === 'RolledForward' ? ' [RF]' : '');
        
        return {
            id: `flight-${flight.id}`,
            name: displayName,
            date: flight.date || flight.createdAt,
            amount: flight.amount,
            hasChildren: children.length > 0,
            isExpanded: UIState.isRowExpanded(`flight-${flight.id}`),
            onExpand: (id) => {
                UIState.toggleRowExpanded(id);
                renderControlTower();
            },
            childrenContent: children.map(child => {
                let childState = null;
                if (typeof isActivePlanned === 'function') {
                    if (isActivePlanned(child.id, flights)) {
                        childState = 'ActivePlanned';
                    }
                }
                const childName = child.name + (childState === 'ActivePlanned' ? ' [AP]' : '');
                
                return {
                    id: `flight-${child.id}`,
                    name: childName,
                    date: child.date || child.createdAt,
                    amount: child.amount,
                    hasChildren: false,
                    actions: [
                        { icon: 'E', tooltip: 'ui.actions.edit', ariaLabel: 'ui.actions.edit', onClick: (id) => console.log('Edit:', id) },
                        { icon: 'X', tooltip: 'ui.actions.delete', ariaLabel: 'ui.actions.delete', onClick: (id) => console.log('Delete:', id) }
                    ]
                };
            })
        };
    });
    
    return createExpandableSection({
        id: 'departures',
        title: 'ui.controlTower.departures',
        items: items,
        primaryAction: {
            icon: '+',
            tooltip: 'ui.actions.createNew',
            ariaLabel: 'ui.actions.createNew',
            onClick: () => console.log('Create new departure')
        },
        renderItem: (config) => {
            const row = createItemRow({
                id: config.id,
                name: config.name,
                date: config.date,
                amount: config.amount,
                hasChildren: config.hasChildren,
                isExpanded: config.isExpanded,
                onExpand: config.onExpand,
                actions: [
                    { icon: 'E', tooltip: 'ui.actions.edit', ariaLabel: 'ui.actions.edit', onClick: (id) => console.log('Edit:', id) },
                    { icon: '+L', tooltip: 'ui.actions.addSubflight', ariaLabel: 'ui.actions.addSubflight', onClick: (id) => console.log('Add subflight:', id) },
                    { icon: 'X', tooltip: 'ui.actions.delete', ariaLabel: 'ui.actions.delete', onClick: (id) => console.log('Delete:', id) }
                ]
            });
            
            if (config.isExpanded && config.childrenContent && config.childrenContent.length > 0) {
                const childrenContainer = document.createElement('div');
                childrenContainer.className = 'mta-item-children';
                config.childrenContent.forEach(child => {
                    const childRow = createItemRow(child);
                    childRow.style.marginLeft = '2em';
                    childrenContainer.appendChild(childRow);
                });
                const wrapper = document.createElement('div');
                wrapper.appendChild(row);
                wrapper.appendChild(childrenContainer);
                return wrapper;
            }
            return row;
        }
    });
};

const renderTerminalsSection = () => {
    const isTerminalView = UIState.terminalViewMode === 'terminals';
    return isTerminalView ? renderTerminalsView() : renderAirportsView();
};

const renderTerminalsView = () => {
    const terminals = getTerminals();
    const flights = getFlights();
    const airports = getAirports();
    
    const items = terminals.map(terminal => {
        let balance = 0;
        if (typeof calculateTerminalBalance === 'function') {
            balance = calculateTerminalBalance(terminal.id, flights);
        }
        
        const relatedFlights = flights.filter(f =>
            f.originTerminalId === terminal.id || f.destinationTerminalId === terminal.id
        ).sort((a, b) => {
            const aDate = new Date(a.date || a.createdAt).getTime();
            const bDate = new Date(b.date || b.createdAt).getTime();
            return bDate - aDate;
        });
        
        const airport = airports.find(a => a.id === terminal.airportId);
        const terminalName = `${airport ? airport.name + ' ' : ''}${terminal.name}${terminal.isDefault ? ' [DEFAULT]' : ''}`;
        
        return {
            id: `terminal-${terminal.id}`,
            name: terminalName,
            date: null,
            amount: balance,
            hasChildren: relatedFlights.length > 0,
            isExpanded: UIState.isRowExpanded(`terminal-${terminal.id}`),
            onExpand: (id) => {
                UIState.toggleRowExpanded(id);
                renderControlTower();
            },
            childrenContent: relatedFlights.map(flight => {
                const direction = flight.originTerminalId === terminal.id ? '->' : '<-';
                return {
                    id: `flight-${flight.id}`,
                    name: `${direction} ${flight.name}`,
                    date: flight.date || flight.createdAt,
                    amount: flight.amount,
                    hasChildren: false,
                    actions: [
                        { icon: 'E', tooltip: 'ui.actions.edit', ariaLabel: 'ui.actions.edit', onClick: (id) => console.log('Edit:', id) }
                    ]
                };
            })
        };
    });
    
    return createExpandableSection({
        id: 'terminals',
        title: 'ui.controlTower.terminals',
        items: items,
        primaryAction: {
            icon: '+',
            tooltip: 'ui.actions.createNew',
            ariaLabel: 'ui.actions.createNew',
            onClick: () => console.log('Create new terminal')
        },
        secondaryAction: {
            icon: '-' ,
            tooltip: 'ui.toggleView.airports',
            ariaLabel: 'ui.toggleView.airports',
            onClick: () => {
                UIState.toggleTerminalView();
                renderControlTower();
            }
        },
        renderItem: (config) => {
            const row = createItemRow({
                id: config.id,
                name: config.name,
                date: config.date,
                amount: config.amount,
                hasChildren: config.hasChildren,
                isExpanded: config.isExpanded,
                onExpand: config.onExpand,
                actions: [
                    { icon: 'E', tooltip: 'ui.actions.edit', ariaLabel: 'ui.actions.edit', onClick: (id) => console.log('Edit:', id) }
                ]
            });
            
            if (config.isExpanded && config.childrenContent && config.childrenContent.length > 0) {
                const childrenContainer = document.createElement('div');
                childrenContainer.className = 'mta-item-children';
                config.childrenContent.forEach(child => {
                    const childRow = createItemRow(child);
                    childRow.style.marginLeft = '2em';
                    childrenContainer.appendChild(childRow);
                });
                const wrapper = document.createElement('div');
                wrapper.appendChild(row);
                wrapper.appendChild(childrenContainer);
                return wrapper;
            }
            return row;
        }
    });
};

const renderAirportsView = () => {
    const airports = getAirports();
    const terminals = getTerminals();
    
    const items = airports.map(airport => {
        const airportTerminals = terminals.filter(t => t.airportId === airport.id);
        
        return {
            id: `airport-${airport.id}`,
            name: airport.name,
            date: null,
            amount: null,
            hasChildren: airportTerminals.length > 0,
            isExpanded: UIState.isRowExpanded(`airport-${airport.id}`),
            onExpand: (id) => {
                UIState.toggleRowExpanded(id);
                renderControlTower();
            },
            childrenContent: airportTerminals.map(terminal => ({
                id: `terminal-${terminal.id}`,
                name: `${terminal.name}${terminal.isDefault ? ' [DEFAULT]' : ''}`,
                date: null,
                amount: null,
                hasChildren: false,
                actions: [
                    { icon: 'E', tooltip: 'ui.actions.edit', ariaLabel: 'ui.actions.edit', onClick: (id) => console.log('Edit:', id) }
                ]
            }))
        };
    });
    
    return createExpandableSection({
        id: 'airports',
        title: 'ui.controlTower.airports',
        items: items,
        primaryAction: {
            icon: '+',
            tooltip: 'ui.actions.createNew',
            ariaLabel: 'ui.actions.createNew',
            onClick: () => console.log('Create new airport')
        },
        secondaryAction: {
            icon: '-',
            tooltip: 'ui.toggleView.terminals',
            ariaLabel: 'ui.toggleView.terminals',
            onClick: () => {
                UIState.toggleTerminalView();
                renderControlTower();
            }
        },
        renderItem: (config) => {
            const row = createItemRow({
                id: config.id,
                name: config.name,
                date: config.date,
                amount: config.amount,
                hasChildren: config.hasChildren,
                isExpanded: config.isExpanded,
                onExpand: config.onExpand,
                actions: []
            });
            
            if (config.isExpanded && config.childrenContent && config.childrenContent.length > 0) {
                const childrenContainer = document.createElement('div');
                childrenContainer.className = 'mta-item-children';
                config.childrenContent.forEach(child => {
                    const childRow = createItemRow(child);
                    childRow.style.marginLeft = '2em';
                    childrenContainer.appendChild(childRow);
                });
                const wrapper = document.createElement('div');
                wrapper.appendChild(row);
                wrapper.appendChild(childrenContainer);
                return wrapper;
            }
            return row;
        }
    });
};

const renderLearnSection = () => {
    const container = document.createElement('section');
    container.className = 'mta-section learn-section';
    container.id = 'learn-section';
    
    const header = document.createElement('h2');
    header.className = 'mta-section__title';
    header.textContent = getI18nString('ui.learn.title');
    container.appendChild(header);
    
    // QuickStart
    const createLearnSubsection = (title, items) => {
        const sub = document.createElement('div');
        sub.className = 'mta-learn-subsection';
        
        const subTitle = document.createElement('h3');
        subTitle.className = 'mta-learn-subsection__title';
        subTitle.textContent = getI18nString(title);
        sub.appendChild(subTitle);
        
        const list = document.createElement('div');
        list.className = 'mta-learn-list';
        
        items.forEach((item, idx) => {
            const itemId = `${title}-${idx}`;
            const isExpanded = UIState.isRowExpanded(itemId);
            
            const btn = document.createElement('button');
            btn.className = 'mta-learn-item';
            btn.setAttribute('aria-expanded', isExpanded.toString());
            btn.innerHTML = `<span class="mta-learn-item__expand">${isExpanded ? '^' : 'v'}</span><span class="mta-learn-item__title">${getI18nString(item.title)}</span>`;
            btn.onclick = () => {
                UIState.toggleRowExpanded(itemId);
                container.innerHTML = '';
                container.appendChild(renderLearnSection());
            };
            list.appendChild(btn);
            
            if (isExpanded) {
                const content = document.createElement('div');
                content.className = 'mta-learn-item__content';
                content.innerHTML = `<p>${getI18nString(item.content)}</p>`;
                list.appendChild(content);
            }
        });
        
        sub.appendChild(list);
        return sub;
    };
    
    const quickstartItems = [
        { title: 'ui.learn.quickstart.step1.title', content: 'ui.learn.quickstart.step1.content' },
        { title: 'ui.learn.quickstart.step2.title', content: 'ui.learn.quickstart.step2.content' },
        { title: 'ui.learn.quickstart.step3.title', content: 'ui.learn.quickstart.step3.content' },
        { title: 'ui.learn.quickstart.step4.title', content: 'ui.learn.quickstart.step4.content' }
    ];
    
    const conceptItems = [
        { title: 'ui.learn.coreConcepts.waitingPassengers.title', content: 'ui.learn.coreConcepts.waitingPassengers.content' },
        { title: 'ui.learn.coreConcepts.roundtripTravelers.title', content: 'ui.learn.coreConcepts.roundtripTravelers.content' },
        { title: 'ui.learn.coreConcepts.oneWayTravelers.title', content: 'ui.learn.coreConcepts.oneWayTravelers.content' },
        { title: 'ui.learn.coreConcepts.reservations.title', content: 'ui.learn.coreConcepts.reservations.content' }
    ];
    
    const accountingItems = [
        { title: 'ui.learn.accountingModes.monthly.title', content: 'ui.learn.accountingModes.monthly.content' },
        { title: 'ui.learn.accountingModes.annual.title', content: 'ui.learn.accountingModes.annual.content' }
    ];
    
    container.appendChild(createLearnSubsection('ui.learn.quickstart.title', quickstartItems));
    container.appendChild(createLearnSubsection('ui.learn.coreConcepts.title', conceptItems));
    container.appendChild(createLearnSubsection('ui.learn.accountingModes.title', accountingItems));
    
    return container;
};

const renderControlTower = () => {
    const contentArea = document.getElementById('mta-content') || document.body;
    contentArea.innerHTML = '';
    contentArea.appendChild(renderStatsSection());
    contentArea.appendChild(renderArrivalsSection());
    contentArea.appendChild(renderDeparturesSection());
    contentArea.appendChild(renderTerminalsSection());
};

window.renderControlTower = renderControlTower;
window.renderLearnSection = renderLearnSection;
window.UIState = UIState;
}







