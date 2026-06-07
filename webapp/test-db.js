const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nyvtrmwreujasdscfdit.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55dnRybXdyZXVqYXNkc2NmZGl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MjkzNDgsImV4cCI6MjA5MTEwNTM0OH0.PHbwMetOZVeW8LoyjwK6f7IhONysUe3NLsJg-UoQ_nE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  console.log("1. Fetching statuses...");
  const { data: statuses, error: statusError } = await supabase.from('statuses').select('*');
  if (statusError) {
    console.error("Error fetching statuses:", statusError);
  } else {
    console.log("Successfully fetched statuses:", statuses);
  }

  console.log("\n2. Fetching shipments...");
  const { data: shipments, error: shipmentError } = await supabase.from('shipments').select('*');
  if (shipmentError) {
    console.error("Error fetching shipments:", shipmentError);
  } else {
    console.log("Successfully fetched shipments:", shipments);
  }

  console.log("\n3. Testing insert into shipments...");
  const { data: inserted, error: insertError } = await supabase.from('shipments').insert({
    client_name: 'Diagnostic Test Ltd',
    reference: 'TEST-REF-123',
    shipment_type: 'Import',
    status_id: 1
  }).select();

  if (insertError) {
    console.error("Error inserting shipment:", insertError);
  } else {
    console.log("Successfully inserted shipment:", inserted);
    
    // Clean up
    if (inserted && inserted[0]) {
      console.log("\n4. Cleaning up inserted shipment...");
      const { error: deleteError } = await supabase.from('shipments').delete().eq('id', inserted[0].id);
      if (deleteError) {
        console.error("Error deleting shipment:", deleteError);
      } else {
        console.log("Cleaned up successfully.");
      }
    }
  }
}

runTest();
