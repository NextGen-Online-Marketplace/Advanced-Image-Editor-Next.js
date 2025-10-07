require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

// Schema definitions matching production
const sectionSchema = new mongoose.Schema({
  name: String,
  order_index: Number
}, { collection: 'sections' });

const sectionChecklistSchema = new mongoose.Schema({
  section_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
  text: String,
  value: String,
  comment: String,
  type: String,
  tab: String,
  answer_choices: [String],
  order_index: Number
}, { collection: 'sectionchecklists' });

const Section = mongoose.model('Section', sectionSchema);
const SectionChecklist = mongoose.model('SectionChecklist', sectionChecklistSchema);

async function queryProduction() {
  try {
    console.log('🔗 Connecting to PRODUCTION database...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    const dbName = mongoose.connection.db.databaseName;
    const host = mongoose.connection.host;
    console.log('✅ Connected to MongoDB');
    console.log(`📍 Database: ${dbName}`);
    console.log(`🔗 Host: ${host}\n`);

    // Get all sections
    const sections = await Section.find().sort({ order_index: 1 }).lean();
    console.log(`📂 Found ${sections.length} sections\n`);

    if (sections.length === 0) {
      console.log('⚠️  No sections found in production database!');
      await mongoose.disconnect();
      return;
    }

    // For each section, get its checklists
    for (const section of sections) {
      const checklists = await SectionChecklist.find({ section_id: section._id })
        .sort({ order_index: 1 })
        .lean();

      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📂 Section: ${section.name} (order: ${section.order_index})`);
      console.log(`   Checklists: ${checklists.length} items`);
      
      if (checklists.length > 0) {
        checklists.forEach(item => {
          const hasAnswers = item.answer_choices && item.answer_choices.length > 0;
          console.log(`   ${hasAnswers ? '✅' : '⚪'} ${item.text} ${hasAnswers ? `(${item.answer_choices.length} choices)` : '(no choices)'}`);
        });
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Get total stats
    const totalChecklists = await SectionChecklist.countDocuments();
    const checklistsWithAnswers = await SectionChecklist.countDocuments({ answer_choices: { $exists: true, $ne: [] } });
    
    console.log('\n📊 SUMMARY:');
    console.log(`   Total Sections: ${sections.length}`);
    console.log(`   Total Checklist Items: ${totalChecklists}`);
    console.log(`   Items with Answer Choices: ${checklistsWithAnswers}`);
    console.log(`   Items without Answer Choices: ${totalChecklists - checklistsWithAnswers}`);
    console.log(`   Completion: ${((checklistsWithAnswers / totalChecklists) * 100).toFixed(1)}%`);

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

queryProduction();
