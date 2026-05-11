// mta-events.js - Money Travel Agency Event Handlers
// Event listeners and action handlers

// ============================================================================
// EVENT HANDLERS
// ============================================================================
(function(){
    const attachHandlers = function(){

        // Income form - Register arrivals
        const incomeForm = document.getElementById('income-form');
        if (incomeForm) {
            // Event listener for type radio buttons to show/hide sections
            const typeRadios = document.querySelectorAll('input[name="group-type"]');
            typeRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    const openTransitFields = document.getElementById('open-transit-fields');
                    const restrictedTransitFields = document.getElementById('restricted-transit-fields');
                    const type = document.querySelector('input[name="group-type"]:checked')?.value;
                    if (window.updateArrivalGroupNameFieldVisibility) {
                        window.updateArrivalGroupNameFieldVisibility(type);
                    }
                    if (window.positionArrivalCargoBlock) {
                        window.positionArrivalCargoBlock(type);
                    }
                    
                    if (type === 'liability') {
                        if (window.renderArrivalCargoRows) {
                            window.renderArrivalCargoRows([]);
                        }
                        // Show Restricted Transit, hide Open Transit
                        if (openTransitFields) openTransitFields.classList.add('mta-hidden');
                        if (restrictedTransitFields) restrictedTransitFields.classList.remove('mta-hidden');
                        
                        // Remove required from open transit fields
                        const landingTerminal = document.getElementById('group-landing-terminal');
                        const incomeAmount = document.getElementById('income-amount');
                        if (landingTerminal) landingTerminal.removeAttribute('required');
                        if (incomeAmount) incomeAmount.removeAttribute('required');
                        
                        // Add required to restricted transit required fields
                        const creditAirport = document.getElementById('group-credit-airport');
                        if (creditAirport) creditAirport.setAttribute('required', 'required');
                        
                        // Update first travel visibility based on extendable checkbox
                        const extendableCheckbox = document.getElementById('group-extendable');
                        const amountGroup = document.getElementById('non-extendable-amount-group');
                        const firstTravelGroup = document.getElementById('restricted-first-travel-group');
                        const isExtendable = extendableCheckbox?.checked || false;
                        
                        if (isExtendable) {
                            if (amountGroup) amountGroup.classList.add('mta-hidden');
                            if (firstTravelGroup) firstTravelGroup.classList.add('mta-hidden');
                            const restrictedAmount = document.getElementById('restricted-amount');
                            if (restrictedAmount) restrictedAmount.removeAttribute('required');
                        } else {
                            if (amountGroup) amountGroup.classList.remove('mta-hidden');
                            if (firstTravelGroup) firstTravelGroup.classList.remove('mta-hidden');
                            const restrictedAmount = document.getElementById('restricted-amount');
                            if (restrictedAmount) restrictedAmount.setAttribute('required', 'required');
                        }
                    } else {
                        // Show Open Transit, hide Restricted Transit
                        if (openTransitFields) openTransitFields.classList.remove('mta-hidden');
                        if (restrictedTransitFields) restrictedTransitFields.classList.add('mta-hidden');
                        
                        // Remove required from restricted transit fields
                        const creditAirport = document.getElementById('group-credit-airport');
                        const restrictedAmount = document.getElementById('restricted-amount');
                        if (creditAirport) creditAirport.removeAttribute('required');
                        if (restrictedAmount) restrictedAmount.removeAttribute('required');
                        
                        // Add required to open transit required fields
                        const landingTerminal = document.getElementById('group-landing-terminal');
                        const incomeAmount = document.getElementById('income-amount');
                        if (landingTerminal) landingTerminal.setAttribute('required', 'required');
                        if (incomeAmount) incomeAmount.setAttribute('required', 'required');
                    }
                    if (window.syncArrivalAmountInputsWithCargo) {
                        window.syncArrivalAmountInputsWithCargo();
                    }
                });
            });

            // Event listener for extendable checkbox
            const extendableCheckbox = document.getElementById('group-extendable');
            if (extendableCheckbox) {
                extendableCheckbox.addEventListener('change', () => {
                    const amountGroup = document.getElementById('non-extendable-amount-group');
                    const restrictedAmount = document.getElementById('restricted-amount');
                    const firstTravelGroup = document.getElementById('restricted-first-travel-group');
                    const firstTravelSelect = document.getElementById('restricted-first-travel-to');
                    const isExtendable = extendableCheckbox.checked;
                    
                    if (isExtendable) {
                        // Extendable (revolving): Hide amount field and first travel
                        if (amountGroup) amountGroup.classList.add('mta-hidden');
                        if (restrictedAmount) {
                            restrictedAmount.removeAttribute('required');
                            restrictedAmount.value = '';
                        }
                        if (firstTravelGroup) firstTravelGroup.classList.add('mta-hidden');
                        if (firstTravelSelect) firstTravelSelect.value = '';
                        if (window.renderArrivalCargoRows) {
                            window.renderArrivalCargoRows([]);
                        }
                    } else {
                        // Non-extendable (fixed credit): Show amount field and first travel
                        if (amountGroup) amountGroup.classList.remove('mta-hidden');
                        if (restrictedAmount) restrictedAmount.setAttribute('required', 'required');
                        if (firstTravelGroup) firstTravelGroup.classList.remove('mta-hidden');
                    }
                    if (window.syncArrivalAmountInputsWithCargo) {
                        window.syncArrivalAmountInputsWithCargo();
                    }
                });
            }

            const addCargoBtn = document.getElementById('arrival-add-cargo-item');
            if (addCargoBtn) {
                addCargoBtn.addEventListener('click', () => {
                    if (window.addArrivalCargoRow) {
                        window.addArrivalCargoRow();
                    }
                });
            }

            const addCargoRowBtn = document.getElementById('arrival-add-cargo-row-btn');
            if (addCargoRowBtn) {
                addCargoRowBtn.addEventListener('click', () => {
                    if (window.addArrivalCargoRow) {
                        window.addArrivalCargoRow();
                    }
                });
            }

            incomeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                try {
                    const name = document.getElementById('group-name').value;
                    const groupName = document.getElementById('group-group-name')?.value || null;
                    const trimmedArrivalName = String(name || '').trim();
                    const typeRadio = document.querySelector('input[name="group-type"]:checked');
                    const type = typeRadio?.value || 'external';
                    const cargoItems = typeof window.getArrivalCargoItems === 'function'
                        ? window.getArrivalCargoItems()
                        : [];
                    const cargoPayload = type !== 'liability' && cargoItems.length > 0 ? cargoItems : null;
                    const cargoTotal = cargoItems.length > 0
                        ? Number(cargoItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0).toFixed(2))
                        : 0;
                    const buildArrivalFlightName = (plannedPrefix, completedPrefix, status = 'Completed') => {
                        const prefix = status === 'Planned' ? plannedPrefix : completedPrefix;
                        return trimmedArrivalName ? `${prefix}${trimmedArrivalName}` : prefix.trim();
                    };
                    
                    // Validation
                    if (!name) {
                        throw new Error(t("pleaseEnterGroupName"));
                    }

                    // Type-specific handling
                    if (type === 'liability') {
                        // Restricted Transit (Credit) handling
                        const creditAirportId = document.getElementById('group-credit-airport').value;
                        const extendable = document.getElementById('group-extendable').checked;
                        const restrictedAmountField = document.getElementById('restricted-amount');
                        const restrictedFirstTravelId = document.getElementById('restricted-first-travel-to').value || null;
                        const restrictedLandingDate = document.getElementById('restricted-landing-date')?.value;
                        
                        if (!creditAirportId) {
                            throw new Error("Credit airport is required for restricted transit");
                        }
                        if (!restrictedLandingDate) {
                            throw new Error("Landing date is required");
                        }

                        // Amount handling: only required if NOT extendable
                        let amount = 0;
                        if (!extendable) {
                            amount = cargoPayload ? cargoTotal : parseFloat(restrictedAmountField?.value || 0);
                            if (!amount || amount <= 0) {
                                throw new Error("Credit line amount must be greater than zero");
                            }
                            
                            // Validate first travel destination if provided
                            if (restrictedFirstTravelId) {
                                const terminals = getTerminals();
                                const firstTravelTerminal = terminals.find(t => t.id === restrictedFirstTravelId);
                                if (!firstTravelTerminal || firstTravelTerminal.type !== 'Transit') {
                                    throw new Error("First travel destination must be a transit terminal");
                                }
                            }
                        } else {
                            if (cargoPayload) {
                                throw new Error(t('arrival.extendableCargoUnsupported'));
                            }
                            amount = 0; // Extendable = unlimited, store as 0
                        }

                        // Create liability passenger group
                        const group = createPassengerGroup(name, amount, type, creditAirportId, extendable, cargoPayload, null);
                        const groupId = group.id;
                        
                        // AUTOMATIC CREDIT INJECTION RULE (v1)
                        // For non-extendable liability: create injection and optional first travel
                        if (!extendable && amount > 0) {
                            const airports = getAirports();
                            const creditAirport = airports.find(a => a.id === creditAirportId);
                            
                            if (creditAirport) {
                                // Get the Income terminal of the credit airport
                                const terminals = getTerminals();
                                const creditIncomeTerminal = terminals.find(
                                    t => t.airportId === creditAirportId && t.type === 'Income'
                                );
                                
                                if (creditIncomeTerminal) {
                                    // Create Completed injection: null → Credit Income
                                    createFlight(groupId, null, creditIncomeTerminal.id, amount, 'Completed', buildArrivalFlightName('Arrival: ', 'Arrival: ', 'Completed'), restrictedLandingDate);
                                    
                                    // If first travel is selected, create: Credit Income → First Travel
                                    if (restrictedFirstTravelId) {
                                        createFlight(groupId, creditIncomeTerminal.id, restrictedFirstTravelId, amount, 'Completed', buildArrivalFlightName('Connection: ', 'Connection: ', 'Completed'), restrictedLandingDate);
                                    }
                                }
                            }
                        }
                        
                        showMessage(t("passengerGroupRegistered"));
                    } else {
                        // Open Transit (External/Internal) handling
                        const amountField = document.getElementById('income-amount');
                        const amount = cargoPayload ? cargoTotal : parseFloat(amountField?.value || 0);
                        const landingDate = document.getElementById('group-landing-date')?.value;
                        
                        if (!amount || amount <= 0) {
                            throw new Error("Amount must be greater than zero");
                        }
                        if (!landingDate) {
                            throw new Error("Landing date is required");
                        }

                        const landingTerminalId = document.getElementById('group-landing-terminal').value;
                        const firstTravelToId = document.getElementById('group-first-travel-to').value || null;

                        if (!landingTerminalId) {
                            throw new Error("Landing terminal is required");
                        }

                        const terminals = getTerminals();
                        const landingTerminal = terminals.find(t => t.id === landingTerminalId);
                        if (!landingTerminal || landingTerminal.type !== 'Income') {
                            throw new Error("Landing terminal must be an income terminal");
                        }

                        if (firstTravelToId) {
                            const firstTravelTerminal = terminals.find(t => t.id === firstTravelToId);
                            if (!firstTravelTerminal || firstTravelTerminal.type !== 'Transit') {
                                throw new Error("First travel destination must be a transit terminal");
                            }
                        }

                        // Create passenger group
                        const group = createPassengerGroup(name, amount, type, null, false, cargoPayload, groupName);
                        const groupId = group.id;
                        
                        // Create Flight 1: Load PG into Landing Terminal (allocation/intake flight with no origin)
                        createFlight(groupId, null, landingTerminalId, amount, 'Completed', buildArrivalFlightName('Arrival: ', 'Arrival: ', 'Completed'), landingDate);
                        
                        // Create Flight 2 if First Travel To is selected: Landing Terminal → First Travel To (Completed)
                        if (firstTravelToId) {
                            createTerminalFundedFlight(landingTerminalId, firstTravelToId, amount, buildArrivalFlightName('Connection: ', 'Connection: ', 'Completed'), landingDate);
                        }

                        showMessage(t("passengerGroupRegistered"));
                    }

                    e.target.reset();
                    document.getElementById('restricted-transit-fields')?.classList.add('mta-hidden');
                    document.getElementById('open-transit-fields')?.classList.remove('mta-hidden');
                    closePopup('register-arrival-popup');
                    updateAll();
                } catch (error) {
                    showMessage(error.message, 'error');
                }
            });

            if (typeof populateArrivalFormSelects === 'function') {
                populateArrivalFormSelects();
            }
        }

        // Flight form - Create flight (planned or completed)
        const flightForm = document.getElementById('passenger-form');
        if (flightForm) {
            flightForm.addEventListener('submit', (e) => {
                e.preventDefault();
                try {
                    let groupId = document.getElementById('passenger-group').value || null;
                    const amount = document.getElementById('passenger-amount').value;
                    const originTerminalId = document.getElementById('flight-origin')?.value || null;
                    const destinationTerminalId = document.getElementById('passenger-destination')?.value || null;

                    if (!destinationTerminalId) {
                        throw new Error(t("pleaseSelectDestinationTerminal"));
                    }

                    if (groupId && !originTerminalId) {
                        throw new Error(t("originTerminalRequiredForCompletedFlights"));
                    }

                    if (originTerminalId) {
                        const result = createTerminalFundedFlight(originTerminalId, destinationTerminalId, amount);
                        if (result.children.length > 1) {
                            showMessage(t("createdFlightsFromTransit").replace('{count}', result.children.length));
                        } else {
                            showMessage(t("flightCreated"));
                        }
                    } else {
                        const status = groupId ? 'Completed' : 'Planned';
                        createFlight(groupId, originTerminalId, destinationTerminalId, amount, status);
                        showMessage(t("flightCreated"));
                    }

                    e.target.reset();
                    closePopup('create-passenger-popup');
                    updateAll();
                } catch (error) {
                    showMessage(error.message, 'error');
                }
            });
        }

        // Unified Flight Form (3-mode selector: tickets, tab, reserve)
        const unifiedFlightForm = document.getElementById('flight-form');
        if (unifiedFlightForm) {
            // Add event listeners for travel mode radio buttons
            const travelModeRadios = document.querySelectorAll('input[name="travel-mode"]');
            travelModeRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    if (window.updateFlightFormTravelMode) {
                        window.updateFlightFormTravelMode();
                    }
                });
            });

            unifiedFlightForm.addEventListener('submit', (e) => {
                e.preventDefault();
                try {
                    const editId = document.getElementById('flight-form-edit-id')?.value || '';
                    const travelMode = document.querySelector('input[name="travel-mode"]:checked')?.value;
                    const destinationTerminalId = document.getElementById('flight-form-destination-terminal').value;
                    const amount = parseFloat(document.getElementById('flight-form-amount').value);
                    const flightName = document.getElementById('flight-form-name').value || null; // Optional name
                    const ordinalRaw = document.getElementById('flight-form-ordinal')?.value;
                    const ordinal = ordinalRaw === '' || ordinalRaw === null || ordinalRaw === undefined ? null : parseInt(ordinalRaw, 10);
                    
                    if (!travelMode) {
                        throw new Error('Please select a travel mode');
                    }
                    if (!destinationTerminalId) {
                        throw new Error(t("pleaseSelectDestinationTerminal"));
                    }
                    if (!amount || amount <= 0) {
                        throw new Error('Amount must be greater than zero');
                    }
                    if (ordinal !== null && (!Number.isInteger(ordinal) || ordinal < 0)) {
                        throw new Error('Order must be a whole number greater than or equal to 0');
                    }

                    if (editId) {
                        const date = document.getElementById('flight-form-date').value;
                        if (!date) {
                            throw new Error('Please select a date');
                        }
                        const flight = getFlightById(editId);
                        if (!flight || flight.status !== 'Planned') {
                            throw new Error('Only planned departures can be edited.');
                        }
                        updateFlight(editId, {
                            destinationTerminalId,
                            amount,
                            name: flightName,
                            date,
                            ordinal
                        });
                        showMessage(t("flightCreated"));
                        e.target.reset();
                        document.getElementById('flight-form-modal').classList.add('mta-hidden');
                        updateAll();
                        return;
                    }

                    if (travelMode === 'tickets') {
                        // Mode 1: "I've got tickets" (Terminal-Funded, Completed)
                        // Implements FIFO ALLOCATION MODEL (v1) from AI-README.txt
                        const originTerminalId = document.getElementById('flight-form-origin-terminal').value;
                        const date = document.getElementById('flight-form-date').value;
                        
                        if (!originTerminalId) {
                            throw new Error(t("originTerminalRequiredForCompletedFlights"));
                        }
                        if (!date) {
                            throw new Error('Please select a date');
                        }

                        createTerminalFundedFlight(
                            originTerminalId,
                            destinationTerminalId,
                            amount,
                            flightName,
                            date,
                            null,
                            ordinal
                        );

                    } else if (travelMode === 'tab') {
                        // Mode 2: "Put it on my tab" (Liability-Funded, Completed)
                        const date = document.getElementById('flight-form-date').value;
                        
                        if (!date) {
                            throw new Error('Please select a date');
                        }
                        
                        // Only extendable liabilities appear in this dropdown
                        const passengerGroupId = document.getElementById('flight-form-liability-group').value;
                        if (!passengerGroupId) {
                            throw new Error('Please select a liability account');
                        }

                        // Validate that the selected PG is an extendable liability
                        const group = getPassengerGroupById(passengerGroupId);
                        if (!group || group.type !== 'liability' || !group.extendable) {
                            throw new Error('Selected passenger group must be an extendable liability account');
                        }

                        // Execute atomic credit flow for extendable liability
                        const reservedLabel = t('reserved') || 'Reserved';
                        const reservedFlightName = flightName ? `${reservedLabel}: ${flightName}` : reservedLabel;
                        const creditFlow = executeExtendableCreditFlow(
                            passengerGroupId,
                            destinationTerminalId,
                            amount,
                            flightName,
                            date,
                            ordinal,
                            reservedFlightName
                        );
                        
                        if (!creditFlow) {
                            throw new Error('Failed to execute credit flow');
                        }

                    } else if (travelMode === 'reserve') {
                        // Mode 3: "Reserve for later" (Planned, no origin, no passengerGroup)
                        const date = document.getElementById('flight-form-date').value;
                        if (!date) {
                            throw new Error('Please select a date');
                        }
                        const destTerminal = getTerminalById(destinationTerminalId);
                        if (!destTerminal || destTerminal.type !== 'Expense') {
                            throw new Error(t("plannedFlightMustTargetExpense") || "Planned flights must target an Expense terminal");
                        }

                        // Create planned flight with null passengerGroupId and null originTerminalId
                        const flight = createFlight(null, null, destinationTerminalId, amount, 'Planned', flightName, date, null, ordinal);
                        
                        if (!flight) {
                            throw new Error('Failed to create planned flight');
                        }
                    }

                    showMessage(t("flightCreated"));
                    
                    e.target.reset();
                    document.getElementById('flight-form-modal').classList.add('mta-hidden');
                    updateAll();
                } catch (error) {
                    showMessage(error.message, 'error');
                }
            });
        }

        // Mode 3: Leg to Destination Form
        const legDestForm = document.getElementById('flight-leg-dest-form');
        if (legDestForm) {
            legDestForm.addEventListener('submit', (e) => {
                e.preventDefault();
                try {
                    const parentFlightId = window.currentFlightContext?.parentFlightId;
                    const originTerminalId = document.getElementById('leg-dest-origin-terminal').value;
                    const amount = parseFloat(document.getElementById('leg-dest-amount').value);
                    const date = document.getElementById('leg-dest-date').value;
                    const name = document.getElementById('leg-dest-name').value || null;

                    if (!parentFlightId) {
                        throw new Error(t("parentFlightNotFound") || "Parent flight not found");
                    }
                    if (!originTerminalId) {
                        throw new Error(t("originTerminalRequiredForCompletedFlights"));
                    }
                    if (!amount || amount <= 0) {
                        throw new Error("Payment amount must be greater than zero");
                    }

                    const parentFlight = getFlightById(parentFlightId);
                    if (!parentFlight) {
                        throw new Error(t("parentFlightNotFound") || "Parent flight not found");
                    }

                    // Mode 3: Leg to Destination - FIFO allocation from origin terminal
                    const destinationTerminalId = parentFlight.destinationTerminalId;
                    createTerminalFundedFlight(
                        originTerminalId,
                        destinationTerminalId,
                        amount,
                        name,
                        date,
                        parentFlightId
                    );
                    showMessage(t("paymentLegCreated") || "Payment leg created successfully");
                    
                    e.target.reset();
                    window.currentFlightContext = null;
                    document.getElementById('flight-leg-dest-form-modal').classList.add('mta-hidden');
                    updateAll();
                } catch (error) {
                    showMessage(error.message, 'error');
                }
            });
        }

        // Mode 4: Leg Return Form
        const legReturnForm = document.getElementById('flight-leg-return-form');
        if (legReturnForm) {
            legReturnForm.addEventListener('submit', (e) => {
                e.preventDefault();
                try {
                    const parentFlightId = window.currentFlightContext?.parentFlightId;
                    const destinationTerminalId = document.getElementById('leg-return-destination-terminal').value;
                    const amount = document.getElementById('leg-return-amount').value;
                    const date = document.getElementById('leg-return-date').value;
                    const name = document.getElementById('leg-return-name').value || null;

                    if (!parentFlightId) {
                        throw new Error(t("parentFlightNotFound") || "Parent flight not found");
                    }
                    if (!destinationTerminalId) {
                        throw new Error(t("pleaseSelectDestinationTerminal"));
                    }

                    const parentFlight = getFlightById(parentFlightId);
                    if (!parentFlight) {
                        throw new Error(t("parentFlightNotFound") || "Parent flight not found");
                    }

                    // Mode 4: Leg Return - origin is locked to Expense terminal
                    const leg = createReturnFlight(parentFlightId, amount, date, name);
                    showMessage(t("returnLegCreated") || "Return leg created successfully");
                    
                    e.target.reset();
                    window.currentFlightContext = null;
                    document.getElementById('flight-leg-return-form-modal').classList.add('mta-hidden');
                    updateAll();
                } catch (error) {
                    showMessage(error.message, 'error');
                }
            });
        }

        // Airport form - Create new airport
        const airportForm = document.getElementById('airport-form');
        if (airportForm) {
            airportForm.addEventListener('submit', (e) => {
                e.preventDefault();
                try {
                    const editId = document.getElementById('airport-edit-id')?.value || '';
                    const name = document.getElementById('airport-name').value;
                    const type = document.getElementById('airport-type')?.value || 'standard';
                    const status = document.getElementById('airport-status')?.value || 'active';

                    if (editId) {
                        updateAirport(editId, { name, status });
                        showMessage(t('ui.messages.airportSaved'));
                    } else {
                        createAirport(name, type);
                        showMessage(t("airportCreatedSuccessfully"));
                    }

                    e.target.reset();
                    closePopup('create-airport-popup');
                    updateAll();
                } catch (error) {
                    showMessage(error.message, 'error');
                }
            });
        }

        // Terminal form - Create new terminal
        const terminalForm = document.getElementById('terminal-form');
        if (terminalForm) {
            terminalForm.addEventListener('submit', (e) => {
                e.preventDefault();
                try {
                    const editId = document.getElementById('terminal-edit-id')?.value || '';
                    const airportId = document.getElementById('terminal-airport').value;
                    const name = document.getElementById('terminal-name').value;
                    const alias = document.getElementById('terminal-code').value;
                    const type = document.getElementById('terminal-type')?.value || 'Transit';
                    const returnableCheckbox = document.getElementById('terminal-returnable');
                    const selectedAirport = getAirportById(airportId);
                    const rawReturnable = !!returnableCheckbox?.checked;

                    if (selectedAirport && selectedAirport.type === 'credit') {
                        showMessage(t('ui.messages.creditAirportManagesTerminals'), 'error');
                        return;
                    }

                    if (type !== 'Expense' && rawReturnable) {
                        showMessage(t('ui.messages.onlyExpenseTerminalsReturnable'), 'error');
                        return;
                    }
                    const returnable = type === 'Expense' ? rawReturnable : false;

                    if (editId) {
                        updateTerminal(editId, { name, alias, returnable });
                        showMessage(t('ui.messages.terminalSaved'));
                    } else {
                        createTerminal(airportId, name, alias, returnable, type);
                        showMessage(t("terminalCreatedSuccessfully"));
                    }

                    e.target.reset();
                    closePopup('create-terminal-popup');
                    updateAll();
                } catch (error) {
                    showMessage(error.message, 'error');
                }
            });
        }

        // Buy Return Ticket form
        const returnForm = document.getElementById('return-ticket-form');
        if (returnForm) {
            returnForm.addEventListener('submit', (e) => {
                e.preventDefault();
                try {
                    const terminalId = document.getElementById('return-terminal-id').value;
                    const amount = parseFloat(document.getElementById('return-amount').value);
                    const destinationTerminalId = document.getElementById('return-destination-terminal')?.value || null;

                    if (!destinationTerminalId) {
                        throw new Error(t("pleaseSelectDestinationTerminal"));
                    }

                    const balance = getMoneyAtTerminal(terminalId);
                    if (amount > balance) {
                        throw new Error(t("insufficientBalance").replace('{available}', formatCurrency(balance)));
                    }

                    const originTerminal = getTerminalById(terminalId);
                    if (originTerminal && originTerminal.type === 'Expense') {
                        throw new Error('Expense-origin return flows must be created from an eligible completed flight via createReturnFlight.');
                    }

                    createTerminalFundedFlight(terminalId, destinationTerminalId, amount);

                    updateAll();

                    showMessage(t("returnTicketPurchased"));
                    e.target.reset();
                    closePopup('buy-return-ticket-popup');
                } catch (error) {
                    showMessage(error.message, 'error');
                }
            });
        }

        // Helper function to load JSON data
        const loadJSONData = (data) => {
            try {
                loadTestData(data);
                const savedGroups = getPassengerGroups();
                const savedFlights = getFlights();
                showMessage(`Data imported. ${savedGroups.length} groups, ${savedFlights.length} flights.`);
                updateAll();
            } catch (error) {
                showMessage('Error importing data: ' + error.message, 'error');
            }
        };

        const loadResetDataFile = async (dataFile) => {
            if (window.location.protocol !== 'file:') {
                const response = await fetch(dataFile);
                if (!response.ok) throw new Error(`Failed to fetch reset data: ${dataFile}`);
                return response.json();
            }

            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', dataFile, true);
                xhr.overrideMimeType('application/json');
                xhr.onload = function() {
                    if (xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300)) {
                        try {
                            resolve(JSON.parse(xhr.responseText));
                        } catch (parseError) {
                            reject(parseError);
                        }
                    } else {
                        reject(new Error(`Failed to load reset data: ${dataFile}`));
                    }
                };
                xhr.onerror = function() {
                    reject(new Error(`Failed to load reset data: ${dataFile}`));
                };
                xhr.send();
            });
        };

        // Import JSON button - opens file picker
        const importBtn = document.getElementById('import-json');
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                document.getElementById('file-input').click();
            });
        }

        // File input handler
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const data = JSON.parse(event.target.result);
                        loadJSONData(data);
                    } catch (error) {
                        showMessage('Invalid JSON file: ' + error.message, 'error');
                    }
                };
                reader.readAsText(file);

                e.target.value = '';
            });
        }

        // Keyboard shortcut: Ctrl+S to toggle Tools tab
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                const settingsTab = document.querySelector('[href="#dev"]');
                if (settingsTab) settingsTab.click();
            }
        });

        const buildBackupFilename = () => {
            const now = new Date();
            const pad = value => String(value).padStart(2, '0');
            const stamp = [
                now.getFullYear(),
                pad(now.getMonth() + 1),
                pad(now.getDate())
            ].join('-');
            return `mta-backup-${stamp}.json`;
        };

        const copyBackupToClipboard = async (json) => {
            if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
                throw new Error('Clipboard is not available');
            }
            await navigator.clipboard.writeText(json);
        };

        const downloadBackupJson = (filename, json) => {
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        };

        const shareBackupWithWebApi = async (filename, json) => {
            if (!navigator.share) return false;

            const file = new File([json], filename, { type: 'application/json' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: 'MTA backup',
                    text: 'Money Travel Agency backup',
                    files: [file]
                });
                return true;
            }

            await navigator.share({
                title: 'MTA backup',
                text: json
            });
            return true;
        };

        const exportBackupJson = async () => {
            const data = getAllData();
            const json = JSON.stringify(data, null, 2);
            const filename = buildBackupFilename();

            if (window.AndroidBackup && typeof window.AndroidBackup.shareJsonBackup === 'function') {
                window.AndroidBackup.shareJsonBackup(filename, json);
                showMessage(t('ui.messages.backupShareOpened'));
                return;
            }

            try {
                const shared = await shareBackupWithWebApi(filename, json);
                if (shared) {
                    showMessage(t('ui.messages.backupShareOpened'));
                    return;
                }
            } catch (error) {
                if (error && error.name === 'AbortError') {
                    return;
                }
            }

            try {
                downloadBackupJson(filename, json);
                showMessage(t('ui.messages.backupDownloaded'));
                return;
            } catch (downloadError) {
                try {
                    await copyBackupToClipboard(json);
                    showMessage(t('ui.messages.backupCopied').replace('{count}', json.length.toLocaleString()));
                    return;
                } catch (clipboardError) {
                    showMessage(`${t('ui.messages.backupExportFailed')}: ${clipboardError.message}`, 'error');
                }
            }
        };

        // Export backup as share/download/copy fallback
        const exportBtn = document.getElementById('export-json');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                exportBackupJson().catch(error => {
                    showMessage(`${t('ui.messages.backupExportFailed')}: ${error.message}`, 'error');
                });
            });
        }

        const resetDataByType = async (resetType) => {
            const isQuickStart = resetType === 'quickstart';
            const confirmMessage = isQuickStart
                ? 'Are you sure you want to reset all data to quick start data?'
                : 'Are you sure you want to reset all data to example test data?';
            if (!confirm(confirmMessage)) {
                return;
            }

            try {
                clearAllData();
                const currentLang = window.getCurrentLanguage ? window.getCurrentLanguage() : 'en';
                const baseName = isQuickStart ? 'mta-quick-start-data' : 'mta-basic-test-data';
                const dataFile = `data/${baseName}-${currentLang}.json`;
                const data = await loadResetDataFile(dataFile);
                loadJSONData(data);
            } catch (error) {
                showMessage('Error resetting data: ' + error.message, 'error');
            }
        };

        const resetExampleDataBtn = document.getElementById('reset-example-data');
        if (resetExampleDataBtn) {
            resetExampleDataBtn.addEventListener('click', () => resetDataByType('example'));
        }

        const resetQuickStartDataBtn = document.getElementById('reset-quickstart-data');
        if (resetQuickStartDataBtn) {
            resetQuickStartDataBtn.addEventListener('click', () => resetDataByType('quickstart'));
        }

        const renderTable = (title, data, columns) => {
            if (data.length === 0) {
                return `<h6>${title} (0)</h6><p class="text-muted small">No records</p>`;
            }

            const headers = columns.map(col => `<th>${col.label}</th>`).join('');
            const rows = data.map(item => {
                const cells = columns.map(col => {
                    let value = col.getValue(item);
                    if (typeof value === 'object') value = JSON.stringify(value);
                    return `<td><small>${value || '-'}</small></td>`;
                }).join('');
                return `<tr>${cells}</tr>`;
            }).join('');

            return `
                <h6>${title} (${data.length})</h6>
                <div style="overflow-x: auto;">
                    <table class="table table-sm table-bordered table-striped" style="font-size: 12px;">
                        <thead><tr>${headers}</tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            `;
        };

        window.renderDevData = () => {
            const devDataEl = document.getElementById('dev-data');
            if (!devDataEl) return;

            const airports = getAirports();
            const terminals = getTerminals();
            const groups = getPassengerGroups();
            const flights = getFlights();
            const products = getProducts ? getProducts() : [];

            devDataEl.innerHTML = `
                ${renderTable('Airports', airports, [
                    { label: 'ID', getValue: a => a.id },
                    { label: 'Name', getValue: a => a.name },
                    { label: 'Type', getValue: a => a.type || 'standard' },
                    { label: 'Status', getValue: a => a.status || 'active' },
                    { label: 'Terminals', getValue: a => getTerminals().filter(t => t.airportId === a.id).length },
                    { label: 'Created', getValue: a => a.createdAt || '-' }
                ])}
                ${renderTable('Terminals', terminals, [
                    { label: 'ID', getValue: t => t.id },
                    { label: 'Airport', getValue: t => getAirportById(t.airportId)?.name },
                    { label: 'Type', getValue: t => t.type },
                    { label: 'Alias', getValue: t => t.alias },
                    { label: 'Name', getValue: t => t.name },
                    { label: 'Returnable', getValue: t => t.returnable ? 'Yes' : 'No' },
                    { label: 'Status', getValue: t => t.status || 'active' },
                    { label: 'Created', getValue: t => t.createdAt || '-' }
                ])}
                ${renderTable('Passenger Groups', groups, [
                    { label: 'ID', getValue: g => g.id },
                    { label: 'Name', getValue: g => g.name },
                    { label: 'Type', getValue: g => g.type || 'external' },
                    { label: 'Total Amount', getValue: g => formatCurrency(g.totalAmount) },
                    { label: 'Cargo', getValue: g => Array.isArray(g.cargo) ? g.cargo.length : 0 },
                    { label: 'Created', getValue: g => new Date(g.createdAt).toLocaleString() }
                ])}
                ${renderTable('Products', products, [
                    { label: 'ID', getValue: p => p.id },
                    { label: 'Name', getValue: p => p.name },
                    { label: 'Default Unit Price', getValue: p => formatCurrency(p.defaultUnitPrice) },
                    { label: 'Status', getValue: p => p.status || 'active' },
                    { label: 'Created', getValue: p => new Date(p.createdAt).toLocaleString() }
                ])}
                ${renderTable('Flights', flights, [
                    { label: 'ID', getValue: f => f.id },
                    { label: 'Name', getValue: f => f.name },
                    { label: 'Group', getValue: f => getPassengerGroupById(f.passengerGroupId)?.name || 'None' },
                    { label: 'Status', getValue: f => f.status },
                    { label: 'Origin', getValue: f => getTerminalById(f.originTerminalId)?.name || 'None' },
                    { label: 'Destination', getValue: f => getTerminalById(f.destinationTerminalId)?.name || 'None' },
                    { label: 'Amount', getValue: f => formatCurrency(f.amount) },
                    { label: 'Date', getValue: f => f.date ? new Date(f.date).toLocaleString() : '-' },
                    { label: 'Created', getValue: f => new Date(f.createdAt).toLocaleString() }
                ])}
            `;
        };

        // Initial load
        updateAll();

        const welcomeModal = document.getElementById('welcome-modal');
        const welcomeModalClose = document.getElementById('welcome-modal-close');
        if (welcomeModalClose) {
            welcomeModalClose.addEventListener('click', () => {
                if (typeof window.closeWelcomeModal === 'function') {
                    window.closeWelcomeModal();
                }
            });
        }

        const productForm = document.getElementById('product-form');
        if (productForm) {
            productForm.addEventListener('submit', (e) => {
                e.preventDefault();
                try {
                    const editId = document.getElementById('product-edit-id')?.value || '';
                    const code = document.getElementById('product-code')?.value || '';
                    const name = document.getElementById('product-name')?.value || '';
                    const defaultUnitPrice = document.getElementById('product-default-unit-price')?.value || '0';

                    if (editId) {
                        updateProduct(editId, { code, name, defaultUnitPrice });
                    } else {
                        createProduct(code, name, defaultUnitPrice);
                    }

                    closePopup('create-product-popup');
                    showMessage(t('ui.messages.productSaved'));
                    if (typeof populateArrivalFormSelects === 'function') {
                        populateArrivalFormSelects();
                    }
                    if (typeof renderArrivalCargoRows === 'function') {
                        renderArrivalCargoRows(typeof getArrivalCargoItems === 'function' ? getArrivalCargoItems() : []);
                    }
                    updateAll();
                } catch (error) {
                    showMessage(error.message, 'error');
                }
            });
        }
        if (welcomeModal) {
            welcomeModal.addEventListener('click', (event) => {
                if (event.target === welcomeModal && typeof window.closeWelcomeModal === 'function') {
                    window.closeWelcomeModal();
                }
            });
        }
        if (typeof window.showWelcomeModalIfNeeded === 'function') {
            window.showWelcomeModalIfNeeded();
        }

        // Mobile nav bindings
        const mobileToggle = document.getElementById('mobile-nav-toggle');
        const mobileNav = document.getElementById('mobile-nav');
        if (mobileToggle) mobileToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMobileMenu();
        });

        // Handle mobile nav clicks (delegated so handlers survive DOM changes)
        document.addEventListener('click', (e) => {
            const mobileLink = e.target.closest && e.target.closest('#mobile-nav .mobile-nav-link');
            if (mobileLink) {
                e.preventDefault();
                const href = mobileLink.getAttribute('href');

                // Try to activate the tab via Bootstrap's tab plugin if available
                try {
                    const hasjQuery = !!window.jQuery;
                    const hasTabFn = hasjQuery && typeof jQuery(mobileLink).tab === 'function';

                    if (hasTabFn) {
                        const desktopSel = '.nav-tabs .nav-link[href="' + href + '"]';
                        const desktopLink = document.querySelector(desktopSel);
                        if (desktopLink) {
                            jQuery(desktopLink).tab('show');
                        } else {
                            jQuery(mobileLink).tab('show');
                        }
                    } else {
                        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('show','active'));
                        const pane = document.querySelector(href);
                        if (pane) pane.classList.add('show','active');
                        document.querySelectorAll('.nav-tabs .nav-link').forEach(n => n.classList.remove('active'));
                        const desktopLink = document.querySelector('.nav-tabs .nav-link[href="' + href + '"]');
                        if (desktopLink) desktopLink.classList.add('active');
                    }
                } catch (err) {
                    console.warn('[mobile-nav] Tab activation error', err);
                }

                setTimeout(() => {
                    closeMobileMenu();
                    const pane = document.querySelector(href);
                    if (pane) {
                        try { pane.setAttribute('tabindex', '-1'); pane.focus(); } catch (e) {}
                    }
                }, 50);
            }
        });
        // Close mobile menu on Escape or clicking outside
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeMobileMenu();
        });

        document.addEventListener('click', (e) => {
            if (!mobileNav || !mobileToggle) return;
            if (mobileNav.classList.contains('d-none')) return;
            if (!mobileNav.contains(e.target) && !mobileToggle.contains(e.target)) {
                closeMobileMenu();
            }
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attachHandlers);
    } else {
        attachHandlers();
    }
})();

