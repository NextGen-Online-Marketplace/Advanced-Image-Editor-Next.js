require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const fs = require('fs');

// Schema definitions
const sectionChecklistSchema = new mongoose.Schema({
  section_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
  section_number: String,
  title: String,
  display_order: Number,
  answer_choices: [String]
}, { collection: 'section_checklists' });

const SectionChecklist = mongoose.model('SectionChecklist', sectionChecklistSchema);

async function exportLocalChecklists() {
  try {
    console.log('🔗 Connecting to LOCAL database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to local MongoDB\n');

    const checklists = await SectionChecklist.find()
      .sort({ section_number: 1, display_order: 1 })
      .lean();

    console.log(`📊 Found ${checklists.length} checklist items in local database\n`);

    // Save to JSON file
    const exportData = checklists.map(item => ({
      section_number: item.section_number,
      title: item.title,
      display_order: item.display_order,
      answer_choices: item.answer_choices || []
    }));

    fs.writeFileSync(
      'scripts/local-checklists-export.json',
      JSON.stringify(exportData, null, 2)
    );

    console.log('✅ Exported to scripts/local-checklists-export.json');
    
    // Show summary by section
    const bySection = {};
    checklists.forEach(item => {
      if (!bySection[item.section_number]) {
        bySection[item.section_number] = [];
      }
      bySection[item.section_number].push({
        title: item.title,
        hasAnswers: (item.answer_choices?.length || 0) > 0,
        answerCount: item.answer_choices?.length || 0
      });
    });

    console.log('\n📋 Summary by Section:');
    Object.keys(bySection).sort().forEach(section => {
      console.log(`\n${section}:`);
      bySection[section].forEach(item => {
        console.log(`  - ${item.title} ${item.hasAnswers ? `(${item.answerCount} choices)` : '(no choices)'}`);
      });
    });

    await mongoose.disconnect();
    console.log('\n✅ Export complete!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

exportLocalChecklists();
