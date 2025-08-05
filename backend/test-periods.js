const TOKEN = process.argv[2];

async function testPeriods() {
  const fetch = (await import('node-fetch')).default;
  
  console.log('Fetching all periods...');
  const allResponse = await fetch('http://localhost:3001/api/billing/periods', {
    headers: { 'Authorization': `Bearer ${TOKEN}` }
  });
  const allData = await allResponse.json();
  
  console.log('Fetching filtered periods...');
  const filteredResponse = await fetch('http://localhost:3001/api/billing/periods?forMeterReadings=true', {
    headers: { 'Authorization': `Bearer ${TOKEN}` }
  });
  const filteredData = await filteredResponse.json();
  
  console.log(`\nAll periods: ${allData.data.length}`);
  console.log(`Filtered periods: ${filteredData.data.length}`);
  
  console.log('\nFirst 5 all periods:');
  allData.data.slice(0, 5).forEach(p => {
    console.log(`${p.periodName}: ${p.startDate} to ${p.endDate}`);
  });
  
  console.log('\nFirst 5 filtered periods:');
  filteredData.data.slice(0, 5).forEach(p => {
    console.log(`${p.periodName}: ${p.startDate} to ${p.endDate}`);
  });
  
  // Check for future periods
  const now = new Date();
  const futurePeriods = allData.data.filter(p => new Date(p.startDate) > now);
  console.log(`\nFuture periods (start > now): ${futurePeriods.length}`);
  if (futurePeriods.length > 0) {
    console.log('Examples:');
    futurePeriods.slice(0, 3).forEach(p => {
      console.log(`${p.periodName}: ${p.startDate}`);
    });
  }
}

testPeriods().catch(console.error);
