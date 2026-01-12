// Tree Carbon & Oxygen Calculator
// Based on research formula: AGB = 34.4703 - 8.0671 * D + 0.6589 * D^2

class TreeCalculator {
    constructor() {
        // Constants
        this.CARBON_PRICE_PER_TON = 1500; // ₹1500 per ton CO2 (conservative Indian valuation)
        this.OXYGEN_PER_PERSON_YEAR = 730; // kg per person per year
        this.CAR_EMISSION_PER_KM = 0.12; // kg CO2 per km
        this.HOME_ENERGY_PER_DAY = 10; // kg CO2 per day
    }

    // Convert Circumference to DBH (Diameter at Breast Height)
    convertCircumferenceToDiamet(circumferenceCm) {
        // Formula: DBH = Circumference / π
        return circumferenceCm / 3.14;
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
    calculateOxygen(carbon) {
        // Formula: O2 = Carbon * 2.67 (per year)
        // Scientific approximation used in urban forestry
        return carbon * 2.67;
    }

    // Calculate Air Pollution Absorption
    calculatePollutionAbsorption(co2) {
        // Formula: Pollution Absorbed = 0.02 × CO2 Equivalent
        // Represents PM2.5, NO₂, SO₂, O₃ absorption combined
        return co2 * 0.02;
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
    calculate(circumferenceCm) {
        // Step 1: Convert Circumference to DBH
        const dbhCm = this.convertCircumferenceToDiamet(circumferenceCm);

        // Step 2-6: Biomass and Carbon calculations
        const agb = this.calculateAGB(dbhCm);
        const bgb = this.calculateBGB(agb);
        const totalBiomass = this.calculateTotalBiomass(agb, bgb);
        const carbon = this.calculateCarbon(totalBiomass);
        const co2 = this.calculateCO2(carbon);
        
        // Step 7: Oxygen production (using carbon, not CO2)
        const oxygen = this.calculateOxygen(carbon);
        
        // Step 8: Pollution absorption (using CO2)
        const pollution = this.calculatePollutionAbsorption(co2);
        
        // Step 9: Economic value
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
                circumference: circumferenceCm.toFixed(2),
                dbh: dbhCm.toFixed(2)
            }
        };
    }
}

// Create global instance
const calculator = new TreeCalculator();