// Initialize UI labels on page load
const initializeUILanguage = () => {
    const currentLang = (typeof window.getCurrentLanguage === 'function')
        ? window.getCurrentLanguage()
        : 'en';

    if (typeof window.setLanguage === 'function') {
        window.setLanguage(currentLang);
        return;
    }

    if (typeof updateUILabels === 'function') updateUILabels();
    if (typeof updateAll === 'function') updateAll();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeUILanguage();
    });
} else {
    initializeUILanguage();
}

const assignFlightToGroup = (flightId) => {
    const groupId = document.getElementById('assign-group-select').value;
    if (!groupId) {
        showMessage(t('ui.messages.selectArrivalFirst'), 'error');
        return;
    }

    const finalAmount = parseFloat(document.getElementById('assign-final-amount').value);
    if (isNaN(finalAmount) || finalAmount <= 0) {
        showMessage(t('ui.messages.enterValidFinalAmount'), 'error');
        return;
    }

    const group = getPassengerGroupById(groupId);
    if (!group) {
        showMessage(t('ui.messages.arrivalNotFound'), 'error');
        return;
    }

    const allocated = getFlights()
        .filter(f => f.passengerGroupId === groupId && f.status === 'Completed')
        .reduce((sum, f) => sum + (f.amount || 0), 0);

    const remaining = (group.totalAmount || 0) - allocated;
    if (finalAmount > remaining) {
        showMessage(
            t('ui.messages.finalAmountExceedsAvailable')
                .replace('{finalAmount}', formatCurrency(finalAmount))
                .replace('{remaining}', formatCurrency(remaining)),
            'error'
        );
        return;
    }

    try {
        updateFlight(flightId, {
            passengerGroupId: groupId,
            amount: finalAmount,
            status: 'Completed'
        });
        showMessage(t('ui.messages.flightAssignedToArrival'));
        closeDetails();
        updateAll();
    } catch (error) {
        showMessage(error.message, 'error');
    }
};

