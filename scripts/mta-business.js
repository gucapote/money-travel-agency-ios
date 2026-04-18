// mta-business.js - Money Travel Agency business logic (canonical v1)

// ============================================================================
// AIRPORTS
// ============================================================================
const createCreditAirportTerminals = (airportId) => {
    const terminals = getTerminals();
    const incomeTerminal = buildTerminal(airportId, 'Credit Income', 'CR-IN', 'Income', false, false);
    const expenseTerminal = buildTerminal(airportId, 'Credit Repayment', 'CR-OUT', 'Expense', false, false);
    saveTerminals([...terminals, incomeTerminal, expenseTerminal]);
    return { incomeTerminal, expenseTerminal };
};

const createAirport = (name, type = 'standard') => {
    const allowedTypes = ['standard', 'credit'];
    if (!allowedTypes.includes(type)) {
        throw new Error('Invalid airport type');
    }

    const airports = getAirports();
    const airport = buildAirport(name, type);
    airports.push(airport);
    saveAirports(airports);

    if (airport.type === 'credit') {
        createCreditAirportTerminals(airport.id);
    }

    return airport;
};

const updateAirport = (id, updates) => {
    const airports = getAirports();
    const existing = airports.find(a => a.id === id);
    if (!existing) {
        throw new Error('Airport not found');
    }

    const nextType = updates.type !== undefined ? updates.type : existing.type;
    if (!['standard', 'credit'].includes(nextType)) {
        throw new Error('Invalid airport type');
    }
    if (nextType !== existing.type) {
        throw new Error('Airport type cannot be changed');
    }

    const airportsUpdated = airports.map(a => a.id === id ? { ...a, ...updates } : a);
    const updatedAirport = airportsUpdated.find(a => a.id === id);

    if (updatedAirport && updatedAirport.type === 'credit') {
        const terminals = getTerminals().filter(t => t.airportId === id);
        const incomeCount = terminals.filter(t => t.type === 'Income').length;
        const expenseCount = terminals.filter(t => t.type === 'Expense').length;
        const transitCount = terminals.filter(t => t.type === 'Transit').length;

        if (incomeCount !== 1 || expenseCount !== 1 || transitCount !== 0) {
            throw new Error('Credit airport must keep exactly 1 Income terminal and 1 Expense terminal');
        }
    }

    saveAirports(airportsUpdated);
};

const deleteAirport = (id) => {
    const terminals = getTerminals().filter(t => t.airportId === id);
    if (terminals.length > 0) {
        throw new Error('Cannot delete airport with existing terminals');
    }
    saveAirports(getAirports().filter(a => a.id !== id));
};

const getAirportById = (id) => getAirports().find(a => a.id === id);

// ============================================================================
// CREDIT AIRPORT HELPERS (PHASE 2.5)
// ============================================================================

/**
 * Get Credit Airports.
 * Returns all airports with type = 'credit'.
 */
const getCreditAirports = () => {
    return getAirports().filter(a => a.type === 'credit');
};

/**
 * Get Credit Airport Terminals.
 * For a credit airport, returns { incomeTerminal, repaymentTerminal }.
 */
const getCreditAirportTerminals = (airportId) => {
    const terminals = getTerminals().filter(t => t.airportId === airportId);
    const incomeTerminal = terminals.find(t => t.type === 'Income');
    const repaymentTerminal = terminals.find(t => t.type === 'Expense');
    
    return {
        incomeTerminal: incomeTerminal || null,
        repaymentTerminal: repaymentTerminal || null
    };
};

/**
 * Get Credit Income Terminal (global lookup).
 * Returns the first Credit Income terminal found across all credit airports.
 */
const getCreditIncomeTerminal = () => {
    const terminals = getTerminals();
    return terminals.find(t => {
        const airport = getAirportById(t.airportId);
        return airport && airport.type === 'credit' && t.type === 'Income';
    }) || null;
};

/**
 * Get Credit Repayment Terminal (global lookup).
 * Returns the first Credit Repayment terminal found across all credit airports.
 */
const getCreditRepaymentTerminal = () => {
    const terminals = getTerminals();
    return terminals.find(t => {
        const airport = getAirportById(t.airportId);
        return airport && airport.type === 'credit' && t.type === 'Expense';
    }) || null;
};

// ============================================================================
// TERMINALS
// ============================================================================
const buildTerminalAlias = (value) => {
    return String(value || '').trim();
};

const createTerminal = (airportId, name, typeOrAlias = 'Transit', returnableOrLegacy = false, legacyType = null, isDefault = false) => {
    const airport = getAirportById(airportId);
    if (!airport) {
        throw new Error('Airport does not exist');
    }
    if (airport.type === 'credit') {
        throw new Error('Credit airports manage terminals automatically');
    }

    // Support the canonical minimal signature and the legacy alias-based one.
    if (typeof legacyType === 'boolean' && isDefault === false) {
        isDefault = legacyType;
        legacyType = null;
    }

    const usingLegacySignature = ['Income', 'Transit', 'Expense'].includes(legacyType);
    const type = usingLegacySignature ? legacyType : typeOrAlias;
    const returnable = usingLegacySignature ? returnableOrLegacy : Boolean(returnableOrLegacy);
    const alias = usingLegacySignature ? buildTerminalAlias(typeOrAlias) : buildTerminalAlias(name);

    const terminals = getTerminals();
    const allowedTypes = ['Income', 'Transit', 'Expense'];
    if (!allowedTypes.includes(type)) {
        throw new Error('Invalid terminal type');
    }
    if (terminals.some(t => t.airportId === airportId && t.alias === alias)) {
        throw new Error('Terminal alias must be unique within the airport');
    }
    if (type !== 'Expense' && returnable) {
        throw new Error('Only Expense terminals can be returnable');
    }
    const terminal = buildTerminal(airportId, name, alias, type, returnable, isDefault);
    let updated = [...terminals, terminal];
    
    // v1: Enforce at most 1 default per type
    if (isDefault) {
        updated = enforceDefaultPerType(terminal.id, true, updated);
    }
    
    saveTerminals(updated);
    return terminal;
};

const updateTerminal = (id, updates) => {
    const terminals = getTerminals();
    const existing = terminals.find(t => t.id === id);
    if (!existing) {
        throw new Error('Terminal not found');
    }

    const nextAirportId = updates.airportId !== undefined ? updates.airportId : existing.airportId;
    const nextName = updates.name !== undefined ? updates.name : existing.name;
    const nextAlias = updates.alias !== undefined ? updates.alias : (updates.name !== undefined ? buildTerminalAlias(nextName) : existing.alias);
    const nextType = updates.type !== undefined ? updates.type : existing.type;
    const nextReturnable = updates.returnable !== undefined ? updates.returnable : existing.returnable;
    const nextIsDefault = updates.isDefault !== undefined ? updates.isDefault : existing.isDefault;

    const nextAirport = getAirportById(nextAirportId);
    if (!nextAirport) {
        throw new Error('Airport does not exist');
    }
    if (nextAirport.type === 'credit') {
        throw new Error('Credit airports manage terminals automatically');
    }

    const allowedTypes = ['Income', 'Transit', 'Expense'];
    if (!allowedTypes.includes(nextType)) {
        throw new Error('Invalid terminal type');
    }
    if (terminals.some(t => t.id !== id && t.airportId === nextAirportId && t.alias === nextAlias)) {
        throw new Error('Terminal alias must be unique within the airport');
    }
    if (nextType !== 'Expense' && nextReturnable) {
        throw new Error('Only Expense terminals can be returnable');
    }

    let updated = terminals.map(t => t.id === id ? { ...t, ...updates, alias: t.id === id ? nextAlias : t.alias } : t);
    
    // v1: Enforce at most 1 default per type
    if (nextIsDefault) {
        updated = enforceDefaultPerType(id, true, updated);
    }
    
    saveTerminals(updated);
};

const deleteTerminal = (id) => {
    const flights = getFlights().filter(f =>
        f.originTerminalId === id || f.destinationTerminalId === id
    );

    if (flights.length > 0) {
        throw new Error('Cannot delete terminal used in flights');
    }

    saveTerminals(getTerminals().filter(t => t.id !== id));
};

const getTerminalById = (id) => getTerminals().find(t => t.id === id);
const getTerminalsByAirport = (airportId) => getTerminals().filter(t => t.airportId === airportId);

const getTerminalWithAirport = (terminalId) => {
    const terminal = getTerminalById(terminalId);
    if (!terminal) return null;
    const airport = getAirportById(terminal.airportId);
    return { ...terminal, airport };
};

// ============================================================================
// LIFECYCLE MANAGEMENT (v1 STATUS & DEACTIVATION)
// ============================================================================

const deactivateAirport = (id) => {
    const airports = getAirports();
    const terminals = getTerminals();
    
    const validation = validateAirportDeactivation(id, airports, terminals);
    if (!validation.canDeactivate) {
        throw new Error(validation.reason);
    }

    const updated = airports.map(a => a.id === id ? { ...a, status: 'inactive' } : a);
    saveAirports(updated);
};

