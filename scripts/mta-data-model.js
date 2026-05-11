/**
 * mta-data-model.js - Canonical Financial Data Model (v1)
 * 
 * Factory functions for creating entities.
 * All balances and derived metrics computed from flight data only.
 * No side effects. Pure data structures.
 */

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Build Airport object.
 * @param {string} name - Airport name
 * @param {string} status - Airport status: 'active' | 'inactive' (default: 'active')
 * @returns {Object} Airport object with id, name, status, createdAt
 */
const buildAirport = (name, type = 'standard', status = 'active') => ({
    id: generateId('APT'),
    name,
    type: type || 'standard',
    status: status || 'active',
    createdAt: new Date().toISOString()
});

/**
 * Build Terminal object.
 * v1 Enhancement: Added isDefault flag for terminal preferences per type.
 * v1 Lifecycle: Added status flag for lifecycle management.
 * @param {string} airportId - Parent airport ID
 * @param {string} name - Terminal name
 * @param {string} alias - Terminal code/alias
 * @param {string} type - Terminal type: 'Income' | 'Transit' | 'Expense'
 * @param {boolean} returnable - Can withdrawal/reallocation
 * @param {boolean} isDefault - Is the default terminal for this type
 * @param {string} status - Terminal status: 'active' | 'inactive' (default: 'active')
 * @returns {Object} Terminal object
 */
const buildTerminal = (airportId, name, alias, type = 'Transit', returnable = false, isDefault = false, status = 'active') => ({
    id: generateId('TERM'),
    airportId,
    type,
    name,
    alias,
    returnable: returnable || false,
    isDefault: isDefault || false,
    status: status || 'active',
    createdAt: new Date().toISOString()
});

/**
 * Build PassengerGroup object.
 * @param {string} name - Group name
 * @param {number} totalAmount - Total funds in this group (total committed principal if type = 'liability')
 * @param {string} type - Group type: 'external' (Open Transit) | 'liability' (Restricted Transit/Credit)
 *                        NOTE: 'internal' is system-reserved for automatic monthly close processes (v2.0+)
 * @param {string|null} creditAirportId - Airport ID for credit groups (required if type = 'liability')
 * @param {boolean} extendable - Revolving credit (default false). Only applies if type = 'liability'
 * @param {Array|null} cargo - Optional descriptive cargo composition
 * @param {string|null} groupName - Optional display grouping label for standard arrivals
 * @returns {Object} PassengerGroup object
 */
const buildPassengerGroup = (name, totalAmount, type = 'external', creditAirportId = null, extendable = false, cargo = null, groupName = null) => ({
    id: generateId('PG'),
    name,
    totalAmount: parseFloat(totalAmount),
    type: type || 'external',
    creditAirportId: creditAirportId || null,
    extendable: type === 'liability' ? Boolean(extendable) : false,
    cargo: normalizeCargoEntries(cargo),
    groupName: type === 'liability' ? null : (String(groupName || '').trim() || null),
    createdAt: new Date().toISOString()
});

/**
 * Build Product object.
 * @param {string} code - Product code
 * @param {string} name - Product name
 * @param {number} defaultUnitPrice - Default unit price
 * @param {string} status - Product status: 'active' | 'inactive'
 * @returns {Object} Product object
 */
const normalizeProductCode = (value) => String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);

const buildProduct = (code, name, defaultUnitPrice, status = 'active') => ({
    id: generateId('PRD'),
    code: normalizeProductCode(code),
    name: String(name || '').trim(),
    defaultUnitPrice: parseFloat(defaultUnitPrice),
    status: status || 'active',
    createdAt: new Date().toISOString()
});

const normalizeCargoEntries = (cargo) => {
    if (!Array.isArray(cargo) || cargo.length === 0) {
        return null;
    }

    return cargo.map(item => ({
        productId: String(item?.productId || '').trim(),
        quantity: Number(item?.quantity),
        unitPrice: Number(item?.unitPrice),
        amount: Number(item?.amount)
    }));
};

const validateCargoEntries = (cargo, expectedTotalAmount = null) => {
    const normalizedCargo = normalizeCargoEntries(cargo);
    if (!normalizedCargo) {
        return { valid: true, cargo: null, totalAmount: 0 };
    }

    normalizedCargo.forEach((item, index) => {
        if (!item.productId) {
            throw new Error(`Cargo line ${index + 1}: productId is required`);
        }
        if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
            throw new Error(`Cargo line ${index + 1}: quantity must be greater than 0`);
        }
        if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
            throw new Error(`Cargo line ${index + 1}: unit price must be greater than or equal to 0`);
        }

        const calculatedAmount = Number((item.quantity * item.unitPrice).toFixed(2));
        const providedAmount = Number(item.amount);
        if (!Number.isFinite(providedAmount) || Math.abs(providedAmount - calculatedAmount) > 0.000001) {
            throw new Error(`Cargo line ${index + 1}: amount must equal quantity * unit price`);
        }
    });

    const totalAmount = Number(normalizedCargo.reduce((sum, item) => sum + item.amount, 0).toFixed(2));
    if (expectedTotalAmount !== null && expectedTotalAmount !== undefined) {
        const normalizedExpected = Number(Number(expectedTotalAmount).toFixed(2));
        if (!Number.isFinite(normalizedExpected) || Math.abs(totalAmount - normalizedExpected) > 0.000001) {
            throw new Error('Cargo total must equal passenger group total amount');
        }
    }

    return { valid: true, cargo: normalizedCargo, totalAmount };
};

