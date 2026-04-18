// mta-data-store.js - Local storage access layer

const STORAGE_KEYS = {
    AIRPORTS: 'mta_airports',
    TERMINALS: 'mta_terminals',
    PASSENGER_GROUPS: 'mta_passenger_groups',
    FLIGHTS: 'mta_flights',
    PRODUCTS: 'mta_products'
};

const getFromStorage = (key) => JSON.parse(localStorage.getItem(key) || '[]');
const saveToStorage = (key, data) => localStorage.setItem(key, JSON.stringify(data));

const getAirports = () => getFromStorage(STORAGE_KEYS.AIRPORTS);
const saveAirports = (airports) => saveToStorage(STORAGE_KEYS.AIRPORTS, airports);

const getTerminals = () => getFromStorage(STORAGE_KEYS.TERMINALS);
const saveTerminals = (terminals) => saveToStorage(STORAGE_KEYS.TERMINALS, terminals);

const getPassengerGroups = () => getFromStorage(STORAGE_KEYS.PASSENGER_GROUPS);
const savePassengerGroups = (groups) => saveToStorage(STORAGE_KEYS.PASSENGER_GROUPS, groups);

const getFlights = () => getFromStorage(STORAGE_KEYS.FLIGHTS);
const saveFlights = (flights) => saveToStorage(STORAGE_KEYS.FLIGHTS, flights);

const getProducts = () => getFromStorage(STORAGE_KEYS.PRODUCTS);
const saveProducts = (products) => saveToStorage(STORAGE_KEYS.PRODUCTS, products);

const getActiveProducts = () => getProducts().filter(product => product.status !== 'inactive');

const getAllData = () => ({
    airports: getAirports(),
    terminals: getTerminals(),
    passengerGroups: getPassengerGroups(),
    flights: getFlights(),
    products: getProducts()
});

const clearAllData = () => {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    localStorage.removeItem('mta_id_counters');
    localStorage.removeItem('mta_system_id');
};