const deactivateTerminal = (id) => {
    const terminals = getTerminals();
    
    const validation = validateTerminalDeactivation(id, terminals);
    if (!validation.canDeactivate) {
        throw new Error(validation.reason);
    }

    const updated = terminals.map(t => t.id === id ? { ...t, status: 'inactive' } : t);
    saveTerminals(updated);
};

const reactivateAirport = (id) => {
    const airports = getAirports();
    const updated = airports.map(a => a.id === id ? { ...a, status: 'active' } : a);
    saveAirports(updated);
};

const reactivateTerminal = (id) => {
    const terminals = getTerminals();
    const updated = terminals.map(t => t.id === id ? { ...t, status: 'active' } : t);
    saveTerminals(updated);
};

// ============================================================================
// TERMINAL METAPHOR
// ============================================================================
const getTerminalMetaphor = (terminal) => {
    if (!terminal) {
        return { roleKey: 'terminalConnection', subtypeKey: null };
    }
    
    if (terminal.type === 'Income') {
        return { roleKey: 'terminalCheckIn', subtypeKey: null };
    } else if (terminal.type === 'Transit') {
        return { roleKey: 'terminalConnection', subtypeKey: null };
    } else if (terminal.type === 'Expense') {
        if (terminal.returnable) {
            return { roleKey: 'terminalCheckout', subtypeKey: 'terminalRoundtrip' };
        } else {
            return { roleKey: 'terminalCheckout', subtypeKey: 'terminalOneWay' };
        }
    }
    
    return { roleKey: 'terminalConnection', subtypeKey: null };
};

// ============================================================================
// PASSENGER GROUPS
// ============================================================================
// ============================================================================
// PRODUCTS
// ============================================================================
const createProduct = (code, name, defaultUnitPrice) => {
    const normalizedCode = normalizeProductCode(code);
    const trimmedName = String(name || '').trim();
    const normalizedPrice = Number(defaultUnitPrice);

    if (!normalizedCode) {
        throw new Error('Product code is required');
    }
    if (!trimmedName) {
        throw new Error('Product name is required');
    }
    if (!Number.isFinite(normalizedPrice) || normalizedPrice < 0) {
        throw new Error('Default unit price must be greater than or equal to 0');
    }

    const products = getProducts();
    if (products.some(product => product.status !== 'inactive' && normalizeProductCode(product.code || product.name) === normalizedCode)) {
        throw new Error('Product code must be unique');
    }
    const product = buildProduct(normalizedCode, trimmedName, normalizedPrice, 'active');
    products.push(product);
    saveProducts(products);
    return product;
};

const updateProduct = (id, updates) => {
    const products = getProducts();
    const existing = products.find(product => product.id === id);
    if (!existing) {
        throw new Error('Product not found');
    }

    const nextCode = updates.code !== undefined ? normalizeProductCode(updates.code) : normalizeProductCode(existing.code || existing.name);
    const nextName = updates.name !== undefined ? String(updates.name).trim() : existing.name;
    const nextDefaultUnitPrice = updates.defaultUnitPrice !== undefined
        ? Number(updates.defaultUnitPrice)
        : existing.defaultUnitPrice;
    const nextStatus = updates.status !== undefined ? updates.status : existing.status;

    if (!nextCode) {
        throw new Error('Product code is required');
    }
    if (!nextName) {
        throw new Error('Product name is required');
    }
    if (!Number.isFinite(nextDefaultUnitPrice) || nextDefaultUnitPrice < 0) {
        throw new Error('Default unit price must be greater than or equal to 0');
    }
    if (!['active', 'inactive'].includes(nextStatus)) {
        throw new Error('Invalid product status');
    }
    if (products.some(product => product.id !== id && product.status !== 'inactive' && normalizeProductCode(product.code || product.name) === nextCode)) {
        throw new Error('Product code must be unique');
    }

    saveProducts(products.map(product => (
        product.id === id
            ? { ...product, code: nextCode, name: nextName, defaultUnitPrice: nextDefaultUnitPrice, status: nextStatus }
            : product
    )));
};

const deleteProduct = (id) => {
    const groupsUsingProduct = getPassengerGroups().filter(group =>
        Array.isArray(group.cargo) && group.cargo.some(item => item.productId === id)
    );
    if (groupsUsingProduct.length > 0) {
        throw new Error('Cannot delete product used in arrival cargo');
    }
    updateProduct(id, { status: 'inactive' });
};

const getProductById = (id) => getProducts().find(product => product.id === id);

// ============================================================================
// PASSENGER GROUPS
// ============================================================================
const createPassengerGroup = (name, totalAmount, type = null, creditAirportId = null, extendable = false, cargo = null, groupName = null) => {
    if (!Number.isFinite(Number(totalAmount))) {
        throw new Error('Total amount must be provided as a number');
    }
    const amt = Number(totalAmount);
    if (amt < 0) {
        throw new Error('Total amount must be greater than or equal to 0');
    }

    const inferredType = type || 'external';
    const allowedTypes = ['external', 'internal', 'liability'];
    if (!allowedTypes.includes(inferredType)) {
        throw new Error('Invalid passenger group type');
    }

    // For liability groups, creditAirportId is required and must be a credit airport
    if (inferredType === 'liability') {
        if (!creditAirportId) {
            throw new Error('Credit airport is required for liability passenger groups');
        }
        const airport = getAirportById(creditAirportId);
        if (!airport) {
            throw new Error('Credit airport does not exist');
        }
        if (airport.type !== 'credit') {
            throw new Error('Liability passenger groups must reference a credit airport');
        }
    }

    // For non-liability groups, creditAirportId must be null
    if (inferredType !== 'liability' && creditAirportId !== null) {
        throw new Error(`Credit airport must be null for ${inferredType} passenger groups`);
    }

    // extendable only applies to liability groups
    if (inferredType !== 'liability' && extendable) {
        throw new Error('extendable can only be true for liability passenger groups');
    }
    const normalizedGroupName = inferredType === 'liability' ? null : (String(groupName || '').trim() || null);

    const cargoValidation = validateCargoEntries(cargo, amt);
    if (cargoValidation.cargo) {
        cargoValidation.cargo.forEach(item => {
            const product = getProductById(item.productId);
            if (!product || product.status === 'inactive') {
                throw new Error('Cargo items must reference active products');
            }
        });
    }

    const groups = getPassengerGroups();
    const group = buildPassengerGroup(name, parseFloat(amt), inferredType, creditAirportId, extendable, cargoValidation.cargo, normalizedGroupName);
    groups.push(group);
    savePassengerGroups(groups);

    return group;
};

const updatePassengerGroup = (id, updates) => {
    const groups = getPassengerGroups();
    const existing = groups.find(g => g.id === id);
    if (!existing) {
        throw new Error('Passenger group not found');
    }

    const nextName = updates.name !== undefined ? String(updates.name).trim() : existing.name;
    const nextType = updates.type !== undefined ? updates.type : existing.type;
    const nextTotalAmount = updates.totalAmount !== undefined ? Number(updates.totalAmount) : existing.totalAmount;
    const nextCreditAirportId = updates.creditAirportId !== undefined ? updates.creditAirportId : existing.creditAirportId;
    const nextExtendable = updates.extendable !== undefined ? Boolean(updates.extendable) : existing.extendable;
    const nextCargo = updates.cargo !== undefined ? updates.cargo : existing.cargo;
    const nextGroupName = updates.groupName !== undefined ? updates.groupName : existing.groupName;

    if (!nextName) {
        throw new Error('Passenger group name is required');
    }
    const allowedTypes = ['external', 'internal', 'liability'];
    if (!allowedTypes.includes(nextType)) {
        throw new Error('Invalid passenger group type');
    }
    if (Number.isNaN(nextTotalAmount) || nextTotalAmount < 0) {
        throw new Error('Total amount must be greater than or equal to 0');
    }

    // For liability groups, creditAirportId is required and must be a credit airport
    if (nextType === 'liability') {
        if (!nextCreditAirportId) {
            throw new Error('Credit airport is required for liability passenger groups');
        }
        const airport = getAirportById(nextCreditAirportId);
        if (!airport) {
            throw new Error('Credit airport does not exist');
        }
        if (airport.type !== 'credit') {
            throw new Error('Liability passenger groups must reference a credit airport');
        }
    }

    // For non-liability groups, creditAirportId must be null and extendable must be false
    if (nextType !== 'liability' && nextCreditAirportId !== null) {
        throw new Error(`Credit airport must be null for ${nextType} passenger groups`);
    }

    // extendable only applies to liability groups
    if (nextType !== 'liability' && nextExtendable) {
        throw new Error('extendable can only be true for liability passenger groups');
    }
    const normalizedGroupName = nextType === 'liability' ? null : (String(nextGroupName || '').trim() || null);

    const cargoValidation = validateCargoEntries(nextCargo, nextTotalAmount);
    if (cargoValidation.cargo) {
        cargoValidation.cargo.forEach(item => {
            const product = getProductById(item.productId);
            if (!product || product.status === 'inactive') {
                throw new Error('Cargo items must reference active products');
            }
        });
    }

    const updated = groups.map(g => g.id === id ? { 
        ...g, 
        name: nextName,
        type: nextType, 
        totalAmount: nextTotalAmount, 
        creditAirportId: nextCreditAirportId,
        extendable: nextType === 'liability' ? nextExtendable : false,
        cargo: cargoValidation.cargo,
        groupName: normalizedGroupName
    } : g);
    savePassengerGroups(updated);
};