/**
 * Build Flight object.
 * v1 Enhancement: Added date (accounting date) and sourceFlightId (for subflights with depth=1).
 * Signature optimized for typical usage patterns from mta-business.js
 * @param {string} name - Flight name (auto-generated if empty)
 * @param {string} passengerGroupId - Passenger group (null only if Planned)
 * @param {string|null} originTerminalId - Origin terminal (null only if Planned)
 * @param {string} destinationTerminalId - Required
 * @param {number} amount - Money being moved
 * @param {string} status - 'Planned' or 'Completed'
 * @param {string|Date} date - Accounting date (when flight is recorded/scheduled)
 * @param {string|null} sourceFlightId - Parent flight ID for subflights (null for root)
 * @param {number|null} ordinalOverride - Explicit ordering override within same business date
 * @returns {Object} Flight object
 */
const buildFlight = (name, passengerGroupId, originTerminalId, destinationTerminalId, amount, status, date = null, sourceFlightId = null, ordinalOverride = null) => {
    // Convert input date to ISO format for storage
    // Input: "YYYY-MM-DD" from HTML input or ISO string or Date object
    // Output: ISO string (stored in flight.date)
    
    let flightDateIso;
    
    if (date) {
        if (typeof date === 'string') {
            if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                // Input format: YYYY-MM-DD
                // Convert to ISO by appending time: "2026-02-21" Ã¢â€ â€™ "2026-02-21T00:00:00.000Z"
                flightDateIso = date + 'T00:00:00.000Z';
            } else {
                // Assume already ISO or parseable format
                flightDateIso = new Date(date).toISOString();
            }
        } else if (date instanceof Date) {
            flightDateIso = date.toISOString();
        } else {
            flightDateIso = new Date(date).toISOString();
        }
    } else {
        flightDateIso = new Date().toISOString();
    }
    
    // Validate ISO format
    const testDate = new Date(flightDateIso);
    if (isNaN(testDate.getTime())) {
        throw new Error('Invalid time value');
    }
    
    // Get the business-date portion only for same-day flight counting
    const flightBusinessDate = flightDateIso.slice(0, 10);
    const flights = getFlights();
    const sameDayFlights = flights.filter(f => {
        try {
            return String(f.date || '').slice(0, 10) === flightBusinessDate;
        } catch {
            return false;
        }
    });
    const ordinal = ordinalOverride !== null && ordinalOverride !== undefined
        ? Number(ordinalOverride)
        : sameDayFlights.length;
    
    return {
        id: generateId('FLT'),
        name,
        passengerGroupId: passengerGroupId || null,
        originTerminalId: originTerminalId || null,
        destinationTerminalId: destinationTerminalId,
        amount: parseFloat(amount),
        status: status || 'Planned',
        date: flightDateIso,
        ordinal: ordinal,
        createdAt: new Date().toISOString(),
        sourceFlightId: sourceFlightId || null
    };
};

// ============================================================================
// SUBFLIGHT VALIDATION (v1 NEW Ã¢â‚¬â€œ Depth = 1)
// ============================================================================

/**
 * Validate Subflight Rules (NEW for v1).
 * Enforces depth = 1 and parent eligibility constraints.
 * Called by mta-business.js before creating/updating flights with sourceFlightId.
 */
const validateSubflightRules = (flight, allFlights) => {
    // Root flights (sourceFlightId = null) are always valid structurally
    if (!flight.sourceFlightId) {
        return { valid: true };
    }

    // This is a child flight; validate parent relationship
    const parentFlight = allFlights.find(f => f.id === flight.sourceFlightId);
    if (!parentFlight) {
        return {
            valid: false,
            error: 'Parent flight not found.'
        };
    }

    // Parent must be a root flight (sourceFlightId = null)
    if (parentFlight.sourceFlightId !== null) {
        return {
            valid: false,
            error: 'Parent flight must be a root flight (sourceFlightId = null). Subflights cannot have children.'
        };
    }

    // Parent may be:
    // - Planned root (commitment children)
    // - Completed root (standalone return root)
    if (parentFlight.status !== 'Planned' && parentFlight.status !== 'Completed') {
        return {
            valid: false,
            error: 'Parent flight must be Planned or Completed root flight.'
        };
    }

    if (parentFlight.status === 'Completed' && flight.status !== 'Completed') {
        return {
            valid: false,
            error: 'Completed roots can only have Completed children.'
        };
    }

    // Child flight cannot have children (depth = 1)
    const hasChildrenUnderChild = allFlights.some(f => f.sourceFlightId === flight.id);
    if (hasChildrenUnderChild) {
        return {
            valid: false,
            error: 'Subflights cannot have children (depth must be exactly 1).'
        };
    }

    return { valid: true };
};