window.assignFlightToGroup = assignFlightToGroup;

// Delete Airport Handler
window.handleDeleteAirport = (airportId, airportName) => {
    if (typeof window.isDeleteEnabledMode === 'function' && !window.isDeleteEnabledMode()) {
        return;
    }
    if (!confirm(t('ui.messages.confirmDeleteAirport').replace('{name}', airportName))) {
        return;
    }

    const terminals = getTerminals().filter(t => t.airportId === airportId);
    if (terminals.length > 0) {
        showMessage(t('ui.messages.airportDeleteBlockedHasTerminals'), 'error');
        return;
    }

    try {
        deleteAirport(airportId);
        if (typeof closeDetails === 'function') {
            closeDetails();
        }
        showMessage(t('ui.messages.airportDeleted'));
        updateAll();
    } catch (error) {
        showMessage(error.message, 'error');
    }
};

// Delete Terminal Handler
window.handleDeleteTerminal = (terminalId, terminalName) => {
    if (typeof window.isDeleteEnabledMode === 'function' && !window.isDeleteEnabledMode()) {
        return;
    }
    const terminal = getTerminalById(terminalId);
    const airport = terminal ? getAirportById(terminal.airportId) : null;
    if (airport && airport.type === 'credit') {
        showMessage(t('ui.messages.creditAirportManagesTerminals'), 'error');
        return;
    }

    if (!confirm(t('ui.messages.confirmDeleteTerminal').replace('{name}', terminalName))) {
        return;
    }

    try {
        deleteTerminal(terminalId);
        if (typeof closeDetails === 'function') {
            closeDetails();
        }
        showMessage(t('ui.messages.terminalDeleted'));
        updateAll();
    } catch (error) {
        const message = error && error.message === 'Cannot delete terminal used in flights'
            ? t('ui.messages.terminalDeleteBlockedFlights')
            : error.message;
        showMessage(message, 'error');
    }
};