const deletePassengerGroup = (id) => {
    const flights = getFlights().filter(f => f.passengerGroupId === id);
    if (flights.length > 0) {
        throw new Error('Cannot delete this arrival because flights still depend on its allocated funds. Delete the related flights first or rework allocations before deleting it.');
    }
    savePassengerGroups(getPassengerGroups().filter(g => g.id !== id));
};

const getPassengerGroupById = (id) => getPassengerGroups().find(g => g.id === id);

const getCreditIncomeTerminalForAirport = (creditAirportId) => {
    if (!creditAirportId) return null;
    const terminals = getTerminals();
    return terminals.find(t => t.airportId === creditAirportId && t.type === 'Income');
};

const getCreditExpenseTerminalForAirport = (creditAirportId) => {
    if (!creditAirportId) return null;
    const terminals = getTerminals();
    return terminals.find(t => t.airportId === creditAirportId && t.type === 'Expense');
};

// ============================================================================
// FLIGHTS
// ============================================================================
const buildFlightName = (originTerminalId, destinationTerminalId) => {
    const origin = originTerminalId ? getTerminalById(originTerminalId) : null;
    const dest = destinationTerminalId ? getTerminalById(destinationTerminalId) : null;
    const originLabel = origin ? (origin.alias || origin.name) : 'Unknown';
    const destLabel = dest ? (dest.alias || dest.name) : 'Unknown';
    return destinationTerminalId ? `${originLabel} → ${destLabel}` : originLabel;
};

const getAllocatedAmountForGroup = (groupId) => {
    const flights = getFlights().filter(f => f.status === 'Completed' && f.passengerGroupId === groupId);
    const terminals = getTerminals();
    const terminalById = terminals.reduce((acc, t) => {
        acc[t.id] = t;
        return acc;
    }, {});

    return flights
        .filter(f => {
            const origin = f.originTerminalId ? terminalById[f.originTerminalId] : null;
            return origin && origin.type === 'Income';
        })
        .reduce((sum, f) => sum + (f.amount || 0), 0);
};

const getRemainingAmountForGroup = (groupId, options = {}) => {
    const group = getPassengerGroupById(groupId);
    if (!group) return 0;
    const excludeFlightId = options.excludeFlightId || null;
    const allocated = getFlights()
        .filter(f => f.status === 'Completed' && f.passengerGroupId === groupId)
        .filter(f => !excludeFlightId || f.id !== excludeFlightId)
        .filter(f => {
            const origin = f.originTerminalId ? getTerminalById(f.originTerminalId) : null;
            return origin && origin.type === 'Income';
        })
        .reduce((sum, f) => sum + (f.amount || 0), 0);
    return (group.totalAmount || 0) - allocated;
};

const getGroupBalanceAtTerminal = (groupId, terminalId, options = {}) => {
    const excludeFlightId = options.excludeFlightId || null;
    const flights = getFlights()
        .filter(f => f.status === 'Completed' && f.passengerGroupId === groupId)
        .filter(f => !excludeFlightId || f.id !== excludeFlightId);
    const incoming = flights
        .filter(f => f.destinationTerminalId === terminalId)
        .reduce((sum, f) => sum + (f.amount || 0), 0);
    const outgoing = flights
        .filter(f => f.originTerminalId === terminalId)
        .reduce((sum, f) => sum + (f.amount || 0), 0);
    return incoming - outgoing;
};

const getAvailableFundsByGroupAtTerminal = (terminalId, options = {}) => {
    return getPassengerGroups()
        .map(g => ({
            group: g,
            available: getGroupBalanceAtTerminal(g.id, terminalId, options)
        }))
        .filter(x => x.available > 0);
};

const validateFlightStructure = (flight) => {
    if (!flight || !flight.status) {
        throw new Error('Invalid flight structure');
    }
    if (!flight.destinationTerminalId) {
        throw new Error('Destination terminal is required');
    }
    if (!Number.isFinite(Number(flight.amount)) || Number(flight.amount) <= 0) {
        throw new Error('Amount must be greater than 0');
    }
    const normalizedStatus = flight.status === 'Planned' ? 'Planned' : 'Completed';
    if (normalizedStatus === 'Completed') {
        if (!flight.passengerGroupId) {
            throw new Error('Passenger group is required for completed flights');
        }
        // Null origin is allowed for external injection (AI-README: "External Injection")
        // when destination is Income terminal
        if (!flight.originTerminalId) {
            const destination = getTerminalById(flight.destinationTerminalId);
            if (!destination || destination.type !== 'Income') {
                throw new Error('Null origin is only allowed when destination is Income terminal');
            }
        }
    } else {
        if (flight.originTerminalId === null) {
            // allowed for Planned flights
        }
    }
};

const validateTerminalOriginRules = (flight) => {
    if (!flight.originTerminalId) return;

    const origin = getTerminalById(flight.originTerminalId);
    if (!origin) {
        throw new Error('Origin terminal does not exist');
    }

    if ((origin.type === 'Income' || origin.type === 'Transit') && origin.returnable) {
        throw new Error('Income and Transit terminals must not be returnable');
    }

    if (origin.type === 'Expense' && !origin.returnable) {
        throw new Error('Non-returnable Expense terminals cannot originate outbound flights.');
    }

    if (origin.type === 'Expense' && origin.returnable) {
        if (flight.status !== 'Completed') {
            throw new Error('Return flows must be completed flights.');
        }
        if (!flight.sourceFlightId) {
            throw new Error('Expense-origin outbound flights must be linked to a root flight (return flow).');
        }
        if (!flight.passengerGroupId) {
            throw new Error('Passenger group is required for return flows.');
        }
    }
};

const validatePassengerGroupAllocation = (flight, options = {}) => {
    if (flight.status !== 'Completed') return;
    const balanceOptions = { excludeFlightId: options.excludeFlightId || null };

    const origin = flight.originTerminalId ? getTerminalById(flight.originTerminalId) : null;
    if (!origin) return;

    if (origin.type === 'Income') {
        const remaining = getRemainingAmountForGroup(flight.passengerGroupId, balanceOptions);
        if (remaining < flight.amount) {
            throw new Error('Insufficient remaining amount for passenger group');
        }
    }

    if (origin.type === 'Transit') {
        const totalAvailable = getAvailableFundsByGroupAtTerminal(origin.id, balanceOptions)
            .reduce((sum, x) => sum + x.available, 0);
        if (totalAvailable < flight.amount) {
            throw new Error('Insufficient funds at transit terminal');
        }
    }

    if (origin.type === 'Expense') {
        if (!flight.passengerGroupId) {
            throw new Error('Passenger group is required for Expense-origin flights');
        }
        const balance = getGroupBalanceAtTerminal(flight.passengerGroupId, origin.id, balanceOptions);
        if (balance < flight.amount) {
            throw new Error('Insufficient group funds at expense terminal');
        }
    }
};

const validateTerminalBalanceIntegrity = () => {
    const groups = getPassengerGroups();
    for (const g of groups) {
        const remaining = getRemainingAmountForGroup(g.id);
        if (remaining < 0) {
            throw new Error('Passenger group remaining amount cannot be negative');
        }
    }
};

const checkRiskPatterns = (flight) => {
    if (!flight || flight.status !== 'Completed') return [];
    const origin = flight.originTerminalId ? getTerminalById(flight.originTerminalId) : null;
    const dest = flight.destinationTerminalId ? getTerminalById(flight.destinationTerminalId) : null;
    if (origin && dest && origin.type === 'Liability' && dest.type === 'Liability') {
        return [{
            code: 'LIABILITY_TO_LIABILITY',
            level: 'red',
            message: 'Debt moved between liabilities — this increases financial risk'
        }];
    }
    return [];
};

// ============================================================================
// PHASE 2 IMPROVEMENTS: EXTERNAL INJECTION VALIDATION
// ============================================================================

/**
 * Check if Passenger Group already has External Injection (PHASE 2 Improvement 3)
 * Returns the existing external injection flight if one exists, null otherwise
 * 
 * External Injection: Completed flight with null origin and Income destination
 */
const getExistingExternalInjection = (passengerGroupId) => {
    if (!passengerGroupId) return null;
    
    const flights = getFlights();
    const terminals = getTerminals();
    
    return flights.find(f => {
        if (f.status !== 'Completed') return false;
        if (f.originTerminalId !== null) return false;
        if (f.passengerGroupId !== passengerGroupId) return false;
        
        const destTerminal = terminals.find(t => t.id === f.destinationTerminalId);
        return destTerminal && destTerminal.type === 'Income';
    }) || null;
};

