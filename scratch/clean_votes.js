const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  // 1. Get elections
  const { data: elections, error: elError } = await supabase.from('elections').select('id, name');
  if (elError) {
    console.error(elError);
    return;
  }
  
  console.log('Elections found:', elections);
  
  for (const el of elections) {
    console.log(`Resetting election: ${el.name} (${el.id})`);
    
    // Delete all votes for this election
    const { error: votesDelError } = await supabase
      .from('votes')
      .delete()
      .eq('election_id', el.id);
      
    if (votesDelError) {
      console.error(`Error deleting votes for ${el.name}:`, votesDelError.message);
    } else {
      console.log(`Successfully deleted votes for ${el.name}`);
    }
    
    // Reset has_voted = false for all voters
    const { error: votersResetError } = await supabase
      .from('election_voters')
      .update({ has_voted: false, voted_at: null })
      .eq('election_id', el.id);
      
    if (votersResetError) {
      console.error(`Error resetting voters for ${el.name}:`, votersResetError.message);
    } else {
      console.log(`Successfully reset voters for ${el.name}`);
    }
  }
}

run();
