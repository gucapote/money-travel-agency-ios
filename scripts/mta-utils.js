// mta-utils.js - Utility helpers (formatting, IDs)

const ID_COUNTERS_KEY = 'mta_id_counters';
const SYSTEM_ID_KEY = 'mta_system_id';
const DEFAULT_SYSTEM_ID = 'MTA01';
const ENTITY_PREFIX_MAP = {
    APT: 'A',
    TERM: 'T',
    PG: 'PG',
    FLT: 'F',
    PRD: 'P'
};

const readIdCounters = () => {
    try {
        const raw = localStorage.getItem(ID_COUNTERS_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
};

const writeIdCounters = (counters) => {
    localStorage.setItem(ID_COUNTERS_KEY, JSON.stringify(counters));
};

const getSystemId = () => {
    const existing = localStorage.getItem(SYSTEM_ID_KEY);
    if (existing) return existing;

    localStorage.setItem(SYSTEM_ID_KEY, DEFAULT_SYSTEM_ID);
    return DEFAULT_SYSTEM_ID;
};

const generateId = (prefix) => {
    const entityPrefix = ENTITY_PREFIX_MAP[prefix];
    if (!entityPrefix) {
        throw new Error(`Unsupported entity prefix: ${prefix}`);
    }

    const systemId = getSystemId();
    const counters = readIdCounters();
    const next = (counters[entityPrefix] || 0) + 1;
    counters[entityPrefix] = next;
    writeIdCounters(counters);

    return `${systemId}-${entityPrefix}${String(next).padStart(6, '0')}`;
};

const syncIdStateFromData = (data = {}) => {
    const collections = [
        ...(data.airports || []),
        ...(data.terminals || []),
        ...(data.passengerGroups || []),
        ...(data.flights || []),
        ...(data.products || [])
    ];

    const counters = {};
    let systemId = null;

    collections.forEach(item => {
        const id = String(item?.id || '');
        const match = id.match(/^([A-Z0-9]+)-([A-Z]+)(\d{6})$/);
        if (!match) return;

        const [, parsedSystemId, entityPrefix, rawNumber] = match;
        const nextNumber = Number(rawNumber);
        if (!Number.isFinite(nextNumber)) return;

        if (!systemId) {
            systemId = parsedSystemId;
        }
        counters[entityPrefix] = Math.max(counters[entityPrefix] || 0, nextNumber);
    });

    if (systemId) {
        localStorage.setItem(SYSTEM_ID_KEY, systemId);
    }
    writeIdCounters(counters);
};

const formatCurrency = (amount) => {
    const numericAmount = Number(amount);
    const safeAmount = Number.isFinite(numericAmount) ? numericAmount : 0;
    const normalizedAmount = Math.abs(safeAmount) < 1e-9 ? 0 : safeAmount;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(normalizedAmount);
};