/**
 * FIFO Allocation Model (v1)
 * 
 * Deterministically allocates requested amount across PassengerGroups at a Terminal
 * based on arrival timestamp (oldest allocation first).
 * 
 * Arrival timestamp = timestamp of the Completed flight that brought funds to terminal.
 * 
 * Returns ordered allocation list: [{passengerGroupId, allocatedAmount}, ...]
 * 
 * Rules:
 * - Must satisfy requested amount across multiple PGs if needed
 * - Throws error if insufficient total terminal balance
 * - Deterministic: same input history produces identical allocations
 * - Excludes passive flows (external injections, returns)
 * 
 * CONTRACT: FIFO ALLOCATION MODEL (v1) from AI-README.txt
 */
const allocateFIFO = (originTerminalId, amount) => {
    const originTerminal = getTerminalById(originTerminalId);
    if (!originTerminal) {
        throw new Error('Origin terminal does not exist');
    }
    if (originTerminal.type === 'Expense') {
        throw new Error('FIFO cannot be used for Expense-origin flows. Use return flow.');
    }

    const flights = getFlights().filter(f => f.status === 'Completed');
    const groups = getPassengerGroups();
    
    // Build list of {passengerGroupId, balance, arrivalTimestamp} at this terminal
    const allocations = groups.map(group => {
        // Find the earliest arrival flight (first Completed flight that brought funds here)
        // FIFO CONTRACT: Return flights (sourceFlightId !== null) are NOT contributions; exclude them
        const arrivalFlights = flights.filter(
            f => f.destinationTerminalId === originTerminalId 
                && f.passengerGroupId === group.id
                && f.sourceFlightId === null  // Exclude return flights
        );
        if (arrivalFlights.length === 0) return null;
        
        // Arrival timestamp = earliest flight that brought funds
        const arrivalTimestamp = new Date(Math.min(...arrivalFlights.map(f => new Date(f.date))));
        
        // Current balance at terminal for this group
        const balance = getGroupBalanceAtTerminal(group.id, originTerminalId);
        if (balance <= 0) return null;
        
        return {
            passengerGroupId: group.id,
            balance: balance,
            arrivalTimestamp: arrivalTimestamp
        };
    }).filter(x => x !== null);
    
    // FIFO CONTRACT: Deterministic sort - primary by arrival timestamp, secondary by group ID
    // Ensures identical allocation for same-date arrivals across all implementations
    allocations.sort((a, b) => {
        const timeA = a.arrivalTimestamp.getTime();
        const timeB = b.arrivalTimestamp.getTime();
        if (timeA !== timeB) return timeA - timeB;
        // Secondary sort: by PassengerGroup ID for determinism
        return a.passengerGroupId.localeCompare(b.passengerGroupId);
    });
    
    // Check total availability
    const totalAvailable = allocations.reduce((sum, a) => sum + a.balance, 0);
    if (totalAvailable < amount) {
        throw new Error(`Insufficient funds at terminal. Available: $${totalAvailable.toFixed(2)}, Requested: $${amount.toFixed(2)}`);
    }
    
    // Accumulate allocation across PGs
    const result = [];
    let remaining = amount;
    
    for (const alloc of allocations) {
        if (remaining <= 0) break;
        
        const allocatedAmount = Math.min(alloc.balance, remaining);
        result.push({
            passengerGroupId: alloc.passengerGroupId,
            allocatedAmount: allocatedAmount
        });
        remaining -= allocatedAmount;
    }
    
    return result;
};

/**
 * Execute Terminal-Funded Flight using the single FIFO engine (v1 hard invariant).
 * - Uses allocateFIFO() for all terminal-funded allocations.
 * - Creates a grouping Planned parent when allocation spans multiple PGs.
 * - If parentFlightId is provided, children are attached to that existing Planned parent.
 * - Atomic: restores original flights if any child creation fails.
 */
const createTerminalFundedFlight = (originTerminalId, destinationTerminalId, amount, name = null, date = null, parentFlightId = null, ordinalOverride = null) => {
    if (!Number.isFinite(Number(amount))) {
        throw new Error('Amount must be provided as a number');
    }
    const amt = Number(amount);
    if (amt <= 0) {
        throw new Error('Amount must be greater than 0');
    }
    const originTerminal = getTerminalById(originTerminalId);
    if (!originTerminal) {
        throw new Error('Origin terminal does not exist');
    }
    if (originTerminal.type === 'Expense') {
        throw new Error('Expense-origin flows must be created through createReturnFlight.');
    }

    const allocation = allocateFIFO(originTerminalId, amt);
    if (!allocation.length) {
        throw new Error('No available passenger groups at the selected origin terminal');
    }

    const originalFlights = getFlights();
    try {
        const result = {
            parent: null,
            children: []
        };

        let effectiveParentId = parentFlightId || null;

        if (allocation.length > 1 && !effectiveParentId) {
            const parentName = name || `[FIFO Multi-Group] ${buildFlightName(originTerminalId, destinationTerminalId)}`;
            const parentFlight = createFlight(
                null,
                originTerminalId,
                destinationTerminalId,
                amt,
                'Planned',
                parentName,
                date,
                null,
                ordinalOverride
            );
            result.parent = parentFlight;
            effectiveParentId = parentFlight.id;
        }

        allocation.forEach((alloc, idx) => {
            const childName = allocation.length === 1
                ? name
                : `[Child ${idx + 1}] ${buildFlightName(originTerminalId, destinationTerminalId)}`;
            const childFlight = createFlight(
                alloc.passengerGroupId,
                originTerminalId,
                destinationTerminalId,
                alloc.allocatedAmount,
                'Completed',
                childName,
                date,
                effectiveParentId,
                ordinalOverride
            );
            result.children.push(childFlight);
        });

        return result;
    } catch (error) {
        saveFlights(originalFlights);
        throw error;
    }
};

/**
 * Get FIFO Passenger Groups Available at Terminal (v1 Legacy)
 * Returns passenger groups available at a terminal in arrival order (FIFO)
 * Used for when caller needs simple ordered list of groups
 * Internally uses allocateFIFO() logic to avoid duplication
 */
const getFIFOPassengerGroupsAtTerminal = (terminalId) => {
    const groups = getPassengerGroups();
    const byId = groups.reduce((acc, g) => {
        acc[g.id] = g;
        return acc;
    }, {});
    const totalAvailable = getAvailableFundsByGroupAtTerminal(terminalId)
        .reduce((sum, x) => sum + x.available, 0);
    if (totalAvailable <= 0) return [];

    const allocation = allocateFIFO(terminalId, totalAvailable);
    return allocation
        .map(a => byId[a.passengerGroupId])
        .filter(Boolean);
};

/**
 * Check if Liability Passenger Group Already Has Credit Injection
 * Returns true if a liability PG already has a credit injection flight
 * Credit injection: null origin → Credit Income terminal with liability PG
 */
const hasExistingCreditInjection = (passengerGroupId) => {
    if (!passengerGroupId) return false;
    
    const group = getPassengerGroupById(passengerGroupId);
    if (!group || group.type !== 'liability') return false;
    
    const flights = getFlights();
    const terminals = getTerminals();
    
    return flights.some(f => {
        if (f.status !== 'Completed') return false;
        if (f.originTerminalId !== null) return false;
        if (f.passengerGroupId !== passengerGroupId) return false;
        
        const destTerminal = terminals.find(t => t.id === f.destinationTerminalId);
        if (!destTerminal) return false;
        
        const destAirport = getAirportById(destTerminal.airportId);
        return destAirport && destAirport.type === 'credit' && destTerminal.type === 'Income';
    });
};

/**
 * Create Automatic Credit Injection
 * When a liability-funded flight is created, auto-create injection if it doesn't exist
 * Injection: null origin → Credit Income terminal with liability PG and full principal amount
 */
const createCreditInjection = (passengerGroupId) => {
    const group = getPassengerGroupById(passengerGroupId);
    if (!group || group.type !== 'liability') {
        throw new Error('Passenger group must be liability type for credit injection');
    }
    
    if (!group.creditAirportId) {
        throw new Error('Liability passenger group must reference a credit airport');
    }
    
    // Check if injection already exists
    if (hasExistingCreditInjection(passengerGroupId)) {
        return; // Already injected, nothing to do
    }
    
    // Find the Credit Income terminal
    const terminals = getTerminals().filter(t => t.airportId === group.creditAirportId);
    const incomeTerminal = terminals.find(t => t.type === 'Income');
    
    if (!incomeTerminal) {
        throw new Error('Credit airport must have an Income terminal for injection');
    }
    
    // Create the injection flight with full principal amount
    const injectionFlight = buildFlight(
        null, // name will be auto-generated
        passengerGroupId,
        null, // origin is null (external injection)
        incomeTerminal.id,
        group.totalAmount,
        'Completed',
        null, // date - uses current
        null // sourceFlightId - root flight
    );
    
    const flights = getFlights();
    flights.push(injectionFlight);
    saveFlights(flights);
};