// ============================================================================
// CREDIT AIRPORT VALIDATION (PHASE 2.5 Ã¢â‚¬â€œ FORMALIZATION)
// ============================================================================

/**
 * Validate Credit Airport Structure.
 * If airport.type === "credit", it MUST contain exactly:
 * - 1 Income terminal (Credit Income)
 * - 1 Expense terminal (Credit Repayment)
 * No Transit. No additional terminals.
 */
const validateCreditAirportStructure = (airport, allTerminals) => {
    if (airport.type !== 'credit') {
        return { valid: true };
    }

    const creditTerminals = allTerminals.filter(t => t.airportId === airport.id);
    
    const incomeTerminals = creditTerminals.filter(t => t.type === 'Income');
    const expenseTerminals = creditTerminals.filter(t => t.type === 'Expense');
    const transitTerminals = creditTerminals.filter(t => t.type === 'Transit');

    if (transitTerminals.length > 0) {
        return {
            valid: false,
            error: 'Credit airport cannot have Transit terminals.'
        };
    }

    if (incomeTerminals.length !== 1) {
        return {
            valid: false,
            error: `Credit airport must have exactly 1 Income terminal. Found: ${incomeTerminals.length}`
        };
    }

    if (expenseTerminals.length !== 1) {
        return {
            valid: false,
            error: `Credit airport must have exactly 1 Expense terminal. Found: ${expenseTerminals.length}`
        };
    }

    if (creditTerminals.length !== 2) {
        return {
            valid: false,
            error: `Credit airport must have exactly 2 terminals (1 Income + 1 Expense). Found: ${creditTerminals.length}`
        };
    }

    return { valid: true };
};

// ============================================================================
// RETURN FLIGHT VALIDATION (PHASE 2A Ã¢â‚¬â€œ EXPLICIT REVERSALS)
// ============================================================================

/**
 * Validate Return Flight Eligibility (PHASE 2A).
 * Canonical v1 freeze:
 * - Selected flight must be Completed and reversible (destination Expense returnable)
 * - Return-of-return is forbidden
 * - Root is resolved by sourceFlightId when present, otherwise selected flight
 */
const isContractReturnFlight = (flight, allTerminals) => {
    if (!flight || flight.status !== 'Completed' || !flight.originTerminalId) return false;
    const originTerm = allTerminals.find(t => t.id === flight.originTerminalId);
    return !!(originTerm && originTerm.type === 'Expense' && originTerm.returnable === true);
};

const resolveReturnRootFlight = (selectedFlight, allFlights) => {
    if (!selectedFlight) return null;
    if (selectedFlight.sourceFlightId) {
        return allFlights.find(f => f.id === selectedFlight.sourceFlightId) || null;
    }
    return selectedFlight;
};

const validateReturnFlightEligibility = (selectedFlight, allFlights, allTerminals) => {
    if (!selectedFlight) {
        return {
            valid: false,
            error: 'Selected flight not found.'
        };
    }

    if (selectedFlight.status !== 'Completed') {
        return {
            valid: false,
            error: 'Only completed flights can be returned.'
        };
    }

    if (isContractReturnFlight(selectedFlight, allTerminals)) {
        return {
            valid: false,
            error: 'Return-of-return is not allowed. Cannot return a return flight.'
        };
    }

    if (!selectedFlight.passengerGroupId) {
        return {
            valid: false,
            error: 'Passenger group is required for return flights.'
        };
    }

    const selectedDest = allTerminals.find(t => t.id === selectedFlight.destinationTerminalId);
    if (!selectedDest || selectedDest.type !== 'Expense' || selectedDest.returnable !== true) {
        return {
            valid: false,
            error: 'Selected flight destination must be a returnable Expense terminal.'
        };
    }

    const selectedOrigin = allTerminals.find(t => t.id === selectedFlight.originTerminalId);
    if (!selectedOrigin) {
        return {
            valid: false,
            error: 'Selected flight origin terminal is required.'
        };
    }

    const rootFlight = resolveReturnRootFlight(selectedFlight, allFlights);
    if (!rootFlight) {
        return {
            valid: false,
            error: 'Root flight not found.'
        };
    }

    if (rootFlight.id === selectedFlight.id && selectedFlight.sourceFlightId) {
        return {
            valid: false,
            error: 'Invalid root resolution.'
        };
    }

    if (rootFlight.sourceFlightId !== null) {
        return {
            valid: false,
            error: 'Root flight must be depth 0.'
        };
    }

    return { valid: true, rootFlight, selectedFlight };
};

