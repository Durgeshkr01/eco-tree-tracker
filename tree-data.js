// Indian Tree Species Database
const treeSpeciesData = [
    // Popular Indian Trees
    { name: "Neem (Azadirachta indica)", scientific: "Azadirachta indica", common: "Neem", avgHeight: 15, avgDBH: 40 },
    { name: "Mango (Mangifera indica)", scientific: "Mangifera indica", common: "Mango", avgHeight: 20, avgDBH: 50 },
    { name: "Peepal (Ficus religiosa)", scientific: "Ficus religiosa", common: "Peepal/Sacred Fig", avgHeight: 25, avgDBH: 60 },
    { name: "Banyan (Ficus benghalensis)", scientific: "Ficus benghalensis", common: "Banyan", avgHeight: 25, avgDBH: 80 },
    { name: "Neem Tree", scientific: "Azadirachta indica", common: "Neem", avgHeight: 15, avgDBH: 40 },
    { name: "Jamun (Syzygium cumini)", scientific: "Syzygium cumini", common: "Jamun/Black Plum", avgHeight: 18, avgDBH: 45 },
    { name: "Ashoka (Saraca asoca)", scientific: "Saraca asoca", common: "Ashoka", avgHeight: 10, avgDBH: 25 },
    { name: "Gulmohar (Delonix regia)", scientific: "Delonix regia", common: "Gulmohar/Flame Tree", avgHeight: 12, avgDBH: 35 },
    { name: "Amaltas (Cassia fistula)", scientific: "Cassia fistula", common: "Amaltas/Golden Shower", avgHeight: 15, avgDBH: 30 },
    { name: "Teak (Tectona grandis)", scientific: "Tectona grandis", common: "Teak/Sagwan", avgHeight: 30, avgDBH: 70 },
    
    // Fruit Trees
    { name: "Coconut (Cocos nucifera)", scientific: "Cocos nucifera", common: "Coconut", avgHeight: 20, avgDBH: 25 },
    { name: "Guava (Psidium guajava)", scientific: "Psidium guajava", common: "Guava/Amrud", avgHeight: 8, avgDBH: 20 },
    { name: "Papaya (Carica papaya)", scientific: "Carica papaya", common: "Papaya", avgHeight: 6, avgDBH: 15 },
    { name: "Jackfruit (Artocarpus heterophyllus)", scientific: "Artocarpus heterophyllus", common: "Jackfruit/Kathal", avgHeight: 20, avgDBH: 50 },
    { name: "Tamarind (Tamarindus indica)", scientific: "Tamarindus indica", common: "Tamarind/Imli", avgHeight: 25, avgDBH: 60 },
    { name: "Pomegranate (Punica granatum)", scientific: "Punica granatum", common: "Pomegranate/Anar", avgHeight: 6, avgDBH: 15 },
    { name: "Custard Apple (Annona squamosa)", scientific: "Annona squamosa", common: "Custard Apple/Sitaphal", avgHeight: 6, avgDBH: 18 },
    { name: "Lemon (Citrus limon)", scientific: "Citrus limon", common: "Lemon/Nimbu", avgHeight: 5, avgDBH: 12 },
    
    // Medicinal Trees
    { name: "Amla (Phyllanthus emblica)", scientific: "Phyllanthus emblica", common: "Amla/Indian Gooseberry", avgHeight: 12, avgDBH: 30 },
    { name: "Arjuna (Terminalia arjuna)", scientific: "Terminalia arjuna", common: "Arjuna", avgHeight: 25, avgDBH: 55 },
    { name: "Harad (Terminalia chebula)", scientific: "Terminalia chebula", common: "Harad/Haritaki", avgHeight: 20, avgDBH: 45 },
    { name: "Baheda (Terminalia bellirica)", scientific: "Terminalia bellirica", common: "Baheda/Bibhitaki", avgHeight: 20, avgDBH: 45 },
    { name: "Tulsi Plant (Ocimum sanctum)", scientific: "Ocimum sanctum", common: "Tulsi/Holy Basil", avgHeight: 1, avgDBH: 2 },
    
    // Timber & Commercial Trees
    { name: "Sal (Shorea robusta)", scientific: "Shorea robusta", common: "Sal/Sakhu", avgHeight: 35, avgDBH: 80 },
    { name: "Sheesham (Dalbergia sissoo)", scientific: "Dalbergia sissoo", common: "Sheesham/Indian Rosewood", avgHeight: 25, avgDBH: 60 },
    { name: "Bamboo (Bambusoideae)", scientific: "Bambusoideae", common: "Bamboo/Baans", avgHeight: 15, avgDBH: 10 },
    { name: "Eucalyptus (Eucalyptus globulus)", scientific: "Eucalyptus globulus", common: "Eucalyptus/Safeda", avgHeight: 40, avgDBH: 70 },
    { name: "Casuarina (Casuarina equisetifolia)", scientific: "Casuarina equisetifolia", common: "Casuarina/Whistling Pine", avgHeight: 30, avgDBH: 50 },
    
    // Ornamental Trees
    { name: "Badam (Terminalia catappa)", scientific: "Terminalia catappa", common: "Indian Almond/Badam", avgHeight: 15, avgDBH: 40 },
    { name: "Kachnar (Bauhinia variegata)", scientific: "Bauhinia variegata", common: "Kachnar/Mountain Ebony", avgHeight: 12, avgDBH: 30 },
    { name: "Siris (Albizia lebbeck)", scientific: "Albizia lebbeck", common: "Siris/Woman's Tongue", avgHeight: 20, avgDBH: 50 },
    { name: "Bougainvillea", scientific: "Bougainvillea glabra", common: "Bougainvillea", avgHeight: 5, avgDBH: 8 },
    { name: "Frangipani (Plumeria)", scientific: "Plumeria rubra", common: "Frangipani/Champa", avgHeight: 6, avgDBH: 15 },
    
    // Forest Trees
    { name: "Sandalwood (Santalum album)", scientific: "Santalum album", common: "Sandalwood/Chandan", avgHeight: 12, avgDBH: 30 },
    { name: "Mahua (Madhuca longifolia)", scientific: "Madhuca longifolia", common: "Mahua", avgHeight: 20, avgDBH: 50 },
    { name: "Malabar Neem (Melia dubia)", scientific: "Melia dubia", common: "Malabar Neem", avgHeight: 20, avgDBH: 45 },
    { name: "Khejri (Prosopis cineraria)", scientific: "Prosopis cineraria", common: "Khejri/Shami", avgHeight: 12, avgDBH: 35 },
    { name: "Babul (Acacia nilotica)", scientific: "Acacia nilotica", common: "Babul/Kikar", avgHeight: 15, avgDBH: 40 },
    
    // Palm Trees
    { name: "Date Palm (Phoenix dactylifera)", scientific: "Phoenix dactylifera", common: "Date Palm/Khajoor", avgHeight: 20, avgDBH: 30 },
    { name: "Betel Nut (Areca catechu)", scientific: "Areca catechu", common: "Betel Nut/Supari", avgHeight: 18, avgDBH: 20 },
    { name: "Palmyra Palm (Borassus flabellifer)", scientific: "Borassus flabellifer", common: "Palmyra Palm/Taal", avgHeight: 25, avgDBH: 35 },
    
    // Flowering Trees
    { name: "Jacaranda (Jacaranda mimosifolia)", scientific: "Jacaranda mimosifolia", common: "Jacaranda", avgHeight: 15, avgDBH: 40 },
    { name: "Silk Cotton (Bombax ceiba)", scientific: "Bombax ceiba", common: "Silk Cotton/Semal", avgHeight: 30, avgDBH: 70 },
    { name: "Indian Coral (Erythrina indica)", scientific: "Erythrina indica", common: "Indian Coral/Pangara", avgHeight: 12, avgDBH: 30 },
    { name: "Parijat (Nyctanthes arbor-tristis)", scientific: "Nyctanthes arbor-tristis", common: "Parijat/Night Jasmine", avgHeight: 8, avgDBH: 20 },
    
    // Other Common Trees
    { name: "Bottle Palm (Hyophorbe lagenicaulis)", scientific: "Hyophorbe lagenicaulis", common: "Bottle Palm", avgHeight: 8, avgDBH: 25 },
    { name: "Pine (Pinus roxburghii)", scientific: "Pinus roxburghii", common: "Chir Pine", avgHeight: 35, avgDBH: 65 },
    { name: "Deodar (Cedrus deodara)", scientific: "Cedrus deodara", common: "Deodar/Himalayan Cedar", avgHeight: 40, avgDBH: 80 },
    { name: "Oak (Quercus)", scientific: "Quercus leucotrichophora", common: "Banj Oak", avgHeight: 25, avgDBH: 55 },
    { name: "Cypress (Cupressus)", scientific: "Cupressus sempervirens", common: "Cypress", avgHeight: 30, avgDBH: 50 },
    { name: "Juniper (Juniperus)", scientific: "Juniperus indica", common: "Himalayan Juniper", avgHeight: 15, avgDBH: 35 }
];

// Load tree species into dropdown
function loadTreeSpecies() {
    const select = document.getElementById('treeSpecies');
    
    // Sort alphabetically
    const sortedTrees = treeSpeciesData.sort((a, b) => a.name.localeCompare(b.name));
    
    sortedTrees.forEach((tree, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = tree.name;
        select.appendChild(option);
    });
}

// Get tree data by index
function getTreeData(index) {
    return treeSpeciesData[index];
}

// Load species on page load
document.addEventListener('DOMContentLoaded', loadTreeSpecies);