/**
 * Atomic Credit Flow for Extendable Liabilities
 * Creates a complete credit-card style transaction (injection + movement + repayment obligation)
 * All steps must succeed; if any fails, the entire operation rolls back
 */
const executeExtendableCreditFlow = (passengerGroupId, destinationTerminalId, amount, name = null, date = null, ordinalOverride = null, reservedName = null) => {
    if (!Number.isFinite(Number(amount))) {
        throw new Error('Amount must be provided as a number');
    }
    const amt = Number(amount);
    if (amt <= 0) {
        throw new Error('Amount must be greater than 0');
    }

    const group = getPassengerGroupById(passengerGroupId);
    if (!group || group.type !== 'liability') {
        throw new Error('Passenger group must be liability type');
    }
    if (!group.extendable) {
        throw new Error('Passenger group must be extendable');
    }

    const terminals = getTerminals();
    const creditTerminals = terminals.filter(t => t.airportId === group.creditAirportId);
    const incomeTerminal = creditTerminals.find(t => t.type === 'Income');
    const expenseTerminal = creditTerminals.find(t => t.type === 'Expense');
    
    if (!incomeTerminal || !expenseTerminal) {
        throw new Error('Credit airport must have Income and Expense terminals');
    }

    const destTerminal = terminals.find(t => t.id === destinationTerminalId);
    if (!destTerminal) {
        throw new Error('Destination terminal does not exist');
    }

    // Save current state in case rollback is needed
    const originalGroups = getPassengerGroups();
    const originalFlights = getFlights();

    try {
        // STEP 1: Increase totalAmount
        const updatedGroups = originalGroups.map(g => 
            g.id === passengerGroupId 
                ? { ...g, totalAmount: g.totalAmount + amt }
                : g
        );
        savePassengerGroups(updatedGroups);

        // STEP 2: Create injection flight (null → Income)
        const injectionFlight = buildFlight(
            name || undefined,           // name
            passengerGroupId,            // passengerGroupId
            null,                        // originTerminalId
            incomeTerminal.id,           // destinationTerminalId
            amt,                         // amount
            'Completed',                 // status
            date,                        // date
            null,                        // sourceFlightId
            ordinalOverride
        );

        // STEP 3: Create movement flight (Income → destination)
        const movementFlight = buildFlight(
            name || undefined,           // name
            passengerGroupId,            // passengerGroupId
            incomeTerminal.id,           // originTerminalId
            destinationTerminalId,       // destinationTerminalId
            amt,                         // amount
            'Completed',                 // status
            date,                        // date
            null,                        // sourceFlightId
            ordinalOverride
        );

        // STEP 4: Create repayment Planned flight (Income → Expense)
        const repaymentFlight = buildFlight(
            reservedName || name || undefined,  // name
            null,                        // passengerGroupId (No passenger group for repayment Planned)
            null,                        // originTerminalId (Planned can have null origin)
            expenseTerminal.id,          // destinationTerminalId
            amt,                         // amount
            'Planned',                   // status
            date,                        // date
            null,                        // sourceFlightId
            ordinalOverride
        );

        const updatedFlights = [...originalFlights, injectionFlight, movementFlight, repaymentFlight];
        saveFlights(updatedFlights);

        return {
            injection: injectionFlight,
            movement: movementFlight,
            repayment: repaymentFlight
        };
    } catch (error) {
        // Rollback: restore original state
        savePassengerGroups(originalGroups);
        saveFlights(originalFlights);
        throw error;
    }
};

const createFlight = (passengerGroupId, originTerminalId, destinationTerminalId, amount, status = 'Planned', name = null, date = null, sourceFlightId = null, ordinalOverride = null) => {
    if (!Number.isFinite(Number(amount))) {
        throw new Error('Amount must be provided as a number');
    }
    const amt = Number(amount);
    if (amt <= 0) {
        throw new Error('Amount must be greater than 0');
    }

    const normalizedStatus = status === 'Planned' ? 'Planned' : 'Completed';

    // Rule Refinement: Planned flights with null origin cannot have a Passenger Group
    if (normalizedStatus === 'Planned' && originTerminalId === null && passengerGroupId !== null) {
        throw new Error('Planned flights with unknown origin cannot have a Passenger Group.');
    }

    if (!destinationTerminalId) {
        throw new Error('Destination terminal is required');
    }
    if (destinationTerminalId) {
        const destTerm = getTerminalById(destinationTerminalId);
        if (!destTerm) {
            throw new Error('Destination terminal does not exist');
        }
    }

    const originTerm = originTerminalId ? getTerminalById(originTerminalId) : null;
    if (originTerminalId && !originTerm) {
        throw new Error('Origin terminal does not exist');
    }
    if (normalizedStatus === 'Completed' && originTerm && originTerm.type === 'Expense') {
        throw new Error('Expense-origin completed flights must be created via createReturnFlight.');
    }

    // PHASE 2 Improvement 3: Prevent multiple external injections per PG
    if (normalizedStatus === 'Completed' && originTerminalId === null && passengerGroupId) {
        const destTerminal = getTerminalById(destinationTerminalId);
        if (destTerminal && destTerminal.type === 'Income') {
            // This is an External Injection attempt - check if one already exists
            const existingInjection = getExistingExternalInjection(passengerGroupId);
            if (existingInjection) {
                throw new Error(
                    `Passenger group "${getPassengerGroupById(passengerGroupId)?.name || 'Unknown'}" already has an external injection flight. ` +
                    `Only one completed external injection per passenger group is allowed.`
                );
            }
        }
    }

    // Terminal-funded FIFO execution is centralized in createTerminalFundedFlight().


    const draftFlight = {
        passengerGroupId: passengerGroupId || null,
        originTerminalId: originTerminalId || null,
        destinationTerminalId,
        amount: amt,
        status: normalizedStatus
    };

    validateFlightStructure(draftFlight);
    validateTerminalOriginRules(draftFlight);
    validatePassengerGroupAllocation(draftFlight);

    if (normalizedStatus === 'Completed' && passengerGroupId) {
        const group = getPassengerGroupById(passengerGroupId);
        if (!group) {
            throw new Error('Passenger group does not exist');
        }
    }

    if (normalizedStatus === 'Completed' && originTerminalId) {
        const originTerm = getTerminalById(originTerminalId);
        if (originTerm && originTerm.type === 'Income') {
            const remaining = getRemainingAmountForGroup(passengerGroupId);
            if (remaining < amt) {
                throw new Error('Insufficient remaining amount for passenger group');
            }
        }
        if (originTerm && originTerm.type === 'Expense') {
            if (!passengerGroupId) {
                throw new Error('Passenger group is required for Expense-origin flights');
            }
            const balance = getGroupBalanceAtTerminal(passengerGroupId, originTerm.id);
            if (balance < amt) {
                throw new Error('Insufficient group funds at expense terminal');
            }
        }
    }

    const flights = getFlights();
    const flightName = name || buildFlightName(originTerminalId, destinationTerminalId);
    const flight = buildFlight(flightName, passengerGroupId, originTerminalId, destinationTerminalId, amt, normalizedStatus, date, sourceFlightId, ordinalOverride);
    
    // v1: Validate subflight rules if sourceFlightId provided
    if (sourceFlightId) {
        const subflightValidation = validateSubflightRules(flight, flights);
        if (!subflightValidation.valid) {
            throw new Error(subflightValidation.error);
        }
    }
    
    flights.push(flight);
    saveFlights(flights);
    validateTerminalBalanceIntegrity();
    return flight;
};