/**
 * Calculate canonical return caps for a selected flight.
 */
const calculateReturnCaps = (selectedFlightId, allFlights, allTerminals) => {
    const selectedFlight = allFlights.find(f => f.id === selectedFlightId);
    const validation = validateReturnFlightEligibility(selectedFlight, allFlights, allTerminals);
    if (!validation.valid) {
        return {
            valid: false,
            error: validation.error,
            allocatedForPG: 0,
            returnedForPG: 0,
            remainingAllocatableForPG: 0,
            fulfilledAmount: 0,
            maxReturnable: 0,
            rootFlight: null,
            selectedFlight: selectedFlight || null
        };
    }

    const rootFlight = validation.rootFlight;
    const passengerGroupId = selectedFlight.passengerGroupId;

    const rootScope = allFlights.filter(f =>
        f.status === 'Completed' &&
        f.passengerGroupId === passengerGroupId &&
        (f.id === rootFlight.id || f.sourceFlightId === rootFlight.id)
    );

    const allocatedForPG = rootScope
        .filter(f => !isContractReturnFlight(f, allTerminals))
        .reduce((sum, f) => sum + (f.amount || 0), 0);

    const returnedForPG = allFlights
        .filter(f =>
            f.status === 'Completed' &&
            f.sourceFlightId === rootFlight.id &&
            f.passengerGroupId === passengerGroupId &&
            isContractReturnFlight(f, allTerminals)
        )
        .reduce((sum, f) => sum + (f.amount || 0), 0);

    const remainingAllocatableForPG = Math.max(0, allocatedForPG - returnedForPG);

    let maxReturnable = remainingAllocatableForPG;
    let fulfilledAmount = 0;
    if (rootFlight.status === 'Planned') {
        fulfilledAmount = Math.max(0, calculateSignedFulfilledAmount(rootFlight, allFlights, allTerminals));
        maxReturnable = Math.min(maxReturnable, fulfilledAmount);
    }

    return {
        valid: true,
        error: null,
        allocatedForPG,
        returnedForPG,
        remainingAllocatableForPG,
        fulfilledAmount,
        maxReturnable: Math.max(0, maxReturnable),
        rootFlight,
        selectedFlight
    };
};

const calculateRemainingReturnable = (selectedFlightId, allFlights) => {
    const terminals = getTerminals();
    const caps = calculateReturnCaps(selectedFlightId, allFlights, terminals);
    if (!caps.valid) return 0;
    return caps.maxReturnable;
};

/**
 * Check if Flight is Fully Returned (PHASE 2A Ã¢â‚¬â€œ DERIVED, NOT STORED).
 * Compares sum of returns against original amount.
 * This is informational only Ã¢â‚¬â€ no structural mutation.
 */
const isFullyReturned = (flightId, allFlights) => {
    const flight = allFlights.find(f => f.id === flightId);
    if (!flight) return false;

    const returns = allFlights.filter(f => 
        f.sourceFlightId === flightId && f.status === 'Completed'
    );
    const totalReturned = returns.reduce((sum, r) => sum + (r.amount || 0), 0);
    return totalReturned >= flight.amount;
};

// ============================================================================
// COMPUTATION FUNCTIONS (PURE Ã¢â‚¬â€œ DERIVED ONLY, DO NOT STORE)
// ===========================================================================

/**
 * Calculate Terminal Balance (v1 Canonical).
 * For a given terminal:
 *   balance = sum(completed flights where destinationTerminalId = T.id)
 *           - sum(completed flights where originTerminalId = T.id)
 */
const calculateTerminalBalance = (terminalId, allFlights) => {
    const completedFlights = allFlights.filter(f => f.status === 'Completed');
    
    const incoming = completedFlights
        .filter(f => f.destinationTerminalId === terminalId)
        .reduce((sum, f) => sum + (f.amount || 0), 0);

    const outgoing = completedFlights
        .filter(f => f.originTerminalId === terminalId)
        .reduce((sum, f) => sum + (f.amount || 0), 0);

    return incoming - outgoing;
};

// ============================================================================
// RUNNING BALANCE CALCULATIONS (PHASE 2B Ã¢â‚¬â€œ DERIVED, CHRONOLOGICAL REPLAY)
// ============================================================================

