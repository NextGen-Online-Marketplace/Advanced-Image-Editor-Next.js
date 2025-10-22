const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Section schema
const SectionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  order_index: { type: Number, required: true },
}, { timestamps: true });

SectionSchema.index({ order_index: 1 });
SectionSchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

const Section = mongoose.models.Section || mongoose.model('Section', SectionSchema);

async function replaceChecklistWithGarage() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the Checklist section (order_index 18)
    const checklistSection = await Section.findOne({ order_index: 18 });
    
    if (!checklistSection) {
      console.log('❌ Checklist section not found at order_index 18');
    } else {
      console.log(`📝 Found section at order_index 18: "${checklistSection.name}"`);
    }

    // Check if Garage section already exists
    const existingGarage = await Section.findOne({ name: /garage/i });
    
    if (existingGarage) {
      console.log(`⚠️ Garage section already exists: "${existingGarage.name}" at order_index ${existingGarage.order_index}`);
      
      // If it's not at position 17, update it
      if (existingGarage.order_index !== 17) {
        await Section.findByIdAndUpdate(existingGarage._id, { order_index: 17 });
        console.log(`✅ Updated existing Garage section to order_index 17`);
      }
      
      // Delete the Checklist section if it exists
      if (checklistSection) {
        await Section.findByIdAndDelete(checklistSection._id);
        console.log(`🗑️ Deleted Checklist section`);
      }
    } else {
      // Update the Checklist section to become Garage
      if (checklistSection) {
        await Section.findByIdAndUpdate(checklistSection._id, { 
          name: '17 - Garage',
          order_index: 17
        });
        console.log(`✅ Replaced "Checklist" with "17 - Garage" at order_index 17`);
      } else {
        // Create new Garage section
        await Section.create({
          name: '17 - Garage',
          order_index: 17
        });
        console.log(`✅ Created new "17 - Garage" section at order_index 17`);
      }
    }

    // Show all sections for confirmation
    console.log('\n📋 All sections after update:');
    const allSections = await Section.find({}).sort({ order_index: 1 });
    allSections.forEach((s) => {
      console.log(`  ${s.order_index}. ${s.name}`);
    });

    console.log('\n🎉 Update completed successfully!');

  } catch (error) {
    console.error('❌ Error updating sections:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  replaceChecklistWithGarage();
}

module.exports = replaceChecklistWithGarage;
