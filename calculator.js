// Tree Carbon & Oxygen Calculator
// Based on research formula: AGB = 34.4703 - 8.0671 * D + 0.6589 * D^2

class TreeCalculator {
    constructor() {
        // Constants
        this.CARBON_PRICE_PER_TON = 2000; // ₹2000 per ton CO2 (approximate)
        this.OXYGEN_PER_PERSON_YEAR = 730; // kg per person per year
        this.CAR_EMISSION_PER_KM = 0.12; // kg CO2 per km
        this.HOME_ENERGY_PER_DAY = 10; // kg CO2 per day
    }

    // Convert units to standard (meters and cm)
    convertHeight(value, unit) {
        switch(unit) {
            case 'm': return value;
            case 'ft': return value * 0.3048;
            case 'cm': return value / 100;
            default: return value;
        }
    }

    convertDBH(value, unit) {
        switch(unit) {
            case 'cm': return value;
            case 'in': return value * 2.54;
            default: return value;
        }
    }

    // Calculate Above-Ground Biomass (AGB)
    calculateAGB(dbhCm) {
        // Formula: AGB = 34.4703 - 8.0671 * D + 0.6589 * D^2
        const D = dbhCm;
        const agb = 34.4703 - (8.0671 * D) + (0.6589 * Math.pow(D, 2));
        return Math.max(0, agb); // Ensure non-negative
    }

    // Calculate Below-Ground Biomass (BGB)
    calculateBGB(agb) {
        // Formula: BGB = AGB * 0.15 (15% of above-ground)
        return agb * 0.15;
    }

    // Calculate Total Biomass
    calculateTotalBiomass(agb, bgb) {
        return agb + bgb;
    }

    // Calculate Carbon Stored
    calculateCarbon(totalBiomass) {
        // Formula: Carbon = Total Biomass * 0.5 (50% of biomass is carbon)
        return totalBiomass * 0.5;
    }

    // Calculate CO2 Equivalent
    calculateCO2(carbon) {
        // Formula: CO2 = (Carbon * 44) / 12
        // Molecular weight ratio: CO2 (44) to C (12)
        return (carbon * 44) / 12;
    }

    // Calculate Oxygen Production
    calculateOxygen(co2) {
        // Formula: O2 ≈ CO2 * 0.7 (approximate)
        // Through photosynthesis: 6CO2 + 6H2O → C6H12O6 + 6O2
        return co2 * 0.727; // More accurate ratio
    }

    // Calculate Air Pollution Absorption
    calculatePollutionAbsorption(height, dbh) {
        // Estimation based on leaf area and tree size
        // Larger trees absorb more pollutants (PM2.5, NO2, SO2)
        const leafAreaFactor = (height * dbh) / 100;
        return leafAreaFactor * 0.5; // kg/year
    }

    // Calculate Economic Value (Carbon Credits)
    calculateEconomicValue(co2) {
        // Convert kg to tons and multiply by price
        const co2Tons = co2 / 1000;
        return co2Tons * this.CARBON_PRICE_PER_TON;
    }

    // Calculate environmental equivalents
    calculateEquivalents(co2, oxygen) {
        return {
            people: (oxygen / this.OXYGEN_PER_PERSON_YEAR).toFixed(2),
            carKm: (co2 / this.CAR_EMISSION_PER_KM).toFixed(0),
            homeDays: (co2 / this.HOME_ENERGY_PER_DAY).toFixed(1)
        };
    }

    // Main calculation function
    calculate(heightValue, heightUnit, dbhValue, dbhUnit) {
        // Convert to standard units
        const heightM = this.convertHeight(heightValue, heightUnit);
        const dbhCm = this.convertDBH(dbhValue, dbhUnit);

        // Perform calculations
        const agb = this.calculateAGB(dbhCm);
        const bgb = this.calculateBGB(agb);
        const totalBiomass = this.calculateTotalBiomass(agb, bgb);
        const carbon = this.calculateCarbon(totalBiomass);
        const co2 = this.calculateCO2(carbon);
        const oxygen = this.calculateOxygen(co2);
        const pollution = this.calculatePollutionAbsorption(heightM, dbhCm);
        const economicValue = this.calculateEconomicValue(co2);
        const equivalents = this.calculateEquivalents(co2, oxygen);

        return {
            biomass: {
                total: totalBiomass.toFixed(2),
                aboveGround: agb.toFixed(2),
                belowGround: bgb.toFixed(2)
            },
            carbon: carbon.toFixed(2),
            co2: co2.toFixed(2),
            oxygen: oxygen.toFixed(2),
            pollution: pollution.toFixed(2),
            economicValue: economicValue.toFixed(2),
            equivalents: equivalents,
            inputs: {
                height: heightM.toFixed(2),
                dbh: dbhCm.toFixed(2)
            }
        };
    }
}

// Create global instance
const calculator = new TreeCalculator();