const getBusinessDateValue = (flight) => {
    const businessDate = String(flight?.date || flight?.createdAt || '').slice(0, 10);
    const ts = new Date(`${businessDate}T00:00:00.000Z`).getTime();
    return Number.isNaN(ts) ? 0 : ts;
};

const getCreatedAtValue = (flight) => {
    const ts = new Date(flight?.createdAt || '').getTime();
    return Number.isNaN(ts) ? 0 : ts;
};

const compareChronologicalFlights = (a, b) => {
    const businessDateCompare = getBusinessDateValue(a) - getBusinessDateValue(b);
    if (businessDateCompare !== 0) return businessDateCompare;
    const createdCompare = getCreatedAtValue(a) - getCreatedAtValue(b);
    if (createdCompare !== 0) return createdCompare;
    const ordinalCompare = (a.ordinal || 0) - (b.ordinal || 0);
    if (ordinalCompare !== 0) return ordinalCompare;
    return (a.id || '').localeCompare(b.id || '');
};

/**
 * Calculate Terminal Running Balance (PHASE 2B).
 * Replays all completed flights in chronological order.
 * Returns array of flights with attached running balance.
 * 
 * No stored fields, no mutations. Pure derived computation.
 */
const getTerminalLedger = (terminalId, allFlights) => {
    const completedFlights = allFlights.filter(f => 
        f.status === 'Completed' && 
        (f.destinationTerminalId === terminalId || f.originTerminalId === terminalId)
    );

    const sorted = completedFlights.sort(compareChronologicalFlights);

    // Replay and compute running balance
    let runningBalance = 0;
    const ledger = sorted.map(flight => {
        if (flight.destinationTerminalId === terminalId) {
            runningBalance += flight.amount;
        }
        if (flight.originTerminalId === terminalId) {
            runningBalance -= flight.amount;
        }
        
        return {
            ...flight,
            _runningBalance: runningBalance
        };
    });

    return ledger;
};

/**
 * Calculate Passenger Group Running Balance (PHASE 2B).
 * Replays all flights for a group in chronological order.
 * Returns array of flights with attached running balance.
 * 
 * Remaining = PG.totalAmount Ã¢Ë†â€™ SUM(Completed outgoing) + SUM(Completed return)
 * 
 * Planned flights do NOT affect balance (only Completed).
 * Return flights (origin Ã¢â€°Â  null) restore balance.
 * Outgoing flights (origin = null or Income origin) consume balance.
 * No stored fields, no mutations. Pure derived computation.
 */
const getPassengerGroupLedger = (groupId, allFlights) => {
    const group = getPassengerGroupById(groupId);
    if (!group) return [];
    const groupFlights = allFlights.filter(f =>
        f.passengerGroupId === groupId && f.status === 'Completed'
    );
    const terminals = getTerminals();
    const terminalById = terminals.reduce((acc, t) => {
        acc[t.id] = t;
        return acc;
    }, {});
    const sorted = groupFlights.sort(compareChronologicalFlights);
    // Build remaining chronologically from the actual completed flow.
    // This avoids leaking future extendable-liability growth into earlier rows.
    let remaining = 0;
    const ledger = sorted.map(flight => {
        // Determine if this is a return flight (origin is Expense terminal)
        const originTerminal = flight.originTerminalId ? terminalById[flight.originTerminalId] : null;
        const destTerminal = flight.destinationTerminalId ? terminalById[flight.destinationTerminalId] : null;
        const destType = destTerminal?.type;
        const isReturn = originTerminal && originTerminal.type === 'Expense';
        if (flight.originTerminalId === null) {
            // External injection (null -> Income): add to remaining
            remaining += flight.amount;
        } else if (isReturn) {
            // Return flight (from Expense): add to remaining
            remaining += flight.amount;
        } else if (destType === 'Expense') {
            // Money going to Expense: subtract from remaining
            remaining -= flight.amount;
        }
        // Else: Transit, Income (non-return), or other destinations do not affect remaining
        return {
            ...flight,
            _runningBalance: remaining,
            _isPlanned: false
        };
    });
    return ledger;
};
/**
 * Calculate Terminal Running Balance for Specific Flight (PHASE 2B).
 * Returns the running balance AT that flight for a terminal.
 * Used for inline display in lists
 */
const getRunningBalanceAtFlight = (terminalId, flightId, allFlights) => {
    const ledger = getTerminalLedger(terminalId, allFlights);
    const flight = ledger.find(f => f.id === flightId);
    return flight ? flight._runningBalance : 0;
};

/**
 * Calculate Passenger Group Running Balance for Specific Flight (PHASE 2B).
 * Returns the running balance AT that flight for a group.
 * Used for inline display in lists
 */