const updateFlight = (id, updates, options = {}) => {
    const flight = getFlightById(id);
    if (!flight) {
        throw new Error('Flight not found');
    }
    const flights = getFlights();

    const allowCompletedUpdate = options.allowCompleted === true;
    const childFlights = flights.filter(f => f.sourceFlightId === id);
    if (childFlights.length > 0) {
        throw new Error('Cannot update flight with existing legs');
    }

    if (flight.status === 'Completed' && !allowCompletedUpdate) {
        throw new Error('Cannot update completed flight');
    }

    if (updates.destinationTerminalId === null) {
        throw new Error('Destination terminal is required');
    }

    const nextStatus = updates.status ? (updates.status === 'Planned' ? 'Planned' : 'Completed') : flight.status;
    const nextOriginId = updates.originTerminalId !== undefined ? updates.originTerminalId : flight.originTerminalId;
    const nextDestId = updates.destinationTerminalId !== undefined ? updates.destinationTerminalId : flight.destinationTerminalId;
    const nextGroupId = updates.passengerGroupId !== undefined ? updates.passengerGroupId : flight.passengerGroupId;
    const nextAmount = updates.amount !== undefined ? Number(updates.amount) : flight.amount;
    const nextDate = updates.date !== undefined ? updates.date : flight.date;
    const nextSourceFlightId = updates.sourceFlightId !== undefined ? updates.sourceFlightId : flight.sourceFlightId;
    const nextOrdinal = updates.ordinal !== undefined ? Number(updates.ordinal) : flight.ordinal;

    if (!nextDestId) {
        throw new Error('Destination terminal is required');
    }

    // Rule Refinement: Planned flights with null origin cannot have a Passenger Group
    if (nextStatus === 'Planned' && nextOriginId === null && nextGroupId !== null) {
        throw new Error('Planned flights with unknown origin cannot have a Passenger Group.');
    }

    const nextOriginTerm = nextOriginId ? getTerminalById(nextOriginId) : null;
    if (nextOriginId && !nextOriginTerm) {
        throw new Error('Origin terminal does not exist');
    }

    const draftFlight = {
        passengerGroupId: nextGroupId || null,
        originTerminalId: nextOriginId || null,
        destinationTerminalId: nextDestId,
        amount: nextAmount,
        status: nextStatus
    };

    validateFlightStructure(draftFlight);
    validateTerminalOriginRules(draftFlight);
    validatePassengerGroupAllocation(draftFlight, { excludeFlightId: id });

    // v1: Validate subflight rules if sourceFlightId provided
    if (nextSourceFlightId) {
        const subflightValidation = validateSubflightRules({ ...draftFlight, id, sourceFlightId: nextSourceFlightId }, flights);
        if (!subflightValidation.valid) {
            throw new Error(subflightValidation.error);
        }
    }

    const updated = flights.map(f => f.id === id ? { ...f, ...updates, status: nextStatus, amount: nextAmount, date: nextDate, sourceFlightId: nextSourceFlightId } : f);
    saveFlights(updated);
    try {
        if (allowCompletedUpdate && (flight.status === 'Completed' || nextStatus === 'Completed')) {
            const boundaryDate = [flight.date, nextDate]
                .map(value => String(value || '').slice(0, 10))
                .filter(Boolean)
                .sort()[0];
            if (boundaryDate) {
                recalculateAllocationsFromDate(boundaryDate);
            }
        }
        validateTerminalBalanceIntegrity();
    } catch (error) {
        saveFlights(flights);
        throw error;
    }
};

const deleteFlight = (id, options = {}) => {
    const flight = getFlightById(id);
    if (!flight) return;

    const allowCompletedDelete = options.allowCompleted === true;
    const childFlights = getFlights().filter(f => f.sourceFlightId === id);
    if (childFlights.length > 0) {
        throw new Error('Cannot delete flight with existing legs');
    }

    if (flight.status === 'Completed' && !allowCompletedDelete) {
        throw new Error('Cannot delete completed flight');
    }

    const previousFlights = getFlights();
    const updatedFlights = previousFlights.filter(f => f.id !== id);
    saveFlights(updatedFlights);

    try {
        if (flight.status === 'Completed' && allowCompletedDelete) {
            recalculateAllocationsFromDate(flight.date);
        }
        validateTerminalBalanceIntegrity();
    } catch (error) {
        saveFlights(previousFlights);
        throw error;
    }
};

const normalizeReplayBoundary = (value) => {
    if (!value) {
        throw new Error('Recalculation date is required');
    }
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        throw new Error('Invalid recalculation date');
    }
    return parsed.toISOString().slice(0, 10);
};

const getReplayBusinessDate = (flight) => String(flight?.date || flight?.createdAt || '').slice(0, 10);

const recalculateAllocationsFromDate = (date) => {
    const boundary = normalizeReplayBoundary(date);
    const flights = getFlights();
    const affectedFlights = flights.filter(f => getReplayBusinessDate(f) >= boundary);
    if (affectedFlights.length === 0) {
        return {
            boundaryDate: boundary,
            recalculatedFlights: 0,
            changedOrdinals: 0
        };
    }

    const sortedAffected = [...affectedFlights].sort(compareChronologicalFlights);
    const dayOrdinals = new Map();
    const replacements = new Map();
    let changedOrdinals = 0;

    sortedAffected.forEach(flight => {
        const businessDate = getReplayBusinessDate(flight);
        const nextOrdinal = dayOrdinals.get(businessDate) || 0;
        dayOrdinals.set(businessDate, nextOrdinal + 1);
        if ((flight.ordinal || 0) !== nextOrdinal) {
            changedOrdinals += 1;
        }
        replacements.set(flight.id, {
            ...flight,
            ordinal: nextOrdinal
        });
    });

    const normalizedFlights = flights.map(flight => replacements.get(flight.id) || flight);
    saveFlights(normalizedFlights);

    return {
        boundaryDate: boundary,
        recalculatedFlights: sortedAffected.length,
        changedOrdinals
    };
};

const recalculateFromDate = (date) => recalculateAllocationsFromDate(date);

// ============================================================================
// RETURN FLIGHTS (PHASE 2A – EXPLICIT REVERSALS FOR RETURNABLE EXPENSES)
// ============================================================================

/**
 * Create Return Flight (v1 freeze canonical).
 * - Single return engine for all Expense-origin reversals.
 * - Resolves root via sourceFlightId (if present) else selected flight.
 * - Enforces per-PG allocation cap and Planned-root fulfillment cap.
 * - Creates exactly one Completed return flight with sourceFlightId = resolved root.
 */
const createReturnFlight = (selectedFlightId, returnAmount, returnDate = null, returnName = null) => {
    if (!Number.isFinite(Number(returnAmount)) || Number(returnAmount) <= 0) {
        throw new Error('Return amount must be greater than 0');
    }

    const flights = getFlights();
    const terminals = getTerminals();
    const selectedFlight = flights.find(f => f.id === selectedFlightId);
    const caps = calculateReturnCaps(selectedFlightId, flights, terminals);
    if (!caps.valid) {
        throw new Error(caps.error);
    }
    if (returnAmount > caps.remainingAllocatableForPG) {
        throw new Error(
            `Cannot return ${returnAmount}. Only ${caps.remainingAllocatableForPG} remaining allocatable for passenger group.`
        );
    }
    if (caps.rootFlight.status === 'Planned' && returnAmount > caps.fulfilledAmount) {
        throw new Error(
            `Cannot return ${returnAmount}. Planned root fulfillment cap is ${caps.fulfilledAmount}.`
        );
    }
    if (returnAmount > caps.maxReturnable) {
        throw new Error(`Cannot return ${returnAmount}. Max returnable is ${caps.maxReturnable}.`);
    }

    const returnFlightName = returnName || `Return: ${selectedFlight.name}`;
    const effectiveDate = returnDate || caps.rootFlight.date;
    const returnFlight = buildFlight(
        returnFlightName,
        selectedFlight.passengerGroupId,
        selectedFlight.destinationTerminalId,  // Reverse: from Expense back to source
        selectedFlight.originTerminalId,
        Number(returnAmount),
        'Completed',
        effectiveDate,
        caps.rootFlight.id
    );

    // Validate structure and balance integrity
    validateFlightStructure(returnFlight);
    validateTerminalOriginRules(returnFlight);
    validatePassengerGroupAllocation(returnFlight);

    flights.push(returnFlight);
    saveFlights(flights);
    validateTerminalBalanceIntegrity();
    
    return returnFlight;
};

/**
 * Get Return Flights for a Parent (PHASE 2A – HELPER).
 * Returns all returns for a given parent flight.
 */
const getReturnFlightsForParent = (parentFlightId) => {
    return getFlights().filter(f => 
        f.sourceFlightId === parentFlightId && f.status === 'Completed'
    );
};

/**
 * Get Remaining Returnable for a Flight (PHASE 2A – HELPER).
 * Computes how much of a flight's amount can still be returned.
 */
const getRemainingReturnableAmount = (flightId) => {
    return calculateRemainingReturnable(flightId, getFlights());
};

/**
 * Check if Flight is Fully Returned (PHASE 2A – DERIVED, NOT STORED).
 * Used by UI for visual indicator. Not a structural property.
 */
const getFlightReturnStatus = (flightId) => {
    const flight = getFlightById(flightId);
    if (!flight || flight.status !== 'Completed' || flight.sourceFlightId !== null) {
        return { isReturnable: false, totalReturned: 0, isFullyReturned: false, remaining: 0 };
    }

    const terminals = getTerminals();
    const destTerm = terminals.find(t => t.id === flight.destinationTerminalId);
    
    if (!destTerm || destTerm.type !== 'Expense' || !destTerm.returnable) {
        return { isReturnable: false, totalReturned: 0, isFullyReturned: false, remaining: 0 };
    }

    const returns = getReturnFlightsForParent(flightId);
    const totalReturned = returns.reduce((sum, r) => sum + (r.amount || 0), 0);
    const remaining = calculateRemainingReturnable(flightId, getFlights());

    return {
        isReturnable: true,
        totalReturned,
        isFullyReturned: remaining === 0,
        remaining
    };
};

// ============================================================================
// CREDIT CHARGE FLOW (PHASE 2.5 – CREDIT AIRPORT LIFECYCLE)
// ============================================================================

