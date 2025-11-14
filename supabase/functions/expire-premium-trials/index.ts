import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting premium trial expiration check...');

    // Get all expired trials that are still active
    const now = new Date().toISOString();
    const { data: expiredTrials, error: fetchError } = await supabaseClient
      .from('premium_trials')
      .select('user_id, id')
      .eq('is_active', true)
      .lt('trial_end_date', now);

    if (fetchError) {
      console.error('Error fetching expired trials:', fetchError);
      throw fetchError;
    }

    if (!expiredTrials || expiredTrials.length === 0) {
      console.log('No expired trials found');
      return new Response(
        JSON.stringify({ message: 'No expired trials to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${expiredTrials.length} expired trials`);

    // Deactivate expired trials
    const { error: updateError } = await supabaseClient
      .from('premium_trials')
      .update({ is_active: false })
      .in('id', expiredTrials.map(t => t.id));

    if (updateError) {
      console.error('Error updating trials:', updateError);
      throw updateError;
    }

    // Remove premium roles for users with expired trials
    // Only remove if they don't have any other active trials or permanent premium
    for (const trial of expiredTrials) {
      // Check if user has any other active trials
      const { data: otherTrials } = await supabaseClient
        .from('premium_trials')
        .select('id')
        .eq('user_id', trial.user_id)
        .eq('is_active', true)
        .neq('id', trial.id);

      // If no other active trials, check for permanent premium role (trial_source != 'referral')
      if (!otherTrials || otherTrials.length === 0) {
        // Get all premium roles for this user
        const { data: premiumRoles } = await supabaseClient
          .from('user_roles')
          .select('id')
          .eq('user_id', trial.user_id)
          .eq('role', 'premium');

        // Check if user has permanent premium (check payment transactions)
        const { data: payments } = await supabaseClient
          .from('payment_transactions')
          .select('id')
          .eq('user_id', trial.user_id)
          .eq('status', 'approved');

        // If no approved payments, this is trial-only premium, so remove it
        if (!payments || payments.length === 0) {
          if (premiumRoles && premiumRoles.length > 0) {
            const { error: deleteRoleError } = await supabaseClient
              .from('user_roles')
              .delete()
              .eq('user_id', trial.user_id)
              .eq('role', 'premium');

            if (deleteRoleError) {
              console.error(`Error removing premium role for user ${trial.user_id}:`, deleteRoleError);
            } else {
              console.log(`Removed premium role for user ${trial.user_id}`);
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Successfully expired ${expiredTrials.length} trials`,
        count: expiredTrials.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in expire-premium-trials function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
