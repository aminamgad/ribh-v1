const fs = require('fs');
const path = require('path');

// Read villages JSON file
const villagesFilePath = path.join(__dirname, '..', 'villages (1).json');
const villagesData = JSON.parse(fs.readFileSync(villagesFilePath, 'utf8'));

if (!villagesData.data || !Array.isArray(villagesData.data)) {
  console.error('❌ Invalid JSON structure. Expected data array.');
  process.exit(1);
}

console.log(`📦 Total villages in file: ${villagesData.data.length}\n`);

// Group by area_id
const areasMap = new Map();

villagesData.data.forEach((village) => {
  const areaId = village.area_id;
  if (!areasMap.has(areaId)) {
    areasMap.set(areaId, {
      areaId,
      villages: [],
      totalVillages: 0,
      minDeliveryCost: village.delivery_cost,
      maxDeliveryCost: village.delivery_cost,
    });
  }

  const area = areasMap.get(areaId);
  area.villages.push({
    id: village.id,
    name: village.village_name,
    deliveryCost: village.delivery_cost,
  });
  area.totalVillages++;
  area.minDeliveryCost = Math.min(area.minDeliveryCost, village.delivery_cost);
  area.maxDeliveryCost = Math.max(area.maxDeliveryCost, village.delivery_cost);
});

const areas = Array.from(areasMap.values()).sort((a, b) => a.areaId - b.areaId);

console.log(`📍 Total areas in file: ${areas.length}\n`);
console.log('📊 Areas breakdown:');
console.log('─'.repeat(60));

areas.forEach((area) => {
  console.log(`\nالمنطقة ${area.areaId}:`);
  console.log(`  - عدد القرى: ${area.totalVillages}`);
  console.log(`  - أقل تكلفة توصيل: ${area.minDeliveryCost} ₪`);
  console.log(`  - أعلى تكلفة توصيل: ${area.maxDeliveryCost} ₪`);
});

console.log('\n' + '─'.repeat(60));
console.log(`\n✅ All data from villages (1).json is ready to be imported!`);