/**
 * Create Credit Charge (PHASE 2.5).
 * Automated workflow when charging to credit:
 * A) Create liability PassengerGroup
 * B) Create load flight (null → Credit Income)
 * C) Create expense flight (Credit Income → destination)
 * D) Create planned repayment flights (3 months default)
 * 
 * No stored outstanding field. Everything derived from completed flights.
 */
const createCreditCharge = (destinationTerminalId, chargeAmount, repaymentMonths = 3, chargeName = null, chargeDate = null) => {
    if (!Number.isFinite(Number(chargeAmount)) || chargeAmount <= 0) {
        throw new Error('Charge amount must be greater than 0');
    }

    const creditIncomeTerminal = getCreditIncomeTerminal();
    const creditRepaymentTerminal = getCreditRepaymentTerminal();

    if (!creditIncomeTerminal) {
        throw new Error('No Credit Income terminal found');
    }
    if (!creditRepaymentTerminal) {
        throw new Error('No Credit Repayment terminal found');
    }

    const destTerminal = getTerminalById(destinationTerminalId);
    if (!destTerminal) {
        throw new Error('Destination terminal does not exist');
    }

    const flights = getFlights();
    const groups = getPassengerGroups();

    // A) Create liability PassengerGroup
    const liabilityPGName = chargeName || `Credit Charge: ${destTerminal.name}`;
    const creditAirportId = creditIncomeTerminal.airportId;
    const liabilityPG = buildPassengerGroup(liabilityPGName, chargeAmount, 'liability', creditAirportId);
    groups.push(liabilityPG);
    savePassengerGroups(groups);

    const baseDate = chargeDate ? new Date(chargeDate) : new Date();
    const createdFlights = [];

    try {
        // B) Create load flight (null → Credit Income)
        const loadFlight = buildFlight(
            `Load: ${liabilityPGName}`,
            liabilityPG.id,
            null,  // No origin (money appears in credit)
            creditIncomeTerminal.id,
            chargeAmount,
            'Completed',
            baseDate.toISOString(),
            null  // Not a return flight
        );
        flights.push(loadFlight);
        createdFlights.push(loadFlight);

        // C) Create expense flight (Credit Income → destination)
        const expenseFlight = buildFlight(
            chargeName || `Charge to ${destTerminal.name}`,
            liabilityPG.id,
            creditIncomeTerminal.id,
            destinationTerminalId,
            chargeAmount,
            'Completed',
            baseDate.toISOString(),
            null  // Not a return flight
        );
        flights.push(expenseFlight);
        createdFlights.push(expenseFlight);

        // D) Create planned repayment flights (split across months)
        const installmentAmount = chargeAmount / repaymentMonths;
        for (let i = 0; i < repaymentMonths; i++) {
            const repaymentDate = new Date(baseDate);
            repaymentDate.setMonth(repaymentDate.getMonth() + i + 1);
            
            const repaymentFlight = buildFlight(
                `Repayment: ${liabilityPGName}`,
                liabilityPG.id,
                null,  // Will come from transit (generically)
                creditRepaymentTerminal.id,
                installmentAmount,
                'Planned',
                repaymentDate.toISOString(),
                null  // Not a return flight
            );
            flights.push(repaymentFlight);
            createdFlights.push(repaymentFlight);
        }

        saveFlights(flights);
        validateTerminalBalanceIntegrity();

        return {
            liabilityPG,
            flights: createdFlights
        };
    } catch (error) {
        // Rollback: remove the PG if something failed
        savePassengerGroups(groups.filter(g => g.id !== liabilityPG.id));
        throw error;
    }
};

/**
 * Create Credit Repayment (PHASE 2.5).
 * User pays part/all of credit obligation:
 * From Transit → Credit Repayment
 */
const createCreditRepayment = (liabilityPGId, repaymentAmount, paymentDate = null) => {
    if (!Number.isFinite(Number(repaymentAmount)) || repaymentAmount <= 0) {
        throw new Error('Repayment amount must be greater than 0');
    }

    const pg = getPassengerGroupById(liabilityPGId);
    if (!pg || pg.type !== 'liability') {
        throw new Error('Passenger group must be a liability group');
    }

    const creditRepaymentTerminal = getCreditRepaymentTerminal();
    if (!creditRepaymentTerminal) {
        throw new Error('No Credit Repayment terminal found');
    }

    // Create repayment flight: null → Credit Repayment
    // (User will allocate from a transit or supply source)
    const repaymentFlight = buildFlight(
        `Repayment: ${pg.name}`,
        pg.id,
        null,  // Generically null; will be allocated from available funds
        creditRepaymentTerminal.id,
        repaymentAmount,
        'Completed',
        paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString(),
        null  // Not a return flight
    );

    const flights = getFlights();
    flights.push(repaymentFlight);
    saveFlights(flights);
    validateTerminalBalanceIntegrity();

    return repaymentFlight;
};

const getFlightById = (id) => getFlights().find(f => f.id === id);
const getFlightsByStatus = (status) => getFlights().filter(f => f.status === status);
const getFlightsByTerminal = (terminalId) => getFlights().filter(f =>
    f.originTerminalId === terminalId || f.destinationTerminalId === terminalId
);

// ============================================================================
// RUNNING BALANCE HELPERS (PHASE 2B – DERIVED)
// ============================================================================

/**
 * Get Terminal Ledger with Running Balance (PHASE 2B).
 * Replays all completed flights for a terminal chronologically.
 * Returns flights with attached _runningBalance.
 */
const getTerminalLedgerWithBalances = (terminalId) => {
    return getTerminalLedger(terminalId, getFlights());
};

/**
 * Get Passenger Group Ledger with Running Balance (PHASE 2B).
 * Replays all flights for a group chronologically.
 * Returns flights with attached _runningBalance.
 */
const getPassengerGroupLedgerWithBalances = (groupId) => {
    return getPassengerGroupLedger(groupId, getFlights());
};

/**
 * Get Running Balance for Flight in Terminal Context (PHASE 2B).
 * Computes balance by replaying up to that flight.
 */
const getTerminalRunningBalance = (terminalId, flightId) => {
    return getRunningBalanceAtFlight(terminalId, flightId, getFlights());
};

/**
 * Get Running Balance for Flight in Group Context (PHASE 2B).
 * Computes balance by replaying up to that flight.
 */
const getGroupRunningBalance = (groupId, flightId) => {
    return getGroupRunningBalanceAtFlight(groupId, flightId, getFlights());
};

