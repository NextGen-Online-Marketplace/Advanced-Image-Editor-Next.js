/**
 * Production Database Seeding Script
 * 
 * This script will update your PRODUCTION database with answer choices.
 * Make sure .env.local has your PRODUCTION MongoDB URI before running!
 * 
 * Usage: node scripts/seed-production.js
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

// Define schemas
const SectionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  order_index: { type: Number, required: true }
}, { timestamps: true });

const SectionChecklistSchema = new mongoose.Schema({
  section_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
  text: { type: String, required: true },
  value: { type: String },
  comment: { type: String },
  type: { type: String, enum: ['status', 'information'], required: true },
  tab: { type: String, enum: ['information', 'limitations'], required: true },
  answer_choices: { type: [String], default: undefined },
  order_index: { type: Number, required: true }
}, { timestamps: true });

const Section = mongoose.models.Section || mongoose.model('Section', SectionSchema);
const SectionChecklist = mongoose.models.SectionChecklist || mongoose.model('SectionChecklist', SectionChecklistSchema);

// Complete answer choices data for all 76 items across 15 sections
const answerChoicesData = {
  '1 - Inspection Details': {
    'General: Type of Inspection': ['Pre-Purchase', 'Pre-Listing', 'Warranty Expiration', 'New Build', '4-Point', 'Roof (only)', 'Electrical', 'Warranty Inspection', 'Repair Inspection'],
    'General: Style of Home': ['Ranch', 'Manufactured', 'Condo', 'Duplex', 'Four-plex', '8-plex', 'Modular', 'Barn dominium', 'Modern', 'Commercial', 'Single-Family', 'Multi-Family'],
    'General: In Attendance': ['Client', 'Buyer Agent', 'Listing Agent', 'Seller', 'Tenant', 'None', 'Family of the Client', 'Contractors', 'Owner', 'Agent Representative', 'Owner Representative'],
    'General: Occupancy': ['Furnished', 'Vacant', 'Occupied', 'Unfurnished', 'Mostly Vacant', 'Staged', 'Partially Occupied', 'Under Construction', 'Remodeled', 'New Construction'],
    'General: Utilities': ['Water', 'Gas', 'Electric', 'Propane', 'All Off', 'All On', 'Gas - Off', 'Water - Off'],
    'General: Weather': ['Rain', 'Recent Rain', 'Clear', 'Snow', 'Recent snow', 'Below freezing', 'Cloudy', 'Fog', 'Heavy Rain', 'Cold', 'Windy'],
    'General: Exterior Temperature': ['Above Freezing', 'Below Freezing'],
  },
  '2 - Orientation / Shutoffs': {
    'Electrical - Main Disconnect - Location': ['Front of the House', 'Rear of the House', 'Left Side of the House', 'Right Side of House', 'Garage', 'Garage Closet', 'Storage Closet', 'Laundry Room', 'Living Room', 'Hallway', 'Kitchen', 'Family Room', 'Master Bedroom', 'Additional Shutoff', 'Bedroom 1', 'Master Closet', 'Bedroom 2 Closet', 'Attic', 'Shop', 'Garage Storage', 'Bathroom', 'None'],
    'Gas - Main Shut Off Valve - Location': ['Meter', 'Propane Tank', 'Left Side of House', 'Right Side of House', 'Front of House', 'Rear of House', 'Near the Road', 'In the Back Yard', 'In the Front Yard'],
    'Water - Main Shut Off Valve - Location': ['Front Yard', 'Left Side of House', 'Right Side of House', 'Rear of House', 'Garage', 'Basement', 'Crawl Space', 'Laundry Room', 'Kitchen', 'Bathroom', 'Utility Room', 'At the Meter', 'At the Street', 'Unknown', 'Not Visible'],
  },
  '4 - Foundation & Structure': {
    'Foundation: Type': ['Slab on Grade', 'Crawl Space', 'Basement', 'Pier and Beam', 'Raised Foundation', 'Concrete Slab', 'Post and Beam', 'Combination'],
    'Foundation: Material': ['Concrete', 'Block', 'Brick', 'Stone', 'Wood', 'Steel', 'Combination'],
    'Basement: Type': ['Full', 'Partial', 'Walkout', 'Finished', 'Unfinished', 'None'],
    'Crawl Space: Type': ['Vented', 'Unvented', 'Conditioned', 'Unconditioned', 'None'],
    'Attic: Access Location': ['Garage', 'Hallway', 'Closet', 'Bedroom', 'Exterior', 'None', 'Multiple Locations'],
    'Crawl Space: Access Location': ['Interior', 'Exterior', 'Garage', 'None', 'Multiple Locations'],
    'Framing: Material': ['Wood', 'Steel', 'Engineered Lumber', 'Combination'],
  },
  '5 - Exterior': {
    'Siding: Material': ['Vinyl', 'Wood', 'Fiber Cement', 'Brick', 'Stucco', 'Stone', 'Aluminum', 'Metal', 'EIFS', 'Combination'],
    'Trim: Material': ['Wood', 'Vinyl', 'Aluminum', 'Fiber Cement', 'PVC', 'Metal', 'Composite'],
    'Soffit: Material': ['Vinyl', 'Wood', 'Aluminum', 'Fiber Cement', 'Metal'],
    'Fascia: Material': ['Wood', 'Vinyl', 'Aluminum', 'Fiber Cement', 'Metal', 'PVC'],
    'Driveway: Material': ['Concrete', 'Asphalt', 'Gravel', 'Pavers', 'Dirt', 'None'],
    'Walkway: Material': ['Concrete', 'Pavers', 'Brick', 'Stone', 'Gravel', 'Wood', 'None'],
    'Patio: Material': ['Concrete', 'Pavers', 'Wood', 'Stone', 'Brick', 'Composite', 'None'],
    'Deck: Material': ['Wood', 'Composite', 'PVC', 'Aluminum', 'Concrete', 'None'],
  },
  '6 - Roof': {
    'Roof: Type': ['Gable', 'Hip', 'Flat', 'Gambrel', 'Mansard', 'Shed', 'Combination'],
    'Roof: Material': ['Asphalt Shingle', 'Metal', 'Tile', 'Slate', 'Wood Shake', 'Built-Up', 'Modified Bitumen', 'TPO', 'EPDM', 'PVC'],
    'Roof: Layers': ['Single Layer', 'Multiple Layers'],
    'Gutters: Material': ['Aluminum', 'Vinyl', 'Steel', 'Copper', 'None'],
    'Downspouts: Material': ['Aluminum', 'Vinyl', 'Steel', 'Copper', 'None'],
  },
  '7 - Doors, Windows & Interior': {
    'Windows: Type': ['Single Hung', 'Double Hung', 'Casement', 'Sliding', 'Fixed', 'Awning', 'Bay', 'Bow', 'Garden', 'Combination'],
    'Windows: Glazing': ['Single Pane', 'Double Pane', 'Triple Pane', 'Low-E', 'Combination'],
    'Windows: Frame Material': ['Wood', 'Vinyl', 'Aluminum', 'Fiberglass', 'Composite', 'Combination'],
    'Doors: Material': ['Wood', 'Steel', 'Fiberglass', 'Vinyl', 'Aluminum', 'Combination'],
  },
  '8 - Insulation & Ventilation': {
    'Attic: Insulation Type': ['Fiberglass Batts', 'Blown-In Fiberglass', 'Blown-In Cellulose', 'Spray Foam', 'Rigid Foam', 'Combination', 'None Visible'],
    'Wall: Insulation Type': ['Fiberglass Batts', 'Blown-In', 'Spray Foam', 'Rigid Foam', 'None Visible', 'Unknown'],
    'Attic: Insulation Material': ['Fiberglass', 'Cellulose', 'Spray Foam', 'Rockwool', 'Combination'],
    'Ventilation & Exhaust: Attic Ventilation Type': ['Ridge Vent', 'Gable Vent', 'Soffit Vent', 'Turbine', 'Power Fan', 'Combination', 'None Visible'],
    'Ventilation & Exhaust: Bathroom Ventilation Type': ['Exhaust Fan to Exterior', 'Exhaust Fan to Attic', 'Window Only', 'None'],
    'Ventilation & Exhaust: Kitchen Ventilation Type': ['Range Hood to Exterior', 'Range Hood Recirculating', 'Microwave Vent', 'None'],
    'Ventilation & Exhaust: Dryer Ventilation Termination': ['Exterior Wall', 'Roof', 'Attic', 'Crawl Space', 'None', 'Unknown'],
  },
  '9 - AC / Cooling': {
    'AC: Type': ['Central Air', 'Heat Pump', 'Mini-Split', 'Window Unit', 'Portable', 'Evaporative Cooler', 'None'],
    'AC: Manufacturer': ['Carrier', 'Trane', 'Lennox', 'Goodman', 'Rheem', 'York', 'American Standard', 'Bryant', 'Amana', 'Coleman', 'Heil', 'Payne', 'Frigidaire', 'GE', 'Other', 'Unknown'],
    'AC: Energy Source': ['Electric', 'Gas', 'Propane', 'Oil'],
  },
  '10 - Furnace / Heater': {
    'Heating: Type': ['Forced Air', 'Boiler', 'Heat Pump', 'Electric Baseboard', 'Wall Heater', 'Space Heater', 'Radiant Floor', 'None'],
    'Heating: Energy Source': ['Natural Gas', 'Propane', 'Electric', 'Oil', 'Wood', 'Geothermal'],
    'Heating: Manufacturer': ['Carrier', 'Trane', 'Lennox', 'Goodman', 'Rheem', 'York', 'American Standard', 'Bryant', 'Amana', 'Coleman', 'Heil', 'Payne', 'Other', 'Unknown'],
  },
  '11 - Water Heater': {
    'Water Heater: Type': ['Tank', 'Tankless', 'Heat Pump', 'Solar', 'Indirect', 'Point of Use'],
    'Water Heater: Energy Source': ['Natural Gas', 'Propane', 'Electric', 'Oil', 'Solar'],
    'Water Heater: Manufacturer': ['AO Smith', 'Rheem', 'Bradford White', 'GE', 'Whirlpool', 'State', 'American', 'Rinnai', 'Navien', 'Noritz', 'Takagi', 'Bosch', 'Other', 'Unknown'],
    'Water Heater: Location': ['Garage', 'Basement', 'Utility Room', 'Closet', 'Attic', 'Crawl Space', 'Exterior', 'Laundry Room'],
  },
  '12 - Electrical': {
    'Service Panel: Manufacturer': ['Square D', 'General Electric', 'Siemens', 'Cutler-Hammer', 'Murray', 'ITE', 'Challenger', 'Federal Pacific', 'Zinsco', 'Pushmatic', 'Other', 'Unknown'],
    'Service Panel: Type': ['Circuit Breaker', 'Fuses', 'Combination'],
    'Service Entrance: Location': ['Overhead', 'Underground'],
    'Wiring: Type': ['Copper', 'Aluminum', 'Copper-Clad Aluminum', 'Knob and Tube', 'Combination'],
  },
  '13 - Plumbing': {
    'Water Supply Piping: Material': ['Copper', 'PEX', 'CPVC', 'Galvanized', 'PVC', 'Polybutylene', 'Combination'],
    'Drain Piping: Material': ['PVC', 'ABS', 'Cast Iron', 'Galvanized', 'Copper', 'Combination'],
    'Water Supply: Source': ['Public', 'Private Well', 'Cistern', 'Unknown'],
  },
  '14 - Fireplace & Chimney': {
    'Fireplace: Type': ['Wood Burning', 'Gas', 'Electric', 'Pellet', 'Ethanol', 'None'],
    'Fireplace: Location': ['Living Room', 'Family Room', 'Bedroom', 'Basement', 'Multiple Locations', 'None'],
    'Chimney: Material': ['Brick', 'Stone', 'Metal', 'Factory-Built', 'None'],
  },
  '15 - Built-In Appliances': {
    'Refrigerator: Brand': ['Whirlpool', 'GE', 'Samsung', 'LG', 'Frigidaire', 'KitchenAid', 'Maytag', 'Bosch', 'Sub-Zero', 'Other', 'Unknown'],
    'Dishwasher: Brand': ['Whirlpool', 'GE', 'Samsung', 'LG', 'Frigidaire', 'KitchenAid', 'Maytag', 'Bosch', 'Other', 'Unknown'],
    'Garbage Disposal: Brand': ['InSinkErator', 'Waste King', 'KitchenAid', 'Moen', 'GE', 'Other', 'Unknown', 'None'],
    'Microwave w/ Exhaust: Brand': ['GE', 'Whirlpool', 'Samsung', 'LG', 'Frigidaire', 'KitchenAid', 'Panasonic', 'Sharp', 'Other', 'Unknown'],
    'Microwave w/ Exhaust: Venting Method': ['Vented to Exterior', 'Recirculating', 'Unknown'],
    'Range Hood: Brand': ['Broan', 'GE', 'Whirlpool', 'Samsung', 'LG', 'KitchenAid', 'Bosch', 'Other', 'Unknown'],
    'Range Hood: Venting Method': ['Vented to Exterior', 'Recirculating', 'Unknown'],
    'Range/Oven/Cooktop: Brand': ['GE', 'Whirlpool', 'Samsung', 'LG', 'Frigidaire', 'KitchenAid', 'Bosch', 'Thermador', 'Other', 'Unknown'],
    'Range/Oven/Cooktop: Energy Source': ['Electric', 'Natural Gas', 'Propane', 'Dual Fuel'],
  },
  '16 - Garage': {
    'Garage Door Opener: Brand': ['LiftMaster', 'Chamberlain', 'Genie', 'Craftsman', 'Overhead Door', 'Other', 'Unknown', 'None'],
    'Garage Door: Material': ['Steel', 'Wood', 'Aluminum', 'Fiberglass', 'Vinyl', 'Combination'],
    'Garage Door: Type': ['Sectional', 'Roll-Up', 'Swing-Out', 'Slide to Side'],
  }
};

async function seedProduction() {
  console.log('\n🚀 Starting Production Database Seeding...\n');
  
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log('📍 Database:', mongoose.connection.name);
    console.log('🔗 Host:', mongoose.connection.host);
    console.log('');

    // Confirm this is production
    const answer = await new Promise((resolve) => {
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      readline.question('⚠️  Is this your PRODUCTION database? (yes/no): ', (ans) => {
        readline.close();
        resolve(ans.toLowerCase());
      });
    });

    if (answer !== 'yes') {
      console.log('❌ Aborted. Please update .env.local with production MongoDB URI first.');
      process.exit(0);
    }

    let totalUpdated = 0;
    let totalSkipped = 0;

    // Process each section
    for (const [sectionName, items] of Object.entries(answerChoicesData)) {
      console.log(`\n📂 Processing: ${sectionName}`);
      
      // Find section
      const section = await Section.findOne({ 
        name: new RegExp(sectionName.replace(/[-]/g, '\\-'), 'i')
      });
      
      if (!section) {
        console.log(`   ⚠️  Section not found: ${sectionName}`);
        continue;
      }

      // Update each item
      for (const [itemText, choices] of Object.entries(items)) {
        const item = await SectionChecklist.findOne({
          section_id: section._id,
          text: new RegExp(itemText.replace(/[-:]/g, '\\$&'), 'i')
        });

        if (item) {
          await SectionChecklist.findByIdAndUpdate(
            item._id,
            { answer_choices: choices },
            { new: true }
          );
          totalUpdated++;
          console.log(`   ✅ Updated: ${itemText} (${choices.length} choices)`);
        } else {
          totalSkipped++;
          console.log(`   ⚠️  Not found: ${itemText}`);
        }
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Items updated: ${totalUpdated}`);
    console.log(`⚠️  Items skipped: ${totalSkipped}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✨ Production database seeding complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

seedProduction();