const getGroupRunningBalanceAtFlight = (groupId, flightId, allFlights) => {
    const ledger = getPassengerGroupLedger(groupId, allFlights);
    const flight = ledger.find(f => f.id === flightId);
    return flight ? flight._runningBalance : 0;
};

/**
 * Calculate Waiting Passengers (Control Tower Metric).
 * Income + Transit terminal balances (money not yet spent).
 */
const calculateWaitingPassengers = (allTerminals, allFlights) => {
    const waitingTerminals = allTerminals.filter(t => t.type === 'Income' || t.type === 'Transit');
    return waitingTerminals.reduce(
        (sum, terminal) => sum + calculateTerminalBalance(terminal.id, allFlights),
        0
    );
};

/**
 * Calculate Roundtrip Travelers (Control Tower Metric).
 * Returnable Expense terminal balances (money that can be reallocated).
 */
const calculateRoundtripTravelers = (allTerminals, allFlights) => {
    const returnableExpenseTerminals = allTerminals.filter(
        t => t.type === 'Expense' && t.returnable === true
    );

    return returnableExpenseTerminals.reduce(
        (sum, terminal) => sum + calculateTerminalBalance(terminal.id, allFlights),
        0
    );
};

/**
 * Calculate One-Way Travelers (Control Tower Metric).
 * Completed flights to non-returnable Expense terminals (money definitively gone).
 */
const calculateOneWayTravelers = (allTerminals, allFlights) => {
    const nonReturnableExpenseTerminals = allTerminals.filter(
        t => t.type === 'Expense' && t.returnable === false
    );

    const terminalIds = new Set(nonReturnableExpenseTerminals.map(t => t.id));
    const completedFlights = allFlights.filter(f => f.status === 'Completed');

    return completedFlights
        .filter(f => terminalIds.has(f.destinationTerminalId))
        .reduce((sum, f) => sum + (f.amount || 0), 0);
};

/**
 * Calculate Returned Travelers (Control Tower Metric).
 * Completed flights that originate from returnable Expense terminals
 * and therefore restore money to internal availability.
 */
const calculateReturnedTravelers = (allTerminals, allFlights) => {
    const returnableExpenseTerminalIds = new Set(
        allTerminals
            .filter(t => t.type === 'Expense' && t.returnable === true)
            .map(t => t.id)
    );

    return allFlights
        .filter(f => f.status === 'Completed')
        .filter(f => returnableExpenseTerminalIds.has(f.originTerminalId))
        .reduce((sum, f) => sum + (f.amount || 0), 0);
};

/**
 * Get Liability Commitment Metrics (Control Tower Metric v1).
 * For PassengerGroup.type = 'liability', derives:
 *   PaidAmount = Sum(Completed flights for this PG)
 *   RemainingCommitment = max(0, totalAmount - PaidAmount)
 *   OverpaidAmount = max(0, PaidAmount - totalAmount)
 * Pass in allPassengerGroups to fetch group data within this function.
 */
const getLiabilityMetrics = (passengerGroupId, allFlights, allPassengerGroups) => {
    const group = allPassengerGroups.find(g => g.id === passengerGroupId);
    if (!group || group.type !== 'liability') {
        return null;
    }

    const paidAmount = allFlights
        .filter(f => f.status === 'Completed' && f.passengerGroupId === passengerGroupId)
        .reduce((sum, f) => sum + (f.amount || 0), 0);

    const remainingCommitment = Math.max(0, group.totalAmount - paidAmount);
    const overpaidAmount = Math.max(0, paidAmount - group.totalAmount);

    return {
        paidAmount,
        remainingCommitment,
        overpaidAmount,
        totalCommitted: group.totalAmount
    };
};

/**
 * Calculate Total Liability Commitments (Control Tower Metric v1).
 * Sum of RemainingCommitment across all liability PassengerGroups.
 */
const calculateLiabilityCommitments = (allPassengerGroups, allFlights) => {
    return allPassengerGroups
        .filter(pg => pg.type === 'liability')
        .reduce((sum, pg) => {
            const metrics = getLiabilityMetrics(pg.id, allFlights, allPassengerGroups);
            return sum + (metrics ? metrics.remainingCommitment : 0);
        }, 0);
};

/**
 * Calculate Planned Spending (Control Tower Metric v1).
 * COMMITMENT LAYER CONTRACT: TotalCommitments = Sum(PendingCommitment for all Planned flights)
 * PendingCommitment = Planned.amount - Sum(signed child amounts)
 * Fulfilled Planned flights (PendingCommitment = 0) excluded from commitment statistics
 * INCLUDES system-generated FIFO grouping parents (passengerGroupId = null)
 */