// ============================================================================
// IMPORT/EXPORT
// ============================================================================
const loadTestData = (data) => {
    clearAllData();

    const ensureUniqueIds = (items, entityLabel) => {
        const seen = new Set();
        items.forEach(item => {
            const id = String(item?.id || '').trim();
            if (!id) {
                throw new Error(`${entityLabel} is missing an id.`);
            }
            if (seen.has(id)) {
                throw new Error(`Duplicate ${entityLabel} id detected: ${id}`);
            }
            seen.add(id);
        });
    };

    const incomingAirports = (data.airports || []).map(a => ({
        id: a.id,
        name: a.name,
        type: a.type || 'standard',
        status: a.status || 'active',
        createdAt: a.createdAt || new Date().toISOString()
    }));

    const incomingTerminals = (data.terminals || []).map(t => {
        const type = t.type || 'Transit';
        const returnable = type === 'Expense' ? !!t.returnable : false;
        return {
            id: t.id,
            name: t.name,
            alias: (t.alias !== undefined ? t.alias : t.code),
            airportId: t.airportId,
            type,
            returnable,
            isDefault: t.isDefault || false,
            createdAt: t.createdAt || new Date().toISOString()
        };
    });

    const incomingGroups = (data.passengerGroups || []).map(g => ({
        id: g.id,
        name: g.name,
        totalAmount: g.totalAmount,
        type: g.type || 'external',
        creditAirportId: g.creditAirportId || null,
        extendable: g.extendable || false,
        cargo: normalizeCargoEntries(g.cargo),
        createdAt: g.createdAt || new Date().toISOString()
    }));

    const incomingProducts = (data.products || []).map(product => ({
        id: product.id,
        code: normalizeProductCode(product.code || product.name),
        name: String(product.name || '').trim(),
        defaultUnitPrice: Number(product.defaultUnitPrice || 0),
        status: product.status || 'active',
        createdAt: product.createdAt || new Date().toISOString()
    }));

    const incomingFlights = (data.flights || []).map((f, idx) => {
        // Preserve ordinal from data if exists, otherwise calculate based on same-date flights
        const flightDate = f.date ? new Date(f.date).toDateString() : new Date().toDateString();
        const previousFlights = (data.flights || []).slice(0, idx);
        const sameDayCount = previousFlights.filter(pf => {
            const pDate = pf.date ? new Date(pf.date).toDateString() : new Date().toDateString();
            return pDate === flightDate;
        }).length;
        
        return {
            id: f.id,
            name: f.name || buildFlightName(f.originTerminalId || null, f.destinationTerminalId || null),
            passengerGroupId: f.passengerGroupId || null,
            originTerminalId: f.originTerminalId || null,
            destinationTerminalId: f.destinationTerminalId || null,
            amount: f.amount || 0,
            status: f.status === 'Planned' ? 'Planned' : 'Completed',
            date: f.date || new Date().toISOString(),
            ordinal: f.ordinal !== undefined ? f.ordinal : sameDayCount,
            createdAt: f.createdAt || new Date().toISOString(),
            sourceFlightId: f.sourceFlightId || null
        };
    });

    ensureUniqueIds(incomingAirports, 'airport');
    ensureUniqueIds(incomingTerminals, 'terminal');
    ensureUniqueIds(incomingGroups, 'passenger group');
    ensureUniqueIds(incomingFlights, 'flight');
    ensureUniqueIds(incomingProducts, 'product');
    {
        const seenProductCodes = new Set();
        incomingProducts.forEach(product => {
            const code = normalizeProductCode(product.code || product.name);
            if (seenProductCodes.has(code)) {
                throw new Error(`Duplicate product code detected: ${code}`);
            }
            seenProductCodes.add(code);
        });
    }

    incomingProducts.forEach(product => {
        if (!product.code) {
            throw new Error('Product code is required.');
        }
        if (!product.name) {
            throw new Error('Product name is required.');
        }
        if (!Number.isFinite(product.defaultUnitPrice) || product.defaultUnitPrice < 0) {
            throw new Error(`Product "${product.name}" has an invalid defaultUnitPrice.`);
        }
        if (!['active', 'inactive'].includes(product.status)) {
            throw new Error(`Product "${product.name}" has an invalid status.`);
        }
    });

    incomingGroups.forEach(group => {
        const cargoValidation = validateCargoEntries(group.cargo, group.totalAmount);
        if (cargoValidation.cargo) {
            cargoValidation.cargo.forEach(item => {
                const product = incomingProducts.find(candidate => candidate.id === item.productId);
                if (!product || product.status === 'inactive') {
                    throw new Error(`Passenger group "${group.name}" references an inactive or missing product in cargo.`);
                }
            });
            group.cargo = cargoValidation.cargo;
        } else {
            group.cargo = null;
        }
    });

    saveAirports(incomingAirports);
    saveTerminals(incomingTerminals);
    savePassengerGroups(incomingGroups);
    saveFlights(incomingFlights);
    saveProducts(incomingProducts);
    if (typeof syncIdStateFromData === 'function') {
        syncIdStateFromData({
            airports: incomingAirports,
            terminals: incomingTerminals,
            passengerGroups: incomingGroups,
            flights: incomingFlights,
            products: incomingProducts
        });
    }

    console.log('Test data loaded:', {
        airports: incomingAirports.length,
        terminals: incomingTerminals.length,
        passengerGroups: incomingGroups.length,
        flights: incomingFlights.length,
        products: incomingProducts.length
    });
};

// ============================================================================
// AGGREGATION FUNCTIONS
// ============================================================================
const getTotalIncome = () => {
    return getPassengerGroups()
        .reduce((sum, g) => {
            const isExternal = g.type ? (g.type === 'external') : true;
            return isExternal ? sum + (g.totalAmount || 0) : sum;
        }, 0);
};

const getTotalExpenses = () => {
    const completedFlights = getFlights().filter(f => f.status === 'Completed');
    return completedFlights.reduce((sum, f) => sum + (f.amount || 0), 0);
};

const getBalance = () => getTotalIncome() - getTotalExpenses();

const getAvailablePassengersAmount = () => {
    const groups = getPassengerGroups();
    const flights = getFlights();
    const terminals = getTerminals();

    const terminalById = terminals.reduce((acc, t) => {
        acc[t.id] = t;
        return acc;
    }, {});

    return groups.reduce((sum, group) => {
        const allocated = flights
            .filter(f => f.passengerGroupId === group.id && f.status === 'Completed')
            .filter(f => {
                const origin = f.originTerminalId ? terminalById[f.originTerminalId] : null;
                return origin && (origin.type === 'Income' || origin.type === 'Liability');
            })
            .reduce((fSum, f) => fSum + (f.amount || 0), 0);
        const remaining = (group.totalAmount || 0) - allocated;
        return sum + Math.max(0, remaining);
    }, 0);
};

const getPlannedPassengersAmount = () => {
    const flights = getFlights().filter(f => f.status === 'Planned');
    return flights.reduce((sum, f) => sum + (f.amount || 0), 0);
};

const getAvailableVsPlanned = () => getAvailablePassengersAmount() - getPlannedPassengersAmount();

const getMoneyAtTerminal = (terminalId) => {
    const flights = getFlights().filter(f => f.status === 'Completed');
    const incoming = flights
        .filter(f => f.destinationTerminalId === terminalId)
        .reduce((sum, f) => sum + (f.amount || 0), 0);
    const outgoing = flights
        .filter(f => f.originTerminalId === terminalId)
        .reduce((sum, f) => sum + (f.amount || 0), 0);
    return incoming - outgoing;
};

// ============================================================================
// VARIANCE REPORTING
// ============================================================================
const getVarianceSummary = () => {
    return {
        count: 0,
        totalPlanned: 0,
        totalActual: 0,
        totalVariance: 0,
        variancePercent: 0,
        overBudgetCount: 0,
        underBudgetCount: 0,
        exactCount: 0
    };
};

const getVarianceByAirportType = () => ({
    Income: { planned: 0, actual: 0, variance: 0, count: 0 },
    Expense: { planned: 0, actual: 0, variance: 0, count: 0 }
});

const getVarianceByTerminal = () => ([]);

const getTopVarianceFlights = (limit = 5) => ([]);

// ============================================================================
// CONTROL TOWER METRICS (v1 UX)
// ============================================================================

// Waiting Passengers: External groups with remaining amount > 0
const getWaitingPassengers = () => {
    const groups = getPassengerGroups();
    const flights = getFlights();
    const terminals = getTerminals();

    const terminalById = terminals.reduce((acc, t) => {
        acc[t.id] = t;
        return acc;
    }, {});

    return groups
        .filter(g => g.type === 'external' || !g.type)
        .map(g => {
            const allocated = flights
                .filter(f => f.passengerGroupId === g.id && f.status === 'Completed')
                .filter(f => {
                    const origin = f.originTerminalId ? terminalById[f.originTerminalId] : null;
                    return origin && (origin.type === 'Income' || origin.type === 'Liability');
                })
                .reduce((sum, f) => sum + (f.amount || 0), 0);
            const remaining = (g.totalAmount || 0) - allocated;
            return { ...g, allocated, remaining, isWaiting: remaining > 0 };
        })
        .filter(g => g.isWaiting);
};

// One-way Travelers: Completed flights to Expense terminals
const getOneWayTravelers = () => {
    const flights = getFlights();
    const terminals = getTerminals();

    const terminalById = terminals.reduce((acc, t) => {
        acc[t.id] = t;
        return acc;
    }, {});

    return flights
        .filter(f => f.status === 'Completed')
        .filter(f => {
            const dest = f.destinationTerminalId ? terminalById[f.destinationTerminalId] : null;
            const origin = f.originTerminalId ? terminalById[f.originTerminalId] : null;
            return dest && dest.type === 'Expense' && origin && (origin.type === 'Income' || origin.type === 'Transit');
        });
};

const getOneWayTravelersTotal = () => {
    return getOneWayTravelers().reduce((sum, f) => sum + (f.amount || 0), 0);
};

// Assets: Total balance at returnable Expense terminals
const getAssetsTotal = () => {
    const terminals = getTerminals();
    return terminals
        .filter(t => t.type === 'Expense' && t.returnable)
        .reduce((sum, t) => sum + getMoneyAtTerminal(t.id), 0);
};

// In Transit: Total amount at Transit terminals from completed flights
const getInTransitTotal = () => {
    const flights = getFlights();
    const terminals = getTerminals();

    const terminalById = terminals.reduce((acc, t) => {
        acc[t.id] = t;
        return acc;
    }, {});

    return flights
        .filter(f => f.status === 'Completed')
        .filter(f => {
            const dest = f.destinationTerminalId ? terminalById[f.destinationTerminalId] : null;
            return dest && dest.type === 'Transit';
        })
        .reduce((sum, f) => sum + (f.amount || 0), 0);
};

// Liabilities: Metrics for liability PassengerGroups
const getLiabilitiesMetrics = () => {
    const groups = getPassengerGroups();
    const flights = getFlights();

    const liabilityGroups = groups.filter(g => g.type === 'liability');

    let totalRemaining = 0;
    let totalDelivered = 0;

    liabilityGroups.forEach(group => {
        const paidAmount = flights
            .filter(f => f.status === 'Completed' && f.passengerGroupId === group.id)
            .reduce((sum, f) => sum + (f.amount || 0), 0);
        
        totalDelivered += paidAmount;
        totalRemaining += Math.max(0, group.totalAmount - paidAmount);
    });

    return { reserved: totalRemaining, delivered: totalDelivered };
};





