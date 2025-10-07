require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function listCollections() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const dbName = mongoose.connection.db.databaseName;
    console.log(`📍 Database: ${dbName}\n`);

    const collections = await mongoose.connection.db.listCollections().toArray();
    
    console.log(`📂 Found ${collections.length} collections:\n`);
    
    for (const coll of collections) {
      const count = await mongoose.connection.db.collection(coll.name).countDocuments();
      console.log(`   ${coll.name} (${count} documents)`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

listCollections();