const calculateSignedFulfilledAmount = (plannedFlight, allFlights, allTerminals) => {
    if (!plannedFlight || plannedFlight.status !== 'Planned') return 0;

    const terminalById = (allTerminals || []).reduce((acc, terminal) => {
        acc[terminal.id] = terminal;
        return acc;
    }, {});

    const children = allFlights.filter(f =>
        f.sourceFlightId === plannedFlight.id && f.status === 'Completed'
    );

    return children.reduce((sum, child) => {
        const origin = child.originTerminalId ? terminalById[child.originTerminalId] : null;
        const signedAmount = origin && origin.type === 'Expense' && origin.returnable === true
            ? -(child.amount || 0)
            : (child.amount || 0);
        return sum + signedAmount;
    }, 0);
};

const calculatePendingCommitmentForPlanned = (plannedFlight, allFlights, allTerminals) => {
    if (!plannedFlight || plannedFlight.status !== 'Planned') return 0;
    const fulfilledAmount = calculateSignedFulfilledAmount(plannedFlight, allFlights, allTerminals);
    return Math.max(0, (plannedFlight.amount || 0) - fulfilledAmount);
};

const calculatePlannedSpending = (allPassengerGroups, allFlights) => {
    const allTerminals = getTerminals();

    // ALL Planned flights (includes both user-created with PG and system-generated parents with PG=null)
    return allFlights
        .filter(f => f.status === 'Planned')  // Include ALL Planned, not just non-null PG
        .map(plannedFlight => calculatePendingCommitmentForPlanned(plannedFlight, allFlights, allTerminals))
        .reduce((sum, pending) => sum + pending, 0);
};

// ============================================================================
// ROLLED-FORWARD LOGIC (v1 NEW Ã¢â‚¬â€œ DERIVED ONLY)
// ============================================================================

/**
 * Derive Rolled-Forward State for a root flight (v1 NEW).
 * Returns: 'ActivePlanned' | 'RolledForward' | null
 * 
 * Logic:
 * - If flight has no planned children: return null (no delay state)
 * - If flight has planned children: return 'RolledForward'
 */
const deriveRolledForwardState = (rootFlightId, allFlights) => {
    const children = allFlights.filter(f => f.sourceFlightId === rootFlightId);
    const plannedChildren = children.filter(f => f.status === 'Planned');

    // No planned children: no delay state
    if (plannedChildren.length === 0) {
        return null;
    }

    // Has planned children: root is RolledForward
    return 'RolledForward';
};

/**
 * Determine if a specific planned child is the ActivePlanned for its root (v1 NEW).
 * Returns true if this child has the latest date among planned children of its parent.
 */
const isActivePlanned = (childFlightId, allFlights) => {
    const childFlight = allFlights.find(f => f.id === childFlightId);
    if (!childFlight || !childFlight.sourceFlightId || childFlight.status !== 'Planned') {
        return false;
    }

    const siblings = allFlights.filter(f => f.sourceFlightId === childFlight.sourceFlightId);
    const plannedSiblings = siblings.filter(f => f.status === 'Planned');

    if (plannedSiblings.length === 0) {
        return false;
    }

    const latest = plannedSiblings.reduce((max, f) => {
        const maxDate = new Date(max.date).getTime();
        const fDate = new Date(f.date).getTime();
        return fDate > maxDate ? f : max;
    });

    return latest.id === childFlightId;
};

/**
 * Get all rolled-forward children of a root flight (v1 NEW).
 * Returns planned children that are NOT the active (latest by date) one.
 */
const getRolledForwardChildren = (rootFlightId, allFlights) => {
    const children = allFlights.filter(f => f.sourceFlightId === rootFlightId);
    const plannedChildren = children.filter(f => f.status === 'Planned');

    if (plannedChildren.length === 0) {
        return [];
    }

    // Find the latest (active) one
    const latest = plannedChildren.reduce((max, f) => {
        const maxDate = new Date(max.date).getTime();
        const fDate = new Date(f.date).getTime();
        return fDate > maxDate ? f : max;
    });

    // Return all others
    return plannedChildren.filter(f => f.id !== latest.id);
};

/**
 * Get all root flights via their children (utility for UI/reporting).
 */
const getRootFlight = (childFlightId, allFlights) => {
    const childFlight = allFlights.find(f => f.id === childFlightId);
    if (!childFlight || !childFlight.sourceFlightId) {
        return childFlight;
    }
    return allFlights.find(f => f.id === childFlight.sourceFlightId) || childFlight;
};

// ============================================================================
// UTILITY FUNCTIONS (HELPERS FOR COMMON OPERATIONS)
// ============================================================================

/**
 * Enforce Default Per Type (v1 Preference).
 * Returns updated terminals array with defaults adjusted.
 * When a terminal is set to isDefault = true:
 * - All other terminals of the same type get isDefault = false.
 * Used by createTerminal/updateTerminal in mta-business.js
 */
const enforceDefaultPerType = (targetTerminalId, setAsDefault, allTerminals) => {
    if (!setAsDefault) {
        return allTerminals;
    }

    const targetTerminal = allTerminals.find(t => t.id === targetTerminalId);
    if (!targetTerminal) {
        return allTerminals;
    }

    return allTerminals.map(t => {
        // If this is the target terminal and we're setting it to default, keep it as default
        if (t.id === targetTerminalId) {
            return { ...t, isDefault: true };
        }
        // If another terminal of the same type has isDefault = true, remove it
        if (t.type === targetTerminal.type && t.isDefault) {
            return { ...t, isDefault: false };
        }
        return t;
    });
};

/**
 * Get a default terminal of a given type (v1 Preference).
 * Falls back to first terminal of that type if no default exists.
 */
const getDefaultTerminal = (type, allTerminals) => {
    // First, look for the one with isDefault = true
    const defaultTerminal = allTerminals.find(t => t.type === type && t.isDefault);
    if (defaultTerminal) {
        return defaultTerminal;
    }

    // Fallback: deterministically select first terminal of that type
    return allTerminals.find(t => t.type === type) || null;
};
// ============================================================================
// LIFECYCLE MANAGEMENT (v1 STATUS VALIDATION)
// ============================================================================

/**
 * Check if an Airport can be deactivated.
 * Invariant 1: At least ONE active Airport must exist globally.
 * Invariant 2: Cannot deactivate if it would leave zero active Terminals of a required type.
 * 
 * @param {string} airportId - Airport to check for deactivation
 * @param {Array} allAirports - All airports
 * @param {Array} allTerminals - All terminals
 * @returns {Object} { canDeactivate: boolean, reason: string|null }
 */
const validateAirportDeactivation = (airportId, allAirports, allTerminals) => {
    const airport = allAirports.find(a => a.id === airportId);
    if (!airport) {
        return { canDeactivate: false, reason: 'Airport not found' };
    }

    const activeCount = allAirports.filter(a => a.status === 'active').length;
    if (activeCount <= 1) {
        return { canDeactivate: false, reason: 'Cannot deactivate: must keep at least one active Airport' };
    }

    const airportTerminals = allTerminals.filter(t => t.airportId === airportId);
    
    // Check if deactivating this airport would leave zero active terminals of any type
    const terminalTypesByAirport = ['Income', 'Transit', 'Expense'];
    for (const type of terminalTypesByAirport) {
        const terminalsOfType = allTerminals.filter(t => t.type === type);
        const activeTerminalsOfType = terminalsOfType.filter(t => t.status === 'active');
        const activeTerminalsOfTypeNotFromThisAirport = activeTerminalsOfType.filter(t => t.airportId !== airportId);
        
        if (activeTerminalsOfTypeNotFromThisAirport.length === 0) {
            return { canDeactivate: false, reason: `Cannot deactivate: would leave zero active ${type} terminals` };
        }
    }

    return { canDeactivate: true, reason: null };
};

/**
 * Check if a Terminal can be deactivated.
 * Invariant: At least ONE active Terminal per type must exist globally.
 * Additional: Cannot deactivate if it is the last active terminal of its type and set as default.
 * 
 * @param {string} terminalId - Terminal to check for deactivation
 * @param {Array} allTerminals - All terminals
 * @returns {Object} { canDeactivate: boolean, reason: string|null }
 */
const validateTerminalDeactivation = (terminalId, allTerminals) => {
    const terminal = allTerminals.find(t => t.id === terminalId);
    if (!terminal) {
        return { canDeactivate: false, reason: 'Terminal not found' };
    }

    const terminalsOfType = allTerminals.filter(t => t.type === terminal.type);
    const activeTerminalsOfType = terminalsOfType.filter(t => t.status === 'active');
    
    if (activeTerminalsOfType.length <= 1) {
        return { canDeactivate: false, reason: `Cannot deactivate: must keep at least one active ${terminal.type} terminal` };
    }

    if (terminal.isDefault && activeTerminalsOfType.length === 1) {
        return { canDeactivate: false, reason: `Cannot deactivate: this is the default ${terminal.type} terminal and no other active terminal exists` };
    }

    return { canDeactivate: true, reason: null };
};

/**
 * Get active Airports (status = 'active').
 * Used by UI to populate dropdowns.
 * 
 * @param {Array} allAirports - All airports
 * @returns {Array} Active airports only
 */
const getActiveAirports = (allAirports) => {
    return allAirports.filter(a => a.status === 'active');
};

/**
 * Get active Terminals (status = 'active').
 * Used by UI to populate dropdowns.
 * 
 * @param {Array} allTerminals - All terminals
 * @returns {Array} Active terminals only
 */
const getActiveTerminals = (allTerminals) => {
    return allTerminals.filter(t => t.status === 'active');
};
